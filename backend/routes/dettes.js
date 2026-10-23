const router = require('express').Router();
const ctrl   = require('../controllers/detteController');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');
const nomClient = (d) => d?.client?.nom || d?.client || 'client';

router.use(proteger);

router.get('/',              ctrl.getDettes);
router.get('/resume',        ctrl.getResume); // doit rester AVANT '/:id'
router.get('/:id',           ctrl.getDette);
router.post('/',             autoriser('admin','gestionnaire'),
  journaliser({ action:'dette_creee', entite:'dette', decrire:({ body }) => ({ entiteId: body.data?._id,
    libelle: `Dette enregistrée : ${GNF(body.data?.montantInitial)} — ${nomClient(body.data)}` }) }),
  ctrl.creerDette);
router.post('/:id/paiement', autoriser('admin','gestionnaire'),
  journaliser({ action:'dette_paiement', entite:'dette', decrire:({ body, req }) => ({ entiteId: req.params.id,
    libelle: `Paiement de ${GNF(req.body?.montant)} reçu — ${nomClient(body.data)} (reste ${GNF(body.data?.montantRestant)})`,
    details: { montant: Number(req.body?.montant), reste: body.data?.montantRestant, note: req.body?.note } }) }),
  ctrl.ajouterPaiement);
router.patch('/:id/echeance', autoriser('admin','gestionnaire'),
  journaliser({ action:'dette_echeance', entite:'dette', decrire:({ body, req }) => ({ entiteId: req.params.id,
    libelle: `Échéance de la dette de ${nomClient(body.data)} ${body.data?.dateEcheance ? 'modifiée' : 'retirée'}` }) }),
  ctrl.modifierEcheance);

module.exports = router;
