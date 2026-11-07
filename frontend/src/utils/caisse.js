import { fmt } from './format';

export const CATEGORIES_DEPENSE = [
  { id: 'transport',    label: 'Transport' },
  { id: 'salaire',      label: 'Salaire' },
  { id: 'loyer',        label: 'Loyer' },
  { id: 'electricite',  label: 'Électricité' },
  { id: 'achat_divers', label: 'Achats divers' },
  { id: 'reparation',   label: 'Réparation' },
  { id: 'autre',        label: 'Autre' },
];
export const libelleCategorie = (id) => CATEGORIES_DEPENSE.find((c) => c.id === id)?.label || 'Autre';

export const aujourdhui = () => new Date().toISOString().slice(0, 10);
export const decaler = (j, n) => new Date(new Date(j + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
export const jourLong = (j) => new Date(j + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Espèces attendues = fond + entrées espèces − dépenses payées en caisse
export const attendues = (c, fond) => Math.round((Number(fond) || 0) + c.entreesEspeces - c.depenses.caisse);

export function texteCaisse(c, { nomBoutique = 'Ma boutique', fond, comptees, note } = {}) {
  const L = [`💼 *Clôture de caisse — ${nomBoutique}*`, jourLong(c.jour), ''];
  L.push('💰 *Ventes*', `• ${c.ventes.nb} vente(s) — *${fmt(c.ventes.ca)} GNF*`);
  const m = c.ventes.parMode;
  if (m.especes) L.push(`• Espèces : ${fmt(m.especes)} GNF`);
  if (m.mobile_money) L.push(`• Mobile Money : ${fmt(m.mobile_money)} GNF`);
  if (m.mixte) L.push(`• Paiement mixte : ${fmt(m.mixte)} GNF`);
  if (c.ventes.credit) L.push(`• Laissé à crédit : ${fmt(c.ventes.credit)} GNF`);
  if (c.retours?.nb) L.push(`• Retours / échanges : ${c.retours.nb} (${fmt(c.retours.valeur)} GNF repris)`);
  if (c.encaissementsDettes) L.push(`• Dettes encaissées : ${fmt(c.encaissementsDettes)} GNF`);
  if (c.depenses.total) {
    L.push('', '🧾 *Dépenses*');
    c.depenses.liste.slice(0, 10).forEach((d) => L.push(`• ${d.libelle} : ${fmt(d.montant)} GNF`));
    L.push(`• Total : ${fmt(c.depenses.total)} GNF`);
  }
  L.push('', `📈 Bénéfice net estimé : *${fmt(c.beneficeNet)} GNF*`);
  if (comptees !== undefined && comptees !== null && comptees !== '') {
    const att = attendues(c, fond);
    const ec = Math.round(Number(comptees) - att);
    L.push('', '🔐 *Caisse*', `• Attendu : ${fmt(att)} GNF`, `• Compté : ${fmt(Number(comptees))} GNF`,
      ec === 0 ? '• ✅ Caisse juste' : `• ${ec < 0 ? '🔴 Manque' : '🟠 Surplus'} : ${fmt(Math.abs(ec))} GNF`);
    if (note) L.push(`• Note : ${note}`);
  }
  return L.join('\n');
}
