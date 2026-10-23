const router = require('express').Router();
const ctrl = require('../controllers/journalController');
const { proteger, autoriser } = require('../middleware/auth');

// Le journal est réservé à l'administrateur.
router.use(proteger, autoriser('admin'));
router.get('/', ctrl.getJournal);

module.exports = router;
