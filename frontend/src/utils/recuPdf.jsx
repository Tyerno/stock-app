// Reçus en PDF (ticket 80 mm) à envoyer directement au client, par WhatsApp ou autre application.
import toast from 'react-hot-toast';
import { fmt, fmtDate } from './format';
import { lireBoutiqueLocale, lireLogoLocal } from './boutique';
import { numeroWhatsApp } from './bonCommande';

const MODES = { especes: 'Espèces', mobile_money: 'Mobile Money', mixte: 'Mixte' };
// Police standard du PDF : on garde les caractères latins (accents compris) et on retire le reste (emojis…).
const net = (v) => String(v ?? '').replace(/[  ]/g, ' ').replace(/[^\x20-\x7E¡-ÿ’€]/g, '');
const nb = (n) => net(fmt(n));

// À appeler d'avance (ouverture de la fenêtre de reçu) : charge la librairie PDF pour que l'envoi soit immédiat.
export const prechargerPdf = () => { import('jspdf').catch(() => {}); };

const L = 80, M = 5, W = L - 2 * M;

function dessiner(doc, ticket, logo) {
  let y = M;
  const droite = L - M;
  const texte = (t, opts = {}) => {
    const { taille = 8.5, gras = false, couleur = 20, align = 'left', gap = 1.2 } = opts;
    doc.setFont('helvetica', gras ? 'bold' : 'normal').setFontSize(taille).setTextColor(...[].concat(couleur));
    const lignes = doc.splitTextToSize(net(t), W);
    for (const l of lignes) {
      y += taille * 0.3528 * 1.05;
      const x = align === 'center' ? L / 2 : align === 'right' ? droite : M;
      doc.text(l, x, y, { align });
    }
    y += gap;
  };
  const ligne = (g, d, o = {}) => {
    const { taille = 8.5, gras = false, couleurD = 20, couleurG = 110 } = o;
    doc.setFontSize(taille);
    doc.setFont('helvetica', 'normal').setTextColor(couleurG);
    const gauche = net(g), droit = net(d);
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    const largD = doc.getTextWidth(droit);
    doc.setFont('helvetica', 'normal');
    const lignesG = doc.splitTextToSize(gauche, Math.max(10, W - largD - 3));
    y += taille * 0.3528 * 1.05;
    lignesG.forEach((l, i) => { if (i) y += taille * 0.3528 * 1.1; doc.setTextColor(couleurG); doc.text(l, M, y); });
    doc.setFont('helvetica', gras ? 'bold' : 'normal').setTextColor(...[].concat(couleurD));
    doc.text(droit, droite, y, { align: 'right' });
    y += 1.4;
  };
  const sep = (plein = false) => {
    y += 1;
    doc.setDrawColor(plein ? 120 : 170).setLineWidth(plein ? 0.3 : 0.2);
    doc.setLineDashPattern(plein ? [] : [1, 1], 0);
    doc.line(M, y, droite, y);
    doc.setLineDashPattern([], 0);
    y += 2.2;
  };

  if (logo) {
    try {
      const props = doc.getImageProperties(logo.data);
      const h = 14, w = Math.min(30, h * (props.width / props.height));
      doc.addImage(logo.data, logo.format, (L - w) / 2, y, w, w === 30 ? 30 / (props.width / props.height) : h);
      y += (w === 30 ? 30 / (props.width / props.height) : h) + 2;
    } catch { /* logo illisible : ignoré */ }
  }
  ticket({ texte, ligne, sep, get y() { return y; } });
  return y;
}

export async function creerPdf(ticket) {
  const { jsPDF } = await import('jspdf');
  let logo = null;
  const l = lireLogoLocal();
  if (l) {
    const m = /^data:image\/(png|jpeg|webp);base64,/.exec(l);
    if (m) logo = { data: l, format: m[1].toUpperCase() };
  }
  const essai = new jsPDF({ unit: 'mm', format: [L, 400] });
  const hauteur = dessiner(essai, ticket, logo) + M;
  const doc = new jsPDF({ unit: 'mm', format: [L, Math.max(60, hauteur)] });
  dessiner(doc, ticket, logo);
  return doc.output('blob');
}

export const entete = (b, titre, numero) => ({ texte, sep }) => {
  texte(b.nom, { taille: 13, gras: true, align: 'center', gap: 0.6 });
  if (b.adresse) texte(b.adresse, { taille: 7.5, couleur: 110, align: 'center', gap: 0.3 });
  if (b.telephone) texte(`Tél : ${b.telephone}`, { taille: 7.5, couleur: 110, align: 'center', gap: 0.3 });
  sep();
  texte(titre, { taille: 10, gras: true, align: 'center', gap: 0.4 });
  if (numero) texte(`N° ${numero}`, { taille: 7.5, couleur: 110, align: 'center', gap: 1 });
};

// ─── Reçu de vente ────────────────────────────────────────────────────────────
export async function pdfRecuVente(vente) {
  const b = lireBoutiqueLocale();
  const recu = vente.montantRecu || 0;
  const reste = recu > 0 ? Math.max(0, vente.totalNet - recu) : 0;
  return creerPdf((c) => {
    entete(b, 'REÇU DE VENTE', vente.numero)(c);
    c.ligne('Date', fmtDate(vente.createdAt));
    c.ligne('Client', vente.client?.nom || 'Client comptoir', { gras: true });
    if (vente.client?.telephone) c.ligne('Tél', vente.client.telephone);
    if (vente.vendeur?.nom) c.ligne('Vendeur', vente.vendeur.nom);
    c.ligne('Paiement', MODES[vente.modePaiement] || vente.modePaiement);
    c.sep();
    for (const l of vente.lignes) {
      c.texte(l.nomProduit, { taille: 8.5, gras: true, gap: 0.2 });
      c.ligne(`${l.quantite} ${l.unite} x ${nb(l.prixUnitaire)}`, nb(l.sousTotal), { taille: 8, couleurD: 20 });
    }
    c.sep();
    c.ligne('Sous-total', `${nb(vente.totalHT)} GNF`);
    if (vente.remise > 0) c.ligne('Remise', `- ${nb(vente.remise)} GNF`, { couleurD: [200, 30, 30] });
    c.sep(true);
    c.ligne('TOTAL', `${nb(vente.totalNet)} GNF`, { taille: 11, gras: true, couleurG: 20 });
    if (recu > 0) {
      c.ligne('Reçu', `${nb(recu)} GNF`);
      if (reste > 0) c.ligne('Reste à payer (crédit)', `${nb(reste)} GNF`, { gras: true, couleurD: [200, 30, 30] });
      else c.ligne('Monnaie rendue', `${nb(vente.monnaie)} GNF`, { gras: true });
    }
    c.sep();
    c.texte('Merci pour votre achat !', { taille: 9, gras: true, align: 'center', gap: 0.4 });
    c.texte("Conservez ce reçu comme preuve d'achat", { taille: 7, couleur: 120, align: 'center', gap: 0 });
  });
}

// ─── Reçu de paiement d'une dette ─────────────────────────────────────────────
export async function pdfRecuPaiement(dette, index) {
  const paiements = dette.paiements || [];
  const p = paiements[index];
  if (!p) throw new Error('Paiement introuvable');
  const avant = paiements.slice(0, index).reduce((t, x) => t + x.montant, 0);
  const reste = Math.max(dette.montantInitial - avant - p.montant, 0);
  const numero = `P-${String(dette._id).slice(-6).toUpperCase()}-${index + 1}`;
  const b = lireBoutiqueLocale();
  const blob = await creerPdf((c) => {
    entete(b, 'REÇU DE PAIEMENT', numero)(c);
    c.ligne('Date', fmtDate(p.date));
    c.ligne('Client', dette.client?.nom || '', { gras: true });
    if (dette.client?.telephone) c.ligne('Tél', dette.client.telephone);
    if (p.note) c.ligne('Note', p.note);
    c.sep();
    c.ligne('Dette initiale', `${nb(dette.montantInitial)} GNF`);
    c.ligne('Déjà versé', `${nb(avant)} GNF`);
    c.sep(true);
    c.ligne('PAYÉ', `${nb(p.montant)} GNF`, { taille: 11, gras: true, couleurG: 20 });
    c.ligne('Reste à payer', `${nb(reste)} GNF`, { gras: true });
    if (reste === 0) c.texte('DETTE SOLDÉE', { taille: 9, gras: true, align: 'center', gap: 0.6 });
    c.sep();
    c.texte('Merci pour votre paiement !', { taille: 9, gras: true, align: 'center', gap: 0.4 });
    c.texte('Conservez ce reçu comme preuve de paiement', { taille: 7, couleur: 120, align: 'center', gap: 0 });
  });
  return { blob, numero };
}

// ─── Envoi ────────────────────────────────────────────────────────────────────
function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Téléphone/tablette : ouvre la fenêtre de partage avec le PDF en pièce jointe (choisir WhatsApp puis le client).
// Ordinateur : télécharge le PDF et propose d'ouvrir WhatsApp avec le message (le PDF est à joindre).
export async function envoyerPdf({ blob, nomFichier, message, telephone }) {
  const fichier = new File([blob], nomFichier, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], text: message });
      return 'partage';
    } catch (e) {
      if (e?.name === 'AbortError') return 'annule';
    }
  }
  telecharger(blob, nomFichier);
  const lien = `https://wa.me/${numeroWhatsApp(telephone)}?text=${encodeURIComponent(message)}`;
  toast((t) => (
    <span className="text-sm">
      PDF téléchargé. Ouvrez WhatsApp puis joignez-le au message.
      <a href={lien} target="_blank" rel="noreferrer" onClick={() => toast.dismiss(t.id)}
        className="block mt-1.5 font-semibold text-emerald-600 underline underline-offset-2">Ouvrir WhatsApp</a>
    </span>
  ), { duration: 12000 });
  return 'telecharge';
}

export async function envoyerRecuVente(vente) {
  const b = lireBoutiqueLocale();
  const message = `Bonjour${vente.client?.nom && vente.client.nom !== 'Client comptoir' ? ` ${vente.client.nom}` : ''}, voici votre reçu ${vente.numero} de ${b.nom} : ${nb(vente.totalNet)} GNF. Merci pour votre achat !`;
  const blob = await pdfRecuVente(vente);
  return envoyerPdf({ blob, nomFichier: `recu-${vente.numero}.pdf`, message, telephone: vente.client?.telephone });
}

export async function envoyerRecuPaiement(dette, index) {
  const b = lireBoutiqueLocale();
  const { blob, numero } = await pdfRecuPaiement(dette, index);
  const p = dette.paiements[index];
  const message = `Bonjour ${dette.client?.nom || ''}, nous confirmons la réception de votre paiement de ${nb(p.montant)} GNF chez ${b.nom}. Voici votre reçu. Merci !`;
  return envoyerPdf({ blob, nomFichier: `recu-${numero}.pdf`, message, telephone: dette.client?.telephone });
}
