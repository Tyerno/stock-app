const router = require('express').Router();
const ctrl   = require('../controllers/miseEnRouteController');
const { proteger, autoriser } = require('../middleware/auth');

router.get('/', proteger, autoriser('admin'), ctrl.getEtat);

module.exports = router;
