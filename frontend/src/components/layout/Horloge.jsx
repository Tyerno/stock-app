import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

// Heure de la boutique : toujours l'heure de Conakry, même si l'horloge de l'appareil est mal réglée.
const FUSEAU = 'Africa/Conakry';

export default function Horloge() {
  const [maintenant, setMaintenant] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [hm, s] = (() => {
    const t = maintenant.toLocaleTimeString('fr-FR', { timeZone: FUSEAU, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return [t.slice(0, 5), t.slice(5)]; // "23:37" + ":41"
  })();
  const dateCourte = maintenant.toLocaleDateString('fr-FR', { timeZone: FUSEAU, weekday: 'short', day: 'numeric', month: 'short' });
  const dateLongue = maintenant.toLocaleDateString('fr-FR', { timeZone: FUSEAU, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 select-none"
      title={`${dateLongue} — heure de Conakry`} aria-label={`${dateLongue}, ${hm}${s}`}>
      <Clock size={14} className="text-indigo-500 flex-shrink-0" aria-hidden="true"/>
      <span className="font-syne text-sm font-bold text-slate-800 tabular-nums leading-none">
        {hm}<span className="hidden sm:inline text-slate-400 font-semibold">{s}</span>
      </span>
      <span className="hidden md:inline text-xs text-slate-400 capitalize leading-none border-l border-slate-200 pl-2">{dateCourte}</span>
    </div>
  );
}
