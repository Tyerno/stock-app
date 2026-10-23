const router = require('express').Router();
const ctrl   = require('../controllers/produitsController');
const { proteger, autoriser } = require('../middleware/auth');
const Produit = require('../models/Produit');
const { journaliser, differences, GNF } = require('../utils/journal');

const CHAMPS_PRODUIT = {
  nom: 'Nom', reference: 'Référence', unite: 'Unité', prixAchat: "Prix d'achat", prixVente: 'Prix de vente',
  seuilAlerte: "Seuil d'alerte", quantiteMaximale: 'Stock maximum',
};
const chargerProduit = (req) => Produit.findById(req.params.id).select('nom reference unite prixAchat prixVente seuilAlerte quantiteMaximale').lean();
const fmtChamp = (c, v) => (c === 'prixAchat' || c === 'prixVente') ? GNF(v) : String(v === '' ? '—' : v);

router.use(proteger);

router.get('/',                   ctrl.getProduits);
router.get('/:id',                ctrl.getProduit);
router.post('/',                  autoriser('admin','gestionnaire'),
  journaliser({ action:'produit_cree', entite:'produit', decrire:({ body }) => ({
    entiteId: body.data?._id,
    libelle: `Produit « ${body.data?.nom} » créé (stock initial ${body.data?.quantiteStock ?? 0} ${body.data?.unite || ''}, vente ${GNF(body.data?.prixVente)})`,
  }) }),
  ctrl.creerProduit);
router.put('/:id',                autoriser('admin','gestionnaire'),
  journaliser({ action:'produit_modifie', entite:'produit', charger:chargerProduit, decrire:({ avant, body, req }) => {
    const chg = differences(avant, body.data, CHAMPS_PRODUIT);
    const nom = body.data?.nom || avant?.nom;
    return {
      entiteId: req.params.id,
      libelle: chg.length ? `Produit « ${nom} » modifié : ` + chg.map(c => `${c.label} ${fmtChamp(c.champ, c.avant)} → ${fmtChamp(c.champ, c.apres)}`).join(' ; ') : `Produit « ${nom} » mis à jour`,
      details: chg.length ? { changements: chg } : undefined,
    };
  } }),
  ctrl.modifierProduit);
router.delete('/:id',             autoriser('admin'),
  journaliser({ action:'produit_archive', entite:'produit', charger:chargerProduit, decrire:({ avant, req }) => ({
    entiteId: req.params.id, libelle: `Produit « ${avant?.nom || req.params.id} » archivé`,
  }) }),
  ctrl.supprimerProduit);
router.post('/:id/entree',        autoriser('admin','gestionnaire'),
  journaliser({ action:'stock_entree', entite:'produit', decrire:({ body, req }) => {
    const m = body.data?.mouvement, p = body.data?.produit;
    return { entiteId: req.params.id, libelle: `Entrée de stock : +${m?.quantite} ${p?.unite || ''} « ${p?.nom} » (${m?.quantiteAvant} → ${m?.quantiteApres})${m?.motif ? ` — ${m.motif}` : ''}`,
      details: { quantite: m?.quantite, avant: m?.quantiteAvant, apres: m?.quantiteApres, motif: m?.motif, fournisseur: m?.fournisseur } };
  } }),
  ctrl.entreeStock);
router.post('/:id/sortie',        autoriser('admin','gestionnaire'),
  journaliser({ action:'stock_sortie', entite:'produit', decrire:({ body, req }) => {
    const m = body.data?.mouvement, p = body.data?.produit;
    return { entiteId: req.params.id, libelle: `Sortie de stock : −${m?.quantite} ${p?.unite || ''} « ${p?.nom} » (${m?.quantiteAvant} → ${m?.quantiteApres})${m?.motif ? ` — ${m.motif}` : ''}`,
      details: { quantite: m?.quantite, avant: m?.quantiteAvant, apres: m?.quantiteApres, motif: m?.motif, client: m?.client } };
  } }),
  ctrl.sortieStock);

module.exports = router;
