const router = require('express').Router();
const ctrl = require('../controllers/boutiqueController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);
router.get('/', ctrl.getBoutique);
router.put('/', autoriser('admin'), ctrl.modifierBoutique);

module.exports = router;
