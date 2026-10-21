import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import api from '../../utils/api';
import { lireLogoLocal, memoriserLogo } from '../../utils/boutique';

// Logo de la boutique : lecture publique (la page de connexion en a besoin avant l'authentification).
// Pendant le chargement, ou si le serveur ne répond pas, on affiche la copie gardée sur l'appareil.
export function useLogoBoutique() {
  const { data } = useQuery({
    queryKey: ['boutique-public'],
    queryFn:  () => api.get('/boutique/public').then(r => r.data.data),
    staleTime: 5 * 60_000,
    retry: false,
  });
  useEffect(() => { if (data) memoriserLogo(data.logo); }, [data]);
  return data ? (data.logo || '') : lireLogoLocal();
}

// Affiche le logo de la boutique, ou l'éclair StockBTP tant qu'aucun logo n'est défini.
export default function MarqueLogo({ taille = 36, rond = 'rounded-xl', className = '' }) {
  const logo = useLogoBoutique();
  const dimension = { width: taille, height: taille };

  if (logo) {
    return <img src={logo} alt="Logo de la boutique" style={dimension}
      className={`${rond} object-contain bg-white border border-slate-100 flex-shrink-0 ${className}`}/>;
  }
  return (
    <div style={dimension} className={`${rond} bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0 ${className}`}>
      <Zap size={Math.round(taille * 0.5)} className="text-white" />
    </div>
  );
}
