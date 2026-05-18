const jwt         = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');
const PLANS       = require('../config/plans');

// ── Vérification JWT ──────────────────────────────────────────────────────────
exports.proteger = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Token manquant' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FIX: populate complet pour avoir toutes les méthodes Mongoose sur entreprise
    const user = await Utilisateur.findById(decoded.id)
      .select('-motDePasse')
      .populate('entreprise'); // populate complet, pas de projection partielle

    if (!user || !user.actif)
      return res.status(401).json({ success: false, message: 'Utilisateur inactif ou introuvable' });

    // Vérifie que l'entreprise est active (sauf superadmin)
    if (user.role !== 'superadmin' && user.entreprise) {
      if (!user.entreprise.actif || user.entreprise.abonnement.statut === 'suspendu')
        return res.status(403).json({ success: false, message: 'Compte entreprise suspendu' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

// ── Contrôle des rôles ────────────────────────────────────────────────────────
exports.autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Accès refusé — rôle requis : ${roles.join(', ')}` });
  next();
};

// ── Isolation tenant ──────────────────────────────────────────────────────────
exports.tenantScope = (req, res, next) => {
  if (req.user.role === 'superadmin') {
    req.entrepriseId = req.headers['x-entreprise-id'] || req.params.entrepriseId || null;
  } else {
    if (!req.user.entreprise)
      return res.status(403).json({ success: false, message: 'Aucune entreprise associée' });
    req.entrepriseId = req.user.entreprise._id;
  }
  next();
};

// ── Vérifie les limites du plan ───────────────────────────────────────────────
// FIX: utilise PLANS directement au lieu de getLimites() pour éviter
// les problèmes de méthodes Mongoose sur documents populés partiellement
exports.verifierLimite = (ressource) => async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin') return next();

    const planNom = req.user.entreprise?.abonnement?.plan || 'gratuit';
    const limites = PLANS[planNom]?.limites || PLANS.gratuit.limites;
    const limite  = limites[ressource];

    if (limite === -1) return next(); // illimité

    const Model = {
      produits:     require('../models/Produit'),
      utilisateurs: require('../models/Utilisateur'),
    }[ressource];

    if (!Model) return next();

    const filtre = ressource === 'utilisateurs'
      ? { entreprise: req.entrepriseId, actif: true, role: { $ne: 'superadmin' } }
      : { entreprise: req.entrepriseId, actif: true };

    const count = await Model.countDocuments(filtre);
    if (count >= limite) {
      return res.status(403).json({
        success: false,
        message: `Limite atteinte (${limite} ${ressource} max sur le plan ${planNom}). Passez au plan supérieur.`,
        code:    'LIMITE_PLAN',
        limite,
        actuel:  count,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
