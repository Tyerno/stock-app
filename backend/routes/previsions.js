const router = require('express').Router();
const ctrl   = require('../controllers/previsionController');
const { proteger } = require('../middleware/auth');

router.use(proteger);
router.get('/',         ctrl.getPrevisions);
router.get('/:id',      ctrl.getPrevisionProduit);

module.exports = router;
