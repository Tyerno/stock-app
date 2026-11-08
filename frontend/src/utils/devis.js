// Statuts d'un devis. « Expiré » n'est pas stocké : c'est un devis en cours dont la date de validité est passée.
export const STATUT_DEVIS = {
  en_cours: { label: 'En cours',          cls: 'bg-indigo-100 text-indigo-700' },
  expire:   { label: 'Expiré',            cls: 'bg-amber-100 text-amber-700' },
  converti: { label: 'Converti en vente', cls: 'bg-emerald-100 text-emerald-700' },
  refuse:   { label: 'Refusé',            cls: 'bg-slate-200 text-slate-600' },
};
export const statutDevis = (d) => (d.statut === 'en_cours' && d.expire ? 'expire' : d.statut);
