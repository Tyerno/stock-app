const Mouvement = require('../models/Mouvement');

exports.lister = async (req, res) => {
  try {
    const { type, produit, page = 1, limit = 40 } = req.query;
    const filtre = { entreprise: req.entrepriseId };
    if (type)    filtre.type    = type;
    if (produit) filtre.produit = produit;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Mouvement.countDocuments(filtre);
    const data  = await Mouvement.find(filtre)
      .populate('produit', 'nom reference unite')
      .populate('creePar', 'nom')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
