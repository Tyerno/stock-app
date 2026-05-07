const router = require('express').Router();
const ctrl   = require('../controllers/produitsController');
const { proteger, autoriser } = require('../middleware/auth');

router.use(proteger);

router.get('/',                   ctrl.getProduits);
router.get('/:id',                ctrl.getProduit);
router.post('/',                  autoriser('admin','gestionnaire'), ctrl.creerProduit);
router.put('/:id',                autoriser('admin','gestionnaire'), ctrl.modifierProduit);
router.delete('/:id',             autoriser('admin'),               ctrl.supprimerProduit);
router.post('/:id/entree',        autoriser('admin','gestionnaire'), ctrl.entreeStock);
router.post('/:id/sortie',        autoriser('admin','gestionnaire'), ctrl.sortieStock);

module.exports = router;
