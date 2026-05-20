export const formatMontant = (montant, devise = 'GNF') => {
  if (montant === null || montant === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant)) + ' ' + devise;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateHeure = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatNombre = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0);

export const statutStockBadge = (produit) => {
  if (produit.quantiteStock === 0)                        return { label: 'Rupture', cls: 'badge-red' };
  if (produit.quantiteStock <= produit.seuilAlerte)       return { label: 'Faible',  cls: 'badge-amber' };
  return { label: 'En stock', cls: 'badge-green' };
};

export const roleLabel = (role) => ({
  admin:        'Administrateur',
  gestionnaire: 'Gestionnaire',
  lecteur:      'Lecteur',
}[role] || role);

export const roleBadgeCls = (role) => ({
  admin:        'badge-blue',
  gestionnaire: 'badge-green',
  lecteur:      'badge-gray',
}[role] || 'badge-gray');

// ─── Raccourcis de formatage (utilisés dans les pages) ───────────────────────
// fmt = formatage nombre entier français (ex: 1 234)
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

// fmtM = formatage compact (ex: 1.2M, 45k)
export const fmtM = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
  return fmt(n);
};

// fmtDate = date + heure en format français
export const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

// inputCls = classe Tailwind standard pour tous les champs texte
export const inputCls = "w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300";
