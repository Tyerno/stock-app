const mongoose = require('mongoose');
const BonCommande = require('../models/BonCommande');
const Produit = require('../models/Produit');
const Mouvement = require('../models/Mouvement');
const { conditionRecherche } = require('../utils/recherche');

const STATUTS = ['brouillon', 'envoye', 'recu', 'annule'];
const nombre = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) ? Number(v) : NaN;
const texte = (v, max) => String(v ?? '').trim().slice(0, max);

async function prochainNumero() {
  const d = new Date();
  const prefix = `BC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dernier = await BonCommande.findOne({ numero: new RegExp(`^${prefix}-`) }).sort({ numero: -1 }).select('numero').lean();
  const seq = dernier ? parseInt(dernier.numero.slice(-4), 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// POST /api/bons-commande  { fournisseur:{nom,contact}, lignes:[{produit,quantite,prixUnitaire?}], note }
exports.creerBon = async (req, res) => {
  try {
    const { fournisseur = {}, lignes, note } = req.body || {};
    const nomF = texte(fournisseur.nom, 100);
    if (!nomF) return res.status(400).json({ success: false, message: 'Le nom du fournisseur est obligatoire' });
    if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > 100) {
      return res.status(400).json({ success: false, message: 'Ajoutez entre 1 et 100 produits au bon' });
    }

    const ids = lignes.map((l) => String(l?.produit));
    if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) {
      return res.status(400).json({ success: false, message: 'Produit invalide ou en double dans le bon' });
    }
    const produits = await Produit.find({ _id: { $in: ids }, actif: true }).select('nom reference unite prixAchat').lean();
    const parId = new Map(produits.map((p) => [String(p._id), p]));

    const propres = [];
    for (const l of lignes) {
      const p = parId.get(String(l.produit));
      if (!p) return res.status(400).json({ success: false, message: 'Un des produits est introuvable ou archivé' });
      const quantite = nombre(l.quantite);
      const prix = l.prixUnitaire === undefined || l.prixUnitaire === '' ? (p.prixAchat || 0) : nombre(l.prixUnitaire);
      if (!(quantite > 0) || quantite > 1000000) return res.status(400).json({ success: false, message: `Quantité invalide pour « ${p.nom} »` });
      if (!(prix >= 0) || prix > 1e10) return res.status(400).json({ success: false, message: `Prix invalide pour « ${p.nom} »` });
      propres.push({ produit: p._id, nomProduit: p.nom, reference: p.reference, unite: p.unite, quantite, prixUnitaire: prix, sousTotal: Math.round(quantite * prix) });
    }
    const total = propres.reduce((s, l) => s + l.sousTotal, 0);

    let bon;
    for (let essai = 0; essai < 4 && !bon; essai++) {
      try {
        bon = await BonCommande.create({
          numero: await prochainNumero(),
          fournisseur: { nom: nomF, contact: texte(fournisseur.contact, 100) || undefined },
          lignes: propres, total, note: texte(note, 500) || undefined, creePar: req.user._id,
        });
      } catch (err) { if (err.code !== 11000 || essai === 3) throw err; } // numéro pris en parallèle : on recommence
    }
    res.status(201).json({ success: true, data: bon, message: `Bon ${bon.numero} créé` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// GET /api/bons-commande?statut&q&page&limit
exports.getBons = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filtre = {};
    if (STATUTS.includes(req.query.statut)) filtre.statut = req.query.statut;
    if (req.query.statut === 'ouverts') filtre.statut = { $in: ['brouillon', 'envoye'] };
    const rech = conditionRecherche(req.query.q, ['numero', 'fournisseur.nom', 'lignes.nomProduit']);
    if (rech) Object.assign(filtre, rech);
    const [data, total] = await Promise.all([
      BonCommande.find(filtre).populate('creePar', 'nom').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      BonCommande.countDocuments(filtre),
    ]);
    res.json({ success: true, data, pagination: { total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de lire les bons de commande' }); }
};

exports.getBon = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Bon introuvable' });
    const bon = await BonCommande.findById(req.params.id).populate('creePar', 'nom').lean();
    if (!bon) return res.status(404).json({ success: false, message: 'Bon introuvable' });
    res.json({ success: true, data: bon });
  } catch (err) { res.status(500).json({ success: false, message: 'Impossible de lire le bon' }); }
};

// PATCH /api/bons-commande/:id/statut  { statut: 'envoye' | 'annule' }
// Transitions permises : brouillon → envoyé | annulé ; envoyé → annulé. La réception a sa propre route.
exports.changerStatut = async (req, res) => {
  try {
    const { statut } = req.body || {};
    const permis = { envoye: ['brouillon'], annule: ['brouillon', 'envoye'] };
    if (!permis[statut]) return res.status(400).json({ success: false, message: 'Statut invalide' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Bon introuvable' });
    const maj = { statut, ...(statut === 'envoye' && { dateEnvoi: new Date() }) };
    const bon = await BonCommande.findOneAndUpdate({ _id: req.params.id, statut: { $in: permis[statut] } }, { $set: maj }, { new: true });
    if (!bon) return res.status(400).json({ success: false, message: 'Ce changement de statut n\'est pas possible pour ce bon' });
    res.json({ success: true, data: bon, message: statut === 'envoye' ? 'Bon marqué comme envoyé' : 'Bon annulé' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// POST /api/bons-commande/:id/reception  { lignes: [{ ligne:<id de la ligne>, quantiteRecue }] }
// Ajoute les quantités reçues au stock (avec un mouvement « entrée » par produit) puis clôt le bon.
exports.receptionner = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Bon introuvable' });
    const saisies = Array.isArray(req.body?.lignes) ? req.body.lignes : [];

    const bon = await BonCommande.findById(req.params.id);
    if (!bon) return res.status(404).json({ success: false, message: 'Bon introuvable' });
    if (!['brouillon', 'envoye'].includes(bon.statut)) return res.status(400).json({ success: false, message: 'Ce bon ne peut plus être réceptionné' });

    const recu = new Map(saisies.map((s) => [String(s?.ligne), nombre(s?.quantiteRecue)]));
    for (const l of bon.lignes) {
      const q = recu.has(String(l._id)) ? recu.get(String(l._id)) : l.quantite; // par défaut : tout est reçu
      if (!(q >= 0) || q > 1000000) return res.status(400).json({ success: false, message: `Quantité reçue invalide pour « ${l.nomProduit} »` });
      l._qRecue = q;
    }

    // « Réservation » atomique : une seule réception possible, même en cas de double clic
    const reserve = await BonCommande.findOneAndUpdate(
      { _id: bon._id, statut: { $in: ['brouillon', 'envoye'] } },
      { $set: { statut: 'recu', dateReception: new Date() } }, { new: false });
    if (!reserve) return res.status(400).json({ success: false, message: 'Ce bon a déjà été réceptionné' });

    const resultats = [];
    for (const l of bon.lignes) {
      l.quantiteRecue = l._qRecue;
      if (!(l._qRecue > 0)) continue;
      const p = await Produit.findByIdAndUpdate(l.produit, { $inc: { quantiteStock: l._qRecue } }, { new: true });
      if (!p) { resultats.push({ produit: l.nomProduit, ignore: true }); continue; }
      await Mouvement.create({
        produit: p._id, type: 'entree', quantite: l._qRecue,
        quantiteAvant: p.quantiteStock - l._qRecue, quantiteApres: p.quantiteStock,
        prixUnitaire: l.prixUnitaire, motif: `Réception ${bon.numero}`, reference: bon.numero,
        fournisseur: bon.fournisseur.nom, utilisateur: req.user._id,
      });
      resultats.push({ produit: l.nomProduit, ajoute: l._qRecue });
    }
    await bon.save(); // enregistre les quantités reçues par ligne (le statut est déjà posé par la réservation)

    const fresh = await BonCommande.findById(bon._id).populate('creePar', 'nom').lean();
    res.json({ success: true, data: fresh, resultats, message: `Réception enregistrée : le stock de ${resultats.filter((r) => r.ajoute).length} produit(s) a été mis à jour` });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
