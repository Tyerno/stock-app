const Mouvement = require('../models/Mouvement');
const Produit   = require('../models/Produit');
const BonCommande = require('../models/BonCommande');
const {
  analyserProduit, classerABC, construireSerie, genererInsights, HIST_MAX, JOUR, cle,
} = require('../utils/previsionMoteur');

// ─── Calcul global (une seule requête sur les mouvements) ────────────────────
async function calculerTout(joursDemandes, detailId = null) {
  const jours = Math.min(180, Math.max(7, parseInt(joursDemandes, 10) || 30));
  const hist  = Math.min(HIST_MAX, Math.max(90, jours * 2));
  const maintenant = Date.now();
  const finMs = maintenant - JOUR; // la journée en cours est incomplète : exclue de l'historique
  const debut = new Date(cle(finMs - (hist - 1) * JOUR) + 'T00:00:00.000Z');

  const [produits, lignes, commandes] = await Promise.all([
    Produit.find({ actif: true })
      .populate('categorie', 'nom couleur')
      .select('nom reference categorie unite quantiteStock quantiteMaximale seuilAlerte prixAchat prixVente fournisseur createdAt'),
    Mouvement.aggregate([
      { $match: { type: { $in: ['sortie', 'retour'] }, createdAt: { $gte: debut } } },
      {
        $group: {
          _id: {
            p: '$produit',
            j: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            t: '$type',
          },
          q: { $sum: '$quantite' },
        },
      },
    ]),
    // Marchandise déjà commandée (bons envoyés, pas encore reçus)
    BonCommande.aggregate([
      { $match: { statut: 'envoye' } },
      { $unwind: '$lignes' },
      { $group: { _id: '$lignes.produit', q: { $sum: '$lignes.quantite' } } },
    ]),
  ]);
  const enCommande = new Map(commandes.map((c) => [String(c._id), c.q]));

  // Demande nette par produit et par jour = sorties − retours (ventes annulées)
  const parProduit = new Map();
  for (const l of lignes) {
    const id = String(l._id.p);
    if (!parProduit.has(id)) parProduit.set(id, new Map());
    const m = parProduit.get(id);
    m.set(l._id.j, (m.get(l._id.j) || 0) + (l._id.t === 'sortie' ? l.q : -l.q));
  }

  // Séries et ancienneté de chaque produit
  const prep = produits.map((p) => {
    const m = parProduit.get(String(p._id)) || new Map();
    let age = p.createdAt ? Math.floor((maintenant - new Date(p.createdAt).getTime()) / JOUR) : hist;
    for (const j of m.keys()) {
      age = Math.max(age, Math.floor((maintenant - new Date(j + 'T00:00:00Z').getTime()) / JOUR));
    }
    const n = Math.max(0, Math.min(hist, age));
    const serie = construireSerie(m, finMs, n);
    const valeur = serie.reduce((s, x) => s + x, 0) * (Number(p.prixVente) || Number(p.prixAchat) || 0);
    return { p, serie, age, valeur };
  });

  const classes = classerABC(prep.map((x) => ({ id: String(x.p._id), valeur: x.valeur })));

  const previsions = prep.map((x) =>
    analyserProduit({
      produit: x.p,
      serie: x.serie,
      ageJours: x.age,
      jours,
      classe: classes.get(String(x.p._id)),
      finMs,
      enCommande: enCommande.get(String(x.p._id)) || 0,
      avecDetail: detailId !== null && String(x.p._id) === String(detailId),
    })
  );

  return { jours, finMs, hist, previsions, produits, prep };
}

// ─── Endpoint principal ───────────────────────────────────────────────────────
exports.getPrevisions = async (req, res) => {
  try {
    const { jours, previsions } = await calculerTout(req.query.jours);

    const ordre = { rupture: 0, critique: 1, eleve: 2, moyen: 3, faible: 4 };
    previsions.sort(
      (a, b) =>
        ordre[a.risque] - ordre[b.risque] ||
        (a.joursAvantRupture ?? 9999) - (b.joursAvantRupture ?? 9999) ||
        b.valeurCommande - a.valeurCommande
    );

    const nb = (r) => previsions.filter((p) => p.risque === r).length;
    const urgents = previsions.filter((p) => ['rupture', 'critique', 'eleve'].includes(p.risque) && p.quantiteACommander > 0);
    const total = previsions.length;
    const penal = nb('rupture') * 1 + nb('critique') * 0.8 + nb('eleve') * 0.5 + nb('moyen') * 0.2;
    const avecData = previsions.filter((p) => p.etat !== 'nouveau');

    const stats = {
      totalProduits: total,
      enRupture: nb('rupture'),
      risqueCritique: nb('critique'),
      risqueEleve: nb('eleve'),
      risqueMoyen: nb('moyen'),
      risqueFaible: nb('faible'),
      commandesUrgentes: urgents.length,
      valeurCommandeEstimee: urgents.reduce((s, p) => s + p.valeurCommande, 0),
      valeurCommandeTotale: previsions.reduce((s, p) => s + p.valeurCommande, 0),
      valeurStock: previsions.reduce((s, p) => s + p.valeurStock, 0),
      valeurDormante: previsions.filter((p) => p.etat === 'dormant').reduce((s, p) => s + p.valeurStock, 0),
      nbDormants: previsions.filter((p) => p.etat === 'dormant').length,
      nbSurstock: previsions.filter((p) => p.etat === 'surstock').length,
      nbClasseA: previsions.filter((p) => p.classeABC === 'A' && p.totalVendu30j > 0).length,
      scoreSante: total ? Math.max(0, Math.round(100 * (1 - penal / total))) : 100,
      fiabiliteMoyenne: avecData.length ? Math.round(avecData.reduce((s, p) => s + p.fiabilite, 0) / avecData.length) : 0,
    };

    const insights = genererInsights(previsions, stats);
    res.json({
      success: true,
      data: { previsions, stats, insights, periode: jours, genereLe: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Prévision détaillée d'un produit ────────────────────────────────────────
exports.getPrevisionProduit = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }
    const { jours, finMs, previsions, prep } = await calculerTout(req.query.jours, req.params.id);
    const prevision = previsions.find((p) => String(p.produitId) === req.params.id);
    if (!prevision) return res.status(404).json({ success: false, message: 'Produit introuvable' });

    const x = prep.find((e) => String(e.p._id) === req.params.id);
    const n = x.serie.length;
    const historique = x.serie.map((q, i) => ({ _id: cle(finMs - (n - 1 - i) * JOUR), quantite: q }));
    const { projections } = prevision;
    delete prevision.projections;

    res.json({ success: true, data: { prevision, historique, projections, periode: jours } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
