import { fmt } from './format';

const MODES = { especes: 'Espèces', mobile_money: 'Mobile Money', mixte: 'Mixte' };
export const libelleMode = (m) => MODES[m] || m;

export function evolution(actuel, precedent) {
  if (!precedent) return actuel ? null : 0;
  return Math.round(((actuel - precedent) / precedent) * 100);
}

// Texte prêt pour WhatsApp (*gras* géré par WhatsApp).
export function texteRapport(r, nomBoutique = 'Ma boutique') {
  const d = new Date(r.date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const L = [];
  L.push(`📊 *Rapport du jour — ${nomBoutique}*`, d, '');
  L.push('💰 *Ventes*');
  if (!r.ventes.nb) L.push('Aucune vente enregistrée.');
  else {
    L.push(`• ${r.ventes.nb} vente(s) — *${fmt(r.ventes.ca)} GNF*`);
    const ev = evolution(r.ventes.ca, r.ventes.caVeille);
    if (ev !== null && r.ventes.caVeille) L.push(`• Veille : ${fmt(r.ventes.caVeille)} GNF (${ev >= 0 ? '+' : ''}${ev} %)`);
    L.push(`• Panier moyen : ${fmt(r.ventes.panierMoyen)} GNF`);
    r.ventes.parMode.forEach((m) => L.push(`• ${libelleMode(m.mode)} : ${fmt(m.total)} GNF (${m.nb})`));
    if (r.ventes.remises > 0) L.push(`• Remises accordées : ${fmt(r.ventes.remises)} GNF`);
  }
  if (r.ventes.annulees.nb) L.push(`• ⚠️ ${r.ventes.annulees.nb} vente(s) annulée(s) — ${fmt(r.ventes.annulees.total)} GNF`);
  if (r.topProduits.length) {
    L.push('', '🏆 *Meilleures ventes*');
    r.topProduits.forEach((p, i) => L.push(`${i + 1}. ${p.nom} — ${fmt(p.quantite)} ${p.unite} (${fmt(p.montant)} GNF)`));
  }
  if (r.finances) {
    L.push('', '📈 *Résultat estimé*');
    if (r.finances.depenses) L.push(`• Dépenses : ${fmt(r.finances.depenses)} GNF`);
    L.push(`• Bénéfice net : *${fmt(r.finances.beneficeNet)} GNF*`);
  }
  L.push('', '🧾 *Dettes clients*');
  L.push(`• Nouvelles : ${r.dettes.nouvelles.nb} (${fmt(r.dettes.nouvelles.total)} GNF)`);
  L.push(`• Encaissé : ${fmt(r.dettes.encaisse.total)} GNF`);
  L.push(`• Reste à recouvrer : *${fmt(r.dettes.enCours.total)} GNF* (${r.dettes.enCours.nb} dette(s)${r.dettes.enCours.enRetard ? `, ${r.dettes.enCours.enRetard} en retard` : ''})`);
  L.push('', '📦 *Stock*');
  L.push(`• Valeur du stock : ${fmt(r.stock.valeurStock)} GNF`);
  if (r.stock.entrees) L.push(`• ${r.stock.entrees} entrée(s) de marchandise`);
  if (r.stock.nbRuptures) L.push(`• 🔴 ${r.stock.nbRuptures} rupture(s) : ${r.stock.ruptures.slice(0, 6).join(', ')}${r.stock.nbRuptures > 6 ? '…' : ''}`);
  if (r.stock.nbFaibles) L.push(`• 🟠 ${r.stock.nbFaibles} stock(s) faible(s) : ${r.stock.faibles.slice(0, 6).map((p) => `${p.nom} (${fmt(p.quantite)})`).join(', ')}${r.stock.nbFaibles > 6 ? '…' : ''}`);
  if (!r.stock.nbRuptures && !r.stock.nbFaibles) L.push('• ✅ Aucune alerte de stock');
  return L.join('\n');
}
