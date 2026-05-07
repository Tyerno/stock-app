const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.proteger = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Non autorisé — token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-motDePasse');
    if (!req.user || !req.user.actif) return res.status(401).json({ success: false, message: 'Compte inactif' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

exports.autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Rôle '${req.user.role}' non autorisé` });
  }
  next();
};
