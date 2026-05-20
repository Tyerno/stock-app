import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Search, Filter, X, TrendingUp, TrendingDown,
  ArrowLeftRight, Calendar
} from 'lucide-react';
import api from '../../utils/api';
import { fmt, fmtDate } from '../../utils/format';

const TYPE_CFG = {
  entree:     { label:'Entrée',      cls:'bg-blue-100 text-blue-700 border-blue-200',     dot:'bg-blue-500',    Icon:ArrowDownCircle },
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
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositif ? 'bg-blue-50' : 'bg-red-50'}`}>
        <Icon size={18} className={isPositif ? 'text-blue-600' : 'text-red-500'}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-gray-900 truncate">{m.produit?.nom}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{m.produit?.reference || m.produit?.categorie?.nom || ''}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className={`font-bold text-sm ${isPositif ? 'text-blue-600' : 'text-red-500'}`}>
              {isPositif ? '+' : '-'}{fmt(m.quantite)} {m.produit?.unite}
            </span>
            <span className="text-gray-300">·</span>
            <span>{m.quantiteAvant} → {m.quantiteApres}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">{m.utilisateur?.nom || '—'}</p>
            <p className="text-[10px] text-gray-400">{fmtDate(m.createdAt)}</p>
          </div>
        </div>
        {m.motif && <p className="text-[10px] text-gray-400 mt-1.5 italic truncate">📝 {m.motif}</p>}
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

  const { data, isLoading, refetch, isFetching } = useQuery({
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
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-blue-200">
            <ArrowLeftRight size={18} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Mouvements</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination.total ? `${fmt(pagination.total)} mouvement(s) au total` : 'Historique des entrées et sorties'}
            </p>
          </div>
        </div>
        <button onClick={() => refetch()}
          className={`p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all ${isFetching ? 'animate-spin' : ''}`}>
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-3 gap-4 mb-5 animate-fade-up-2">
        <div className="card-neu p-4 text-center">
          <p className="font-syne text-xl font-bold text-blue-600">{nbEntrees}</p>
          <p className="text-[10px] text-gray-400 mt-1">Entrées</p>
        </div>
        <div className="card-neu p-4 text-center">
          <p className="font-syne text-xl font-bold text-red-500">{nbSorties}</p>
          <p className="text-[10px] text-gray-400 mt-1">Sorties</p>
        </div>
        <div className="card-neu p-4 text-center">
          <p className="font-syne text-xl font-bold text-gray-700">{pagination.pages || 1}</p>
          <p className="text-[10px] text-gray-400 mt-1">Pages</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-5 animate-fade-up-3">
        <div className="flex items-center gap-3">
          {/* Types rapides */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            <button onClick={() => { setType(''); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!type ? 'gradient-brand text-white shadow-md shadow-blue-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              Tous
            </button>
            {Object.entries(TYPE_CFG).map(([t, cfg]) => (
              <button key={t} onClick={() => { setType(t); setPage(1); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${type === t ? cfg.cls : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Filtre dates */}
          <button onClick={() => setFiltres(v => !v)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${filtresOpen || dateDebut || dateFin ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-600'}`}>
            <Calendar size={13}/> Dates
            {(dateDebut || dateFin) && <span className="w-2 h-2 rounded-full bg-blue-500"/>}
          </button>
        </div>

        {/* Panneau dates */}
        {filtresOpen && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-end gap-3 animate-fade-up shadow-sm">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-gray-500">Du</label>
              <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition-all"/>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-gray-500">Au</label>
              <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition-all"/>
            </div>
            {hasFiltre && (
              <button onClick={resetFiltres}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 border border-red-200 transition-all flex-shrink-0">
                <X size={12}/> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
        </div>
      ) : mouvements.length === 0 ? (
        <div className="card-neu flex flex-col items-center py-20 text-gray-300">
          <ArrowLeftRight size={36} className="mb-3 opacity-30"/>
          <p className="text-sm">Aucun mouvement trouvé</p>
          {hasFiltre && (
            <button onClick={resetFiltres} className="mt-4 text-xs text-blue-500 hover:underline">
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vue cards (mobile) */}
          <div className="flex flex-col gap-3 lg:hidden animate-fade-up-4">
            {mouvements.map(m => <MouvementCard key={m._id} m={m}/>)}
          </div>

          {/* Vue tableau (desktop) */}
          <div className="hidden lg:block card-neu overflow-hidden animate-fade-up-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Produit','Type','Quantité','Avant → Après','Motif','Par','Date'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map(m => {
                    const cfg = TYPE_CFG[m.type] || TYPE_CFG.ajustement;
                    const isPositif = ['entree','retour'].includes(m.type);
                    return (
                      <tr key={m._id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{m.produit?.nom}</p>
                          {m.produit?.reference && <p className="text-[10px] font-mono text-gray-400">{m.produit.reference}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-sm font-bold ${isPositif ? 'text-blue-600' : 'text-red-500'}`}>
                            {isPositif ? '+' : '-'}{fmt(m.quantite)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">{m.produit?.unite}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 font-mono whitespace-nowrap">
                          {fmt(m.quantiteAvant)} → <span className="font-bold text-gray-800">{fmt(m.quantiteApres)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 max-w-[150px] truncate">{m.motif || '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{m.utilisateur?.nom || '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5 animate-fade-up">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 disabled:opacity-40 transition-all">
                ← Précédent
              </button>
              <span className="text-sm text-gray-500">
                Page <strong>{page}</strong> sur <strong>{pagination.pages}</strong>
              </span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page === pagination.pages}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 disabled:opacity-40 transition-all">
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
