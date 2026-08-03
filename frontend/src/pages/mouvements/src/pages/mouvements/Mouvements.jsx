import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
  X, TrendingUp, TrendingDown,
  ArrowLeftRight, Calendar, StickyNote, WifiOff
} from 'lucide-react';
import api from '../../utils/api';
import { fmt, fmtDate } from '../../utils/format';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';

const TYPE_CFG = {
  entree:     { label:'Entrée',      cls:'bg-indigo-100 text-indigo-700 border-indigo-200',     dot:'bg-indigo-500',    Icon:ArrowDownCircle },
  sortie:     { label:'Sortie',      cls:'bg-red-100 text-red-700 border-red-200',        dot:'bg-red-500',     Icon:ArrowUpCircle },
  ajustement: { label:'Ajustement',  cls:'bg-indigo-100 text-indigo-700 border-indigo-200', dot:'bg-indigo-500', Icon:ArrowLeftRight },
  retour:     { label:'Retour',      cls:'bg-violet-100 text-violet-700 border-violet-200', dot:'bg-violet-500', Icon:ArrowDownCircle },
  perte:      { label:'Perte',       cls:'bg-orange-100 text-orange-700 border-orange-200', dot:'bg-orange-500', Icon:TrendingDown },
};

// ─── Card mouvement mobile ────────────────────────────────────────────────────
function MouvementCard({ m }) {
  const cfg = TYPE_CFG[m.type] || TYPE_CFG.ajustement;
  const Icon = cfg.Icon;
  const isPositif = ['entree', 'retour'].includes(m.type);

  return (
    <div className="card-neu p-4 flex items-start gap-3 hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositif ? 'bg-indigo-50' : 'bg-red-50'}`}>
        <Icon size={18} className={isPositif ? 'text-indigo-600' : 'text-red-500'}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-slate-900 truncate">{m.produit?.nom}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
        </div>
        <p className="text-xs text-slate-400 mb-2">{m.produit?.reference || m.produit?.categorie?.nom || ''}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className={`font-bold text-sm ${isPositif ? 'text-indigo-600' : 'text-red-500'}`}>
              {isPositif ? '+' : '-'}{fmt(m.quantite)} {m.produit?.unite}
            </span>
            <span className="text-slate-300">·</span>
            <span>{m.quantiteAvant} → {m.quantiteApres}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">{m.utilisateur?.nom || '—'}</p>
            <p className="text-[10px] text-slate-400">{fmtDate(m.createdAt)}</p>
          </div>
        </div>
        {m.motif && (
          <p className="text-[10px] text-slate-400 mt-1.5 italic truncate flex items-center gap-1">
            <StickyNote size={10}/> {m.motif}
          </p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function Mouvements() {
  const [page, setPage]           = useState(1);
  const [type, setType]           = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin]     = useState('');
  const [filtresOpen, setFiltres] = useState(false);
  const [vueMode, setVueMode]     = useState('auto'); // auto = cards mobile, table desktop

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['mouvements', page, type, dateDebut, dateFin],
    queryFn:  () => api.get('/mouvements', {
      params: { page, limit:20, type:type||undefined, dateDebut:dateDebut||undefined, dateFin:dateFin||undefined }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const mouvements  = data?.data || [];
  const pagination  = data?.pagination || {};
  const hasFiltre   = type || dateDebut || dateFin;

  const resetFiltres = () => { setType(''); setDateDebut(''); setDateFin(''); setPage(1); setFiltres(false); };

  // Stats rapides
  const nbEntrees = mouvements.filter(m => ['entree','retour'].includes(m.type)).length;
  const nbSorties = mouvements.filter(m => ['sortie','perte'].includes(m.type)).length;

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <ArrowLeftRight size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Mouvements</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {pagination.total ? `${fmt(pagination.total)} mouvement(s) au total` : 'Historique des entrées et sorties'}
            </p>
          </div>
        </div>
        <button onClick={() => refetch()} title="Actualiser"
          className={`btn-secondary ${isFetching ? 'opacity-70' : ''}`}>
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''}/> Actualiser
        </button>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:'Entrées', value:nbEntrees,          color:'text-indigo-600', bg:'bg-indigo-50', border:'border-l-indigo-500', Icon:TrendingUp },
          { label:'Sorties', value:nbSorties,          color:'text-red-500',    bg:'bg-red-50',    border:'border-l-red-500',    Icon:TrendingDown },
          { label:'Pages',   value:pagination.pages||1, color:'text-slate-700', bg:'bg-slate-100', border:'border-l-slate-400',  Icon:Calendar },
        ].map((k, i) => (
          <div key={k.label} className={`card-neu border-l-4 ${k.border} p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 animate-fade-up-${i+1}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
                <k.Icon size={16} className={k.color}/>
              </div>
            </div>
            <p className={`font-syne text-2xl font-bold ${k.color} leading-none`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-5 animate-fade-up-3">
        <div className="flex items-center gap-3">
          {/* Types rapides */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            <button onClick={() => { setType(''); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!type ? 'gradient-brand text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              Tous
            </button>
            {Object.entries(TYPE_CFG).map(([t, cfg]) => (
              <button key={t} onClick={() => { setType(t); setPage(1); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${type === t ? cfg.cls : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Filtre dates */}
          <button onClick={() => setFiltres(v => !v)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${filtresOpen || dateDebut || dateFin ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-600'}`}>
            <Calendar size={13}/> Dates
            {(dateDebut || dateFin) && <span className="w-2 h-2 rounded-full bg-indigo-500"/>}
          </button>
        </div>

        {/* Panneau dates */}
        {filtresOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-end gap-3 animate-fade-up shadow-sm">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-500">Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-all"/>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-500">Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-all"/>
            </div>
            {hasFiltre && (
              <button onClick={resetFiltres} className="btn-ghost btn-sm text-red-500 hover:bg-red-50 flex-shrink-0">
                <X size={12}/> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contenu */}
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <div className="card-neu">
          <EmptyState
            icon={WifiOff}
            title="Impossible de charger les mouvements"
            description="Une erreur est survenue lors du chargement. Vérifiez votre connexion et réessayez."
          />
        </div>
      ) : mouvements.length === 0 ? (
        <div className="card-neu">
          <EmptyState
            icon={ArrowLeftRight}
            title="Aucun mouvement trouvé"
            description={hasFiltre ? 'Aucun résultat pour ces filtres.' : 'Les entrées et sorties de stock apparaîtront ici.'}
            action={hasFiltre && (
              <button onClick={resetFiltres} className="btn-ghost btn-sm">
                Effacer les filtres
              </button>
            )}
          />
        </div>
      ) : (
        <>
          {/* Vue cards (mobile) */}
          <div className="flex flex-col gap-3 lg:hidden animate-fade-up-4">
            {mouvements.map(m => <MouvementCard key={m._id} m={m}/>)}
          </div>

          {/* Vue tableau (desktop) */}
          <div className="hidden lg:block animate-fade-up-4">
            <Table columns={[
              'Produit', 'Type',
              { label: 'Quantité', align: 'right' },
              { label: 'Avant → Après', align: 'right' },
              'Motif', 'Par', 'Date',
            ]}>
              {mouvements.map(m => {
                const cfg = TYPE_CFG[m.type] || TYPE_CFG.ajustement;
                const isPositif = ['entree','retour'].includes(m.type);
                return (
                  <tr key={m._id}>
                    <td>
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{m.produit?.nom}</p>
                      {m.produit?.reference && <p className="text-[10px] font-mono text-slate-400">{m.produit.reference}</p>}
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="text-right">
                      <span className={`text-sm font-bold ${isPositif ? 'text-indigo-600' : 'text-red-500'}`}>
                        {isPositif ? '+' : '-'}{fmt(m.quantite)}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{m.produit?.unite}</span>
                    </td>
                    <td className="text-xs text-slate-500 font-mono whitespace-nowrap text-right">
                      {fmt(m.quantiteAvant)} → <span className="font-bold text-slate-800">{fmt(m.quantiteApres)}</span>
                    </td>
                    <td className="text-xs text-slate-400 max-w-[150px] truncate">{m.motif || '—'}</td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{m.utilisateur?.nom || '—'}</td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                  </tr>
                );
              })}
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5 animate-fade-up">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary">
                ← Précédent
              </button>
              <span className="text-sm text-slate-500">
                Page <strong>{page}</strong> sur <strong>{pagination.pages}</strong>
              </span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page === pagination.pages} className="btn-secondary">
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
