const router = require('express').Router();
const { Categorie } = require('../models');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const cats = await Categorie.find({ actif:true }).populate('nombreProduits');
    res.json({ success:true, data:cats });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/', autoriser('admin','gestionnaire'), async (req, res) => {
  try {
    const cat = await Categorie.create(req.body);
    res.status(201).json({ success:true, data:cat });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
});

router.put('/:id', autoriser('admin','gestionnaire'), async (req, res) => {
  try {
    const cat = await Categorie.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true });
    if (!cat) return res.status(404).json({ success:false, message:'Catégorie introuvable' });
    res.json({ success:true, data:cat });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
});

router.delete('/:id', autoriser('admin'), async (req, res) => {
  try {
    await Categorie.findByIdAndUpdate(req.params.id, { actif:false });
    res.json({ success:true, message:'Catégorie désactivée' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
