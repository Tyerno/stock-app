const router = require('express').Router();
const ctrl   = require('../controllers/ventesController');
const { proteger, autoriser } = require('../middleware/auth');
const Vente = require('../models/Vente');
const { journaliser, GNF } = require('../utils/journal');

router.use(proteger);

router.get('/',                  ctrl.getVentes);
router.get('/stats',             ctrl.getStatsVentes);
router.get('/:id',               ctrl.getVente);
router.post('/',                 autoriser('admin','gestionnaire'),
  journaliser({ action:'vente_creee', entite:'vente', decrire:({ body }) => {
    const v = body.data || {};
    const nb = (v.lignes || []).length;
    return { entiteId: v._id, libelle: `Vente ${v.numero} : ${nb} article${nb > 1 ? 's' : ''}, total ${GNF(v.totalNet)}${v.client?.nom && v.client.nom !== 'Client comptoir' ? ` — client ${v.client.nom}` : ''}`,
      details: { numero: v.numero, total: v.totalNet, articles: (v.lignes || []).map(l => `${l.quantite} ${l.unite || ''} ${l.nomProduit}`.trim()) } };
  } }),
  ctrl.creerVente);
router.patch('/:id/annuler',     autoriser('admin'),
  journaliser({ action:'vente_annulee', entite:'vente', charger:(req) => Vente.findById(req.params.id).select('numero totalNet').lean(),
    decrire:({ avant, req }) => ({ entiteId: req.params.id, libelle: `Vente ${avant?.numero} annulée (${GNF(avant?.totalNet)} remis en stock)`, details: { numero: avant?.numero, total: avant?.totalNet } }) }),
  ctrl.annulerVente);

module.exports = router;
