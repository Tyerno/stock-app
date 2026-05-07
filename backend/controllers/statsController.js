const Vente = require('../models/Vente');

exports.getStats = async (req, res) => {
  try {
    const { periode='30' } = req.query;
    const debut     = new Date(Date.now() - Number(periode)*24*60*60*1000);
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const debutAnPasse = new Date(new Date().getFullYear()-1, new Date().getMonth(), 1);

    const [kpisMois, kpisMoisPasse, ventesParJour, topProduits, topClients, parModePaiement, ventesParHeure] = await Promise.all([
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debutMois } } }, { $group:{ _id:null, ca:{ $sum:'$totalNet' }, nb:{ $sum:1 }, panier:{ $avg:'$totalNet' }, remises:{ $sum:'$remise' } } }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debutAnPasse, $lt:debutMois } } }, { $group:{ _id:null, ca:{ $sum:'$totalNet' }, nb:{ $sum:1 } } }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut } } }, { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, ca:{ $sum:'$totalNet' }, nb:{ $sum:1 } } }, { $sort:{ _id:1 } }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut } } }, { $unwind:'$lignes' }, { $group:{ _id:'$lignes.nomProduit', quantite:{ $sum:'$lignes.quantite' }, ca:{ $sum:'$lignes.sousTotal' }, nbVentes:{ $sum:1 } } }, { $sort:{ ca:-1 } }, { $limit:10 }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut }, 'client.nom':{ $ne:'' } } }, { $group:{ _id:'$client.nom', ca:{ $sum:'$totalNet' }, nbAchats:{ $sum:1 }, panier:{ $avg:'$totalNet' } } }, { $sort:{ ca:-1 } }, { $limit:10 }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut } } }, { $group:{ _id:'$modePaiement', nb:{ $sum:1 }, ca:{ $sum:'$totalNet' } } }, { $sort:{ ca:-1 } }]),
      Vente.aggregate([{ $match:{ statut:'validee', createdAt:{ $gte:debut } } }, { $group:{ _id:{ $hour:'$createdAt' }, nb:{ $sum:1 }, ca:{ $sum:'$totalNet' } } }, { $sort:{ _id:1 } }]),
    ]);

    const caMois      = kpisMois[0]?.ca || 0;
    const caMoisPasse = kpisMoisPasse[0]?.ca || 0;
    const tendanceCA  = caMoisPasse > 0 ? (((caMois - caMoisPasse) / caMoisPasse) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        kpis: { caMois, nbVentesMois:kpisMois[0]?.nb||0, panierMoyen:Math.round(kpisMois[0]?.panier||0), remisesTotales:kpisMois[0]?.remises||0, tendanceCA:Number(tendanceCA) },
        ventesParJour, topProduits, topClients, parModePaiement, ventesParHeure,
      },
    });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};
