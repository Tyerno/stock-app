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
  superadmin:   'Super Admin',
  admin:        'Administrateur',
  gestionnaire: 'Gestionnaire',
  lecteur:      'Lecteur',
}[role] || role);

export const roleBadgeCls = (role) => ({
  superadmin:   'badge-purple',
  admin:        'badge-blue',
  gestionnaire: 'badge-green',
  lecteur:      'badge-gray',
}[role] || 'badge-gray');
