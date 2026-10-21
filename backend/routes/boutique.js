const router = require('express').Router();
const ctrl = require('../controllers/boutiqueController');
const { proteger, autoriser } = require('../middleware/auth');

// Publique : nom + logo pour la page de connexion (avant l'authentification).
router.get('/public', ctrl.getMarque);

router.use(proteger);
router.get('/', ctrl.getBoutique);
router.put('/', autoriser('admin'), ctrl.modifierBoutique);

module.exports = router;
