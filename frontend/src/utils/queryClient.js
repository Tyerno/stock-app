import { QueryClient } from '@tanstack/react-query';

// Instance unique, partagée avec la synchronisation des ventes hors connexion.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
