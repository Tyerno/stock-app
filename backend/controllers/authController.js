const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { envoyerReinitialisation } = require('../services/emailService');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

exports.connexion = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse) return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

    const emailNormalise = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNormalise }).select('+motDePasse');
    if (!user || !(await user.verifierMotDePasse(String(motDePasse)))) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    // Compte désactivé : refusé après vérification du mot de passe
    if (!user.actif) {
      return res.status(403).json({ success: false, message: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    user.derniereConnexion = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, token: genToken(user._id), data: { id: user._id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.moi = (req, res) => res.json({ success: true, data: req.user });

// ─── Mon compte ───────────────────────────────────────────────────────────────
const profilPublic = (u) => ({ id: u._id, nom: u.nom, email: u.email, role: u.role });

// Modifier son propre nom (l'email et le rôle ne se changent pas ici).
exports.modifierProfil = async (req, res) => {
  try {
    const nom = typeof req.body?.nom === 'string' ? req.body.nom.trim() : '';
    if (nom.length < 2 || nom.length > 60) {
      return res.status(400).json({ success: false, message: 'Le nom doit contenir entre 2 et 60 caractères' });
    }
    const user = await User.findById(req.user._id);
    user.nom = nom;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, data: profilPublic(user), message: 'Nom mis à jour' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// Changer son propre mot de passe : exige le mot de passe actuel. Les autres sessions sont invalidées
// (voir middleware/auth.js) ; un nouveau jeton est renvoyé pour que cet appareil reste connecté.
// NB : les erreurs de saisie répondent 400 (et non 401) pour ne pas déclencher la déconnexion automatique du client.
exports.changerMotDePasse = async (req, res) => {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body || {};
    if (typeof motDePasseActuel !== 'string' || typeof nouveauMotDePasse !== 'string' || !motDePasseActuel) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel et nouveau mot de passe requis' });
    }
    if (nouveauMotDePasse.length < 8 || nouveauMotDePasse.length > 72) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir entre 8 et 72 caractères' });
    }
    const user = await User.findById(req.user._id).select('+motDePasse');
    if (!(await user.verifierMotDePasse(motDePasseActuel))) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }
    if (nouveauMotDePasse === motDePasseActuel) {
      return res.status(400).json({ success: false, message: "Le nouveau mot de passe doit être différent de l'ancien" });
    }
    user.motDePasse = nouveauMotDePasse;
    await user.save(); // hash + motDePasseChangeLe via le hook du modèle
    res.json({ success: true, token: genToken(user._id), data: profilPublic(user), message: 'Mot de passe mis à jour. Vos autres appareils sont déconnectés.' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// ─── Mot de passe oublié ──────────────────────────────────────────────────────
const hashJeton = (jeton) => crypto.createHash('sha256').update(String(jeton)).digest('hex');
const DUREE_JETON_MS = 30 * 60 * 1000; // 30 minutes
const MESSAGE_GENERIQUE = "Si un compte actif existe avec cette adresse, un email de réinitialisation vient d'être envoyé.";

// Demande de réinitialisation. La réponse est TOUJOURS la même, que le compte existe ou non,
// pour ne pas révéler quelles adresses sont enregistrées.
exports.motDePasseOublie = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'Adresse email requise' });

    const user = await User.findOne({ email });
    if (user && user.actif) {
      const jeton = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash   = hashJeton(jeton);
      user.resetTokenExpire = new Date(Date.now() + DUREE_JETON_MS);
      await user.save({ validateBeforeSave: false });

      const base = (process.env.APP_URL || (process.env.FRONTEND_URL || '').split(',')[0] || 'http://localhost:3000')
        .trim().replace(/\/$/, '');
      const lien = `${base}/reinitialiser-mot-de-passe/${jeton}`;

      // Envoi sans attendre : la durée de réponse ne trahit pas l'existence du compte.
      envoyerReinitialisation({ email: user.email, nom: user.nom, lien }).catch((e) => {
        console.error('❌ Email de réinitialisation non envoyé :', e.message);
        if (process.env.NODE_ENV !== 'production') console.log('🔗 Lien de réinitialisation (dev uniquement) :', lien);
      });
    }

    res.json({ success: true, message: MESSAGE_GENERIQUE });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur, réessayez plus tard' });
  }
};

// Choix du nouveau mot de passe avec le jeton reçu par email.
exports.reinitialiserMotDePasse = async (req, res) => {
  try {
    const { motDePasse } = req.body || {};
    if (typeof motDePasse !== 'string' || motDePasse.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const user = await User.findOne({
      resetTokenHash:   hashJeton(req.params.token),
      resetTokenExpire: { $gt: new Date() },
    }).select('+motDePasse +resetTokenHash +resetTokenExpire');

    if (!user || !user.actif) {
      return res.status(400).json({ success: false, message: 'Lien invalide ou expiré. Refaites une demande.' });
    }

    user.motDePasse       = motDePasse;   // haché par le hook pre('save')
    user.resetTokenHash   = undefined;    // le lien ne peut servir qu'une fois
    user.resetTokenExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur, réessayez plus tard' });
  }
};
