const Entreprise  = require('../models/Entreprise');
const Utilisateur = require('../models/Utilisateur');
const Produit     = require('../models/Produit');
const Vente       = require('../models/Vente');

// GET /api/superadmin/stats - stats globales plateforme
exports.stats = async (req, res) => {
  try {
    const [totalEntreprises, entreprisesActives, totalUsers, totalProduits,
           ventesAgg, parPlan] = await Promise.all([
      Entreprise.countDocuments(),
      Entreprise.countDocuments({ actif: true, 'abonnement.statut': 'actif' }),
      Utilisateur.countDocuments({ role: { $ne: 'superadmin' } }),
      Produit.countDocuments({ actif: true }),
      Vente.aggregate([
        { $match: { statut: 'validee' } },
        { $group: { _id: null, total: { $sum: '$totalNet' }, count: { $sum: 1 } } },
      ]),
      Entreprise.aggregate([
        { $group: { _id: '$abonnement.plan', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalEntreprises,
        entreprisesActives,
        totalUsers,
        totalProduits,
        totalVentes:  ventesAgg[0]?.count || 0,
        caTotal:      ventesAgg[0]?.total || 0,
        parPlan:      parPlan.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/superadmin/entreprises
exports.listerEntreprises = async (req, res) => {
  try {
    const { search, plan, statut, page = 1, limit = 20 } = req.query;
    const filtre = {};
    if (search) filtre.nom = { $regex: search, $options: 'i' };
    if (plan)   filtre['abonnement.plan']   = plan;
    if (statut) filtre['abonnement.statut'] = statut;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Entreprise.countDocuments(filtre);
    const data  = await Entreprise.find(filtre)
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

    // Enrichir avec le nombre d'users et de produits
    const enriched = await Promise.all(data.map(async (e) => {
      const [users, produits] = await Promise.all([
        Utilisateur.countDocuments({ entreprise: e._id }),
        Produit.countDocuments({ entreprise: e._id, actif: true }),
      ]);
      return { ...e.toJSON(), stats: { users, produits } };
    }));

    res.json({ success: true, total, page: Number(page), data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/superadmin/entreprises/:id/plan
exports.changerPlan = async (req, res) => {
  try {
    const { plan, statut } = req.body;
    const update = {};
    if (plan)   update['abonnement.plan']   = plan;
    if (statut) update['abonnement.statut'] = statut;

    const entreprise = await Entreprise.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!entreprise)
      return res.status(404).json({ success: false, message: 'Entreprise introuvable' });

    res.json({ success: true, data: entreprise });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/superadmin/entreprises/:id/toggle
exports.toggleEntreprise = async (req, res) => {
  try {
    const entreprise = await Entreprise.findById(req.params.id);
    if (!entreprise)
      return res.status(404).json({ success: false, message: 'Entreprise introuvable' });

    entreprise.actif = !entreprise.actif;
    await entreprise.save();
    res.json({ success: true, data: entreprise, message: `Entreprise ${entreprise.actif ? 'activée' : 'désactivée'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
