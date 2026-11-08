const router = require('express').Router();
const ctrl = require('../controllers/devisController');
const Devis = require('../models/Devis');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');

router.use(proteger);

router.get('/', ctrl.getDevisListe);
router.get('/:id', ctrl.getDevis);

const ecrire = autoriser('admin', 'gestionnaire');
const chargerDevis = (req) => Devis.findById(req.params.id).select('numero client totalNet').lean();

router.get('/:id/panier', ecrire, ctrl.getPanier);

router.post('/', ecrire,
  journaliser({ action: 'devis_cree', entite: 'devis', decrire: ({ body }) => ({ entiteId: body.data?._id,
    libelle: `Devis ${body.data?.numero} créé pour ${body.data?.client?.nom} : ${body.data?.lignes?.length} produit(s), ${GNF(body.data?.totalNet)}${body.sousPlancher?.length ? ` (sous le prix plancher : ${body.sousPlancher.join(', ')})` : ''}`,
    details: { numero: body.data?.numero, total: body.data?.totalNet, articles: (body.data?.lignes || []).map((l) => `${l.quantite} ${l.unite || ''} ${l.nomProduit} à ${GNF(l.prixUnitaire)}`.trim()) } }) }),
  ctrl.creerDevis);

router.patch('/:id/statut', ecrire,
  journaliser({ action: 'devis_statut', entite: 'devis', charger: chargerDevis, decrire: ({ avant, body, req }) => ({ entiteId: req.params.id,
    libelle: `Devis ${avant?.numero} (${avant?.client?.nom}) ${body.data?.statut === 'refuse' ? 'marqué comme refusé' : 'remis en cours'}` }) }),
  ctrl.changerStatut);

router.post('/:id/converti', ecrire,
  journaliser({ action: 'devis_converti', entite: 'devis', charger: chargerDevis, decrire: ({ avant, req }) => ({ entiteId: req.params.id,
    libelle: `Devis ${avant?.numero} (${avant?.client?.nom}) transformé en vente : ${GNF(avant?.totalNet)}` }) }),
  ctrl.marquerConverti);

router.delete('/:id', ecrire,
  journaliser({ action: 'devis_supprime', entite: 'devis', charger: chargerDevis, decrire: ({ avant, req }) => ({ entiteId: req.params.id,
    libelle: `Devis ${avant?.numero} (${avant?.client?.nom}, ${GNF(avant?.totalNet)}) supprimé` }) }),
  ctrl.supprimer);

module.exports = router;
