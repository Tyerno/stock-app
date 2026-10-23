const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/sauvegardeController');
const { proteger, autoriser } = require('../middleware/auth');

// Une sauvegarde est lourde et sensible : réservée à l'administrateur, et limitée en fréquence.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Trop de sauvegardes demandées. Réessayez plus tard.' },
});

router.use(proteger, autoriser('admin'));
router.get('/resume', ctrl.resume);
router.get('/', limiter, ctrl.telecharger);

module.exports = router;
