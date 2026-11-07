import { useQuery } from '@tanstack/react-query';
import api from './api';
import { useAuth } from '../context/AuthContext';

export const cleNom = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Clients déjà connus (déduits des ventes et des dettes) : sert à suggérer un nom et pré-remplir le téléphone.
// Réservé à l'admin et au gestionnaire : pour un lecteur, la liste reste vide, sans appel au serveur.
export function useClientsConnus() {
  const { peutEcrire } = useAuth();
  const { data } = useQuery({
    queryKey: ['clients', 'suggestions'],
    queryFn: () => api.get('/clients').then((r) => r.data.data),
    enabled: !!peutEcrire,
    staleTime: 5 * 60 * 1000,
  });
  return data || [];
}

export function telephoneConnu(clients, nom) {
  const k = cleNom(nom);
  if (!k) return '';
  return clients.find((c) => c.cle === k)?.telephone || '';
}
