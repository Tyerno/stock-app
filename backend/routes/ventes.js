const router = require('express').Router();
const ctrl   = require('../controllers/ventesController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);

router.get('/',                  ctrl.getVentes);
router.get('/stats',             ctrl.getStatsVentes);
router.get('/:id',               ctrl.getVente);
router.post('/',                 autoriser('admin','gestionnaire'), ctrl.creerVente);
router.patch('/:id/annuler',     autoriser('admin'),               ctrl.annulerVente);

module.exports = router;
