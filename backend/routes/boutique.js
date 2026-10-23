const router = require('express').Router();
const ctrl = require('../controllers/boutiqueController');
const { proteger, autoriser } = require('../middleware/auth');
const Boutique = require('../models/Boutique');
const { journaliser, differences } = require('../utils/journal');
const LABELS = { nom:'Nom', adresse:'Adresse', telephone:'Téléphone', email:'Email', ville:'Ville', pays:'Pays', devise:'Devise', emailAlertes:'Email des alertes', seuilDefaut:"Seuil d'alerte par défaut" };

// Publique : nom + logo pour la page de connexion (avant l'authentification).
router.get('/public', ctrl.getMarque);

router.use(proteger);
router.get('/', ctrl.getBoutique);
router.put('/', autoriser('admin'),
  journaliser({ action:'boutique_modifiee', entite:'boutique', charger:() => Boutique.findOne().lean(), decrire:({ avant, body }) => {
    const chg = differences(avant || {}, body.data, LABELS);
    const logo = (avant?.logo || '') !== (body.data?.logo || '');
    const parts = chg.map(c => `${c.label} « ${c.avant || '—'} » → « ${c.apres || '—'} »`);
    if (logo) parts.push(body.data?.logo ? 'Logo changé' : 'Logo retiré');
    return { libelle: `Informations de la boutique modifiées${parts.length ? ' : ' + parts.join(' ; ') : ''}`, details: chg.length ? { changements: chg } : undefined };
  } }),
  ctrl.modifierBoutique);

module.exports = router;
