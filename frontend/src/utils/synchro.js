import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from './api';
import { listerVentes, majVente, retirerVente } from './horsLigne';
import { queryClient } from './queryClient';

const A_RAFRAICHIR = ['ventes', 'dashboard', 'produits', 'produits-vente', 'catalogue-hors-ligne', 'caisse', 'rapport-jour', 'dettes', 'dettes-dashboard', 'clients', 'alertes', 'mouvements'];

let enCours = false;
const utilisateurCourant = () => { try { return JSON.parse(localStorage.getItem('user'))?._id || null; } catch { return null; } };

// Envoie les ventes en attente, une par une et dans l'ordre. Sûr à rappeler : chaque vente porte une clé unique,
// le serveur ne l'enregistre qu'une fois même si la réponse s'est perdue en route.
export async function synchroniser() {
  if (enCours || !navigator.onLine) return { envoyees: 0 };
  enCours = true;
  let envoyees = 0;
  try {
    const moi = utilisateurCourant();
    const file = (await listerVentes()).filter((v) => v.statut !== 'erreur' && (!v.utilisateurId || v.utilisateurId === moi));
    for (const v of file) {
      try {
        let venteId = v.venteId; let reste = 0; let client = v.payload.client;
        if (v.etape !== 'dette') {
          const r = await api.post('/ventes', v.payload);
          const vente = r.data.data;
          venteId = vente._id;
          reste = Math.max(0, vente.totalNet - (vente.montantRecu || 0));
          client = vente.client || client;
          if (v.dette && reste > 0) await majVente(v.cle, { etape: 'dette', venteId, detteMontant: reste });
        } else reste = v.detteMontant || 0;

        if (v.dette && reste > 0) {
          await api.post('/dettes', {
            client: { nom: v.dette.nom, telephone: v.dette.telephone || client?.telephone || '' },
            montantInitial: reste, vente: venteId, cleUnique: `${v.cle}-d`,
          });
        }
        await retirerVente(v.cle);
        envoyees += 1;
      } catch (e) {
        const s = e.response?.status;
        if (!e.response || s >= 500 || s === 409 || s === 429 || s === 401) break; // réseau, serveur ou session : on réessaiera plus tard
        await majVente(v.cle, { statut: 'erreur', erreur: e.response?.data?.message || 'Vente refusée par le serveur' });
      }
    }
  } catch (e) {
    console.error('Synchronisation :', e?.message);
  } finally {
    enCours = false;
  }
  if (envoyees > 0) {
    toast.success(`${envoyees} vente${envoyees > 1 ? 's' : ''} envoyée${envoyees > 1 ? 's' : ''} au serveur ✓`, { duration: 5000 });
    A_RAFRAICHIR.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  }
  return { envoyees };
}

// Compte les ventes en attente / refusées et relance l'envoi dès que possible (retour du réseau, ouverture, toutes les 30 s).
export function useSynchro() {
  const [etat, setEtat] = useState({ enAttente: 0, refusees: 0, envoi: false });
  const vivant = useRef(true);

  const rafraichir = useCallback(async () => {
    try {
      const l = await listerVentes();
      if (vivant.current) setEtat((e) => ({ ...e, enAttente: l.filter((v) => v.statut !== 'erreur').length, refusees: l.filter((v) => v.statut === 'erreur').length }));
      return l;
    } catch { return []; }
  }, []);

  const lancer = useCallback(async () => {
    if (vivant.current) setEtat((e) => ({ ...e, envoi: true }));
    await synchroniser();
    await rafraichir();
    if (vivant.current) setEtat((e) => ({ ...e, envoi: false }));
  }, [rafraichir]);

  useEffect(() => {
    vivant.current = true;
    const tick = async () => { const l = await rafraichir(); if (l.some((v) => v.statut !== 'erreur') && navigator.onLine) lancer(); };
    tick();
    const surChangement = () => { rafraichir().then((l) => { if (l.some((v) => v.statut !== 'erreur') && navigator.onLine) lancer(); }); };
    window.addEventListener('online', tick);
    window.addEventListener('file-hors-ligne', surChangement);
    const t = setInterval(tick, 30000);
    return () => { vivant.current = false; window.removeEventListener('online', tick); window.removeEventListener('file-hors-ligne', surChangement); clearInterval(t); };
  }, [rafraichir, lancer]);

  return { ...etat, lancer, rafraichir };
}
