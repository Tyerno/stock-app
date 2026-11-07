const router = require('express').Router();
const ctrl   = require('../controllers/dashboardController');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');

router.use(proteger);
router.get('/', ctrl.getStats);

// Activité commerciale (CA, bénéfice estimé) et objectif mensuel : administrateur seulement.
router.get('/activite', autoriser('admin'), ctrl.getActivite);
router.put('/objectif', autoriser('admin'),
  journaliser({ action: 'objectif_modifie', entite: 'boutique', decrire: ({ body }) => ({ libelle: `Objectif mensuel de chiffre d'affaires fixé à ${GNF(body.data?.objectifMensuel)}` }) }),
  ctrl.setObjectif);

module.exports = router;
