const jwt         = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');
const Entreprise  = require('../models/Entreprise');

const genToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/inscription
// Crée une nouvelle entreprise + son admin
exports.inscrire = async (req, res) => {
  try {
    const { nomEntreprise, secteur, nom, email, motDePasse } = req.body;

    if (!nomEntreprise || !nom || !email || !motDePasse)
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });

    const emailExiste = await Utilisateur.findOne({ email });
    if (emailExiste)
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });

    // Créer l'entreprise
    const entreprise = await Entreprise.create({ nom: nomEntreprise, secteur });

    // Créer l'admin de l'entreprise
    const admin = await Utilisateur.create({
      nom, email, motDePasse, role: 'admin', entreprise: entreprise._id,
    });

    const token = genToken(admin._id);
    await Utilisateur.findByIdAndUpdate(admin._id, { dernierLogin: new Date() });

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès !',
      data: {
        token,
        utilisateur: {
          _id: admin._id, nom: admin.nom, email: admin.email, role: admin.role,
        },
        entreprise: {
          _id: entreprise._id, nom: entreprise.nom, slug: entreprise.slug,
          abonnement: entreprise.abonnement, parametres: entreprise.parametres,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse)
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

    const user = await Utilisateur.findOne({ email })
      .populate('entreprise', 'nom slug abonnement parametres actif');

    if (!user || !user.actif)
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });

    const ok = await user.comparerMotDePasse(motDePasse);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });

    // Vérif entreprise (sauf superadmin)
    if (user.role !== 'superadmin' && user.entreprise) {
      if (!user.entreprise.actif)
        return res.status(403).json({ success: false, message: 'Compte entreprise désactivé' });
      if (user.entreprise.abonnement.statut === 'suspendu')
        return res.status(403).json({ success: false, message: 'Abonnement suspendu — contactez le support' });
    }

    await Utilisateur.findByIdAndUpdate(user._id, { dernierLogin: new Date() });

    res.json({
      success: true,
      data: {
        token: genToken(user._id),
        utilisateur: {
          _id: user._id, nom: user.nom, email: user.email,
          role: user.role, avatar: user.avatar,
        },
        entreprise: user.entreprise || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
exports.moi = async (req, res) => {
  res.json({ success: true, data: { utilisateur: req.user, entreprise: req.user.entreprise } });
};

// PUT /api/auth/mot-de-passe
exports.changerMotDePasse = async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;
    const user = await Utilisateur.findById(req.user._id);
    const ok   = await user.comparerMotDePasse(ancien);
    if (!ok)
      return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect' });
    user.motDePasse = nouveau;
    await user.save();
    res.json({ success: true, message: 'Mot de passe modifié' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
