const { User } = require('../models');

exports.getUtilisateurs = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt:-1 });
    res.json({ success:true, data:users });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
};

exports.creerUtilisateur = async (req, res) => {
  try {
    const { nom, email, motDePasse, role } = req.body;
    const user = await User.create({ nom, email, motDePasse, role });
    res.status(201).json({ success:true, data:{ id:user._id, nom:user.nom, email:user.email, role:user.role }, message:'Compte créé avec succès' });
  } catch (err) {
    if (err.code===11000) return res.status(400).json({ success:false, message:'Email déjà utilisé' });
    res.status(400).json({ success:false, message:err.message });
  }
};

exports.modifierUtilisateur = async (req, res) => {
  try {
    const { nom, email, role, actif } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { nom, email, role, actif }, { new:true, runValidators:true });
    if (!user) return res.status(404).json({ success:false, message:'Utilisateur introuvable' });
    res.json({ success:true, data:user, message:'Compte mis à jour' });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};

exports.changerMotDePasse = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+motDePasse');
    if (!user) return res.status(404).json({ success:false, message:'Utilisateur introuvable' });
    user.motDePasse = req.body.motDePasse;
    await user.save();
    res.json({ success:true, message:'Mot de passe mis à jour' });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};

exports.toggleActif = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success:false, message:'Utilisateur introuvable' });
    if (user._id.toString() === req.user._id.toString()) return res.status(400).json({ success:false, message:'Impossible de désactiver votre propre compte' });
    user.actif = !user.actif;
    await user.save();
    res.json({ success:true, message:user.actif ? 'Compte activé' : 'Compte désactivé', data:user });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
};
