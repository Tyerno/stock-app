const router = require('express').Router();
const ctrl   = require('../controllers/retourController');
const { proteger, autoriser } = require('../middleware/auth');
const { journaliser, GNF } = require('../utils/journal');

router.use(proteger, autoriser('admin', 'gestionnaire'));

router.get('/',          ctrl.getRetours);
router.get('/vente/:id', ctrl.getPourVente);
router.post('/',
  journaliser({ action: 'retour_enregistre', entite: 'retour', decrire: ({ body }) => {
    const r = body.data || {};
    const n = (r.lignesRetour || []).length;
    return { entiteId: r._id, libelle: `${r.type === 'echange' ? 'Échange' : 'Retour'} ${r.numero} (vente ${r.venteNumero}) : ${n} article${n > 1 ? 's' : ''} repris, valeur ${GNF(r.totalRetourne)}${r.difference ? `, ${r.difference > 0 ? 'client paie' : 'remboursé'} ${GNF(Math.abs(r.difference))}` : ''}`,
      details: { numero: r.numero, vente: r.venteNumero, totalRetourne: r.totalRetourne, totalEchange: r.totalEchange, difference: r.difference, reglement: r.reglement, motif: r.motif } };
  } }),
  ctrl.creerRetour);

module.exports = router;
