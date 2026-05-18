const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { proteger } = require('../middleware/auth');

router.post('/inscription',  ctrl.inscrire);
router.post('/login',        ctrl.login);
router.get('/me',  proteger, ctrl.moi);
router.put('/mot-de-passe', proteger, ctrl.changerMotDePasse);

module.exports = router;
