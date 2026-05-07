const router = require('express').Router();
const ctrl   = require('../controllers/dashboardController');
const { proteger } = require('../middleware/auth');

router.use(proteger);
router.get('/', ctrl.getStats);

module.exports = router;
