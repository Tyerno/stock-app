const router  = require('express').Router();
const Produit = require('../models/Produit');
const Vente   = require('../models/Vente');
const email   = require('../services/emailService');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);
router.use(autoriser('admin'));

// ─── Tester la connexion email ────────────────────────────────────────────────
router.get('/test', async (req, res) => {
  try {
    const ok = await email.testerConnexion();
    if (ok) {
      res.json({ success: true, message: 'Email configuré et prêt ✅' });
    } else {
      res.status(500).json({ success: false, message: 'Erreur de connexion email' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Envoyer alerte stock manuellement ───────────────────────────────────────
router.post('/alerte-stock', async (req, res) => {
  try {
    const produits = await Produit.find({
      actif: true,
      $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] },
    }).select('nom unite quantiteStock seuilAlerte');

    if (produits.length === 0) {
      return res.json({ success: true, message: 'Aucun produit en alerte — email non envoyé' });
    }

    await email.envoyerAlerteStock(produits);
    res.json({ success: true, message: `Email envoyé pour ${produits.length} produit(s)` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Envoyer résumé quotidien manuellement ────────────────────────────────────
router.post('/resume', async (req, res) => {
  try {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);

    const [ventesJour, alertes, valeurStockAgg] = await Promise.all([
      Vente.aggregate([
        { $match: { statut: 'validee', createdAt: { $gte: debutJour } } },
        { $group: { _id: null, nb: { $sum: 1 }, ca: { $sum: '$totalNet' } } },
      ]),
      Produit.countDocuments({ actif: true, $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] } }),
      Produit.aggregate([
        { $match: { actif: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantiteStock', '$prixAchat'] } } } },
      ]),
    ]);

    await email.envoyerResumequotidien({
      ventes:      ventesJour[0]?.nb    || 0,
      ca:          ventesJour[0]?.ca    || 0,
      alertes,
      valeurStock: valeurStockAgg[0]?.total || 0,
    });

    res.json({ success: true, message: 'Résumé quotidien envoyé ✅' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
