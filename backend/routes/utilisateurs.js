const router = require('express').Router();
const ctrl   = require('../controllers/utilisateursController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);
router.use(autoriser('admin'));

router.get('/',                   ctrl.getUtilisateurs);
router.post('/',                  ctrl.creerUtilisateur);
router.put('/:id',                ctrl.modifierUtilisateur);
router.patch('/:id/mot-de-passe', ctrl.changerMotDePasse);
router.patch('/:id/toggle',       ctrl.toggleActif);

module.exports = router;
