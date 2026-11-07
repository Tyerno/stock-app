import { fmt } from './format';
import { lireBoutiqueLocale } from './boutique';
import { numeroWhatsApp } from './bonCommande';

const jour = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const clair = (n) => fmt(n).replace(/[  ]/g, ' ');

export const peutRelancer = (dette) => dette.statut !== 'PAYEE' && !!numeroWhatsApp(dette.client?.telephone);

// Message poli de rappel, adapté selon que l'échéance est dépassée ou non.
export function messageRappel(dette) {
  const b = lireBoutiqueLocale();
  const reste = clair(dette.montantRestant);
  const debut = new Date(); debut.setUTCHours(0, 0, 0, 0);
  const echeance = dette.dateEcheance ? new Date(dette.dateEcheance) : null;
  const depasse = echeance && echeance < debut;
  let m = `Bonjour ${dette.client?.nom || ''}, ici ${b.nom}. `;
  if (depasse) m += `Sauf erreur de notre part, il vous reste ${reste} GNF à régler, dont l'échéance du ${jour(echeance)} est dépassée. `;
  else if (echeance) m += `Petit rappel : il vous reste ${reste} GNF à régler d'ici le ${jour(echeance)}. `;
  else m += `Petit rappel : il vous reste ${reste} GNF à régler. `;
  m += `Vous pouvez passer à la boutique${b.telephone ? ` ou nous appeler au ${b.telephone}` : ''}. Merci de votre confiance !`;
  return m;
}

export const lienRappel = (dette) =>
  `https://wa.me/${numeroWhatsApp(dette.client?.telephone)}?text=${encodeURIComponent(messageRappel(dette))}`;
