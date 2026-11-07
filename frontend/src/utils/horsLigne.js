import { useEffect, useState } from 'react';

// Stockage local (IndexedDB) pour vendre sans connexion :
//  - « ventes »    : file d'attente des ventes à envoyer au serveur
//  - « catalogue » : copie des produits (prix, stock) pour continuer à vendre hors connexion
const NOM = 'stockbtp-hors-ligne';
let ouverture;

const ouvrir = () => {
  if (!ouverture) {
    ouverture = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('Stockage local indisponible'));
      const r = indexedDB.open(NOM, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('ventes', { keyPath: 'cle' });
        r.result.createObjectStore('catalogue', { keyPath: 'id' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => { ouverture = null; reject(r.error); };
    });
  }
  return ouverture;
};

// Exécute `fn(store, transaction)` ; renvoie ce que `fn` retourne (une requête IDB → son résultat).
const operer = async (magasin, mode, fn) => {
  const db = await ouvrir();
  return new Promise((resolve, reject) => {
    const t = db.transaction(magasin, mode);
    const sortie = fn(t.objectStore(magasin), t);
    t.oncomplete = () => resolve(sortie && 'result' in sortie ? sortie.result : sortie);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaction annulée'));
  });
};

export const signaler = () => { try { window.dispatchEvent(new Event('file-hors-ligne')); } catch { /* sans effet */ } };

// ── File d'attente des ventes ────────────────────────────────────────────────
export const ajouterVente = async (item) => { await operer('ventes', 'readwrite', (s) => s.put(item)); signaler(); };
export const listerVentes = async () => (await operer('ventes', 'readonly', (s) => s.getAll())).sort((a, b) => a.creeLe - b.creeLe);
export const retirerVente = async (cle) => { await operer('ventes', 'readwrite', (s) => s.delete(cle)); signaler(); };
export const majVente = async (cle, patch) => {
  await operer('ventes', 'readwrite', (s) => {
    const r = s.get(cle);
    r.onsuccess = () => { if (r.result) s.put({ ...r.result, ...patch }); };
  });
  signaler();
};

// ── Catalogue local ──────────────────────────────────────────────────────────
const retirerDuStock = (produits, lignes) => {
  const parId = new Map(lignes.map((l) => [String(l.produitId), l.quantite]));
  return produits.map((p) => (parId.has(String(p._id)) ? { ...p, quantiteStock: Math.max(0, +(p.quantiteStock - parId.get(String(p._id))).toFixed(3)) } : p));
};

// Copie fraîche du serveur : on y retire les ventes encore en attente (le serveur ne les connaît pas encore).
export const sauverCatalogue = async (produits) => {
  let enAttente = [];
  try { enAttente = (await listerVentes()).filter((v) => v.etape === 'vente'); } catch { /* ignoré */ }
  let liste = produits;
  for (const v of enAttente) liste = retirerDuStock(liste, v.payload.lignes);
  await operer('catalogue', 'readwrite', (s) => s.put({ id: 'produits', date: Date.now(), produits: liste }));
  try { window.dispatchEvent(new Event('catalogue-maj')); } catch { /* ignoré */ }
};
export const lireCatalogue = async () => (await operer('catalogue', 'readonly', (s) => s.get('produits'))) || null;
export const ajusterCatalogue = async (lignes) => {
  await operer('catalogue', 'readwrite', (s) => {
    const r = s.get('produits');
    r.onsuccess = () => { if (r.result) s.put({ ...r.result, produits: retirerDuStock(r.result.produits, lignes) }); };
  });
  try { window.dispatchEvent(new Event('catalogue-maj')); } catch { /* ignoré */ }
};
export const viderCatalogueLocal = () => { try { operer('catalogue', 'readwrite', (s) => s.clear()).catch(() => {}); } catch { /* ignoré */ } };

// ── Aides ────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function filtrerCatalogue(produits, recherche, categorieId) {
  const q = norm(recherche).trim();
  return produits
    .filter((p) => !categorieId || String(p.categorie?._id || p.categorie) === String(categorieId))
    .filter((p) => !q || norm(p.nom).includes(q) || norm(p.reference).includes(q))
    .slice(0, 100);
}
export function categoriesDuCatalogue(produits) {
  const m = new Map();
  for (const p of produits) if (p.categorie?._id && !m.has(p.categorie._id)) m.set(p.categorie._id, p.categorie);
  return [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom));
}

export function useEnLigne() {
  const [enLigne, setEnLigne] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setEnLigne(true); const off = () => setEnLigne(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return enLigne;
}

export const cleVente = () => {
  try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch { /* repli ci-dessous */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 8)}`;
};
