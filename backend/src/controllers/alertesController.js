const Produit = require('../models/Produit');

exports.lister = async (req, res) => {
  try {
    const produits = await Produit.find({ entreprise: req.entrepriseId, actif: true })
      .populate('categorie', 'nom couleur');

    const ruptures = produits.filter(p => p.quantiteStock === 0);
    const faibles  = produits.filter(p => p.quantiteStock > 0 && p.quantiteStock <= p.seuilAlerte);

    res.json({ success: true, data: { ruptures, faibles, total: ruptures.length + faibles.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
