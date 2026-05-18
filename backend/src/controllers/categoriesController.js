const Categorie = require('../models/Categorie');

exports.lister = async (req, res) => {
  try {
    const data = await Categorie.find({ entreprise: req.entrepriseId }).sort({ nom: 1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.creer = async (req, res) => {
  try {
    const cat = await Categorie.create({ ...req.body, entreprise: req.entrepriseId });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Cette catégorie existe déjà' });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.modifier = async (req, res) => {
  try {
    const cat = await Categorie.findOneAndUpdate(
      { _id: req.params.id, entreprise: req.entrepriseId },
      req.body, { new: true }
    );
    if (!cat) return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.supprimer = async (req, res) => {
  try {
    await Categorie.findOneAndDelete({ _id: req.params.id, entreprise: req.entrepriseId });
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
