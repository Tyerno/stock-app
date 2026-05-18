import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Loader, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatNombre } from '../../utils/format';

// FIX: un seul export default, suppression du double export
export default function Alertes() {
  const { entreprise } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['alertes', entreprise?._id],
    queryFn:  () => api.get('/alertes').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const ruptures = data?.ruptures || [];
  const faibles  = data?.faibles  || [];

  if (isLoading) return (
    <div className="p-12 text-center">
      <Loader size={24} className="animate-spin text-indigo-500 mx-auto" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertes de stock</h1>
          <p className="page-subtitle">{data?.total || 0} produit(s) nécessitent votre attention</p>
        </div>
      </div>

      {data?.total === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">Tout est en ordre !</p>
          <p className="text-slate-500 text-sm mt-1">Aucun produit en rupture ou en stock faible.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {ruptures.length > 0 && (
            <div>
              <h2 className="font-bold text-red-600 flex items-center gap-2 mb-3">
                <AlertTriangle size={16} /> Ruptures de stock ({ruptures.length})
              </h2>
              <div className="card divide-y divide-slate-50">
                {ruptures.map(p => (
                  <div key={p._id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.nom}</p>
                      <p className="text-xs text-slate-400">{p.reference} · {p.categorie?.nom}</p>
                    </div>
                    <span className="badge badge-red">0 {p.unite}</span>
                    <Link to="/produits" className="btn-secondary btn-sm">Réapprovisionner</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {faibles.length > 0 && (
            <div>
              <h2 className="font-bold text-amber-600 flex items-center gap-2 mb-3">
                <AlertTriangle size={16} /> Stock faible ({faibles.length})
              </h2>
              <div className="card divide-y divide-slate-50">
                {faibles.map(p => (
                  <div key={p._id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.nom}</p>
                      <p className="text-xs text-slate-400">{p.reference} · Seuil: {p.seuilAlerte} {p.unite}</p>
                    </div>
                    <span className="badge badge-amber">{formatNombre(p.quantiteStock)} {p.unite}</span>
                    <Link to="/produits" className="btn-secondary btn-sm">Réapprovisionner</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
