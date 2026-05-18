const cron    = require('node-cron');
const Produit = require('../models/Produit');
const Vente   = require('../models/Vente');
const email   = require('../services/emailService');

module.exports = function demarrerCrons() {

  // ─── 1. Résumé quotidien — chaque soir à 20h00 ───────────────────────────
  cron.schedule('0 20 * * *', async () => {
    console.log('🕗 Cron : envoi résumé quotidien...');
    try {
      const debutJour = new Date();
      debutJour.setHours(0, 0, 0, 0);

      const [ventesJour, alertes, valeurStockAgg] = await Promise.all([
        Vente.aggregate([
          { $match: { statut: 'validee', createdAt: { $gte: debutJour } } },
          { $group: { _id: null, nb: { $sum: 1 }, ca: { $sum: '$totalNet' } } },
        ]),
        Produit.countDocuments({
          actif: true,
          $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] },
        }),
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
    } catch (err) {
      console.error('❌ Cron résumé quotidien :', err.message);
    }
  }, { timezone: 'Africa/Conakry' });

  // ─── 2. Vérification alertes stock — toutes les 6h ───────────────────────
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔔 Cron : vérification alertes stock...');
    try {
      const produits = await Produit.find({
        actif: true,
        $expr: { $lte: ['$quantiteStock', '$seuilAlerte'] },
      }).select('nom unite quantiteStock seuilAlerte');

      if (produits.length > 0) {
        await email.envoyerAlerteStock(produits);
      } else {
        console.log('✅ Aucune alerte stock à envoyer');
      }
    } catch (err) {
      console.error('❌ Cron alertes stock :', err.message);
    }
  }, { timezone: 'Africa/Conakry' });

  console.log('⏰ Crons démarrés : résumé quotidien (20h) + alertes stock (toutes les 6h)');
};
