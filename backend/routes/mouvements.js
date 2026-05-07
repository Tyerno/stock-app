const router    = require('express').Router();
const Mouvement = require('../models/Mouvement');
const { proteger } = require('../middleware/auth');

router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const { page=1, limit=30, produit, type, dateDebut, dateFin } = req.query;
    const filtre = {};
    if (produit)  filtre.produit = produit;
    if (type)     filtre.type   = type;
    if (dateDebut || dateFin) {
      filtre.createdAt = {};
      if (dateDebut) filtre.createdAt.$gte = new Date(dateDebut);
      if (dateFin)   filtre.createdAt.$lte = new Date(dateFin + 'T23:59:59');
    }
    const skip = (Number(page)-1)*Number(limit);
    const [mouvements, total] = await Promise.all([
      Mouvement.find(filtre).populate('produit','nom unite reference').populate('utilisateur','nom').sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      Mouvement.countDocuments(filtre),
    ]);
    res.json({ success:true, data:mouvements, pagination:{ total, page:Number(page), pages:Math.ceil(total/Number(limit)) } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
