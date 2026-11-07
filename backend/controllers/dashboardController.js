const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');

exports.getStats = async (req, res) => {
  try {
    const maintenant  = new Date();
    const debutMois   = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debut30j    = new Date(maintenant - 30*24*60*60*1000);

    const [totalProduits, produitsRupture, produitsFaibles, valeurStockAgg, mouvementsMois, graphe30Jours, topProduits, derniersMouvements, alertesRupture, alertesFaibles] = await Promise.all([
      Produit.countDocuments({ actif:true }),
      Produit.countDocuments({ actif:true, quantiteStock:0 }),
      Produit.countDocuments({ actif:true, quantiteStock:{ $gt:0 }, $expr:{ $lte:['$quantiteStock','$seuilAlerte'] } }),
      Produit.aggregate([{ $match:{ actif:true } }, { $group:{ _id:null, total:{ $sum:{ $multiply:['$quantiteStock','$prixAchat'] } } } }]),
      Mouvement.aggregate([
        { $match:{ createdAt:{ $gte:debutMois } } },
        { $group:{ _id:'$type', total:{ $sum:'$quantite' }, count:{ $sum:1 } } },
      ]),
      Mouvement.aggregate([
        { $match:{ createdAt:{ $gte:debut30j }, type:{ $in:['entree','sortie'] } } },
        { $group:{ _id:{ date:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, type:'$type' }, quantite:{ $sum:'$quantite' } } },
        { $sort:{ '_id.date':1 } },
      ]),
      Mouvement.aggregate([
        { $match:{ createdAt:{ $gte:debut30j } } },
        { $group:{ _id:'$produit', count:{ $sum:1 } } },
        { $sort:{ count:-1 } },
        { $limit:5 },
        { $lookup:{ from:'produits', localField:'_id', foreignField:'_id', as:'produit' } },
        { $unwind:'$produit' },
        { $project:{ nom:'$produit.nom', unite:'$produit.unite', count:1 } },
      ]),
      Mouvement.find().sort({ createdAt:-1 }).limit(8).populate('produit','nom unite').populate('utilisateur','nom'),
      Produit.find({ actif:true, quantiteStock:0 }).populate('categorie','nom couleur').select('nom reference quantiteStock seuilAlerte unite categorie').limit(10),
      Produit.find({ actif:true, quantiteStock:{ $gt:0 }, $expr:{ $lte:['$quantiteStock','$seuilAlerte'] } }).populate('categorie','nom couleur').select('nom reference quantiteStock seuilAlerte unite categorie').limit(10),
    ]);

    const mvtMap = {};
    mouvementsMois.forEach(m => (mvtMap[m._id] = m));

    res.json({
      success: true,
      data: {
        kpis: {
          totalProduits,
          produitsRupture,
          produitsFaibles,
          valeurStock:      valeurStockAgg[0]?.total || 0,
          entreesMois:      mvtMap.entree?.count || 0,
          sortiesMois:      mvtMap.sortie?.count || 0,
        },
        graphe30Jours,
        topProduits,
        derniersMouvements,
        alertes: [...alertesRupture, ...alertesFaibles],
      },
    });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

// ─── Activité commerciale (administrateur) ───────────────────────────────────
// Chiffre d'affaires, bénéfice estimé et comparaison avec la période précédente.
// Jours comptés en UTC (= heure de Conakry). Le bénéfice utilise le prix d'achat actuel des produits.
const Vente   = require('../models/Vente');
const Retour  = require('../models/Retour');
const Depense = require('../models/Depense');
const Boutique = require('../models/Boutique');

const JOUR = 24 * 3600 * 1000;
const PERIODES = ['jour', 'semaine', '30j', 'mois'];
const debutJour = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };
const cleJour = (d) => new Date(d).toISOString().slice(0, 10);

function plages(periode, now = new Date()) {
  const auj = debutJour(now); const demain = new Date(+auj + JOUR);
  if (periode === 'jour')    return { cur: [auj, demain], prev: [new Date(+auj - JOUR), auj] };
  if (periode === 'semaine') return { cur: [new Date(+auj - 6 * JOUR), demain], prev: [new Date(+auj - 13 * JOUR), new Date(+auj - 6 * JOUR)] };
  if (periode === '30j')     return { cur: [new Date(+auj - 29 * JOUR), demain], prev: [new Date(+auj - 59 * JOUR), new Date(+auj - 29 * JOUR)] };
  const debut = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 1));
  const ecoules = Math.round((+auj - +debut) / JOUR) + 1;
  const pDebut = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth() - 1, 1));
  return { cur: [debut, demain], prev: [pDebut, new Date(Math.min(+pDebut + ecoules * JOUR, +debut))] };
}

const COUT_LIGNE = { $multiply: ['$lignes.quantite', { $ifNull: [{ $arrayElemAt: ['$p.prixAchat', 0] }, 0] }] };
const PRODUITS = [{ $unwind: '$lignes' }, { $lookup: { from: 'produits', localField: 'lignes.produit', foreignField: '_id', as: 'p' } }];

async function resumer(debut, fin) {
  const dans = { $gte: debut, $lt: fin };
  const [v, c, r, d] = await Promise.all([
    Vente.aggregate([{ $match: { statut: 'validee', createdAt: dans } }, { $group: { _id: null, ca: { $sum: '$totalNet' }, nb: { $sum: 1 }, remises: { $sum: '$remise' } } }]),
    Vente.aggregate([{ $match: { statut: 'validee', createdAt: dans } }, ...PRODUITS, { $group: { _id: null, cout: { $sum: COUT_LIGNE } } }]),
    Retour.aggregate([{ $match: { createdAt: dans } }, { $group: { _id: null, nb: { $sum: 1 }, valeur: { $sum: '$totalRetourne' }, echange: { $sum: '$totalEchange' }, marge: { $sum: { $subtract: ['$margeEchange', '$margeRetournee'] } } } }]),
    Depense.aggregate([{ $match: { date: dans } }, { $group: { _id: null, total: { $sum: '$montant' } } }]),
  ]);
  const ca = v[0]?.ca || 0, nb = v[0]?.nb || 0, cout = c[0]?.cout || 0;
  const ret = r[0] || { nb: 0, valeur: 0, echange: 0, marge: 0 };
  const depenses = d[0]?.total || 0;
  const margeBrute = ca - cout + (ret.marge || 0);
  return {
    ca: ca - ret.valeur + ret.echange, // ventes − articles repris + articles donnés en échange
    caVentes: ca, nbVentes: nb, panierMoyen: nb ? Math.round(ca / nb) : 0,
    retours: { nb: ret.nb, valeur: ret.valeur },
    margeBrute, depenses, benefice: margeBrute - depenses,
  };
}

exports._interne = { plages, resumer };

// GET /api/dashboard/activite?periode=jour|semaine|30j|mois
exports.getActivite = async (req, res) => {
  try {
    const periode = PERIODES.includes(req.query.periode) ? req.query.periode : 'semaine';
    const now = new Date(); const auj = debutJour(now);
    const { cur, prev } = plages(periode, now);
    const serieDebut = periode === 'jour' ? new Date(+auj - 6 * JOUR) : cur[0];
    const serieDans = { $gte: serieDebut, $lt: cur[1] };
    const parJour = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    const debutMois = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 1));

    const [actuel, precedent, mois, vJ, cJ, rJ, dJ, topProduits, topClients, modes, boutique] = await Promise.all([
      resumer(cur[0], cur[1]),
      resumer(prev[0], prev[1]),
      periode === 'mois' ? null : resumer(debutMois, cur[1]),
      Vente.aggregate([{ $match: { statut: 'validee', createdAt: serieDans } }, { $group: { _id: parJour, ca: { $sum: '$totalNet' }, nb: { $sum: 1 } } }]),
      Vente.aggregate([{ $match: { statut: 'validee', createdAt: serieDans } }, ...PRODUITS, { $group: { _id: parJour, cout: { $sum: COUT_LIGNE } } }]),
      Retour.aggregate([{ $match: { createdAt: serieDans } }, { $group: { _id: parJour, valeur: { $sum: '$totalRetourne' }, echange: { $sum: '$totalEchange' }, marge: { $sum: { $subtract: ['$margeEchange', '$margeRetournee'] } } } }]),
      Depense.aggregate([{ $match: { date: serieDans } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$montant' } } }]),
      Vente.aggregate([{ $match: { statut: 'validee', createdAt: { $gte: cur[0], $lt: cur[1] } } }, ...PRODUITS, { $group: { _id: '$lignes.nomProduit', quantite: { $sum: '$lignes.quantite' }, ca: { $sum: '$lignes.sousTotal' }, cout: { $sum: COUT_LIGNE } } }, { $sort: { ca: -1 } }, { $limit: 5 }]),
      Vente.aggregate([{ $match: { statut: 'validee', createdAt: { $gte: cur[0], $lt: cur[1] }, 'client.nom': { $type: 'string', $nin: ['', 'Client comptoir'] } } }, { $group: { _id: { $toLower: { $trim: { input: '$client.nom' } } }, nom: { $first: '$client.nom' }, ca: { $sum: '$totalNet' }, nb: { $sum: 1 } } }, { $sort: { ca: -1 } }, { $limit: 5 }]),
      Vente.aggregate([{ $match: { statut: 'validee', createdAt: { $gte: cur[0], $lt: cur[1] } } }, { $group: { _id: '$modePaiement', nb: { $sum: 1 }, ca: { $sum: '$totalNet' } } }, { $sort: { ca: -1 } }]),
      Boutique.findOne().select('objectifMensuel').lean(),
    ]);

    // Série jour par jour, sans trous
    const mV = new Map(vJ.map((x) => [x._id, x])), mC = new Map(cJ.map((x) => [x._id, x.cout])), mR = new Map(rJ.map((x) => [x._id, x])), mD = new Map(dJ.map((x) => [x._id, x.total]));
    const serie = [];
    for (let t = +serieDebut; t < +cur[1]; t += JOUR) {
      const k = cleJour(t); const v = mV.get(k); const r = mR.get(k);
      const ca = v?.ca || 0, ret = r || { valeur: 0, echange: 0, marge: 0 };
      serie.push({ date: k, ca: ca - ret.valeur + ret.echange, nb: v?.nb || 0, benefice: ca - (mC.get(k) || 0) + (ret.marge || 0) - (mD.get(k) || 0) });
    }
    const meilleur = serie.reduce((m, j) => (j.ca > (m?.ca || 0) ? j : m), null);

    // Objectif du mois
    const resMois = mois || actuel;
    const joursDuMois = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth() + 1, 0)).getUTCDate();
    const ecoules = auj.getUTCDate();
    const montant = boutique?.objectifMensuel || 0;
    const objectif = {
      montant, caMois: resMois.ca, joursDuMois, joursEcoules: ecoules, joursRestants: joursDuMois - ecoules,
      projection: Math.round((resMois.ca / ecoules) * joursDuMois),
      resteParJour: montant > resMois.ca ? Math.ceil((montant - resMois.ca) / Math.max(1, joursDuMois - ecoules)) : 0,
    };

    res.json({ success: true, data: {
      periode, debut: cur[0], fin: cur[1], actuel, precedent, serie, meilleurJour: meilleur && meilleur.ca > 0 ? meilleur : null, objectif,
      topProduits: topProduits.map((p) => ({ nom: p._id, quantite: p.quantite, ca: p.ca, marge: p.ca - p.cout })),
      topClients: topClients.map((c) => ({ nom: c.nom, ca: c.ca, nb: c.nb })),
      modes,
    } });
  } catch (err) {
    console.error('❌ Activité :', err.message);
    res.status(500).json({ success: false, message: 'Activité indisponible pour le moment' });
  }
};

// PUT /api/dashboard/objectif { montant }
exports.setObjectif = async (req, res) => {
  try {
    const montant = Number(req.body?.montant);
    if (!Number.isFinite(montant) || montant < 0 || montant > 1e13) return res.status(400).json({ success: false, message: 'Objectif invalide' });
    const doc = await Boutique.findOneAndUpdate({}, { $set: { objectifMensuel: Math.round(montant) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select('objectifMensuel').lean();
    res.json({ success: true, data: { objectifMensuel: doc.objectifMensuel }, message: 'Objectif enregistré' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};
