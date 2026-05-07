// ─── Mouvements.jsx ──────────────────────────────────────────────────────────
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import api from '../utils/api';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);
const TYPE_CFG = {
  entree:     { label:'Entrée',  cls:'bg-blue-50 text-blue-600 border border-blue-100' },
  sortie:     { label:'Sortie',  cls:'bg-red-50 text-red-600 border border-red-100' },
  ajustement: { label:'Ajust.',  cls:'bg-indigo-50 text-indigo-600 border border-indigo-100' },
  retour:     { label:'Retour',  cls:'bg-violet-50 text-violet-600 border border-violet-100' },
  perte:      { label:'Perte',   cls:'bg-orange-50 text-orange-600 border border-orange-100' },
};

export function Mouvements() {
  const [type, setType]           = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin]     = useState('');
  const [page, setPage]           = useState(1);
  const inputCls = "bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-400 transition-all";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['mouvements', type, dateDebut, dateFin, page],
    queryFn: () => api.get('/mouvements', { params:{ type:type||undefined, dateDebut:dateDebut||undefined, dateFin:dateFin||undefined, page, limit:30 } }).then(r=>r.data),
    keepPreviousData: true,
  });

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Mouvements</h1>
          <p className="text-sm text-gray-400 mt-1">Historique complet des entrées et sorties</p>
        </div>
        {isFetching && <RefreshCw size={16} className="text-gray-400 animate-spin mt-2"/>}
      </div>
      <div className="flex items-center gap-3 mb-5 flex-wrap animate-fade-up-2">
        <select className={inputCls} value={type} onChange={e=>{setType(e.target.value);setPage(1);}}>
          <option value="">Tous les types</option>
          <option value="entree">Entrées</option>
          <option value="sortie">Sorties</option>
          <option value="ajustement">Ajustements</option>
          <option value="retour">Retours</option>
          <option value="perte">Pertes</option>
        </select>
        <input type="date" className={inputCls} value={dateDebut} onChange={e=>{setDateDebut(e.target.value);setPage(1);}}/>
        <input type="date" className={inputCls} value={dateFin}   onChange={e=>{setDateFin(e.target.value);setPage(1);}}/>
      </div>
      <div className="card-neu overflow-hidden animate-fade-up-3">
        {isLoading ? <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Produit','Type','Qté','Avant','Après','Montant','Réf.','Par','Date'].map(h=>(
                  <th key={h} className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data?.data?.length===0 ? <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Aucun mouvement trouvé</td></tr>
                : data?.data?.map(m=>{
                  const cfg = TYPE_CFG[m.type]||{};
                  return (
                    <tr key={m._id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-800 max-w-[160px] truncate group-hover:text-blue-700 transition-colors">{m.produit?.nom}</td>
                      <td className="px-5 py-3.5"><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${cfg.cls}`}>{cfg.label}</span></td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-gray-700">{fmt(m.quantite)} <span className="text-gray-400 text-xs font-normal">{m.produit?.unite}</span></td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{fmt(m.quantiteAvant)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-600">{fmt(m.quantiteApres)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{m.montantTotal ? fmt(m.montantTotal)+' GNF':'—'}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{m.reference||'—'}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{m.utilisateur?.nom||'—'}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data?.pagination?.pages>1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all">← Précédent</button>
          <span className="text-sm text-gray-400">Page {page} / {data.pagination.pages}</span>
          <button disabled={page>=data.pagination.pages} onClick={()=>setPage(p=>p+1)} className="px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all">Suivant →</button>
        </div>
      )}
    </div>
  );
}

export default Mouvements;
