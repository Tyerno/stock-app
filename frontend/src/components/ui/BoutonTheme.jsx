import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../utils/theme';

export default function BoutonTheme() {
  const { sombre, basculer } = useTheme();
  const libelle = sombre ? 'Passer en mode clair' : 'Passer en mode sombre';
  return (
    <button type="button" onClick={basculer} className="btn-icon text-slate-500" aria-label={libelle} title={libelle}>
      {sombre ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
