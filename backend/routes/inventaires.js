const router = require('express').Router();
const ctrl = require('../controllers/inventaireController');
const Inventaire = require('../models/Inventaire');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');

router.use(proteger);
router.get('/', ctrl.getInventaires);
router.get('/:id', ctrl.getInventaire);

const compteur = autoriser('admin', 'gestionnaire');
const charger = (req) => Inventaire.findById(req.params.id).select('numero').lean();

router.post('/', compteur,
  journaliser({ action: 'inventaire_demarre', entite: 'inventaire', decrire: ({ body }) => ({ entiteId: body.data?._id,
    libelle: `Inventaire ${body.data?.numero} démarré (${body.data?.lignes?.length} produits — ${body.data?.perimetre})` }) }),
  ctrl.demarrer);

router.patch('/:id/lignes/:ligneId', compteur, ctrl.compter); // trop fréquent pour le journal : seul le résultat final est tracé

router.post('/:id/valider', autoriser('admin'),
  journaliser({ action: 'inventaire_valide', entite: 'inventaire', charger, decrire: ({ avant, body, req }) => {
    const r = body.data?.resume || {};
    return { entiteId: req.params.id,
      libelle: `Inventaire ${avant?.numero} validé : ${r.nbComptes} produits comptés, ${r.nbEcarts} écart(s)${r.nbEcarts ? ` (pertes ${GNF(r.valeurPerte)}, gains ${GNF(r.valeurGain)})` : ''}`,
      details: r };
  } }),
  ctrl.valider);

router.post('/:id/annuler', compteur,
  journaliser({ action: 'inventaire_annule', entite: 'inventaire', charger, decrire: ({ avant, req }) => ({ entiteId: req.params.id, libelle: `Inventaire ${avant?.numero} annulé (stock inchangé)` }) }),
  ctrl.annuler);

module.exports = router;
