const mongoose  = require('mongoose');
const Produit   = require('../models/Produit');
const Mouvement = require('../models/Mouvement');
const Boutique  = require('../models/Boutique');
const { Categorie } = require('../models');

const MAX_LIGNES = 2000;
const UNITES = ['unité', 'kg', 'tonne', 'm', 'm²', 'm³', 'litre', 'sac', 'palette', 'lot'];
const SYNONYMES = {
  unite: 'unité', unites: 'unité', u: 'unité', piece: 'unité', pieces: 'unité', pièce: 'unité', pièces: 'unité', pc: 'unité', pcs: 'unité',
  barre: 'unité', barres: 'unité', tonnes: 'tonne', t: 'tonne', kilo: 'kg', kilos: 'kg', kg: 'kg',
  metre: 'm', mètre: 'm', metres: 'm', mètres: 'm', ml: 'm', m2: 'm²', 'm²': 'm²', m3: 'm³', 'm³': 'm³',
  l: 'litre', litres: 'litre', sacs: 'sac', palettes: 'palette', lots: 'lot',
};
const sansAccent = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const cle = (s) => sansAccent(String(s || '').trim().toLowerCase().replace(/\s+/g, ' '));

// "1 500 000", "1.500.000", "1500,50", "1,500.25" → nombre ; null si illisible ; undefined si vide
function nombre(v) {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[\s  ]/g, '').replace(/(gnf|fg|f)$/i, '');
  if (!/^[\d.,-]+$/.test(s)) return null;
  const pt = (s.match(/\./g) || []).length, vir = (s.match(/,/g) || []).length;
  if (pt && vir) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (vir > 1 || pt > 1) s = s.replace(/[.,]/g, '');
  else if (vir === 1) s = /,\d{3}$/.test(s) && !/^0,/.test(s) ? s.replace(',', '') : s.replace(',', '.');
  else if (pt === 1 && /\.\d{3}$/.test(s) && !/^0\./.test(s)) s = s.replace('.', '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const texte = (v, max = 120) => String(v ?? '').trim().slice(0, max);

function uniteValide(v) {
  const t = texte(v, 20);
  if (!t) return { unite: 'unité' };
  const k = t.toLowerCase();
  const u = UNITES.find((x) => x.toLowerCase() === k) || SYNONYMES[k] || SYNONYMES[sansAccent(k)];
  return u ? { unite: u } : { erreur: `unité « ${t} » inconnue (${UNITES.join(', ')})` };
}

// Analyse des lignes : renvoie un statut par ligne et les données prêtes à enregistrer.
async function analyser(lignes, mode) {
  const [existants, cats, boutique] = await Promise.all([
    Produit.find({ actif: true }).select('nom reference').lean(),
    Categorie.find({}).select('nom').lean(),
    Boutique.findOne().select('seuilDefaut').lean(),
  ]);
  const seuilDefaut = boutique?.seuilDefaut ?? 10;
  const parRef = new Map(), parNom = new Map();
  for (const p of existants) {
    if (p.reference) parRef.set(p.reference.toUpperCase(), p);
    parNom.set(cle(p.nom), p);
  }
  const catsConnues = new Map(cats.map((c) => [cle(c.nom), c]));
  const refsFichier = new Set(), nomsFichier = new Set();

  return lignes.map((l, i) => {
    const r = { ligne: i + 1, statut: 'creer', erreurs: [], donnees: null, existantId: null };
    const nom = texte(l.nom, 120);
    const reference = texte(l.reference, 60).toUpperCase();
    const categorie = texte(l.categorie, 60);
    if (!nom) r.erreurs.push('nom manquant');
    if (!categorie) r.erreurs.push('catégorie manquante');
    const u = uniteValide(l.unite);
    if (u.erreur) r.erreurs.push(u.erreur);

    const champs = {};
    for (const [k, lib] of [['prixAchat', "prix d'achat"], ['prixVente', 'prix de vente'], ['quantite', 'quantité'], ['seuilAlerte', "seuil d'alerte"], ['delaiLivraison', 'délai de livraison']]) {
      const n = nombre(l[k]);
      if (n === null) r.erreurs.push(`${lib} illisible`);
      else if (n !== undefined && n < 0) r.erreurs.push(`${lib} négatif`);
      else champs[k] = n;
    }
    if (champs.prixAchat === undefined && champs.prixVente === undefined && !r.erreurs.some((e) => e.startsWith('prix'))) r.erreurs.push('aucun prix');
    if (champs.prixAchat === undefined) champs.prixAchat = champs.prixVente ?? 0;
    if (champs.prixVente === undefined) champs.prixVente = champs.prixAchat ?? 0;

    const dejaRef = reference && parRef.get(reference);
    const dejaNom = !reference && parNom.get(cle(nom));
    const existant = dejaRef || dejaNom;

    if (reference) {
      if (refsFichier.has(reference)) r.erreurs.push('référence en double dans le fichier');
      refsFichier.add(reference);
    } else if (nom) {
      if (nomsFichier.has(cle(nom))) r.erreurs.push('nom en double dans le fichier');
      nomsFichier.add(cle(nom));
    }

    if (r.erreurs.length) { r.statut = 'erreur'; return r; }

    r.donnees = {
      nom, reference: reference || undefined, categorie, unite: u.unite,
      prixAchat: champs.prixAchat, prixVente: champs.prixVente,
      quantiteStock: champs.quantite ?? 0,
      seuilAlerte: champs.seuilAlerte ?? seuilDefaut,
      fournisseur: (texte(l.fournisseur, 80) || champs.delaiLivraison !== undefined)
        ? { nom: texte(l.fournisseur, 80) || undefined, delaiLivraison: champs.delaiLivraison } : undefined,
    };
    r.categorieNouvelle = !catsConnues.has(cle(categorie));
    if (existant) {
      r.existantId = String(existant._id);
      r.statut = mode === 'mettre_a_jour' ? 'maj' : 'ignore';
    }
    return r;
  });
}

const resumer = (res) => {
  const n = (s) => res.filter((r) => r.statut === s).length;
  const nouvelles = new Set(res.filter((r) => r.categorieNouvelle && ['creer', 'maj'].includes(r.statut)).map((r) => cle(r.donnees.categorie)));
  return { total: res.length, aCreer: n('creer'), aMettreAJour: n('maj'), ignores: n('ignore'), erreurs: n('erreur'), categoriesNouvelles: nouvelles.size };
};

function lire(req) {
  const { lignes, mode } = req.body || {};
  if (!Array.isArray(lignes) || lignes.length === 0) return { erreur: 'Le fichier ne contient aucune ligne à importer.' };
  if (lignes.length > MAX_LIGNES) return { erreur: `Trop de lignes (${lignes.length}). Maximum ${MAX_LIGNES} par import : découpez le fichier.` };
  if (!lignes.every((l) => l && typeof l === 'object' && !Array.isArray(l))) return { erreur: 'Format de lignes invalide.' };
  return { lignes, mode: mode === 'mettre_a_jour' ? 'mettre_a_jour' : 'ignorer' };
}

// POST /api/produits/import/apercu : n'écrit rien, renvoie le diagnostic ligne par ligne
exports.apercu = async (req, res) => {
  try {
    const p = lire(req);
    if (p.erreur) return res.status(400).json({ success: false, message: p.erreur });
    const res_ = await analyser(p.lignes, p.mode);
    res.json({
      success: true,
      data: {
        resume: resumer(res_),
        lignes: res_.map((r) => ({ ligne: r.ligne, statut: r.statut, erreurs: r.erreurs, nom: r.donnees?.nom, categorieNouvelle: !!r.categorieNouvelle })),
      },
    });
  } catch (err) {
    console.error('❌ Aperçu import :', err.message);
    res.status(500).json({ success: false, message: 'Analyse impossible pour le moment' });
  }
};

// POST /api/produits/import : enregistre les lignes valides (les lignes en erreur sont ignorées)
exports.importer = async (req, res) => {
  try {
    const p = lire(req);
    if (p.erreur) return res.status(400).json({ success: false, message: p.erreur });
    const analyse = await analyser(p.lignes, p.mode);
    const valides = analyse.filter((r) => ['creer', 'maj'].includes(r.statut));

    // 1. Catégories manquantes
    const cats = await Categorie.find({}).select('nom').lean();
    const idCat = new Map(cats.map((c) => [cle(c.nom), c._id]));
    const couleurs = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    let k = cats.length;
    for (const r of valides) {
      const c = cle(r.donnees.categorie);
      if (!idCat.has(c)) {
        try {
          const nouv = await Categorie.create({ nom: r.donnees.categorie, couleur: couleurs[k++ % couleurs.length] });
          idCat.set(c, nouv._id);
        } catch (e) {
          const ex = await Categorie.findOne({ nom: new RegExp(`^${r.donnees.categorie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id').lean();
          if (!ex) throw e;
          idCat.set(c, ex._id);
        }
      }
    }

    // 2. Créations (en lot) puis mouvements d'entrée du stock initial
    const aCreer = valides.filter((r) => r.statut === 'creer');
    let crees = [];
    if (aCreer.length) {
      const docs = aCreer.map((r) => ({ ...r.donnees, categorie: idCat.get(cle(r.donnees.categorie)), creePar: req.user._id }));
      try {
        crees = await Produit.insertMany(docs, { ordered: false });
      } catch (e) {
        crees = e.insertedDocs || [];
        if (!crees.length) throw e;
      }
      const mouvements = crees.filter((d) => d.quantiteStock > 0).map((d) => ({
        produit: d._id, type: 'entree', quantite: d.quantiteStock, quantiteAvant: 0, quantiteApres: d.quantiteStock,
        prixUnitaire: d.prixAchat, montantTotal: d.prixAchat * d.quantiteStock, motif: 'Stock initial (import)', utilisateur: req.user._id,
      }));
      if (mouvements.length) await Mouvement.insertMany(mouvements, { ordered: false }).catch((e) => console.error('⚠️ Mouvements import :', e.message));
    }

    // 3. Mises à jour (prix, nom, catégorie, unité, seuil, fournisseur ; jamais le stock)
    const aMaj = valides.filter((r) => r.statut === 'maj');
    let maj = 0;
    if (aMaj.length) {
      const ops = aMaj.map((r) => {
        const d = r.donnees;
        const $set = { nom: d.nom, categorie: idCat.get(cle(d.categorie)), unite: d.unite, prixAchat: d.prixAchat, prixVente: d.prixVente, seuilAlerte: d.seuilAlerte };
        if (d.fournisseur) $set.fournisseur = d.fournisseur;
        return { updateOne: { filter: { _id: new mongoose.Types.ObjectId(r.existantId) }, update: { $set } } };
      });
      const rb = await Produit.bulkWrite(ops, { ordered: false });
      maj = rb.modifiedCount ?? aMaj.length;
    }

    const ignores = analyse.filter((r) => r.statut === 'ignore').length;
    const erreurs = analyse.filter((r) => r.statut === 'erreur').length;
    res.status(201).json({
      success: true,
      data: { crees: crees.length, misAJour: maj, ignores, erreurs, total: analyse.length },
      message: `${crees.length} produit(s) créé(s)${maj ? `, ${maj} mis à jour` : ''}`,
    });
  } catch (err) {
    console.error('❌ Import produits :', err.message);
    res.status(500).json({ success: false, message: 'Import impossible pour le moment' });
  }
};

exports._interne = { nombre, uniteValide };
