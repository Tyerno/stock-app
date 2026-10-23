const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { proteger } = require('../middleware/auth');
const { journaliser } = require('../utils/journal');

router.post('/connexion', journaliser({ action:'connexion', entite:'compte',
  decrire:({ body }) => ({ utilisateur: { _id: body.data?.id, nom: body.data?.nom, email: body.data?.email, role: body.data?.role }, entiteId: body.data?.id, libelle: `Connexion de ${body.data?.nom}` }),
  echecs:({ req, statut }) => (statut === 401 || statut === 403) ? { action:'connexion_echec', libelle: `Tentative de connexion refusée (${String(req.body?.email ?? '').slice(0, 80)})` } : null,
}), ctrl.connexion);
router.post('/mot-de-passe-oublie',                 ctrl.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe/:token',   ctrl.reinitialiserMotDePasse);
router.get('/moi',          proteger, ctrl.moi);
router.put('/moi',          proteger, ctrl.modifierProfil);
router.patch('/mot-de-passe', proteger, journaliser({ action:'mdp_change', entite:'compte', decrire:({ req }) => ({ entiteId: req.user._id, libelle: `${req.user.nom} a changé son mot de passe` }) }), ctrl.changerMotDePasse);

module.exports = router;
