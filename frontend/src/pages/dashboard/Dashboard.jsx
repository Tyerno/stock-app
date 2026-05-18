import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Package, AlertTriangle, ShoppingCart, Wallet, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatMontant, formatNombre, formatDate } from '../../utils/format';

function KpiCard({ label, value, sub, Icon, color, link }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald:'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50  text-amber-600',
    red:    'bg-red-50    text-red-600',
  };
  const card = (
    <div className="kpi-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {link && <ArrowRight size={14} className="text-slate-300" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return link ? <Link to={link}>{card}</Link> : card;
}

const CustomTooltip = ({ active, payload, label, devise }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-indigo-600">{formatMontant(payload[0]?.value, devise)}</p>
      {payload[1] && <p className="text-slate-500">{payload[1]?.value} ventes</p>}
    </div>
  );
};

export default function Dashboard() {
  const { devise, entreprise } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', entreprise?._id],
    queryFn:  () => api.get('/dashboard').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}
    </div>
  );

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="CA aujourd'hui"   value={formatMontant(kpis.caAujourdhui, devise)}  sub={`${kpis.ventesAujourdhui || 0} vente(s)`} Icon={Wallet}        color="indigo"  />
        <KpiCard label="CA ce mois"       value={formatMontant(kpis.caMois, devise)}         sub={`${kpis.ventesMois || 0} ventes`}          Icon={TrendingUp}    color="emerald" />
        <KpiCard label="Produits"         value={formatNombre(kpis.totalProduits)}           sub="en catalogue"                              Icon={Package}       color="indigo"  link="/produits" />
        <KpiCard label="Alertes stock"    value={kpis.alertes || 0}                          sub={`${kpis.ruptures || 0} ruptures`}          Icon={AlertTriangle} color={kpis.alertes > 0 ? 'red' : 'emerald'} link="/alertes" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Graphe ventes 30j */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900">Ventes — 30 derniers jours</h2>
              <p className="text-xs text-slate-400 mt-0.5">Chiffre d'affaires quotidien</p>
            </div>
            <Link to="/ventes" className="btn-ghost btn-sm">Voir tout</Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.graphe30Jours || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={50}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip devise={devise} />} />
              <Area type="monotone" dataKey="montant" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top produits */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">Top produits</h2>
            <span className="text-xs text-slate-400">30 jours</span>
          </div>
          {(data?.topProduits || []).length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-slate-400 text-sm">
              Aucune vente encore
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.topProduits || []).map((p, i) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.nom}</p>
                    <p className="text-xs text-slate-400">{formatNombre(p.totalVendu)} {p.unite}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Valeur du stock */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Package size={22} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Valeur totale du stock</p>
          <p className="text-2xl font-bold text-slate-900">{formatMontant(kpis.valeurStock, devise)}</p>
        </div>
        <div className="ml-auto">
          <Link to="/produits" className="btn-secondary btn-sm">Gérer le stock</Link>
        </div>
      </div>
    </div>
  );
}
