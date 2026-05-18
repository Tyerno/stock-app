const router = require('express').Router();
const ctrl   = require('../controllers/parametresController');
const { proteger, autoriser, tenantScope } = require('../middleware/auth');

router.use(proteger, tenantScope);
router.get('/', ctrl.obtenir);
router.put('/', autoriser('admin'), ctrl.modifier);

module.exports = router;
