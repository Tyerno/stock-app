const router = require('express').Router();
const ctrl   = require('../controllers/produitsController');
const { proteger, autoriser, tenantScope, verifierLimite } = require('../middleware/auth');

router.use(proteger, tenantScope);
router.get('/',    ctrl.lister);
router.get('/:id', ctrl.obtenir);
router.post('/',   autoriser('admin','gestionnaire'), verifierLimite('produits'), ctrl.creer);
router.put('/:id', autoriser('admin','gestionnaire'), ctrl.modifier);
router.delete('/:id', autoriser('admin'), ctrl.supprimer);
router.post('/:id/ajuster-stock', autoriser('admin','gestionnaire'), ctrl.ajusterStock);

module.exports = router;
