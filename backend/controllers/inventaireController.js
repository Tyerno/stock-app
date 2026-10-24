const mongoose = require('mongoose');
const Inventaire = require('../models/Inventaire');
const Produit = require('../models/Produit');
const Mouvement = require('../models/Mouvement');

const MAX_LIGNES = 3000;

const ecartLigne = (l) => (l.stockCompte === null || l.stockCompte === undefined || l.theoriqueAuComptage === null || l.theoriqueAuComptage === undefined)
  ? null : Math.round((l.stockCompte - l.theoriqueAuComptage) * 100) / 100;

function resumer(inv) {
  let comptes = 0, ecarts = 0, perte = 0, gain = 0;
  for (const l of inv.lignes) {
    const e = inv.statut === 'valide' && l.ecartApplique !== undefined ? l.ecartApplique : ecartLigne(l);
    if (e === null || e === undefined) continue;
    comptes++;
    if (e !== 0) {
      ecarts++;
      const v = e * (l.prixAchat || 0);
      if (v < 0) perte += -v; else gain += v;
    }
  }
  return { nbLignes: inv.lignes.length, nbComptes: comptes, nbEcarts: ecarts, valeurPerte: Math.round(perte), valeurGain: Math.round(gain) };
}

async function prochainNumero() {
  const d = new Date();
  const prefix = `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dernier = await Inventaire.findOne({ numero: new RegExp(`^${prefix}-`) }).sort({ numero: -1 }).select('numero').lean();
  const seq = dernier ? parseInt(dernier.numero.slice(-4), 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

const idValide = (id) => mongoose.isValidObjectId(id);

// POST /api/inventaires  { categorie?: id, note? }  — un seul inventaire en cours à la fois
exports.demarrer = async (req, res) => {
  try {
    const enCours = await Inventaire.findOne({ statut: 'en_cours' }).select('numero').lean();
    if (enCours) return res.status(409).json({ success: false, message: `L'inventaire ${enCours.numero} est déjà en cours : terminez-le ou annulez-le d'abord.`, data: { _id: enCours._id } });

    const filtre = { actif: true };
    let perimetre = 'Tous les produits';
    if (req.body?.categorie) {
      if (!idValide(req.body.categorie)) return res.status(400).json({ success: false, message: 'Catégorie invalide' });
      filtre.categorie = req.body.categorie;
    }
    const produits = await Produit.find(filtre).populate('categorie', 'nom').select('nom reference unite prixAchat categorie').sort({ nom: 1 }).limit(MAX_LIGNES + 1).lean();
    if (produits.length === 0) return res.status(400).json({ success: false, message: 'Aucun produit à inventorier' });
    if (produits.length > MAX_LIGNES) return res.status(400).json({ success: false, message: `Trop de produits (${MAX_LIGNES} maximum) : choisissez une catégorie` });
    if (filtre.categorie) perimetre = `Catégorie : ${produits[0].categorie?.nom || 'sélection'}`;

    let inv;
    for (let essai = 0; essai < 4 && !inv; essai++) {
      try {
        inv = await Inventaire.create({
          numero: await prochainNumero(), perimetre, note: String(req.body?.note ?? '').trim().slice(0, 300) || undefined, creePar: req.user._id,
          lignes: produits.map((p) => ({ produit: p._id, nomProduit: p.nom, reference: p.reference, unite: p.unite, categorie: p.categorie?.nom, prixAchat: p.prixAchat || 0 })),
        });
      } catch (err) { if (err.code !== 11000 || essai === 3) throw err; }
    }
    res.status(201).json({ success: true, data: inv, message: `Inventaire ${inv.numero} démarré (${inv.lignes.length} produits)` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// GET /api/inventaires
exports.getInventaires = async (req, res) => {
  try {
    const liste = await Inventaire.find().populate('creePar', 'nom').sort({ createdAt: -1 }).limit(30).lean();
    res.json({ success: true, data: liste.map((i) => ({ ...i, lignes: undefined, resume: resumer(i) })) });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de lire les inventaires' }); }
};

// GET /api/inventaires/:id  (avec les lignes et l'écart de chacune)
exports.getInventaire = async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(404).json({ success: false, message: 'Inventaire introuvable' });
    const inv = await Inventaire.findById(req.params.id).populate('creePar', 'nom').populate('validePar', 'nom').lean();
    if (!inv) return res.status(404).json({ success: false, message: 'Inventaire introuvable' });
    inv.lignes = inv.lignes.map((l) => ({ ...l, ecart: inv.statut === 'valide' && l.ecartApplique !== undefined ? l.ecartApplique : ecartLigne(l) }));
    res.json({ success: true, data: { ...inv, resume: resumer(inv) } });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de lire l\'inventaire' }); }
};

// PATCH /api/inventaires/:id/lignes/:ligneId  { stockCompte: nombre | null }
exports.compter = async (req, res) => {
  try {
    const { id, ligneId } = req.params;
    if (!idValide(id) || !idValide(ligneId)) return res.status(404).json({ success: false, message: 'Ligne introuvable' });
    const brut = req.body?.stockCompte;
    let q = null;
    if (brut !== null && brut !== '' && brut !== undefined) {
      q = typeof brut === 'number' || typeof brut === 'string' ? Number(brut) : NaN;
      if (!(q >= 0) || q > 10000000) return res.status(400).json({ success: false, message: 'Quantité comptée invalide' });
      q = Math.round(q * 100) / 100;
    }

    const inv = await Inventaire.findOne({ _id: id, statut: 'en_cours', 'lignes._id': ligneId }).select({ lignes: { $elemMatch: { _id: ligneId } } }).lean();
    if (!inv || !inv.lignes?.length) return res.status(404).json({ success: false, message: 'Inventaire terminé ou ligne introuvable' });

    let theorique = null;
    if (q !== null) {
      const p = await Produit.findById(inv.lignes[0].produit).select('quantiteStock').lean();
      if (!p) return res.status(404).json({ success: false, message: 'Produit introuvable' });
      theorique = p.quantiteStock;
    }
    const maj = q === null
      ? { 'lignes.$.stockCompte': null, 'lignes.$.theoriqueAuComptage': null, 'lignes.$.comptePar': null, 'lignes.$.compteLe': null }
      : { 'lignes.$.stockCompte': q, 'lignes.$.theoriqueAuComptage': theorique, 'lignes.$.comptePar': req.user._id, 'lignes.$.compteLe': new Date() };
    const ok = await Inventaire.updateOne({ _id: id, statut: 'en_cours', 'lignes._id': ligneId }, { $set: maj });
    if (!ok.matchedCount) return res.status(404).json({ success: false, message: 'Inventaire terminé ou ligne introuvable' });

    res.json({ success: true, data: { _id: ligneId, stockCompte: q, theoriqueAuComptage: theorique, ecart: q === null ? null : Math.round((q - theorique) * 100) / 100 } });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// POST /api/inventaires/:id/valider — corrige le stock des écarts constatés (administrateur)
exports.valider = async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(404).json({ success: false, message: 'Inventaire introuvable' });
    // Réservation atomique : la validation ne peut avoir lieu qu'une fois
    const inv = await Inventaire.findOneAndUpdate({ _id: req.params.id, statut: 'en_cours' },
      { $set: { statut: 'valide', dateValidation: new Date(), validePar: req.user._id } }, { new: false }).lean();
    if (!inv) return res.status(400).json({ success: false, message: 'Cet inventaire est déjà terminé ou introuvable' });

    const lignes = [];
    for (const l of inv.lignes) {
      const ecart = ecartLigne(l);
      if (ecart === null) { lignes.push(l); continue; }
      let appliqué = 0;
      if (ecart !== 0) {
        // Le stock actuel est corrigé de l'écart (jamais en dessous de zéro) : les ventes faites depuis le comptage sont conservées
        const avant = await Produit.findOneAndUpdate({ _id: l.produit }, [{ $set: { quantiteStock: { $max: [0, { $add: ['$quantiteStock', ecart] }] } } }], { new: false }).select('quantiteStock').lean();
        if (avant) {
          const apres = Math.max(0, avant.quantiteStock + ecart);
          appliqué = Math.round((apres - avant.quantiteStock) * 100) / 100;
          if (appliqué !== 0) {
            await Mouvement.create({
              produit: l.produit, type: 'ajustement', quantite: Math.abs(appliqué), quantiteAvant: avant.quantiteStock, quantiteApres: apres,
              prixUnitaire: l.prixAchat || undefined, motif: `Inventaire ${inv.numero} : compté ${l.stockCompte}, attendu ${l.theoriqueAuComptage}`,
              reference: inv.numero, utilisateur: req.user._id,
            });
          }
        }
      }
      lignes.push({ ...l, ecartApplique: appliqué });
    }
    await Inventaire.updateOne({ _id: inv._id }, { $set: { lignes } });

    const final = { ...inv, statut: 'valide', lignes };
    const resume = resumer(final);
    res.json({ success: true, data: { _id: inv._id, numero: inv.numero, statut: 'valide', resume },
      message: resume.nbEcarts ? `Inventaire validé : ${resume.nbEcarts} écart(s) corrigé(s) dans le stock` : 'Inventaire validé : aucun écart, le stock est exact' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// POST /api/inventaires/:id/annuler — abandonne l'inventaire sans toucher au stock
exports.annuler = async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(404).json({ success: false, message: 'Inventaire introuvable' });
    const inv = await Inventaire.findOneAndUpdate({ _id: req.params.id, statut: 'en_cours' }, { $set: { statut: 'annule' } }, { new: true }).select('numero statut').lean();
    if (!inv) return res.status(400).json({ success: false, message: 'Cet inventaire est déjà terminé ou introuvable' });
    res.json({ success: true, data: inv, message: `Inventaire ${inv.numero} annulé : le stock n'a pas été modifié` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
