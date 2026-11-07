const router = require('express').Router();
const caisse = require('../controllers/caisseController');
const dep    = require('../controllers/depenseController');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');

const LIB = { transport: 'Transport', salaire: 'Salaire', loyer: 'Loyer', electricite: 'Électricité', achat_divers: 'Achats divers', reparation: 'Réparation', autre: 'Autre' };

// Chiffres financiers : administrateur et gestionnaire uniquement.
router.use(proteger, autoriser('admin', 'gestionnaire'));

router.get('/jour',      caisse.getJour);
router.get('/clotures',  caisse.getClotures);
router.post('/cloture',  caisse.cloturer); // la trace au journal est faite dans le contrôleur

router.post('/depenses',
  journaliser({ action: 'depense_creee', entite: 'depense', decrire: ({ body }) => ({
    entiteId: body.data?._id,
    libelle: `Dépense : ${body.data?.libelle} — ${GNF(body.data?.montant)} (${LIB[body.data?.categorie] || 'Autre'})`,
    details: { montant: body.data?.montant, categorie: body.data?.categorie },
  }) }),
  dep.creerDepense);
router.delete('/depenses/:id', autoriser('admin'),
  journaliser({ action: 'depense_supprimee', entite: 'depense', decrire: ({ body, req }) => ({
    entiteId: req.params.id,
    libelle: `Dépense supprimée : ${body.data?.libelle} — ${GNF(body.data?.montant)}`,
    details: { montant: body.data?.montant },
  }) }),
  dep.supprimerDepense);

module.exports = router;
