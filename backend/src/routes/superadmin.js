const router = require('express').Router();
const ctrl   = require('../controllers/superAdminController');
const { proteger, autoriser } = require('../middleware/auth');
router.use(proteger, autoriser('superadmin'));
router.get('/stats',                         ctrl.stats);
router.get('/entreprises',                   ctrl.listerEntreprises);
router.put('/entreprises/:id/plan',          ctrl.changerPlan);
router.put('/entreprises/:id/toggle',        ctrl.toggleEntreprise);
module.exports = router;
