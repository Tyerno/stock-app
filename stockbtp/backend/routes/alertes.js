const router  = require('express').Router();
const Produit = require('../models/Produit');
const { proteger } = require('../middleware/auth');

router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const [ruptures, faibles] = await Promise.all([
      Produit.find({ actif:true, quantiteStock:0 }).populate('categorie','nom couleur').select('nom reference quantiteStock seuilAlerte unite categorie'),
      Produit.find({ actif:true, quantiteStock:{ $gt:0 }, $expr:{ $lte:['$quantiteStock','$seuilAlerte'] } }).populate('categorie','nom couleur').select('nom reference quantiteStock seuilAlerte unite categorie'),
    ]);
    res.json({ success:true, data:{ ruptures, faibles, total:ruptures.length+faibles.length } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
