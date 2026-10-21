// Copie locale des infos de la boutique : les reçus (Ventes, Dettes) les lisent dans localStorage.
// La source de vérité est la base de données (/api/boutique) ; cette copie est rafraîchie à chaque
// chargement de l'application et à chaque sauvegarde dans Paramètres.
export const CHAMPS_BOUTIQUE = ['nom', 'adresse', 'telephone', 'email', 'devise', 'ville', 'pays'];

export const DEFAUTS_BOUTIQUE = { nom: 'StockBTP', adresse: '', telephone: '', email: '', devise: 'GNF', ville: 'Conakry', pays: 'Guinée' };

export function lireBoutiqueLocale() {
  const o = {};
  CHAMPS_BOUTIQUE.forEach((k) => {
    let v = null;
    try { v = localStorage.getItem(`boutique_${k}`); } catch { /* stockage indisponible */ }
    o[k] = v || DEFAUTS_BOUTIQUE[k];
  });
  return o;
}

export function memoriserBoutique(data) {
  CHAMPS_BOUTIQUE.forEach((k) => {
    try { localStorage.setItem(`boutique_${k}`, data?.[k] ?? ''); } catch { /* stockage indisponible */ }
  });
}
