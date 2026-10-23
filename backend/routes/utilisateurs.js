const router = require('express').Router();
const ctrl   = require('../controllers/utilisateursController');
const { proteger, autoriser } = require('../middleware/auth');
const { User } = require('../models');
const { journaliser, differences } = require('../utils/journal');
const chargerUser = (req) => User.findById(req.params.id).select('nom email role actif').lean();

router.use(proteger);
router.use(autoriser('admin'));

router.get('/',                   ctrl.getUtilisateurs);
router.post('/', journaliser({ action:'utilisateur_cree', entite:'utilisateur', decrire:({ body }) => ({ entiteId: body.data?.id,
  libelle: `Compte créé : ${body.data?.nom} (${body.data?.email}) — rôle ${body.data?.role}` }) }), ctrl.creerUtilisateur);
router.put('/:id', journaliser({ action:'utilisateur_modifie', entite:'utilisateur', charger:chargerUser, decrire:({ avant, body, req }) => {
  const chg = differences(avant, body.data, { nom:'Nom', email:'Email', role:'Rôle', actif:'Actif' });
  return { entiteId: req.params.id, libelle: `Compte de ${body.data?.nom || avant?.nom} modifié${chg.length ? ' : ' + chg.map(c => `${c.label} ${c.avant} → ${c.apres}`).join(' ; ') : ''}`, details: chg.length ? { changements: chg } : undefined };
} }), ctrl.modifierUtilisateur);
router.patch('/:id/mot-de-passe', journaliser({ action:'utilisateur_mdp', entite:'utilisateur', charger:chargerUser, decrire:({ avant, req }) => ({ entiteId: req.params.id,
  libelle: `Mot de passe de ${avant?.nom || 'un compte'} réinitialisé par l'administrateur` }) }), ctrl.changerMotDePasse);
router.patch('/:id/toggle', journaliser({ action:'utilisateur_toggle', entite:'utilisateur', decrire:({ body, req }) => ({ entiteId: req.params.id,
  libelle: `Compte de ${body.data?.nom} ${body.data?.actif ? 'activé' : 'désactivé'}` }) }), ctrl.toggleActif);

module.exports = router;
