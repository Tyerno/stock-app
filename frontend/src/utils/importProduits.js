// Lecture des fichiers d'import de produits (CSV ou Excel) côté navigateur.
const sansAccent = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const normaliser = (s) => sansAccent(String(s ?? '')).toLowerCase().replace(/[^a-z0-9]/g, '');

export const COLONNES = [
  { cle: 'nom',            titre: 'Nom',                  alias: ['nom', 'produit', 'designation', 'article', 'libelle', 'nomduproduit'], exemple: ['Ciment CPJ 42,5', 'Fer à béton 8mm', 'Sable fin'] },
  { cle: 'reference',      titre: 'Référence',            alias: ['reference', 'ref', 'code', 'codebarres', 'codebarre', 'sku'], exemple: ['CIM-001', 'FER-008', ''] },
  { cle: 'categorie',      titre: 'Catégorie',            alias: ['categorie', 'famille', 'rayon', 'type', 'groupe'], exemple: ['Liants', 'Fer', 'Agrégats'] },
  { cle: 'unite',          titre: 'Unité',                alias: ['unite', 'unit', 'conditionnement'], exemple: ['sac', 'unité', 'm³'] },
  { cle: 'prixAchat',      titre: "Prix d'achat",         alias: ['prixachat', 'prixdachat', 'achat', 'pa', 'cout', 'coutachat'], exemple: ['70000', '40000', '120000'] },
  { cle: 'prixVente',      titre: 'Prix de vente',        alias: ['prixvente', 'vente', 'pv', 'prix', 'prixdevente'], exemple: ['90000', '55000', '150000'] },
  { cle: 'quantite',       titre: 'Quantité en stock',    alias: ['quantite', 'qte', 'stock', 'stockinitial', 'quantitestock', 'quantiteenstock'], exemple: ['50', '200', '12'] },
  { cle: 'seuilAlerte',    titre: "Seuil d'alerte",       alias: ['seuil', 'seuilalerte', 'seuildalerte', 'alerte', 'stockmini', 'stockminimum'], exemple: ['10', '30', '3'] },
  { cle: 'fournisseur',    titre: 'Fournisseur',          alias: ['fournisseur', 'fournisseurnom'], exemple: ['Cimenterie', 'Sotrag', ''] },
  { cle: 'delaiLivraison', titre: 'Délai livraison (jours)', alias: ['delai', 'delailivraison', 'delaijours', 'delaidelivraison'], exemple: ['5', '3', ''] },
];

const MAX_OCTETS = 5 * 1024 * 1024;

function decoder(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

// Analyse CSV : guillemets, retours à la ligne dans une cellule, séparateur ; , ou tabulation.
export function analyserCSV(texte) {
  const t = texte.replace(/^﻿/, '');
  const premiere = t.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].map((s) => [s, premiere.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let ligne = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { ligne.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(cell); cell = '';
      rows.push(ligne); ligne = [];
    } else cell += c;
  }
  if (cell !== '' || ligne.length) { ligne.push(cell); rows.push(ligne); }
  return rows;
}

// Renvoie { lignes: [{nom, reference, …}], colonnesReconnues, colonnesIgnorees }
export async function lireFichier(fichier) {
  if (!fichier) throw new Error('Aucun fichier choisi.');
  if (fichier.size > MAX_OCTETS) throw new Error('Fichier trop volumineux (5 Mo maximum).');
  const nom = fichier.name.toLowerCase();
  let rows;
  if (nom.endsWith('.xlsx')) {
    const { default: readXlsxFile } = await import('read-excel-file');
    try { rows = await readXlsxFile(fichier); }
    catch { throw new Error("Ce fichier Excel n'a pas pu être lu. Ouvrez-le dans Excel, faites « Enregistrer sous » → CSV (séparateur point-virgule), puis réessayez."); }
  } else if (nom.endsWith('.csv') || nom.endsWith('.txt')) {
    rows = analyserCSV(decoder(await fichier.arrayBuffer()));
  } else if (nom.endsWith('.xls')) {
    throw new Error("Ancien format .xls non pris en charge : ouvrez le fichier dans Excel et faites « Enregistrer sous » → .xlsx ou CSV.");
  } else {
    throw new Error('Format non pris en charge. Utilisez un fichier .xlsx ou .csv.');
  }
  rows = rows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  if (rows.length < 2) throw new Error("Le fichier doit contenir une ligne d'en-têtes puis au moins un produit.");

  const entetes = rows[0].map(normaliser);
  const index = {};
  for (const col of COLONNES) {
    const i = entetes.findIndex((h) => col.alias.includes(h));
    if (i >= 0) index[col.cle] = i;
  }
  if (index.nom === undefined) throw new Error("Colonne « Nom » introuvable. Utilisez le modèle de fichier pour avoir les bons en-têtes.");
  if (index.categorie === undefined) throw new Error("Colonne « Catégorie » introuvable. Utilisez le modèle de fichier.");
  if (index.prixVente === undefined && index.prixAchat === undefined) throw new Error("Aucune colonne de prix (« Prix de vente » ou « Prix d'achat »).");

  const lignes = rows.slice(1).map((r) => {
    const o = {};
    for (const [cle, i] of Object.entries(index)) {
      const v = r[i];
      o[cle] = v instanceof Date ? '' : (v ?? '');
    }
    return o;
  });
  const reconnues = COLONNES.filter((c) => index[c.cle] !== undefined).map((c) => c.titre);
  const utilisees = new Set(Object.values(index));
  const ignorees = rows[0].filter((h, i) => !utilisees.has(i) && String(h ?? '').trim()).map(String);
  return { lignes, reconnues, ignorees };
}

// Modèle téléchargeable : CSV avec séparateur « ; » (s'ouvre bien dans Excel en français).
export function telechargerModele() {
  const esc = (v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lignes = [COLONNES.map((c) => c.titre)];
  for (let i = 0; i < 3; i++) lignes.push(COLONNES.map((c) => c.exemple[i]));
  const csv = '﻿' + lignes.map((l) => l.map(esc).join(';')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'modele-import-produits.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
