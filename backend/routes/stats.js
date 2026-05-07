const router = require('express').Router();
const ctrl   = require('../controllers/statsController');
const { proteger } = require('../middleware/auth');

router.use(proteger);
router.get('/', ctrl.getStats);

module.exports = router;
