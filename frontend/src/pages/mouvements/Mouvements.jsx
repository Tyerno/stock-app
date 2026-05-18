import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Loader, Filter } from 'lucide-react';
import api from '../../utils/api';
import { formatNombre, formatDateHeure } from '../../utils/format';

const typeConfig = {
  entree:     { label: 'Entrée',     Icon: ArrowDownCircle, cls: 'text-emerald-500', badge: 'badge-green' },
  sortie:     { label: 'Sortie',     Icon: ArrowUpCircle,   cls: 'text-red-500',     badge: 'badge-red'   },
  ajustement: { label: 'Ajustement', Icon: RefreshCw,       cls: 'text-amber-500',   badge: 'badge-amber' },
};

export default function Mouvements() {
  const [filtreType, setFiltreType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['mouvements', filtreType],
    queryFn:  () => api.get('/mouvements', { params: { type: filtreType, limit: 60 } }).then(r => r.data),
  });

  const mouvements = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mouvements de stock</h1>
          <p className="page-subtitle">{data?.total || 0} mouvement(s) enregistré(s)</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'Tous'], ['entree', 'Entrées'], ['sortie', 'Sorties'], ['ajustement', 'Ajustements']].map(([val, label]) => (
          <button key={val}
            onClick={() => setFiltreType(val)}
            className={`btn btn-sm ${filtreType === val ? 'btn-primary' : 'btn-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>
        ) : mouvements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Aucun mouvement trouvé</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Produit</th>
                  <th>Avant</th>
                  <th>Quantité</th>
                  <th>Après</th>
                  <th>Motif</th>
                  <th>Par</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map(m => {
                  const cfg = typeConfig[m.type] || typeConfig.ajustement;
                  return (
                    <tr key={m._id}>
                      <td>
                        <span className={`badge ${cfg.badge}`}>
                          <cfg.Icon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-800">{m.produit?.nom}</p>
                        <p className="text-xs text-slate-400">{m.produit?.reference}</p>
                      </td>
                      <td className="font-mono text-slate-500">{formatNombre(m.quantiteAvant)}</td>
                      <td>
                        <span className={`font-bold font-mono ${m.type === 'sortie' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {m.type === 'sortie' ? '-' : '+'}{formatNombre(m.quantite)}
                        </span>
                      </td>
                      <td className="font-mono font-semibold">{formatNombre(m.quantiteApres)}</td>
                      <td className="text-slate-500 text-sm">{m.motif || '—'}</td>
                      <td className="text-slate-400 text-sm">{m.creePar?.nom || '—'}</td>
                      <td className="text-slate-400 text-xs">{formatDateHeure(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
