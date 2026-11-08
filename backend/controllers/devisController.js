const mongoose = require('mongoose');
const Devis = require('../models/Devis');
const Produit = require('../models/Produit');
const Vente = require('../models/Vente');
const { conditionRecherche } = require('../utils/recherche');

const nombre = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) ? Number(v) : NaN;
const texte = (v, max) => String(v ?? '').trim().slice(0, max);
const f = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

async function prochainNumero() {
  const d = new Date();
  const prefix = `DEV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dernier = await Devis.findOne({ numero: new RegExp(`^${prefix}-`) }).sort({ numero: -1 }).select('numero').lean();
  const seq = dernier ? parseInt(dernier.numero.slice(-4), 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

const expire = (d) => d.statut === 'en_cours' && new Date(d.dateValidite) < new Date();
const enrichir = (d) => ({ ...d, expire: expire(d) });

// POST /api/devis  { client:{nom,telephone}, lignes:[{produit,quantite,prixUnitaire?}], remise, validiteJours, note }
exports.creerDevis = async (req, res) => {
  try {
    const { client = {}, lignes, remise, validiteJours, note } = req.body || {};
    const nomC = texte(client.nom, 100);
    if (!nomC) return res.status(400).json({ success: false, message: 'Le nom du client est obligatoire' });
    if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > 100) {
      return res.status(400).json({ success: false, message: 'Ajoutez entre 1 et 100 produits au devis' });
    }
    const jours = validiteJours === undefined || validiteJours === '' ? 15 : nombre(validiteJours);
    if (!Number.isInteger(jours) || jours < 1 || jours > 365) return res.status(400).json({ success: false, message: 'Validité : entre 1 et 365 jours' });

    const ids = lignes.map((l) => String(l?.produit));
    if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) {
      return res.status(400).json({ success: false, message: 'Produit invalide ou en double dans le devis' });
    }
    const produits = await Produit.find({ _id: { $in: ids }, actif: true }).select('nom reference unite prixVente prixMin').lean();
    const parId = new Map(produits.map((p) => [String(p._id), p]));

    const propres = [];
    for (const l of lignes) {
      const p = parId.get(String(l.produit));
      if (!p) return res.status(400).json({ success: false, message: 'Un des produits est introuvable ou archivé' });
      const quantite = nombre(l.quantite);
      const prix = l.prixUnitaire === undefined || l.prixUnitaire === '' ? (p.prixVente || 0) : nombre(l.prixUnitaire);
      if (!(quantite > 0) || quantite > 1000000) return res.status(400).json({ success: false, message: `Quantité invalide pour « ${p.nom} »` });
      if (!(prix >= 0) || prix > 1e10) return res.status(400).json({ success: false, message: `Prix invalide pour « ${p.nom} »` });
      propres.push({ produit: p._id, nomProduit: p.nom, reference: p.reference, unite: p.unite, quantite, prixUnitaire: prix, sousTotal: Math.round(quantite * prix), prixMin: p.prixMin || 0 });
    }
    const totalHT = propres.reduce((s, l) => s + l.sousTotal, 0);
    const rem = remise === undefined || remise === '' ? 0 : nombre(remise);
    if (!(rem >= 0) || rem > totalHT) return res.status(400).json({ success: false, message: 'Remise invalide' });
    const totalNet = totalHT - rem;

    // Même règle que la vente : le prix réellement proposé (remise comprise) ne descend pas sous le prix plancher.
    const ratio = totalHT > 0 ? totalNet / totalHT : 1;
    const sousPlancher = propres.filter((l) => l.prixMin > 0 && Math.round(l.prixUnitaire * ratio) < l.prixMin);
    if (sousPlancher.length && req.user.role !== 'admin') {
      return res.status(400).json({ success: false, message: `Prix trop bas : ${sousPlancher.map((l) => `« ${l.nomProduit} » à ${f(l.prixUnitaire * ratio)} GNF (minimum ${f(l.prixMin)})`).join(', ')}. Demandez à l'administrateur.` });
    }

    const dateValidite = new Date(); dateValidite.setUTCHours(23, 59, 59, 999); dateValidite.setUTCDate(dateValidite.getUTCDate() + jours);
    const lignesFinales = propres.map(({ prixMin, ...l }) => l);

    let devis;
    for (let essai = 0; essai < 4 && !devis; essai++) {
      try {
        devis = await Devis.create({
          numero: await prochainNumero(),
          client: { nom: nomC, telephone: texte(client.telephone, 30) || undefined },
          lignes: lignesFinales, totalHT, remise: rem, totalNet, dateValidite,
          note: texte(note, 500) || undefined, creePar: req.user._id,
        });
      } catch (err) { if (err.code !== 11000 || essai === 3) throw err; } // numéro pris en parallèle : on recommence
    }
    res.status(201).json({ success: true, data: devis, message: `Devis ${devis.numero} créé`, sousPlancher: sousPlancher.map((l) => l.nomProduit) });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// GET /api/devis?statut=en_cours|expire|converti|refuse&q&page&limit
exports.getDevisListe = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const maintenant = new Date();
    const filtre = {};
    switch (req.query.statut) {
      case 'en_cours': Object.assign(filtre, { statut: 'en_cours', dateValidite: { $gte: maintenant } }); break;
      case 'expire':   Object.assign(filtre, { statut: 'en_cours', dateValidite: { $lt: maintenant } }); break;
      case 'converti': case 'refuse': filtre.statut = req.query.statut; break;
      default: break;
    }
    const rech = conditionRecherche(req.query.q, ['numero', 'client.nom', 'lignes.nomProduit']);
    if (rech) Object.assign(filtre, rech);
    const [data, total, enCours, expires, convertis, refuses] = await Promise.all([
      Devis.find(filtre).populate('creePar', 'nom').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Devis.countDocuments(filtre),
      Devis.countDocuments({ statut: 'en_cours', dateValidite: { $gte: maintenant } }),
      Devis.countDocuments({ statut: 'en_cours', dateValidite: { $lt: maintenant } }),
      Devis.countDocuments({ statut: 'converti' }),
      Devis.countDocuments({ statut: 'refuse' }),
    ]);
    res.json({
      success: true, data: data.map(enrichir),
      compteurs: { en_cours: enCours, expire: expires, converti: convertis, refuse: refuses },
      pagination: { total, page, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de lire les devis' }); }
};

exports.getDevis = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    const d = await Devis.findById(req.params.id).populate('creePar', 'nom').populate('vente', 'numero').lean();
    if (!d) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    res.json({ success: true, data: enrichir(d) });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de lire le devis' }); }
};

// GET /api/devis/:id/panier : lignes du devis avec le stock et le prix plancher d'AUJOURD'HUI, pour préremplir la caisse.
exports.getPanier = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    const d = await Devis.findById(req.params.id).lean();
    if (!d) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    if (d.statut === 'converti') return res.status(409).json({ success: false, message: 'Ce devis a déjà été transformé en vente' });
    const produits = await Produit.find({ _id: { $in: d.lignes.map((l) => l.produit) } }).select('nom unite quantiteStock prixVente prixMin actif').lean();
    const parId = new Map(produits.map((p) => [String(p._id), p]));
    const lignes = d.lignes.map((l) => {
      const p = parId.get(String(l.produit));
      const dispo = p && p.actif !== false;
      return {
        produitId: String(l.produit), nomProduit: l.nomProduit, unite: l.unite || p?.unite || '',
        quantite: l.quantite, prixUnitaire: l.prixUnitaire, prixCatalogue: p?.prixVente ?? l.prixUnitaire,
        prixMin: p?.prixMin || 0, stockMax: dispo ? p.quantiteStock : 0, disponible: !!dispo,
      };
    });
    res.json({ success: true, data: { _id: d._id, numero: d.numero, client: d.client, remise: d.remise, expire: expire(d), lignes } });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de préparer la vente' }); }
};

// PATCH /api/devis/:id/statut  { statut: 'refuse' | 'en_cours' }  (un devis converti ne change plus)
exports.changerStatut = async (req, res) => {
  try {
    const { statut } = req.body || {};
    if (!['refuse', 'en_cours'].includes(statut)) return res.status(400).json({ success: false, message: 'Statut invalide' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    const d = await Devis.findOneAndUpdate({ _id: req.params.id, statut: { $ne: 'converti' } }, { statut }, { new: true }).lean();
    if (!d) return res.status(409).json({ success: false, message: 'Devis introuvable ou déjà transformé en vente' });
    res.json({ success: true, data: enrichir(d), message: statut === 'refuse' ? 'Devis marqué comme refusé' : 'Devis remis en cours' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// POST /api/devis/:id/converti  { venteId } : appelé par la caisse une fois la vente enregistrée.
exports.marquerConverti = async (req, res) => {
  try {
    const { venteId } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(venteId)) return res.status(400).json({ success: false, message: 'Identifiant invalide' });
    const vente = await Vente.findById(venteId).select('_id numero').lean();
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable' });
    const d = await Devis.findOneAndUpdate(
      { _id: req.params.id, statut: { $ne: 'converti' } },
      { statut: 'converti', vente: vente._id, dateConversion: new Date() }, { new: true }
    ).lean();
    if (d) return res.json({ success: true, data: enrichir(d), message: `Devis ${d.numero} transformé en vente ${vente.numero}` });
    const deja = await Devis.findById(req.params.id).lean();
    if (deja && String(deja.vente) === String(vente._id)) return res.json({ success: true, data: enrichir(deja) }); // appel répété : rien à faire
    res.status(409).json({ success: false, message: 'Devis introuvable ou déjà transformé par une autre vente' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// DELETE /api/devis/:id (jamais un devis converti : il garde le lien vers sa vente)
exports.supprimer = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Devis introuvable' });
    const d = await Devis.findOneAndDelete({ _id: req.params.id, statut: { $ne: 'converti' } }).lean();
    if (!d) return res.status(409).json({ success: false, message: 'Devis introuvable ou déjà transformé en vente' });
    res.json({ success: true, message: `Devis ${d.numero} supprimé` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
