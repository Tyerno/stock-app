const router = require('express').Router();
const ctrl = require('../controllers/bonCommandeController');
const BonCommande = require('../models/BonCommande');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');

router.use(proteger);

router.get('/', ctrl.getBons);
router.get('/:id', ctrl.getBon);

const ecrire = autoriser('admin', 'gestionnaire');
const chargerBon = (req) => BonCommande.findById(req.params.id).select('numero fournisseur total').lean();

router.post('/', ecrire,
  journaliser({ action: 'bon_cree', entite: 'commande', decrire: ({ body }) => ({ entiteId: body.data?._id,
    libelle: `Bon de commande ${body.data?.numero} créé : ${body.data?.fournisseur?.nom}, ${body.data?.lignes?.length} produit(s), ${GNF(body.data?.total)}`,
    details: { numero: body.data?.numero, total: body.data?.total, articles: (body.data?.lignes || []).map((l) => `${l.quantite} ${l.unite || ''} ${l.nomProduit}`.trim()) } }) }),
  ctrl.creerBon);

router.patch('/:id/statut', ecrire,
  journaliser({ action: 'bon_statut', entite: 'commande', charger: chargerBon, decrire: ({ avant, body, req }) => ({ entiteId: req.params.id,
    libelle: `Bon ${avant?.numero} (${avant?.fournisseur?.nom}) ${body.data?.statut === 'envoye' ? 'marqué comme envoyé' : 'annulé'}` }) }),
  ctrl.changerStatut);

router.post('/:id/reception', ecrire,
  journaliser({ action: 'bon_recu', entite: 'commande', charger: chargerBon, decrire: ({ avant, body, req }) => ({ entiteId: req.params.id,
    libelle: `Bon ${avant?.numero} réceptionné (${avant?.fournisseur?.nom}) : stock mis à jour`,
    details: { articles: (body.data?.lignes || []).map((l) => `${l.quantiteRecue ?? 0} / ${l.quantite} ${l.unite || ''} ${l.nomProduit}`.trim()) } }) }),
  ctrl.receptionner);

module.exports = router;
