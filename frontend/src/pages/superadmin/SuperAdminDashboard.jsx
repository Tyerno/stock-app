import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Package, ShoppingCart, TrendingUp, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatMontant, formatNombre } from '../../utils/format';

function StatCard({ label, value, Icon, color }) {
  const colors = {
    indigo:  'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    purple:  'bg-purple-50 text-purple-600',
  };
  return (
    <div className="kpi-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn:  () => api.get('/superadmin/stats').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>;

  const plans = data?.parPlan || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Vue globale — Plateforme</h1>
        <p className="page-subtitle">Administration StockSaaS</p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Entreprises actives" value={formatNombre(data?.entreprisesActives)}  Icon={Building2}    color="indigo"  />
        <StatCard label="Utilisateurs"         value={formatNombre(data?.totalUsers)}         Icon={Users}        color="emerald" />
        <StatCard label="Produits (total)"     value={formatNombre(data?.totalProduits)}      Icon={Package}      color="amber"   />
        <StatCard label="Ventes (total)"       value={formatNombre(data?.totalVentes)}        Icon={ShoppingCart} color="purple"  />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Répartition par plan */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-5">Répartition par plan</h2>
          <div className="space-y-3">
            {[
              { plan: 'gratuit',    label: 'Gratuit',    color: 'bg-slate-200',  textColor: 'text-slate-600' },
              { plan: 'pro',        label: 'Pro',        color: 'bg-indigo-400', textColor: 'text-indigo-700' },
              { plan: 'enterprise', label: 'Enterprise', color: 'bg-purple-500', textColor: 'text-purple-700' },
            ].map(({ plan, label, color, textColor }) => {
              const count  = plans[plan] || 0;
              const total  = data?.totalEntreprises || 1;
              const pct    = Math.round((count / total) * 100);
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-semibold ${textColor}`}>{label}</span>
                    <span className="text-slate-500">{count} entreprise(s) · {pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CA total */}
        <div className="card p-5 flex flex-col justify-between">
          <h2 className="font-bold text-slate-900 mb-2">Chiffre d'affaires global</h2>
          <div>
            <p className="text-4xl font-bold text-indigo-600">{formatMontant(data?.caTotal, 'GNF')}</p>
            <p className="text-sm text-slate-400 mt-1">Cumul total · toutes entreprises</p>
          </div>
          <Link to="/superadmin/entreprises" className="btn-primary mt-6 self-start">
            Gérer les entreprises →
          </Link>
        </div>
      </div>
    </div>
  );
}
