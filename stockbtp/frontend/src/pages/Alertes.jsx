import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

function Section({ titre, items, accent, Icon }) {
  const s = {
    red:   { header:'text-red-600',   badge:'bg-red-100 text-red-600',   row:'hover:bg-red-50/50',  left:'border-l-4 border-red-400',  qty:'text-red-600 bg-red-50' },
    amber: { header:'text-amber-600', badge:'bg-amber-100 text-amber-700', row:'hover:bg-amber-50/50', left:'border-l-4 border-amber-400', qty:'text-amber-700 bg-amber-50' },
  }[accent];

  return (
    <div className="animate-fade-up-2">
      <div className="flex items-center gap-3 mb-4">
        <Icon size={16} className={s.header}/>
        <h2 className={`text-sm font-semibold ${s.header}`}>{titre}</h2>
        <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full ${s.badge}`}>{items.length}</span>
      </div>
      {items.length===0 ? (
        <div className="card-neu flex items-center justify-center py-10 gap-3 text-gray-300">
          <CheckCircle size={18} className="opacity-40"/>
          <span className="text-sm">Aucun produit dans cette catégorie ✓</span>
        </div>
      ) : (
        <div className="card-neu overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['Produit','Référence','Catégorie','Stock actuel','Seuil','Écart'].map(h=>(
                  <th key={h} className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map(p=>(
                  <tr key={p._id} className={`border-b border-gray-50 ${s.row} ${s.left} transition-colors`}>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">{p.nom}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{p.reference||'—'}</td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:p.categorie?.couleur}}/><span className="text-xs text-gray-500">{p.categorie?.nom}</span></div></td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${s.qty}`}>{p.quantiteStock===0?'Rupture totale':`${fmt(p.quantiteStock)} ${p.unite}`}</span></td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{fmt(p.seuilAlerte)} {p.unite}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-red-500 font-semibold">{p.quantiteStock===0?'— Rupture':`- ${fmt(p.seuilAlerte-p.quantiteStock)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Alertes() {
  const { data, isLoading } = useQuery({
    queryKey: ['alertes'],
    queryFn: () => api.get('/alertes').then(r=>r.data.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="mb-8 animate-fade-up">
        <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Alertes stock</h1>
        <p className="text-sm text-gray-400 mt-1">{isLoading?'…':`${data?.total||0} produit(s) nécessitent votre attention`}</p>
      </div>
      {isLoading ? <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/></div> : (
        <div className="flex flex-col gap-8">
          <Section titre="Ruptures de stock" items={data?.ruptures||[]} accent="red"   Icon={XCircle}/>
          <Section titre="Stocks faibles"    items={data?.faibles||[]}  accent="amber" Icon={AlertTriangle}/>
        </div>
      )}
    </div>
  );
}
