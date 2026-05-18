const Utilisateur = require('../models/Utilisateur');

exports.lister = async (req, res) => {
  try {
    const data = await Utilisateur.find({ entreprise: req.entrepriseId })
      .select('-motDePasse').sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.creer = async (req, res) => {
  try {
    const { nom, email, motDePasse, role } = req.body;
    if (role === 'superadmin')
      return res.status(400).json({ success: false, message: 'Rôle non autorisé' });

    const existe = await Utilisateur.findOne({ email });
    if (existe)
      return res.status(400).json({ success: false, message: 'Email déjà utilisé' });

    const user = await Utilisateur.create({
      nom, email, motDePasse: motDePasse || 'Bienvenue123!',
      role: role || 'lecteur',
      entreprise: req.entrepriseId,
    });

    res.status(201).json({
      success: true,
      data: { _id: user._id, nom: user.nom, email: user.email, role: user.role },
      message: motDePasse ? undefined : 'Mot de passe par défaut : Bienvenue123!',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.modifier = async (req, res) => {
  try {
    const { motDePasse, role, ...reste } = req.body;
    if (role === 'superadmin')
      return res.status(400).json({ success: false, message: 'Rôle non autorisé' });

    const user = await Utilisateur.findOne({ _id: req.params.id, entreprise: req.entrepriseId });
    if (!user)
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    Object.assign(user, reste);
    if (role)       user.role       = role;
    if (motDePasse) user.motDePasse = motDePasse;

    await user.save();
    res.json({ success: true, data: { _id: user._id, nom: user.nom, email: user.email, role: user.role, actif: user.actif } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.supprimer = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte' });

    await Utilisateur.findOneAndUpdate(
      { _id: req.params.id, entreprise: req.entrepriseId },
      { actif: false }
    );
    res.json({ success: true, message: 'Utilisateur désactivé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
