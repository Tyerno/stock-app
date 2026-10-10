const router = require('express').Router();
const ctrl   = require('../controllers/detteController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);

router.get('/',              ctrl.getDettes);
router.get('/:id',           ctrl.getDette);
router.post('/',             autoriser('admin','gestionnaire'), ctrl.creerDette);
router.post('/:id/paiement', autoriser('admin','gestionnaire'), ctrl.ajouterPaiement);
router.patch('/:id/echeance', autoriser('admin','gestionnaire'), ctrl.modifierEcheance);

module.exports = router;
