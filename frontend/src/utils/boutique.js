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
  if (data && 'logo' in data) memoriserLogo(data.logo);
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Copie locale du logo (data URL) : la page de connexion et les reçus l'utilisent sans attendre le réseau.
const RE_LOGO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function lireLogoLocal() {
  try {
    const l = localStorage.getItem('boutique_logo') || '';
    return RE_LOGO.test(l) ? l : '';
  } catch { return ''; }
}

export function memoriserLogo(logo) {
  try {
    if (logo && RE_LOGO.test(logo)) localStorage.setItem('boutique_logo', logo);
    else localStorage.removeItem('boutique_logo');
  } catch { /* stockage indisponible */ }
}

// Échappe le texte inséré dans le HTML des reçus imprimés.
export const echapperHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Bloc <img> à placer en tête d'un reçu, ou chaîne vide s'il n'y a pas de logo.
export function logoRecuHtml() {
  const l = lireLogoLocal();
  return l ? `<img src="${l}" alt="" style="display:block;margin:0 auto 6px;max-width:60px;max-height:60px;object-fit:contain"/>` : '';
}
