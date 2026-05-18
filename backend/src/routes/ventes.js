const router = require('express').Router();
const ctrl   = require('../controllers/ventesController');
const { proteger, autoriser, tenantScope } = require('../middleware/auth');

router.use(proteger, tenantScope);
router.get('/',              ctrl.lister);
router.get('/:id',           ctrl.obtenir);
router.post('/',             autoriser('admin','gestionnaire'), ctrl.creer);
router.put('/:id/annuler',   autoriser('admin'), ctrl.annuler);

module.exports = router;
