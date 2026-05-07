const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { proteger } = require('../middleware/auth');

router.post('/inscription', ctrl.inscription);
router.post('/connexion',   ctrl.connexion);
router.get('/moi',          proteger, ctrl.moi);

module.exports = router;
