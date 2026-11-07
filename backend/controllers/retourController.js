const mongoose  = require('mongoose');
const Vente     = require('../models/Vente');
const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');
const Dette     = require('../models/Dette');
const Retour    = require('../models/Retour');

// ─── Retours et échanges ──────────────────────────────────────────────────────
// La vente d'origine n'est jamais modifiée. Un retour : articles repris (remis en stock si bon état),
// remboursement en espèces / Mobile Money, ou déduction de la dette du client.
// Un échange : le client repart avec d'autres articles, et on règle seulement la différence.
const nombre = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN);
const arrondi = (n) => Math.round(n);
const REGLEMENTS = ['especes', 'mobile_money', 'dette'];

const dejaRetourne = async (venteId) => {
  const retours = await Retour.find({ vente: venteId }).select('lignesRetour').lean();
  const m = new Map();
  for (const r of retours) for (const l of r.lignesRetour) m.set(String(l.produit), (m.get(String(l.produit)) || 0) + l.quantite);
  return m;
};
const vendu = (vente) => {
  const m = new Map();
  for (const l of vente.lignes) m.set(String(l.produit), (m.get(String(l.produit)) || 0) + l.quantite);
  return m;
};
// Part du prix réellement payée après remise globale de la vente d'origine
const ratioRemise = (vente) => (vente.totalHT > 0 ? Math.max(0, Math.min(1, vente.totalNet / vente.totalHT)) : 1);
const arrondiQte = (n) => Math.round(n * 1000) / 1000;

async function creerRetourAvecNumero(donnees) {
  for (let essai = 1; ; essai++) {
    const d = new Date();
    const prefix = `RET-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const dernier = await Retour.findOne({ numero: new RegExp(`^${prefix}`) }).sort({ numero: -1 }).select('numero').lean();
    const seq = dernier ? parseInt(dernier.numero.slice(-4), 10) + 1 : 1;
    try { return await Retour.create({ ...donnees, numero: `${prefix}-${String(seq).padStart(4, '0')}` }); }
    catch (e) {
      const collision = e?.code === 11000 && /numero/.test(JSON.stringify(e.keyPattern || e.message || ''));
      if (!collision || essai >= 5) throw e;
    }
  }
}

// GET /api/retours/vente/:id : ce qui peut encore être rendu
exports.getPourVente = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Vente introuvable' });
    const vente = await Vente.findById(req.params.id).lean();
    if (!vente) return res.status(404).json({ success: false, message: 'Vente introuvable' });
    const [rendus, retours, dette] = await Promise.all([
      dejaRetourne(vente._id),
      Retour.find({ vente: vente._id }).sort({ createdAt: -1 }).lean(),
      Dette.findOne({ vente: vente._id }).select('montantRestant statut').lean(),
    ]);
    const lignes = [];
    const vus = new Set();
    for (const l of vente.lignes) {
      const k = String(l.produit);
      if (vus.has(k)) continue; vus.add(k);
      const qteVendue = vendu(vente).get(k);
      lignes.push({ produit: k, nomProduit: l.nomProduit, unite: l.unite, prixUnitaire: l.prixUnitaire, vendu: qteVendue,
        dejaRendu: rendus.get(k) || 0, rendable: arrondiQte(qteVendue - (rendus.get(k) || 0)) });
    }
    res.json({ success: true, data: {
      vente: { _id: vente._id, numero: vente.numero, statut: vente.statut, client: vente.client, totalNet: vente.totalNet, createdAt: vente.createdAt },
      ratio: ratioRemise(vente), lignes, retours,
      dette: dette && dette.statut === 'EN_COURS' ? { montantRestant: dette.montantRestant } : null,
    } });
  } catch (err) {
    console.error('❌ Retours :', err.message);
    res.status(500).json({ success: false, message: 'Retours indisponibles' });
  }
};

// GET /api/retours?limit= : derniers retours
exports.getRetours = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const data = await Retour.find({}).sort({ createdAt: -1 }).limit(limit).populate('utilisateur', 'nom').lean();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: 'Retours indisponibles' }); }
};

// POST /api/retours { venteId, retour:[{produitId, quantite, remisEnStock}], echange:[{produitId, quantite, prixUnitaire?}], reglement, motif }
exports.creerRetour = async (req, res) => {
  const reserves = []; // stock sorti pour l'échange : { produit, quantite }
  let retour = null;
  try {
    const { venteId, retour: lr, echange: le = [], reglement = 'especes', motif } = req.body || {};
    if (!mongoose.isValidObjectId(venteId)) throw new Error('Vente introuvable');
    if (!Array.isArray(lr) || lr.length === 0) throw new Error('Choisissez au moins un article à reprendre');
    if (!Array.isArray(le) || lr.length > 100 || le.length > 100) throw new Error('Trop de lignes');
    if (!REGLEMENTS.includes(reglement)) throw new Error('Mode de règlement invalide');

    const vente = await Vente.findById(venteId).lean();
    if (!vente) throw new Error('Vente introuvable');
    if (vente.statut !== 'validee') throw new Error('Cette vente est annulée : aucun retour possible');

    // 1. Quantités reprises : jamais plus que ce qui a été vendu et pas déjà rendu
    const rendus = await dejaRetourne(vente._id);
    const venduPar = vendu(vente);
    const ratio = ratioRemise(vente);
    const demandes = new Map();
    const lignesRetour = [];
    for (const l of lr) {
      const id = String(l?.produitId || ''); const q = arrondiQte(nombre(l?.quantite));
      if (!Number.isFinite(q) || q <= 0) throw new Error('Quantité à reprendre invalide');
      const src = vente.lignes.find((x) => String(x.produit) === id);
      if (!src) throw new Error('Un article repris ne figure pas sur cette vente');
      demandes.set(id, arrondiQte((demandes.get(id) || 0) + q));
      lignesRetour.push({ produit: src.produit, nomProduit: src.nomProduit, unite: src.unite, quantite: q, prixUnitaire: src.prixUnitaire,
        sousTotal: arrondi(src.prixUnitaire * q), remisEnStock: l?.remisEnStock !== false });
    }
    for (const [id, q] of demandes) {
      const reste = arrondiQte(venduPar.get(id) - (rendus.get(id) || 0));
      if (q > reste + 1e-9) throw new Error(`Quantité trop grande : il ne reste que ${reste} à rendre pour cet article`);
    }
    const totalRetourne = arrondi(lignesRetour.reduce((s, l) => s + l.sousTotal, 0) * ratio);

    // 2. Articles donnés en échange (prix du catalogue, modifiable : la boutique négocie)
    const lignesEchange = [];
    for (const l of le) {
      const id = String(l?.produitId || ''); const q = arrondiQte(nombre(l?.quantite));
      if (!mongoose.isValidObjectId(id)) throw new Error('Produit introuvable');
      if (!Number.isFinite(q) || q <= 0) throw new Error("Quantité d'échange invalide");
      const p = await Produit.findById(id).select('nom unite prixVente prixAchat prixMin actif').lean();
      if (!p || p.actif === false) throw new Error('Produit introuvable ou désactivé');
      const prix = l?.prixUnitaire === undefined || l?.prixUnitaire === '' ? p.prixVente : nombre(l.prixUnitaire);
      if (!Number.isFinite(prix) || prix < 0) throw new Error("Prix d'échange invalide");
      if ((p.prixMin || 0) > 0 && prix < p.prixMin && req.user.role !== 'admin')
        throw new Error(`Prix trop bas pour « ${p.nom} » : le minimum est ${p.prixMin} GNF. Demandez à l'administrateur.`);
      lignesEchange.push({ produit: p._id, nomProduit: p.nom, unite: p.unite, quantite: q, prixUnitaire: prix, sousTotal: arrondi(prix * q), remisEnStock: true, _achat: p.prixAchat || 0 });
    }
    const totalEchange = lignesEchange.reduce((s, l) => s + l.sousTotal, 0);
    const difference = totalEchange - totalRetourne;

    // 3. Règlement de la différence
    let montantDette = 0, especesNet = 0;
    if (difference < 0) {
      const du = -difference;
      if (reglement === 'dette') {
        const dette = await Dette.findOne({ vente: vente._id, statut: 'EN_COURS' }).select('montantRestant').lean();
        if (!dette) throw new Error("Cette vente n'a pas de dette en cours à réduire");
        montantDette = Math.min(du, dette.montantRestant);
        especesNet = -(du - montantDette);
      } else if (reglement === 'especes') especesNet = -du;
    } else if (difference > 0 && reglement === 'especes') especesNet = difference;
    if (difference >= 0 && reglement === 'dette') throw new Error('Rien à rembourser : choisissez espèces ou Mobile Money');

    // 4. Stock sortant : réservation atomique (comme une vente)
    for (const l of lignesEchange) {
      const avant = await Produit.findOneAndUpdate({ _id: l.produit, quantiteStock: { $gte: l.quantite } }, { $inc: { quantiteStock: -l.quantite } }, { new: false }).select('quantiteStock');
      if (!avant) throw new Error(`Stock insuffisant pour l'échange : ${l.nomProduit}`);
      reserves.push({ produit: l.produit, quantite: l.quantite, avant: avant.quantiteStock });
    }

    // 5. Enregistrement, puis recontrôle (deux retours simultanés ne peuvent pas dépasser le vendu)
    const achatRetour = new Map((await Produit.find({ _id: { $in: lignesRetour.map((l) => l.produit) } }).select('prixAchat').lean()).map((p) => [String(p._id), p.prixAchat || 0]));
    const margeRetournee = arrondi(lignesRetour.reduce((s, l) => s + (l.prixUnitaire * ratio - (achatRetour.get(String(l.produit)) || 0)) * l.quantite, 0));
    const margeEchange = arrondi(lignesEchange.reduce((s, l) => s + (l.prixUnitaire - l._achat) * l.quantite, 0));
    retour = await creerRetourAvecNumero({
      vente: vente._id, venteNumero: vente.numero, client: vente.client,
      type: lignesEchange.length ? 'echange' : 'retour',
      lignesRetour, lignesEchange: lignesEchange.map(({ _achat, ...x }) => x),
      totalRetourne, totalEchange, difference, reglement, montantDette, especesNet, margeRetournee, margeEchange,
      motif: String(motif || '').slice(0, 200), utilisateur: req.user._id,
    });
    const apres = await dejaRetourne(vente._id);
    for (const [id, q] of apres) {
      if (q > (venduPar.get(id) || 0) + 1e-9) throw new Error('Un autre retour vient d\'être enregistré pour cette vente : actualisez et recommencez');
    }

    // 6. Articles repris remis en rayon + mouvements de stock
    for (const l of lignesRetour) {
      if (!l.remisEnStock) continue;
      try {
        const avant = await Produit.findOneAndUpdate({ _id: l.produit }, { $inc: { quantiteStock: l.quantite } }, { new: false }).select('quantiteStock');
        if (avant) await Mouvement.create({ produit: l.produit, type: 'retour', quantite: l.quantite, quantiteAvant: avant.quantiteStock, quantiteApres: avant.quantiteStock + l.quantite,
          motif: `Retour ${retour.numero} (vente ${vente.numero})`, reference: retour.numero, utilisateur: req.user._id });
      } catch (e) { console.error(`⚠️ Remise en stock incomplète (${retour.numero}) :`, e.message); }
    }
    for (const r of reserves) {
      try {
        await Mouvement.create({ produit: r.produit, type: 'sortie', quantite: r.quantite, quantiteAvant: r.avant, quantiteApres: r.avant - r.quantite,
          motif: `Échange ${retour.numero} (vente ${vente.numero})`, reference: retour.numero, utilisateur: req.user._id });
      } catch (e) { console.error(`⚠️ Mouvement d'échange non enregistré (${retour.numero}) :`, e.message); }
    }

    // 7. Déduction de la dette (jamais comptée comme argent encaissé)
    if (montantDette > 0) {
      try {
        const dette = await Dette.findOne({ vente: vente._id, statut: 'EN_COURS' });
        if (dette) { dette.paiements.push({ montant: Math.min(montantDette, dette.montantRestant), note: `Avoir ${retour.numero}`, avoir: true }); await dette.save(); }
      } catch (e) { console.error(`⚠️ Dette non réduite (${retour.numero}) :`, e.message); }
    }

    const message = difference > 0 ? `Échange enregistré : le client paie ${difference} GNF`
      : difference < 0 ? `${lignesEchange.length ? 'Échange' : 'Retour'} enregistré : à rembourser ${-difference} GNF${montantDette ? ` (dont ${montantDette} déduits de sa dette)` : ''}`
      : 'Échange enregistré : aucune différence à régler';
    res.status(201).json({ success: true, data: retour, message });
  } catch (err) {
    // Annulation propre : le stock sorti pour l'échange est remis, et le retour enregistré est effacé
    for (const r of reserves) { try { await Produit.updateOne({ _id: r.produit }, { $inc: { quantiteStock: r.quantite } }); } catch (e) { console.error('⚠️ Restitution impossible', e.message); } }
    if (retour) { try { await Retour.deleteOne({ _id: retour._id }); } catch (e) { console.error('⚠️ Retour non effacé', e.message); } }
    res.status(400).json({ success: false, message: err.message });
  }
};
