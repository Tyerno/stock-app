import { fmt, fmtDate } from './format';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Reçu ticket (80 mm) pour UN paiement d'une dette. `index` = position dans dette.paiements.
// Les montants "déjà versé" et "reste à payer" sont recalculés à la date du paiement.
export function imprimerRecuPaiement(dette, index) {
  const paiements = dette.paiements || [];
  const p = paiements[index];
  if (!p) return;

  const versesAvant = paiements.slice(0, index).reduce((t, x) => t + x.montant, 0);
  const apres       = versesAvant + p.montant;
  const reste       = Math.max(dette.montantInitial - apres, 0);
  const numero      = `P-${String(dette._id).slice(-6).toUpperCase()}-${index + 1}`;

  const nomBoutique = localStorage.getItem('boutique_nom')       || 'StockBTP';
  const adresse     = localStorage.getItem('boutique_adresse')   || 'Conakry, Guinée';
  const telephone   = localStorage.getItem('boutique_telephone') || '';

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
  <title>Reçu ${esc(numero)}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:10px;font-size:12px;color:#111}.center{text-align:center}.bold{font-weight:700}.divider{border-top:1px dashed #aaa;margin:8px 0}.row{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;font-size:11px}.muted{color:#666}.total-row{display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-top:1px solid #ccc;padding-top:6px;margin-top:6px}@media print{body{margin:0}}</style>
  </head><body>
  <div class="center" style="margin-bottom:12px">
    <div class="bold" style="font-size:16px">⚡ ${esc(nomBoutique)}</div>
    <div class="muted" style="font-size:10px">${esc(adresse)}</div>
    ${telephone ? `<div class="muted" style="font-size:10px">Tél: ${esc(telephone)}</div>` : ''}
    <div class="divider"></div>
    <div class="bold" style="font-size:13px">REÇU DE PAIEMENT</div>
    <div class="muted" style="font-size:10px">N° ${esc(numero)}</div>
  </div>
  <div class="row"><span class="muted">Date :</span><span>${esc(fmtDate(p.date))}</span></div>
  <div class="row"><span class="muted">Client :</span><span class="bold">${esc(dette.client?.nom)}</span></div>
  ${dette.client?.telephone ? `<div class="row"><span class="muted">Tél :</span><span>${esc(dette.client.telephone)}</span></div>` : ''}
  ${p.note ? `<div class="row"><span class="muted">Note :</span><span>${esc(p.note)}</span></div>` : ''}
  <div class="divider"></div>
  <div class="row"><span class="muted">Dette initiale :</span><span>${fmt(dette.montantInitial)} GNF</span></div>
  <div class="row"><span class="muted">Déjà versé :</span><span>${fmt(versesAvant)} GNF</span></div>
  <div class="total-row"><span>PAYÉ :</span><span>${fmt(p.montant)} GNF</span></div>
  <div class="row" style="margin-top:6px"><span class="muted">Reste à payer :</span><span class="bold">${fmt(reste)} GNF</span></div>
  ${reste === 0 ? '<div class="center bold" style="margin-top:6px">✓ DETTE SOLDÉE</div>' : ''}
  <div class="divider"></div>
  <div class="center muted" style="font-size:10px">
    <div class="bold">Merci pour votre paiement !</div>
    <div style="margin-top:2px">Conservez ce reçu comme preuve de paiement</div>
  </div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);};</script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return false; // pop-up bloquée
  win.document.write(html);
  win.document.close();
  return true;
}
