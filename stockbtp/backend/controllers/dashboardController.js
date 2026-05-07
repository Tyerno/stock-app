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
