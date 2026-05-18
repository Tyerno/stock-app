// ─── dashboardController.js ───────────────────────────────────────────────────
const Produit   = require('../models/Produit');
const Vente     = require('../models/Vente');
const Mouvement = require('../models/Mouvement');

exports.obtenir = async (req, res) => {
  try {
    const eid       = req.entrepriseId;
    // FIX: créer des dates indépendantes pour éviter la mutation de `now`
    const now       = new Date();
    const debutAuj  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const debut30j  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalProduits, ruptures, faibles,
           ventesAuj, ventesMois, valStock, graphe, topProduits] = await Promise.all([
      Produit.countDocuments({ entreprise: eid, actif: true }),
      Produit.countDocuments({ entreprise: eid, actif: true, quantiteStock: 0 }),
      Produit.countDocuments({ entreprise: eid, actif: true, quantiteStock: { $gt: 0 }, $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] } }),
      Vente.aggregate([
        { $match: { entreprise: eid, statut: 'validee', createdAt: { $gte: debutAuj } } },
        { $group: { _id: null, total: { $sum: '$totalNet' }, count: { $sum: 1 } } },
      ]),
      Vente.aggregate([
        { $match: { entreprise: eid, statut: 'validee', createdAt: { $gte: debutMois } } },
        { $group: { _id: null, total: { $sum: '$totalNet' }, count: { $sum: 1 } } },
      ]),
      Produit.aggregate([
        { $match: { entreprise: eid, actif: true } },
        { $group: { _id: null, valeur: { $sum: { $multiply: ['$quantiteStock', '$prixAchat'] } } } },
      ]),
      Vente.aggregate([
        { $match: { entreprise: eid, statut: 'validee', createdAt: { $gte: debut30j } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, montant: { $sum: '$totalNet' }, nombre: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Mouvement.aggregate([
        { $match: { entreprise: eid, type: 'sortie', createdAt: { $gte: debut30j } } },
        { $group: { _id: '$produit', totalVendu: { $sum: '$quantite' } } },
        { $sort: { totalVendu: -1 } }, { $limit: 5 },
        { $lookup: { from: 'produits', localField: '_id', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $project: { nom: '$p.nom', unite: '$p.unite', totalVendu: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          totalProduits,
          alertes: ruptures + faibles,
          ruptures,
          faibles,
          caAujourdhui:    ventesAuj[0]?.total || 0,
          ventesAujourdhui:ventesAuj[0]?.count || 0,
          caMois:          ventesMois[0]?.total || 0,
          ventesMois:      ventesMois[0]?.count || 0,
          valeurStock:     valStock[0]?.valeur || 0,
        },
        graphe30Jours: graphe,
        topProduits,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { obtenir: exports.obtenir };
