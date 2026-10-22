const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { proteger } = require('../middleware/auth');

router.post('/connexion',   ctrl.connexion);
router.post('/mot-de-passe-oublie',                 ctrl.motDePasseOublie);
router.post('/reinitialiser-mot-de-passe/:token',   ctrl.reinitialiserMotDePasse);
router.get('/moi',          proteger, ctrl.moi);
router.put('/moi',          proteger, ctrl.modifierProfil);
router.patch('/mot-de-passe', proteger, ctrl.changerMotDePasse);

module.exports = router;
