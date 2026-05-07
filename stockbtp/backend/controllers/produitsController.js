const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');

exports.getProduits = async (req, res) => {
  try {
    const { page=1, limit=50, search, categorie, statut, sortBy='nom', order='asc' } = req.query;
    const filtre = { actif: true };
    if (search)   filtre.$text = { $search: search };
    if (categorie) filtre.categorie = categorie;
    if (statut === 'rupture') filtre.quantiteStock = 0;
    if (statut === 'faible')  filtre.$expr = { $lte: ['$quantiteStock','$seuilAlerte'] };
    if (statut === 'normal')  filtre.$expr = { $gt:  ['$quantiteStock','$seuilAlerte'] };
    const skip = (Number(page)-1)*Number(limit);
    const [produits, total] = await Promise.all([
      Produit.find(filtre).populate('categorie','nom couleur').sort({ [sortBy]: order==='desc'?-1:1 }).skip(skip).limit(Number(limit)),
      Produit.countDocuments(filtre),
    ]);
    res.json({ success:true, data:produits, pagination:{ total, page:Number(page), pages:Math.ceil(total/Number(limit)), limit:Number(limit) } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.getProduit = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id).populate('categorie');
    if (!produit) return res.status(404).json({ success:false, message:'Produit introuvable' });
    const mouvements = await Mouvement.find({ produit:produit._id }).sort({ createdAt:-1 }).limit(10).populate('utilisateur','nom');
    res.json({ success:true, data:{ ...produit.toJSON(), mouvementsRecents:mouvements } });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.creerProduit = async (req, res) => {
  try {
    const produit = await Produit.create({ ...req.body, creePar:req.user._id });
    await produit.populate('categorie','nom couleur');
    if (req.body.quantiteStock > 0) {
      await Mouvement.create({ produit:produit._id, type:'entree', quantite:req.body.quantiteStock, quantiteAvant:0, quantiteApres:req.body.quantiteStock, prixUnitaire:produit.prixAchat, motif:'Stock initial', utilisateur:req.user._id });
    }
    res.status(201).json({ success:true, data:produit, message:'Produit créé avec succès' });
  } catch (err) {
    if (err.code===11000) return res.status(400).json({ success:false, message:'Référence déjà utilisée' });
    res.status(400).json({ success:false, message:err.message });
  }
};

exports.modifierProduit = async (req, res) => {
  try {
    const { quantiteStock, ...modifications } = req.body;
    const produit = await Produit.findByIdAndUpdate(req.params.id, modifications, { new:true, runValidators:true }).populate('categorie','nom couleur');
    if (!produit) return res.status(404).json({ success:false, message:'Produit introuvable' });
    res.json({ success:true, data:produit, message:'Produit mis à jour' });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};

exports.supprimerProduit = async (req, res) => {
  try {
    const produit = await Produit.findByIdAndUpdate(req.params.id, { actif:false }, { new:true });
    if (!produit) return res.status(404).json({ success:false, message:'Produit introuvable' });
    res.json({ success:true, message:'Produit archivé' });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.entreeStock = async (req, res) => {
  try {
    const { quantite, motif, reference, fournisseur, prixUnitaire } = req.body;
    const produit = await Produit.findById(req.params.id);
    if (!produit) return res.status(404).json({ success:false, message:'Produit introuvable' });
    const qAvant = produit.quantiteStock;
    produit.quantiteStock += Number(quantite);
    await produit.save();
    const mouvement = await Mouvement.create({ produit:produit._id, type:'entree', quantite:Number(quantite), quantiteAvant:qAvant, quantiteApres:produit.quantiteStock, prixUnitaire:prixUnitaire||produit.prixAchat, motif, reference, fournisseur, utilisateur:req.user._id });
    res.json({ success:true, data:{ produit, mouvement }, message:`Entrée de ${quantite} ${produit.unite} enregistrée` });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};

exports.sortieStock = async (req, res) => {
  try {
    const { quantite, motif, reference, client, prixUnitaire } = req.body;
    const produit = await Produit.findById(req.params.id);
    if (!produit) return res.status(404).json({ success:false, message:'Produit introuvable' });
    if (produit.quantiteStock < Number(quantite)) return res.status(400).json({ success:false, message:`Stock insuffisant (dispo : ${produit.quantiteStock} ${produit.unite})` });
    const qAvant = produit.quantiteStock;
    produit.quantiteStock -= Number(quantite);
    await produit.save();
    const mouvement = await Mouvement.create({ produit:produit._id, type:'sortie', quantite:Number(quantite), quantiteAvant:qAvant, quantiteApres:produit.quantiteStock, prixUnitaire:prixUnitaire||produit.prixVente, motif, reference, client, utilisateur:req.user._id });
    res.json({ success:true, data:{ produit, mouvement }, message:`Sortie de ${quantite} ${produit.unite} enregistrée` });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};
