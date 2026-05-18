const router = require('express').Router();
const ctrl   = require('../controllers/categoriesController');
const { proteger, autoriser, tenantScope } = require('../middleware/auth');
router.use(proteger, tenantScope);
router.get('/',       ctrl.lister);
router.post('/',      autoriser('admin','gestionnaire'), ctrl.creer);
router.put('/:id',    autoriser('admin','gestionnaire'), ctrl.modifier);
router.delete('/:id', autoriser('admin'), ctrl.supprimer);
module.exports = router;
