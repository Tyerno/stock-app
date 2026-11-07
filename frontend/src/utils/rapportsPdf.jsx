// Rapport du jour et clôture de caisse en PDF (format ticket), à envoyer par WhatsApp comme les reçus.
import { fmt } from './format';
import { lireBoutiqueLocale } from './boutique';
import { libelleMode, evolution } from './rapportJour';
import { attendues, jourLong } from './caisse';
import { creerPdf, entete, envoyerPdf } from './recuPdf';

const GNF = (n) => `${fmt(n)} GNF`;
const ROUGE = [200, 30, 30];
const VERT = [16, 150, 90];

const titre = (c, t) => { c.sep(); c.texte(t, { taille: 9.5, gras: true, gap: 0.8 }); };

// ─── Rapport du jour ──────────────────────────────────────────────────────────
export async function pdfRapportJour(r) {
  const b = lireBoutiqueLocale();
  return creerPdf((c) => {
    entete(b, 'RAPPORT DU JOUR', null)(c);
    c.texte(jourLong(r.date), { taille: 8, couleur: 110, align: 'center', gap: 0.4 });

    titre(c, 'Ventes');
    if (!r.ventes.nb) c.texte('Aucune vente enregistrée.', { taille: 8, couleur: 110 });
    else {
      c.ligne(`${r.ventes.nb} vente(s)`, GNF(r.ventes.ca), { gras: true, couleurG: 20 });
      const ev = evolution(r.ventes.ca, r.ventes.caVeille);
      if (ev !== null && r.ventes.caVeille) {
        c.ligne(`Veille : ${fmt(r.ventes.caVeille)}`, `${ev >= 0 ? '+' : ''}${ev} %`, { couleurD: ev >= 0 ? VERT : ROUGE });
      }
      c.ligne('Panier moyen', GNF(r.ventes.panierMoyen));
      r.ventes.parMode.forEach((m) => c.ligne(`${libelleMode(m.mode)} (${m.nb})`, GNF(m.total)));
      if (r.ventes.remises > 0) c.ligne('Remises accordées', GNF(r.ventes.remises));
    }
    if (r.ventes.annulees.nb) c.ligne(`Annulées (${r.ventes.annulees.nb})`, GNF(r.ventes.annulees.total), { couleurD: ROUGE });

    if (r.topProduits.length) {
      titre(c, 'Meilleures ventes');
      r.topProduits.forEach((p, i) => {
        c.texte(`${i + 1}. ${p.nom}`, { taille: 8, gras: true, gap: 0.1 });
        c.ligne(`${fmt(p.quantite)} ${p.unite}`, GNF(p.montant), { taille: 8 });
      });
    }

    if (r.finances) {
      titre(c, 'Résultat estimé');
      if (r.finances.depenses) c.ligne('Dépenses', GNF(r.finances.depenses));
      c.ligne('Bénéfice net', GNF(r.finances.beneficeNet), { gras: true, couleurG: 20, couleurD: r.finances.beneficeNet >= 0 ? VERT : ROUGE });
    }

    titre(c, 'Dettes clients');
    c.ligne(`Nouvelles (${r.dettes.nouvelles.nb})`, GNF(r.dettes.nouvelles.total));
    c.ligne('Encaissé', GNF(r.dettes.encaisse.total));
    c.ligne(`Reste à recouvrer (${r.dettes.enCours.nb})`, GNF(r.dettes.enCours.total), { gras: true, couleurG: 20 });
    if (r.dettes.enCours.enRetard) c.texte(`${r.dettes.enCours.enRetard} dette(s) en retard`, { taille: 7.5, couleur: ROUGE, gap: 0.3 });

    titre(c, 'Stock');
    c.ligne('Valeur du stock', GNF(r.stock.valeurStock));
    if (r.stock.entrees) c.ligne('Entrées de marchandise', String(r.stock.entrees));
    if (r.stock.nbRuptures) {
      c.texte(`${r.stock.nbRuptures} rupture(s) : ${r.stock.ruptures.slice(0, 6).join(', ')}${r.stock.nbRuptures > 6 ? '...' : ''}`, { taille: 7.5, couleur: ROUGE, gap: 0.3 });
    }
    if (r.stock.nbFaibles) {
      c.texte(`${r.stock.nbFaibles} stock(s) faible(s) : ${r.stock.faibles.slice(0, 6).map((p) => `${p.nom} (${fmt(p.quantite)})`).join(', ')}${r.stock.nbFaibles > 6 ? '...' : ''}`, { taille: 7.5, couleur: 90, gap: 0.3 });
    }
    if (!r.stock.nbRuptures && !r.stock.nbFaibles) c.texte('Aucune alerte de stock', { taille: 8, couleur: VERT });
  });
}

export async function envoyerRapportJour(r) {
  const b = lireBoutiqueLocale();
  const blob = await pdfRapportJour(r);
  const message = `Rapport du jour - ${b.nom} - ${jourLong(r.date)} : ${r.ventes.nb} vente(s), ${GNF(r.ventes.ca)}.`;
  return envoyerPdf({ blob, nomFichier: `rapport-jour-${r.date}.pdf`, message });
}

// ─── Clôture de caisse ────────────────────────────────────────────────────────
export async function pdfCaisse(k, { fond, comptees, note } = {}) {
  const b = lireBoutiqueLocale();
  return creerPdf((c) => {
    entete(b, 'CLÔTURE DE CAISSE', null)(c);
    c.texte(jourLong(k.jour), { taille: 8, couleur: 110, align: 'center', gap: 0.4 });

    titre(c, 'Ventes');
    c.ligne(`${k.ventes.nb} vente(s)`, GNF(k.ventes.ca), { gras: true, couleurG: 20 });
    const m = k.ventes.parMode;
    if (m.especes) c.ligne('Espèces', GNF(m.especes));
    if (m.mobile_money) c.ligne('Mobile Money', GNF(m.mobile_money));
    if (m.mixte) c.ligne('Paiement mixte', GNF(m.mixte));
    if (k.ventes.credit) c.ligne('Laissé à crédit', GNF(k.ventes.credit));
    if (k.retours?.nb) c.ligne(`Retours / échanges (${k.retours.nb})`, GNF(k.retours.valeur));
    if (k.encaissementsDettes) c.ligne('Dettes encaissées', GNF(k.encaissementsDettes));

    if (k.depenses.total) {
      titre(c, 'Dépenses');
      k.depenses.liste.slice(0, 10).forEach((d) => c.ligne(d.libelle, GNF(d.montant), { taille: 8 }));
      c.ligne('Total', GNF(k.depenses.total), { gras: true, couleurG: 20 });
    }

    c.sep(true);
    c.ligne('Bénéfice net estimé', GNF(k.beneficeNet), { gras: true, couleurG: 20, couleurD: k.beneficeNet >= 0 ? VERT : ROUGE });

    if (comptees !== undefined && comptees !== null && comptees !== '') {
      const att = attendues(k, fond);
      const ec = Math.round(Number(comptees) - att);
      titre(c, 'Caisse');
      c.ligne('Attendu', GNF(att));
      c.ligne('Compté', GNF(Number(comptees)));
      c.ligne(ec === 0 ? 'Caisse juste' : ec < 0 ? 'Manque' : 'Surplus', ec === 0 ? 'OK' : GNF(Math.abs(ec)),
        { gras: true, couleurG: 20, couleurD: ec === 0 ? VERT : ROUGE });
      if (note) c.texte(`Note : ${note}`, { taille: 7.5, couleur: 90, gap: 0.3 });
    }
  });
}

export async function envoyerCaisse(k, options) {
  const b = lireBoutiqueLocale();
  const blob = await pdfCaisse(k, options);
  const message = `Clôture de caisse - ${b.nom} - ${jourLong(k.jour)} : ${k.ventes.nb} vente(s), ${GNF(k.ventes.ca)}.`;
  return envoyerPdf({ blob, nomFichier: `cloture-caisse-${k.jour}.pdf`, message });
}
