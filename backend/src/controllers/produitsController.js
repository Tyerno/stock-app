const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');

// GET /api/produits
exports.lister = async (req, res) => {
  try {
    const { search, categorie, statut, page = 1, limit = 50 } = req.query;
    const filtre = { entreprise: req.entrepriseId, actif: true };

    if (search)    filtre.nom = { $regex: search, $options: 'i' };
    if (categorie) filtre.categorie = categorie;
    if (statut === 'rupture') filtre.quantiteStock = 0;
    if (statut === 'faible')  filtre.$expr = { $lte: ['$quantiteStock', '$seuilAlerte'] };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Produit.countDocuments(filtre);
    const data  = await Produit.find(filtre)
      .populate('categorie', 'nom couleur')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/produits/:id
exports.obtenir = async (req, res) => {
  try {
    const produit = await Produit.findOne({ _id: req.params.id, entreprise: req.entrepriseId })
      .populate('categorie');
    if (!produit)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    res.json({ success: true, data: produit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/produits
exports.creer = async (req, res) => {
  try {
    const body = { ...req.body };
    // FIX: supprimer categorie vide pour éviter BSONError sur cast ObjectId("")
    if (!body.categorie) delete body.categorie;
    if (!body.reference) delete body.reference;

    const produit = await Produit.create({ ...body, entreprise: req.entrepriseId });
    await produit.populate('categorie', 'nom couleur');
    res.status(201).json({ success: true, data: produit });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Référence déjà utilisée' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/produits/:id
exports.modifier = async (req, res) => {
  try {
    const body = { ...req.body };
    // FIX: supprimer categorie vide
    if (body.categorie === '' || body.categorie === null) body.categorie = null;

    const produit = await Produit.findOneAndUpdate(
      { _id: req.params.id, entreprise: req.entrepriseId },
      body,
      { new: true, runValidators: true }
    ).populate('categorie', 'nom couleur');
    if (!produit)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    res.json({ success: true, data: produit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/produits/:id
exports.supprimer = async (req, res) => {
  try {
    const produit = await Produit.findOneAndUpdate(
      { _id: req.params.id, entreprise: req.entrepriseId },
      { actif: false }, { new: true }
    );
    if (!produit)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    res.json({ success: true, message: 'Produit archivé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/produits/:id/ajuster-stock
exports.ajusterStock = async (req, res) => {
  try {
    const { quantite, type, motif } = req.body;
    const produit = await Produit.findOne({ _id: req.params.id, entreprise: req.entrepriseId });
    if (!produit)
      return res.status(404).json({ success: false, message: 'Produit introuvable' });

    const avant = produit.quantiteStock;
    const delta = type === 'entree' ? quantite : type === 'sortie' ? -quantite : quantite;
    const apres = avant + delta;

    if (apres < 0)
      return res.status(400).json({ success: false, message: 'Stock insuffisant' });

    produit.quantiteStock = apres;
    await produit.save();

    await Mouvement.create({
      entreprise: req.entrepriseId,
      produit: produit._id, type, quantite: Math.abs(quantite),
      quantiteAvant: avant, quantiteApres: apres,
      motif, creePar: req.user._id,
    });

    res.json({ success: true, data: produit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
