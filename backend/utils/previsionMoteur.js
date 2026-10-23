'use strict';
// ─── Moteur de prévision StockBTP ────────────────────────────────────────────
// Calculs 100 % locaux (aucun service externe, aucun coût) :
//  • demande : moyenne exponentielle (demi-vie 21 j) corrigée de la saisonnalité
//    hebdomadaire, tendance amortie et validée statistiquement (test t)
//  • jours exceptionnels (pics) détectés et atténués
//  • incertitude : écart-type des écarts → stock de sécurité, scénarios min/max
//  • réapprovisionnement : point de commande = demande pendant le délai
//    fournisseur + stock de sécurité ; quantité = stock cible − stock actuel
//  • classe ABC (valeur des ventes), stock dormant, surstock, indice de confiance

const JOUR = 86400000;
const HIST_MAX = 180;
const HORIZON = 180;
const PHI = 0.95; // amortissement de la tendance
const DEMI_VIE = 21;
const Z = { A: 1.88, B: 1.65, C: 1.28 };
const SERVICE = { A: 97, B: 95, C: 90 };
const CYCLE = { A: 21, B: 30, C: 45 };
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const somme = (a) => a.reduce((s, x) => s + x, 0);
const moy = (a) => (a.length ? somme(a) / a.length : 0);
const ecartType = (a) => {
  if (a.length < 2) return 0;
  const m = moy(a);
  return Math.sqrt(somme(a.map((x) => (x - m) ** 2)) / (a.length - 1));
};
const arr = (x, d = 1) => {
  const p = 10 ** d;
  return Math.round(x * p) / p;
};
const cle = (ms) => new Date(ms).toISOString().slice(0, 10);

// Série journalière (du plus ancien au plus récent) se terminant à finMs inclus
function construireSerie(parJour, finMs, n) {
  const s = [];
  for (let i = n - 1; i >= 0; i--) s.push(Math.max(0, parJour.get(cle(finMs - i * JOUR)) || 0));
  return s;
}

function prevoir(serie, finMs) {
  const n = serie.length;
  const vide = { y0: [], niveau: 0, pente: 0, f: Array(7).fill(1), sigma: 0, anomalies: 0, demandes: Array(HORIZON).fill(0) };
  if (n === 0) return vide;

  const wd = (i) => new Date(finMs - (n - 1 - i) * JOUR).getUTCDay();
  const m = moy(serie);
  const sd = ecartType(serie);
  const cap = m + 3 * sd;
  const anomalies = sd > 0 ? serie.filter((v) => v > cap).length : 0;
  const y0 = serie.map((v) => (sd > 0 ? Math.min(v, cap) : v));

  // Saisonnalité hebdomadaire (réduite vers 1 quand il y a peu d'observations)
  let f = Array(7).fill(1);
  const g = moy(y0);
  if (n >= 28 && g > 0) {
    const parJ = [[], [], [], [], [], [], []];
    y0.forEach((v, i) => parJ[wd(i)].push(v));
    f = parJ.map((vals) => {
      const w = vals.length / (vals.length + 4);
      return 1 + w * (moy(vals) / g - 1);
    });
    const mf = moy(f);
    f = f.map((x) => Math.min(3, Math.max(0, x / mf)));
  }

  // Niveau : moyenne pondérée exponentiellement des valeurs désaisonnalisées
  let sw = 0;
  let sv = 0;
  for (let i = 0; i < n; i++) {
    const fi = f[wd(i)];
    if (fi < 0.1) continue; // jour de fermeture habituel
    const w = 0.5 ** ((n - 1 - i) / DEMI_VIE);
    sw += w;
    sv += (w * y0[i]) / fi;
  }
  const niveau = sw > 0 ? sv / sw : 0;

  // Tendance : régression sur les moyennes hebdomadaires (≤ 8 semaines)
  let pente = 0;
  const nbSem = Math.min(8, Math.floor(n / 7));
  if (nbSem >= 4 && niveau > 0) {
    const y = [];
    for (let k = nbSem - 1; k >= 0; k--) {
      const fin = n - k * 7;
      y.push(moy(y0.slice(fin - 7, fin)));
    }
    const xm = (nbSem - 1) / 2;
    const ym = moy(y);
    let sxx = 0;
    let sxy = 0;
    y.forEach((v, x) => {
      sxx += (x - xm) ** 2;
      sxy += (x - xm) * (v - ym);
    });
    const b = sxy / sxx;
    const sse = somme(y.map((v, x) => (v - (ym + b * (x - xm))) ** 2));
    const se = Math.sqrt(sse / (nbSem - 2) / sxx);
    const t = se > 0 ? Math.abs(b) / se : b !== 0 ? 10 : 0;
    pente = (b / 7) * Math.min(1, t / 2); // atténuée si peu significative
  }

  // Incertitude : écart-type des écarts modèle/réel sur 8 semaines
  const fen = Math.min(n, 56);
  const res = [];
  for (let i = n - fen; i < n; i++) res.push(y0[i] - niveau * f[wd(i)]);
  let sigma = ecartType(res);
  if (n < 21) sigma = Math.max(sigma, niveau);

  // Demande prévue jour par jour (h = 1 → aujourd'hui)
  const demandes = [];
  let cumPhi = 0;
  let p = 1;
  for (let h = 1; h <= HORIZON; h++) {
    p *= PHI;
    cumPhi += p;
    let base = niveau + pente * cumPhi;
    base = Math.min(2.5 * niveau, Math.max(0.3 * niveau, base));
    const jourSem = new Date(finMs + h * JOUR).getUTCDay();
    demandes.push(Math.max(0, base * f[jourSem]));
  }
  return { y0, niveau, pente, f, sigma, anomalies, demandes };
}

function classerABC(items) {
  // items : [{ id, valeur }] → Map id → 'A'|'B'|'C'
  const total = somme(items.map((i) => i.valeur));
  const map = new Map();
  let cumul = 0;
  [...items].sort((a, b) => b.valeur - a.valeur).forEach((it) => {
    if (total <= 0 || it.valeur <= 0) return map.set(it.id, 'C');
    cumul += it.valeur;
    const part = cumul / total;
    map.set(it.id, part - it.valeur / total < 0.8 ? 'A' : part - it.valeur / total < 0.95 ? 'B' : 'C');
  });
  return map;
}

function premierJour(cum, seuil) {
  // plus petit h tel que cum[h-1] >= seuil (null si hors horizon)
  for (let h = 1; h <= cum.length; h++) if (cum[h - 1] >= seuil) return h;
  return null;
}

function analyserProduit({ produit, serie, ageJours, jours, classe, finMs, avecDetail = false }) {
  const n = serie.length;
  const stock = Math.max(0, Number(produit.quantiteStock) || 0);
  const unite = produit.unite || 'unité';
  const prixAchat = Number(produit.prixAchat) || 0;
  const delaiEstime = !(produit.fournisseur && produit.fournisseur.delaiLivraison > 0);
  const delai = Math.min(90, Math.max(1, Math.round(delaiEstime ? 7 : produit.fournisseur.delaiLivraison)));

  const mod = prevoir(serie, finMs);
  const { niveau, sigma, f, demandes } = mod;
  const cum = [];
  demandes.reduce((s, d, i) => (cum[i] = s + d), 0);

  // Période d'observation
  const jP = Math.max(1, Math.min(jours, n));
  const totalPeriode = somme(serie.slice(-jP));
  const jEff = Math.min(jP, Math.floor(n / 2));
  let tendance = 0;
  if (jEff >= 7) {
    const recent = somme(mod.y0.slice(-jEff));
    const avant = somme(mod.y0.slice(-2 * jEff, -jEff));
    if (avant > 0) tendance = ((recent - avant) / avant) * 100;
    else if (recent > 0) tendance = 100;
  }

  // Réapprovisionnement
  const classeOk = classe || 'B';
  const ss = Math.ceil(Z[classeOk] * sigma * Math.sqrt(delai));
  const demandeDelai = cum[delai - 1];
  const pointCommande = Math.ceil(demandeDelai + ss);
  const cible = Math.ceil(cum[Math.min(HORIZON, delai + CYCLE[classeOk]) - 1] + ss);

  let jMed = null;
  let jMin = null;
  let jMax = null;
  let joursAvantCommande = null;
  if (niveau > 0.0001) {
    const zz = 1.28;
    const hi = cum.map((c, i) => c + zz * sigma * Math.sqrt(i + 1));
    const lo = cum.map((c, i) => Math.max(0, c - zz * sigma * Math.sqrt(i + 1)));
    const h1 = premierJour(cum, stock);
    const h2 = premierJour(hi, stock);
    const h3 = premierJour(lo, stock);
    jMed = h1 === null ? null : Math.max(0, h1 - 1);
    jMin = h2 === null ? null : Math.max(0, h2 - 1);
    jMax = h3 === null ? null : Math.max(0, h3 - 1);
    if (stock <= pointCommande) joursAvantCommande = 0;
    else {
      for (let h = 1; h <= HORIZON; h++) {
        if (stock - cum[h - 1] <= pointCommande) {
          joursAvantCommande = h;
          break;
        }
      }
    }
  }

  let quantite = 0;
  if (niveau > 0.0001 && (stock <= pointCommande || (joursAvantCommande !== null && joursAvantCommande <= 2))) quantite = Math.ceil(Math.max(0, cible - stock));
  const seuil = Number(produit.seuilAlerte) || 0;
  const sousSeuil = seuil > 0 && stock <= seuil;
  if (sousSeuil && quantite === 0) quantite = Math.ceil(seuil * 2 - stock);
  if (produit.quantiteMaximale > 0) quantite = Math.min(quantite, Math.max(0, Math.ceil(produit.quantiteMaximale - stock)));

  // Indicateurs d'état
  const ventesRecentes = somme(serie.slice(-45));
  const evenements = serie.filter((v) => v > 0).length;
  const nouveau = ageJours < 14;
  const dormant = !nouveau && stock > 0 && ageJours >= 45 && ventesRecentes === 0;
  const couverture = niveau > 0.0001 ? stock / niveau : null;
  const surstock = !dormant && couverture !== null && couverture > 180 && stock > seuil * 2;
  const etat = nouveau ? 'nouveau' : dormant ? 'dormant' : surstock ? 'surstock' : 'normal';

  // Niveau de risque : comparé au délai de livraison
  let risque = 'faible';
  if (jMed !== null) {
    if (jMed < delai || (jMed <= delai && quantite > 0)) risque = 'critique';
    else if (jMed <= delai + 7) risque = 'eleve';
    else if (jMed <= delai + 21) risque = 'moyen';
  }
  if (sousSeuil && risque === 'faible') risque = 'moyen';
  if (stock <= 0 && (niveau > 0.0001 || seuil > 0)) risque = 'rupture';

  // Indice de confiance
  const cv = moy(serie) > 0 ? ecartType(serie) / moy(serie) : 0;
  let fiabilite = Math.round(100 * (0.4 * Math.min(1, n / 60) + 0.35 * Math.min(1, evenements / 15) + 0.25 / (1 + cv / 1.5)));
  if (n < 7) fiabilite = Math.min(fiabilite, 20);
  if (evenements === 0) fiabilite = Math.min(fiabilite, 25);
  fiabilite = Math.max(0, Math.min(100, fiabilite));
  const confiance = fiabilite >= 70 ? 'bonne' : fiabilite >= 40 ? 'moyenne' : 'faible';

  // Explications lisibles
  const moyPrevue = arr(moy(demandes.slice(0, 30)), 2);
  const raisons = [];
  raisons.push(
    n < 14
      ? `Historique très court (${n} jour${n > 1 ? 's' : ''}) : prévision indicative, elle se précisera avec les ventes.`
      : `Calcul basé sur ${n} jours d'historique dont ${evenements} jours avec ventes.`
  );
  if (niveau > 0.0001) {
    const sens = Math.abs(tendance) < 5 ? 'stable' : tendance > 0 ? `en hausse de ${Math.round(tendance)} %` : `en baisse de ${Math.round(-tendance)} %`;
    raisons.push(`Demande estimée à ${moyPrevue} ${unite}/jour sur 30 jours, ${sens} par rapport à la période précédente.`);
  } else {
    raisons.push('Aucune vente récente : pas de demande à prévoir.');
  }
  const iMax = f.indexOf(Math.max(...f));
  const iMin = f.indexOf(Math.min(...f));
  if (n >= 28 && f[iMax] >= 1.3) raisons.push(`Pic de ventes le ${JOURS_FR[iMax]} (+${Math.round((f[iMax] - 1) * 100)} % vs la moyenne).`);
  if (n >= 28 && f[iMin] <= 0.6) raisons.push(`Ventes faibles le ${JOURS_FR[iMin]}.`);
  raisons.push(
    `Livraison fournisseur : ${delai} j${delaiEstime ? ' (valeur par défaut — renseignez le délai dans la fiche produit)' : ''}. ` +
      `Stock de sécurité : ${ss} ${unite} (${SERVICE[classeOk]} % de couverture, produit de classe ${classeOk}).`
  );
  if (mod.anomalies > 0) raisons.push(`${mod.anomalies} jour${mod.anomalies > 1 ? 's' : ''} exceptionnel${mod.anomalies > 1 ? 's' : ''} détecté${mod.anomalies > 1 ? 's' : ''} : atténué${mod.anomalies > 1 ? 's' : ''} pour ne pas fausser la prévision.`);

  // Conseil en une phrase
  let conseil;
  if (risque === 'rupture') conseil = quantite > 0 ? `En rupture : commander ${quantite} ${unite} immédiatement.` : 'En rupture, sans demande récente : à réapprovisionner seulement si besoin.';
  else if (quantite > 0)
    conseil = `Commander ${quantite} ${unite}${joursAvantCommande ? ` d'ici ${joursAvantCommande} j` : ' maintenant'}${jMed !== null ? ` (rupture estimée dans ${jMed} j, livraison en ${delai} j)` : ''}.`;
  else if (etat === 'dormant') conseil = `Aucune vente depuis 45 jours : ne pas réapprovisionner, envisager une promotion.`;
  else if (etat === 'surstock') conseil = couverture > 365 ? `Plus d'un an de stock au rythme actuel : suspendre les achats.` : `Couverture d'environ ${Math.round(couverture)} jours : suspendre les achats.`;
  else if (etat === 'nouveau') conseil = 'Produit récent : attendre quelques jours de ventes pour une prévision fiable.';
  else conseil = jMed !== null ? `Stock suffisant pour environ ${jMed} jours.` : 'Stock suffisant.';

  // Mini-courbe : ventes des 8 dernières semaines
  const sparkline = [];
  for (let k = 7; k >= 0; k--) {
    const fin = n - k * 7;
    sparkline.push(arr(somme(serie.slice(Math.max(0, fin - 7), Math.max(0, fin))), 1));
  }

  const out = {
    produitId: produit._id,
    nomProduit: produit.nom,
    reference: produit.reference,
    categorie: produit.categorie,
    unite,
    stockActuel: stock,
    seuilAlerte: seuil,
    consommationJournaliere: arr(totalPeriode / jP, 2),
    consommationAjustee: moyPrevue,
    demandePrevue7j: Math.ceil(cum[6]),
    demandePrevue30j: Math.ceil(cum[29]),
    tendance: Math.round(tendance),
    joursAvantRupture: jMed,
    joursAvantRuptureMin: jMin,
    joursAvantRuptureMax: jMax,
    joursAvantCommande,
    dateCommande: joursAvantCommande === null ? null : cle(finMs + (1 + joursAvantCommande) * JOUR),
    delaiLivraison: delai,
    delaiEstime,
    pointCommande,
    quantiteACommander: quantite,
    stockSecurite: ss,
    stockCible: cible,
    prixAchat,
    valeurCommande: Math.round(quantite * prixAchat),
    valeurStock: Math.round(stock * prixAchat),
    classeABC: classeOk,
    etat,
    couverture: couverture === null ? null : Math.round(couverture),
    risque,
    fiabilite,
    confiance,
    totalVendu30j: Math.round(totalPeriode),
    anomalies: mod.anomalies,
    saisonnalite: f.map((x) => arr(x, 2)),
    sparkline,
    conseil,
    raisons,
    fournisseur: produit.fournisseur,
  };

  if (avecDetail) {
    const projections = [];
    for (let h = 1; h <= 30; h++) {
      const marge = 1.28 * sigma * Math.sqrt(h);
      projections.push({
        date: cle(finMs + h * JOUR),
        stock: arr(Math.max(0, stock - cum[h - 1]), 1),
        stockMin: arr(Math.max(0, stock - cum[h - 1] - marge), 1),
        stockMax: arr(Math.max(0, stock - cum[h - 1] + marge), 1),
        demande: arr(demandes[h - 1], 2),
      });
    }
    out.projections = projections;
  }
  return out;
}

// Constats globaux rédigés en français
function genererInsights(prev, stats) {
  const ins = [];
  const noms = (l, k = 3) => l.slice(0, k).map((p) => p.nomProduit).join(', ') + (l.length > k ? `… (+${l.length - k})` : '');
  const fmt = (v) => Math.round(v).toLocaleString('fr-FR').replace(/ | /g, ' ');

  const avantLivraison = prev.filter((p) => p.risque === 'critique' || p.risque === 'rupture').filter((p) => p.quantiteACommander > 0);
  if (avantLivraison.length) {
    ins.push({
      niveau: 'danger',
      titre: `${avantLivraison.length} produit${avantLivraison.length > 1 ? 's' : ''} à commander aujourd'hui`,
      texte: `${noms(avantLivraison)} : le stock ne tiendra pas jusqu'à la livraison. Budget estimé : ${fmt(avantLivraison.reduce((s, p) => s + p.valeurCommande, 0))} GNF.`,
      produitIds: avantLivraison.slice(0, 5).map((p) => p.produitId),
    });
  }
  const hausse = prev.filter((p) => p.tendance >= 40 && p.fiabilite >= 40 && p.totalVendu30j > 0).sort((a, b) => b.tendance - a.tendance);
  if (hausse.length) {
    ins.push({
      niveau: 'warning',
      titre: `Demande en forte hausse sur ${hausse.length} produit${hausse.length > 1 ? 's' : ''}`,
      texte: `${noms(hausse)} (jusqu'à +${hausse[0].tendance} %). Pensez à augmenter vos quantités d'achat.`,
      produitIds: hausse.slice(0, 5).map((p) => p.produitId),
    });
  }
  const baisse = prev.filter((p) => p.tendance <= -40 && p.fiabilite >= 40 && p.stockActuel > 0);
  if (baisse.length) {
    ins.push({
      niveau: 'info',
      titre: `Ventes en net recul sur ${baisse.length} produit${baisse.length > 1 ? 's' : ''}`,
      texte: `${noms(baisse)} : évitez de racheter au rythme habituel.`,
      produitIds: baisse.slice(0, 5).map((p) => p.produitId),
    });
  }
  const dormants = prev.filter((p) => p.etat === 'dormant');
  if (dormants.length) {
    ins.push({
      niveau: 'warning',
      titre: `${fmt(stats.valeurDormante)} GNF immobilisés dans ${dormants.length} produit${dormants.length > 1 ? 's' : ''} dormant${dormants.length > 1 ? 's' : ''}`,
      texte: `${noms(dormants)} : aucune vente depuis 45 jours. Promotion ou déstockage conseillés.`,
      produitIds: dormants.slice(0, 5).map((p) => p.produitId),
    });
  }
  const sur = prev.filter((p) => p.etat === 'surstock');
  if (sur.length) {
    ins.push({
      niveau: 'info',
      titre: `Surstock sur ${sur.length} produit${sur.length > 1 ? 's' : ''}`,
      texte: `${noms(sur)} : plus de 6 mois de couverture. Suspendez les achats.`,
      produitIds: sur.slice(0, 5).map((p) => p.produitId),
    });
  }
  const nbA = prev.filter((p) => p.classeABC === 'A' && p.totalVendu30j > 0).length;
  if (nbA > 0) {
    ins.push({
      niveau: 'info',
      titre: `${nbA} produit${nbA > 1 ? 's' : ''} « star${nbA > 1 ? 's' : ''} » (classe A)`,
      texte: `Ils génèrent environ 80 % de la valeur de vos ventes : leur stock est protégé en priorité (97 % de couverture).`,
    });
  }
  const peu = prev.filter((p) => p.etat !== 'nouveau' && p.fiabilite < 40 && p.etat !== 'dormant');
  if (peu.length >= 3) {
    ins.push({
      niveau: 'info',
      titre: `${peu.length} produits avec peu de données`,
      texte: `Leurs prévisions sont indicatives. Plus vous enregistrez de ventes, plus elles deviennent précises.`,
    });
  }
  const bons = ins.filter((i) => i.niveau === 'danger' || i.niveau === 'warning').length;
  if (bons === 0) {
    ins.unshift({ niveau: 'success', titre: 'Stock sain', texte: 'Aucun risque de rupture imminent détecté. Continuez ainsi !' });
  }
  return ins;
}

module.exports = { prevoir, analyserProduit, classerABC, construireSerie, genererInsights, HIST_MAX, JOUR, cle };
