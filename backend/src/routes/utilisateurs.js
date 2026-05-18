const router = require('express').Router();
const ctrl   = require('../controllers/utilisateursController');
const { proteger, autoriser, tenantScope, verifierLimite } = require('../middleware/auth');
router.use(proteger, tenantScope);
router.get('/',       autoriser('admin'), ctrl.lister);
router.post('/',      autoriser('admin'), verifierLimite('utilisateurs'), ctrl.creer);
router.put('/:id',    autoriser('admin'), ctrl.modifier);
router.delete('/:id', autoriser('admin'), ctrl.supprimer);
module.exports = router;
