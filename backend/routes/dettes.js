const router = require('express').Router();
const ctrl   = require('../controllers/detteController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);

router.get('/',              ctrl.getDettes);
router.get('/:id',           ctrl.getDette);
router.post('/',             autoriser('admin','gestionnaire'), ctrl.creerDette);
router.post('/:id/paiement', autoriser('admin','gestionnaire'), ctrl.ajouterPaiement);

module.exports = router;
