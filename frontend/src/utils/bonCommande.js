import { lireBoutiqueLocale, logoRecuHtml, echapperHtml as esc } from './boutique';

const nombre = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/ | /g, ' ');
const dateLongue = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export const STATUT_BON = {
  brouillon: { label: 'Brouillon', cls: 'bg-slate-200 text-slate-600' },
  envoye:    { label: 'Envoyé',    cls: 'bg-indigo-100 text-indigo-700' },
  recu:      { label: 'Reçu',      cls: 'bg-emerald-100 text-emerald-700' },
  annule:    { label: 'Annulé',    cls: 'bg-red-100 text-red-600' },
};

// ─── Impression (A4) ──────────────────────────────────────────────────────────
export function imprimerBon(bon) {
  const b = lireBoutiqueLocale();
  const logo = logoRecuHtml().replace('max-width:60px;max-height:60px', 'max-width:70px;max-height:70px').replace('margin:0 auto 6px', 'margin:0 0 6px');
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Bon de commande ${esc(bon.numero)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:28px 34px;font-size:13px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:26px}
    .nom{font-size:20px;font-weight:700}.muted{color:#666;font-size:12px;line-height:1.5}
    h1{font-size:22px;letter-spacing:1px;text-align:right}.num{text-align:right;color:#444;margin-top:4px}
    .bloc{border:1px solid #ddd;border-radius:8px;padding:12px 14px;margin-bottom:22px}
    .bloc b{display:block;font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;text-align:left;font-size:11px;text-transform:uppercase;color:#555;padding:8px 10px}
    td{padding:9px 10px;border-bottom:1px solid #eee;vertical-align:top}
    .r{text-align:right}.c{text-align:center}
    .total{display:flex;justify-content:flex-end;margin-top:14px}
    .total div{border-top:2px solid #111;padding-top:8px;font-size:16px;font-weight:700;min-width:240px;display:flex;justify-content:space-between}
    .note{margin-top:20px;padding:10px 12px;background:#f9fafb;border-radius:8px;font-size:12px}
    .sign{display:flex;justify-content:space-between;margin-top:60px;font-size:12px;color:#555}
    .sign div{width:44%;border-top:1px solid #999;padding-top:6px;text-align:center}
    @media print{body{padding:10mm}}
  </style></head><body>
  <div class="top">
    <div>${logo}<div class="nom">${esc(b.nom)}</div>
      <div class="muted">${esc(b.adresse)}${b.adresse && b.ville ? ', ' : ''}${esc(b.ville)}</div>
      ${b.telephone ? `<div class="muted">Tél : ${esc(b.telephone)}</div>` : ''}${b.email ? `<div class="muted">${esc(b.email)}</div>` : ''}</div>
    <div><h1>BON DE COMMANDE</h1><div class="num">N° ${esc(bon.numero)}</div><div class="num">Date : ${esc(dateLongue(bon.createdAt))}</div></div>
  </div>
  <div class="bloc"><b>Fournisseur</b><div style="font-size:15px;font-weight:700">${esc(bon.fournisseur?.nom)}</div>${bon.fournisseur?.contact ? `<div class="muted">${esc(bon.fournisseur.contact)}</div>` : ''}</div>
  <table><thead><tr><th>Produit</th><th>Réf.</th><th class="c">Qté</th><th class="r">Prix unitaire</th><th class="r">Montant</th></tr></thead><tbody>
  ${bon.lignes.map((l) => `<tr><td><b>${esc(l.nomProduit)}</b></td><td class="muted">${esc(l.reference || '')}</td><td class="c">${esc(nombre(l.quantite))} ${esc(l.unite || '')}</td><td class="r">${nombre(l.prixUnitaire)}</td><td class="r"><b>${nombre(l.sousTotal)}</b></td></tr>`).join('')}
  </tbody></table>
  <div class="total"><div><span>TOTAL</span><span>${nombre(bon.total)} ${esc(b.devise || 'GNF')}</span></div></div>
  ${bon.note ? `<div class="note"><b>Note :</b> ${esc(bon.note)}</div>` : ''}
  <div class="sign"><div>Pour ${esc(b.nom)}</div><div>Le fournisseur (bon pour accord)</div></div>
  </body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export function texteBon(bon) {
  const b = lireBoutiqueLocale();
  const lignes = bon.lignes.map((l) => `• ${nombre(l.quantite)} ${l.unite || ''} ${l.nomProduit} — ${nombre(l.prixUnitaire)} ${b.devise}`.replace(/\s+/g, ' '));
  return [
    `*BON DE COMMANDE ${bon.numero}*`,
    b.nom,
    `Date : ${dateLongue(bon.createdAt)}`,
    '',
    `Bonjour ${bon.fournisseur?.nom},`,
    'Nous souhaitons commander :',
    ...lignes,
    '',
    `*Total : ${nombre(bon.total)} ${b.devise}*`,
    ...(bon.note ? ['', `Note : ${bon.note}`] : []),
    '',
    'Merci de confirmer la disponibilité et le délai de livraison.',
  ].join('\n');
}

// Numéro WhatsApp tiré du champ « contact » du fournisseur (Guinée : indicatif 224 ajouté si absent).
export function numeroWhatsApp(contact) {
  const brut = String(contact || '');
  const chiffres = brut.replace(/\D/g, '');
  if (chiffres.length < 8) return '';
  if (brut.trim().startsWith('+')) return chiffres;
  if (chiffres.startsWith('00')) return chiffres.slice(2);
  if (chiffres.length === 9) return `224${chiffres}`;
  return chiffres;
}

export function lienWhatsApp(bon) {
  const num = numeroWhatsApp(bon.fournisseur?.contact);
  return `https://wa.me/${num}?text=${encodeURIComponent(texteBon(bon))}`;
}
