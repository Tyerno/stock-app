const router = require('express').Router();
const ctrl   = require('../controllers/clientController');
const { proteger, autoriser } = require('../middleware/auth');

// Fichier clients : historique d'achats et dettes, réservé à l'administrateur et au gestionnaire.
router.use(proteger, autoriser('admin', 'gestionnaire'));
router.get('/',       ctrl.getClients);
router.get('/fiche',  ctrl.getFiche);

module.exports = router;
