import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Rocket, ArrowRight, PartyPopper, AlertTriangle } from 'lucide-react';
import { useMiseEnRoute } from '../../utils/miseEnRoute';
import { CenteredSpinner } from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';

export default function MiseEnRoute() {
  const { etapes, faites, total, isLoading, isError, termine } = useMiseEnRoute();
  if (isLoading) return <CenteredSpinner />;
  if (isError) return <EmptyState icon={AlertTriangle} title="Indisponible" description="Impossible de charger la liste pour le moment. Réessayez dans un instant." />;

  const pct = Math.round((faites / total) * 100);
  const prochaine = etapes.find((e) => !e.ok);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <div className="card-neu p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center flex-shrink-0">
          {termine ? <PartyPopper size={26} className="text-white" /> : <Rocket size={26} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-syne text-lg font-bold text-slate-900">{termine ? 'Votre boutique est prête !' : 'Mise en route de la boutique'}</h2>
          <p className="text-xs text-slate-400">{faites} étape{faites > 1 ? 's' : ''} sur {total} terminée{faites > 1 ? 's' : ''}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full gradient-brand transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="font-syne text-2xl font-bold text-indigo-600">{pct}%</span>
      </div>

      <div className="flex flex-col gap-2">
        {etapes.map((e, i) => {
          const courante = prochaine?.id === e.id;
          return (
            <div key={e.id} className={`rounded-2xl border p-4 flex items-start gap-3 transition-colors ${e.ok ? 'bg-emerald-50/50 border-emerald-100' : courante ? 'bg-white border-indigo-200 shadow-sm' : 'bg-white border-slate-100'}`}>
              {e.ok ? <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <Circle size={20} className={`flex-shrink-0 mt-0.5 ${courante ? 'text-indigo-400' : 'text-slate-300'}`} />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${e.ok ? 'text-slate-500 line-through decoration-emerald-300' : 'text-slate-900'}`}>{i + 1}. {e.titre}</p>
                {!e.ok && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{e.aide}</p>}
              </div>
              {!e.ok && e.lien && (
                <Link to={e.lien} className={`btn text-xs whitespace-nowrap ${courante ? 'btn-primary' : 'btn-secondary'}`}>{e.action} <ArrowRight size={12} /></Link>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Les étapes se cochent toutes seules dès qu'elles sont faites.</p>
    </div>
  );
}
