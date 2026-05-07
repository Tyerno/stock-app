const jwt = require('jsonwebtoken');
const { User } = require('../models');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

exports.inscription = async (req, res) => {
  try {
    const { nom, email, motDePasse, role } = req.body;
    const user = await User.create({ nom, email, motDePasse, role });
    res.status(201).json({ success: true, token: genToken(user._id), data: { id: user._id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.connexion = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user || !(await user.verifierMotDePasse(motDePasse))) return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    user.derniereConnexion = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, token: genToken(user._id), data: { id: user._id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.moi = (req, res) => res.json({ success: true, data: req.user });
