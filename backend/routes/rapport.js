const router = require('express').Router();
const ctrl   = require('../controllers/rapportController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger, autoriser('admin', 'gestionnaire'));
router.get('/jour', ctrl.getRapportJour);

module.exports = router;
