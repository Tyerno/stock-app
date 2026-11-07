import { useQuery } from '@tanstack/react-query';
import api from './api';
import { useAuth } from '../context/AuthContext';

// L'appli est-elle installée sur ce téléphone / cet ordinateur ?
export const appInstallee = () => {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  catch { return false; }
};

// Étapes de mise en service. `fait(e)` lit l'état renvoyé par le serveur ; `lien` mène à l'écran concerné.
export const ETAPES = [
  { id: 'nom',        titre: 'Nommer la boutique',               aide: "Le nom apparaît sur les reçus, l'écran de connexion et l'appli installée.", lien: '/parametres', action: 'Ouvrir les paramètres', fait: (e) => e.boutiqueNommee },
  { id: 'logo',       titre: 'Ajouter le logo',                  aide: 'Affiché sur les reçus et dans le menu.',                                   lien: '/parametres', action: 'Ajouter le logo',       fait: (e) => e.logo },
  { id: 'coordonnees',titre: 'Renseigner téléphone et adresse',  aide: "Imprimés sur les reçus pour que les clients puissent vous joindre.",       lien: '/parametres', action: 'Compléter',             fait: (e) => e.coordonnees },
  { id: 'categories', titre: 'Créer les catégories de produits', aide: 'Ciment, fer, peinture, plomberie… pour ranger le catalogue.',              lien: '/produits',   action: 'Voir les produits',     fait: (e) => e.categories > 0 },
  { id: 'produits',   titre: 'Ajouter les produits',             aide: "Un par un, ou en une fois grâce à l'import Excel / CSV.",                  lien: '/produits',   action: 'Ajouter ou importer',   fait: (e) => e.produits > 0 },
  { id: 'inventaire', titre: 'Compter le stock réel',            aide: "Un premier inventaire vérifie que les quantités de l'appli sont exactes.", lien: '/inventaire', action: 'Faire un inventaire',   fait: (e) => e.inventaires > 0 },
  { id: 'equipe',     titre: "Créer le compte d'un employé",     aide: 'Un gestionnaire peut vendre et encaisser sans accéder aux réglages.',     lien: '/utilisateurs', action: 'Ajouter un utilisateur', fait: (e) => e.utilisateurs > 1 },
  { id: 'vente',      titre: 'Enregistrer une première vente',   aide: 'Pour vérifier le parcours complet, du panier au reçu PDF.',               lien: '/ventes',     action: 'Aller à la caisse',     fait: (e) => e.ventes > 0 },
  { id: 'installer',  titre: "Installer l'appli sur le téléphone", aide: "Menu du navigateur → « Ajouter à l'écran d'accueil » : elle s'ouvre comme une vraie application.", fait: () => appInstallee() },
  { id: 'sauvegarde', titre: 'Télécharger une première sauvegarde', aide: 'Une copie de toutes vos données, à garder en lieu sûr.',                lien: '/parametres', action: 'Sauvegarder',           fait: (e) => e.sauvegardes > 0 },
];

export function useMiseEnRoute() {
  const { isAdmin } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['mise-en-route'],
    queryFn: () => api.get('/mise-en-route').then((r) => r.data.data),
    enabled: !!isAdmin,
    staleTime: 60 * 1000,
  });
  const etapes = data ? ETAPES.map((s) => ({ ...s, ok: !!s.fait(data) })) : [];
  const faites = etapes.filter((s) => s.ok).length;
  return { etapes, faites, total: ETAPES.length, isLoading, isError, termine: !!data && faites === ETAPES.length };
}
