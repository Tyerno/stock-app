import { lireBoutiqueLocale, logoRecuHtml, echapperHtml as esc } from './boutique';

// Feuille de comptage à imprimer : une case vide par produit, pour compter avec un stylo en rayon.
export function imprimerFeuille(inv) {
  const b = lireBoutiqueLocale();
  const logo = logoRecuHtml().replace('max-width:60px;max-height:60px', 'max-width:50px;max-height:50px').replace('margin:0 auto 6px', 'margin:0 0 4px');
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Feuille de comptage ${esc(inv.numero)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:18px 24px;font-size:12px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
    .nom{font-size:16px;font-weight:700}h1{font-size:17px;text-align:right}.sub{color:#555;font-size:11px;text-align:right;margin-top:3px}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;text-align:left;font-size:10px;text-transform:uppercase;color:#555;padding:6px 8px;border:1px solid #ccc}
    td{padding:7px 8px;border:1px solid #ccc}.case{width:110px}.obs{width:150px}.u{width:60px;color:#555}
    tr{page-break-inside:avoid}
    .sign{display:flex;justify-content:space-between;margin-top:30px;font-size:11px;color:#555}.sign div{width:44%;border-top:1px solid #999;padding-top:5px;text-align:center}
    @media print{body{padding:8mm}}
  </style></head><body>
  <div class="top"><div>${logo}<div class="nom">${esc(b.nom)}</div></div>
    <div><h1>FEUILLE DE COMPTAGE</h1><div class="sub">Inventaire ${esc(inv.numero)} · ${esc(inv.perimetre)}</div><div class="sub">Date : ____ / ____ / ________</div></div></div>
  <table><thead><tr><th>Produit</th><th>Réf.</th><th class="u">Unité</th><th class="case">Quantité comptée</th><th class="obs">Observations</th></tr></thead><tbody>
  ${inv.lignes.map((l) => `<tr><td><b>${esc(l.nomProduit)}</b></td><td>${esc(l.reference || '')}</td><td class="u">${esc(l.unite || '')}</td><td class="case"></td><td class="obs"></td></tr>`).join('')}
  </tbody></table>
  <div class="sign"><div>Compté par</div><div>Vérifié par</div></div></body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
