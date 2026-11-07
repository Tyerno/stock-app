const Vente    = require('../models/Vente');
const Dette    = require('../models/Dette');
const Depense  = require('../models/Depense');
const Cloture  = require('../models/Cloture');
const Retour   = require('../models/Retour');
const Produit  = require('../models/Produit');
const { tracer, GNF } = require('../utils/journal');

const JOUR = 24 * 3600 * 1000;
const cle = (ms) => new Date(ms).toISOString().slice(0, 10);
const jourValide = (j) => /^\d{4}-\d{2}-\d{2}$/.test(j) && !isNaN(new Date(j + 'T00:00:00Z'));
const bornes = (jour) => {
  const debut = new Date(jour + 'T00:00:00.000Z');
  return { debut, fin: new Date(debut.getTime() + JOUR) };
};

// Chiffres de la caisse pour un jour (UTC, comme le reste de l'application).
async function calculerJour(jour) {
  const { debut, fin } = bornes(jour);
  const dansJour = { $gte: debut, $lt: fin };

  const [ventes, paiements, depenses, retours] = await Promise.all([
    Vente.find({ statut: 'validee', createdAt: dansJour }).select('modePaiement totalNet remise lignes').lean(),
    Dette.aggregate([
      { $unwind: '$paiements' },
      { $match: { 'paiements.date': dansJour, 'paiements.avoir': { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$paiements.montant' }, nb: { $sum: 1 } } },
    ]),
    Depense.find({ date: dansJour }).sort({ date: -1 }).populate('utilisateur', 'nom').lean(),
    Retour.find({ createdAt: dansJour }).select('totalRetourne totalEchange difference especesNet montantDette margeRetournee margeEchange').lean(),
  ]);

  // Part de chaque vente laissée en dette (non encaissée)
  const dettesVente = ventes.length
    ? await Dette.find({ vente: { $in: ventes.map((v) => v._id) } }).select('vente montantInitial').lean()
    : [];
  const enDette = new Map();
  for (const d of dettesVente) enDette.set(String(d.vente), (enDette.get(String(d.vente)) || 0) + d.montantInitial);

  const modes = { especes: 0, mobile_money: 0, mixte: 0 };
  let ca = 0, creditJour = 0, remises = 0;
  for (const v of ventes) {
    const credit = Math.min(v.totalNet, enDette.get(String(v._id)) || 0);
    const encaisse = v.totalNet - credit;
    modes[v.modePaiement] = (modes[v.modePaiement] || 0) + encaisse;
    ca += v.totalNet; creditJour += credit; remises += v.remise || 0;
  }

  // Bénéfice brut estimé : (prix vendu − prix d'achat actuel) × quantité
  const ids = [...new Set(ventes.flatMap((v) => v.lignes.map((l) => String(l.produit))))];
  const produits = ids.length ? await Produit.find({ _id: { $in: ids } }).select('prixAchat').lean() : [];
  const achat = new Map(produits.map((p) => [String(p._id), p.prixAchat || 0]));
  let beneficeBrut = 0;
  for (const v of ventes) for (const l of v.lignes) beneficeBrut += (l.prixUnitaire - (achat.get(String(l.produit)) || 0)) * l.quantite;
  beneficeBrut -= remises;
  // Retours et échanges du jour : bénéfice perdu sur les articles repris, gagné sur ceux donnés en échange
  for (const r of retours) beneficeBrut += (r.margeEchange || 0) - (r.margeRetournee || 0);
  const resumeRetours = {
    nb: retours.length,
    valeur: retours.reduce((s, r) => s + r.totalRetourne, 0),
    rembourse: retours.reduce((s, r) => s + Math.max(0, -r.difference), 0),
    supplement: retours.reduce((s, r) => s + Math.max(0, r.difference), 0),
    especesNet: retours.reduce((s, r) => s + (r.especesNet || 0), 0),
  };

  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const depensesCaisse = depenses.filter((d) => d.payeCaisse).reduce((s, d) => s + d.montant, 0);
  const encaissementsDettes = paiements[0]?.total || 0;

  // Espèces entrées en caisse : ventes espèces + ventes mixtes + remboursements de dettes (supposés en espèces)
  // + espèces nettes des retours/échanges (remboursement en espèces = sortie, supplément payé = entrée)
  const entreesEspeces = modes.especes + modes.mixte + encaissementsDettes + resumeRetours.especesNet;

  return {
    jour,
    ventes: { nb: ventes.length, ca, credit: creditJour, remises, parMode: modes },
    encaissementsDettes,
    retours: resumeRetours,
    depenses: { total: totalDepenses, caisse: depensesCaisse, liste: depenses },
    entreesEspeces,
    beneficeBrut: Math.round(beneficeBrut),
    beneficeNet: Math.round(beneficeBrut - totalDepenses),
  };
}

// GET /api/caisse/jour?date=AAAA-MM-JJ
exports.getJour = async (req, res) => {
  try {
    const aujourdhui = cle(Date.now());
    let jour = String(req.query.date || aujourdhui);
    if (!jourValide(jour)) return res.status(400).json({ success: false, message: 'Date invalide (AAAA-MM-JJ)' });
    if (jour > aujourdhui) jour = aujourdhui;
    const [chiffres, cloture, precedente] = await Promise.all([
      calculerJour(jour),
      Cloture.findOne({ jour }).lean(),
      Cloture.findOne({ jour: { $lt: jour } }).sort({ jour: -1 }).select('jour especesComptees').lean(),
    ]);
    res.json({ success: true, data: { ...chiffres, cloture, precedente, estAujourdhui: jour === aujourdhui } });
  } catch (err) {
    console.error('❌ Caisse :', err.message);
    res.status(500).json({ success: false, message: 'Caisse indisponible pour le moment' });
  }
};

// POST /api/caisse/cloture { date, especesComptees, fondOuverture, note }
exports.cloturer = async (req, res) => {
  try {
    const { date, especesComptees, fondOuverture = 0, note } = req.body || {};
    const aujourdhui = cle(Date.now());
    const jour = String(date || aujourdhui);
    if (!jourValide(jour) || jour > aujourdhui) return res.status(400).json({ success: false, message: 'Date invalide' });
    const comptees = Number(especesComptees), fond = Number(fondOuverture) || 0;
    if (especesComptees === '' || especesComptees == null || !Number.isFinite(comptees) || comptees < 0)
      return res.status(400).json({ success: false, message: "Saisissez l'argent réellement compté en caisse." });
    if (!Number.isFinite(fond) || fond < 0) return res.status(400).json({ success: false, message: 'Fond de caisse invalide' });

    const c = await calculerJour(jour);
    const attendues = Math.round(fond + c.entreesEspeces - c.depenses.caisse);
    const ecart = Math.round(comptees - attendues);
    const { liste, ...depensesResume } = c.depenses;
    const doc = await Cloture.findOneAndUpdate(
      { jour },
      { $set: {
        jour, fondOuverture: fond, especesAttendues: attendues, especesComptees: comptees, ecart,
        note: String(note || '').slice(0, 300),
        utilisateur: { id: req.user._id, nom: req.user.nom },
        details: { ventes: c.ventes, retours: c.retours, encaissementsDettes: c.encaissementsDettes, depenses: depensesResume, beneficeNet: c.beneficeNet },
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await tracer({
      req, action: 'caisse_cloturee', entite: 'caisse', entiteId: doc._id,
      libelle: `Caisse du ${jour} clôturée : attendu ${GNF(attendues)}, compté ${GNF(comptees)}, écart ${ecart >= 0 ? '+' : '−'}${GNF(Math.abs(ecart))}`,
      details: { jour, attendues, comptees, ecart },
    });
    res.status(201).json({ success: true, data: doc, message: 'Caisse clôturée' });
  } catch (err) {
    console.error('❌ Clôture :', err.message);
    res.status(500).json({ success: false, message: 'Clôture impossible pour le moment' });
  }
};

// GET /api/caisse/clotures : dernières clôtures
exports.getClotures = async (req, res) => {
  try {
    const lim = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 14));
    const data = await Cloture.find({}).sort({ jour: -1 }).limit(lim).select('jour especesAttendues especesComptees ecart note utilisateur').lean();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: 'Historique indisponible' }); }
};

exports._calculerJour = calculerJour;
