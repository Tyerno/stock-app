const Mouvement = require('../models/Mouvement');
const Produit   = require('../models/Produit');

// ─── Moteur de prévision IA ───────────────────────────────────────────────────
// Calcule la consommation moyenne, tendance, jours avant rupture
// et quantité optimale à commander pour chaque produit

async function calculerPrevision(produit, jours = 30) {
  const debut = new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
  const debutPrecedent = new Date(Date.now() - jours * 2 * 24 * 60 * 60 * 1000);

  // ─── Sorties sur la période actuelle ─────────────────────────────────────
  const sortiesActuelles = await Mouvement.aggregate([
    {
      $match: {
        produit:    produit._id,
        type:       { $in: ['sortie', 'perte'] },
        createdAt:  { $gte: debut },
      },
    },
    { $group: { _id: null, total: { $sum: '$quantite' } } },
  ]);

  // ─── Sorties sur la période précédente (pour calculer tendance) ───────────
  const sortiesPrecedentes = await Mouvement.aggregate([
    {
      $match: {
        produit:   produit._id,
        type:      { $in: ['sortie', 'perte'] },
        createdAt: { $gte: debutPrecedent, $lt: debut },
      },
    },
    { $group: { _id: null, total: { $sum: '$quantite' } } },
  ]);

  // ─── Sorties par jour (pour détecter les pics) ────────────────────────────
  const sortiesParJour = await Mouvement.aggregate([
    {
      $match: {
        produit:   produit._id,
        type:      { $in: ['sortie', 'perte'] },
        createdAt: { $gte: debut },
      },
    },
    {
      $group: {
        _id:      { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        quantite: { $sum: '$quantite' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalActuel    = sortiesActuelles[0]?.total    || 0;
  const totalPrecedent = sortiesPrecedentes[0]?.total  || 0;

  // ─── Consommation moyenne journalière ─────────────────────────────────────
  const consommationJournaliere = totalActuel / jours;

  // ─── Tendance (% de variation entre les deux périodes) ───────────────────
  let tendance = 0;
  if (totalPrecedent > 0) {
    tendance = ((totalActuel - totalPrecedent) / totalPrecedent) * 100;
  }

  // ─── Consommation ajustée avec la tendance ────────────────────────────────
  const facteurTendance  = 1 + (tendance / 100) * 0.5; // pondéré à 50%
  const consommationAjustee = consommationJournaliere * Math.max(0.5, facteurTendance);

  // ─── Jours avant rupture ──────────────────────────────────────────────────
  let joursAvantRupture = null;
  if (consommationAjustee > 0) {
    joursAvantRupture = Math.floor(produit.quantiteStock / consommationAjustee);
  }

  // ─── Quantité optimale à commander ───────────────────────────────────────
  // Stock de sécurité = 15 jours de consommation
  // Stock cible       = 45 jours de consommation
  const stockSecurite = Math.ceil(consommationAjustee * 15);
  const stockCible    = Math.ceil(consommationAjustee * 45);
  const quantiteACommander = Math.max(0, stockCible - produit.quantiteStock);

  // ─── Niveau de risque ─────────────────────────────────────────────────────
  let risque = 'faible';
  if (joursAvantRupture !== null) {
    if (joursAvantRupture <= 3)  risque = 'critique';
    else if (joursAvantRupture <= 7)  risque = 'eleve';
    else if (joursAvantRupture <= 15) risque = 'moyen';
  }
  if (produit.quantiteStock === 0) risque = 'rupture';

  // ─── Score de fiabilité (0-100) ───────────────────────────────────────────
  // Plus on a de données, plus la prévision est fiable
  const nbJoursAvecDonnees = sortiesParJour.length;
  const fiabilite = Math.min(100, Math.round((nbJoursAvecDonnees / jours) * 100));

  return {
    produitId:            produit._id,
    nomProduit:           produit.nom,
    reference:            produit.reference,
    categorie:            produit.categorie,
    unite:                produit.unite,
    stockActuel:          produit.quantiteStock,
    seuilAlerte:          produit.seuilAlerte,
    consommationJournaliere: Math.round(consommationJournaliere * 100) / 100,
    consommationAjustee:  Math.round(consommationAjustee * 100) / 100,
    tendance:             Math.round(tendance),
    joursAvantRupture,
    quantiteACommander:   Math.ceil(quantiteACommander),
    stockSecurite:        Math.ceil(stockSecurite),
    risque,
    fiabilite,
    totalVendu30j:        Math.round(totalActuel),
    fournisseur:          produit.fournisseur,
  };
}

// ─── Endpoint principal ───────────────────────────────────────────────────────
exports.getPrevisions = async (req, res) => {
  try {
    const { jours = 30 } = req.query;

    // Récupérer tous les produits actifs
    const produits = await Produit.find({ actif: true })
      .populate('categorie', 'nom couleur')
      .select('nom reference categorie unite quantiteStock seuilAlerte prixAchat prixVente fournisseur');

    // Calculer les prévisions en parallèle
    const previsions = await Promise.all(
      produits.map(p => calculerPrevision(p, Number(jours)))
    );

    // ─── Trier par risque ─────────────────────────────────────────────────
    const ordre = { rupture:0, critique:1, eleve:2, moyen:3, faible:4 };
    previsions.sort((a, b) => ordre[a.risque] - ordre[b.risque]);

    // ─── Statistiques globales ────────────────────────────────────────────
    const stats = {
      totalProduits:      previsions.length,
      enRupture:          previsions.filter(p => p.risque === 'rupture').length,
      risqueCritique:     previsions.filter(p => p.risque === 'critique').length,
      risqueEleve:        previsions.filter(p => p.risque === 'eleve').length,
      risqueMoyen:        previsions.filter(p => p.risque === 'moyen').length,
      risqueFaible:       previsions.filter(p => p.risque === 'faible').length,
      commandesUrgentes:  previsions.filter(p => ['rupture','critique','eleve'].includes(p.risque) && p.quantiteACommander > 0).length,
      valeurCommandeEstimee: previsions.reduce((s, p) => {
        return s + (p.quantiteACommander * (p.prixAchat || 0));
      }, 0),
    };

    res.json({ success: true, data: { previsions, stats, periode: Number(jours) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Prévision pour un produit spécifique ────────────────────────────────────
exports.getPrevisionProduit = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id)
      .populate('categorie', 'nom couleur');
    if (!produit) return res.status(404).json({ success: false, message: 'Produit introuvable' });

    const { jours = 30 } = req.query;

    // Historique détaillé des 90 derniers jours
    const debut = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const historique = await Mouvement.aggregate([
      { $match: { produit: produit._id, type: { $in: ['sortie','perte'] }, createdAt: { $gte: debut } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, quantite: { $sum: '$quantite' } } },
      { $sort: { _id: 1 } },
    ]);

    const prevision = await calculerPrevision(produit, Number(jours));

    // Projections sur les 30 prochains jours
    const projections = [];
    let stockSimule = produit.quantiteStock;
    for (let i = 1; i <= 30; i++) {
      stockSimule = Math.max(0, stockSimule - prevision.consommationAjustee);
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      projections.push({
        date:  date.toISOString().slice(0, 10),
        stock: Math.round(stockSimule * 10) / 10,
      });
    }

    res.json({ success: true, data: { prevision, historique, projections } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
