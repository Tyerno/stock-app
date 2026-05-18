import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  BarChart2, TrendingUp, ShoppingCart, Users,
  CreditCard, Smartphone, Layers, RefreshCw, Calendar
} from 'lucide-react';
import api from '../utils/api';

const fmt  = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtM = (n) => { if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M'; if (n >= 1_000) return (n/1_000).toFixed(0)+'k'; return fmt(n); };

const COLORS = ['#3B82F6','#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="text-gray-300">{p.name} :</span>
          <span className="font-bold text-white">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Statistiques() {
  const [periode, setPeriode] = useState('30');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stats', periode],
    queryFn:  () => api.get(`/stats?periode=${periode}`).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const kpis = data?.kpis || {};
  const tendance = kpis.tendanceCA || 0;

  const modeLabels = { especes:'Espèces', mobile_money:'Mobile Money', mixte:'Mixte' };
  const modeIcons  = { especes:CreditCard, mobile_money:Smartphone, mixte:Layers };

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-blue-200">
            <BarChart2 size={18} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Statistiques</h1>
            <p className="text-xs text-gray-400 mt-0.5">Analyse de vos performances commerciales</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Période */}
          <div className="flex bg-white border border-gray-200 rounded-2xl p-1 gap-1">
            {[{v:'7',l:'7j'},{v:'30',l:'30j'},{v:'60',l:'60j'},{v:'90',l:'90j'}].map(p => (
              <button key={p.v} onClick={() => setPeriode(p.v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${periode === p.v ? 'gradient-brand text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                {p.l}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()}
            className={`p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all ${isFetching ? 'animate-spin' : ''}`}>
            <RefreshCw size={15}/>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 animate-fade-up-2">
            {[
              { label:'CA ce mois',    value:fmtM(kpis.caMois)+' GNF',  Icon:TrendingUp,  color:'text-blue-600',   bg:'bg-blue-50',   trend:tendance },
              { label:'Ventes ce mois',value:kpis.nbVentesMois||0,      Icon:ShoppingCart,color:'text-indigo-600', bg:'bg-indigo-50'  },
              { label:'Panier moyen',  value:fmtM(kpis.panierMoyen)+' GNF', Icon:BarChart2, color:'text-green-600', bg:'bg-green-50' },
              { label:'Remises totales',value:fmtM(kpis.remisesTotales)+' GNF', Icon:Calendar, color:'text-amber-600', bg:'bg-amber-50' },
            ].map((k, i) => (
              <div key={k.label} className={`card-neu p-4 animate-fade-up-${i+1}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-tight">{k.label}</p>
                  <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
                    <k.Icon size={15} className={k.color}/>
                  </div>
                </div>
                <p className={`font-syne text-xl font-bold ${k.color}`}>{k.value}</p>
                {k.trend !== undefined && (
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${k.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {k.trend >= 0 ? <TrendingUp size={10}/> : <TrendingUp size={10} className="rotate-180"/>}
                    {k.trend >= 0 ? '+' : ''}{k.trend}% vs mois précédent
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Graphe CA par jour */}
          <div className="card-neu p-5 mb-4 animate-fade-up-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-bold text-gray-800">Chiffre d'affaires par jour</p>
                <p className="text-xs text-gray-400 mt-0.5">Évolution sur {periode} jours</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-blue-500"/>
                  <span className="text-xs text-gray-400">CA (GNF)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full bg-indigo-400"/>
                  <span className="text-xs text-gray-400">Nb ventes</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.ventesParJour || []} margin={{ top:5, right:5, bottom:0, left:-10 }}>
                <defs>
                  <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gNb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                <XAxis dataKey="_id" tick={{ fontSize:9, fill:'#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={d => d?.slice(5)} interval={Math.floor((data?.ventesParJour?.length||1)/6)}/>
                <YAxis tick={{ fontSize:9, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
                <Tooltip content={<CustomTooltip />}/>
                <Area type="monotone" dataKey="ca" name="CA" stroke="#3B82F6" strokeWidth={2.5}
                  fill="url(#gCA)" dot={false} activeDot={{ r:5, fill:'#3B82F6', stroke:'#fff', strokeWidth:2 }}/>
                <Area type="monotone" dataKey="nb" name="Nb ventes" stroke="#6366F1" strokeWidth={2}
                  fill="url(#gNb)" dot={false} activeDot={{ r:4, fill:'#6366F1', stroke:'#fff', strokeWidth:2 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top produits + Modes paiement */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 animate-fade-up-4">

            {/* Top produits */}
            <div className="card-neu p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">🏆 Top 10 produits</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.topProduits || []} layout="vertical" margin={{ top:0, right:20, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false}/>
                  <XAxis type="number" tick={{ fontSize:9, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
                  <YAxis type="category" dataKey="_id" tick={{ fontSize:10, fill:'#374151' }} tickLine={false} axisLine={false} width={100}
                    tickFormatter={v => v?.length > 12 ? v.slice(0,12)+'…' : v}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Bar dataKey="ca" name="CA (GNF)" radius={[0,6,6,0]}>
                    {(data?.topProduits || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Modes de paiement */}
            <div className="card-neu p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">💳 Modes de paiement</p>
              {data?.parModePaiement?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.parModePaiement} dataKey="ca" nameKey="_id" cx="50%" cy="50%"
                        outerRadius={70} innerRadius={40} paddingAngle={3}>
                        {data.parModePaiement.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [fmt(v)+' GNF', 'CA']}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 mt-2">
                    {data.parModePaiement.map((m, i) => {
                      const Icon = modeIcons[m._id] || CreditCard;
                      const total = data.parModePaiement.reduce((s, x) => s + x.ca, 0);
                      const pct = total > 0 ? ((m.ca / total) * 100).toFixed(1) : 0;
                      return (
                        <div key={m._id} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }}/>
                          <Icon size={13} className="text-gray-400 flex-shrink-0"/>
                          <span className="text-xs text-gray-600 flex-1">{modeLabels[m._id] || m._id}</span>
                          <span className="text-xs font-bold text-gray-800">{fmt(m.ca)} GNF</span>
                          <span className="text-[10px] text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-300">
                  <p className="text-sm">Aucune donnée disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Top clients + Heures de pointe */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-up-5">

            {/* Top clients */}
            <div className="card-neu p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">👥 Top 10 clients</p>
              {data?.topClients?.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {data.topClients.map((c, i) => (
                    <div key={c._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c._id || 'Client comptoir'}</p>
                        <p className="text-[10px] text-gray-400">{c.nbAchats} achat(s) · panier moy. {fmtM(c.panier)} GNF</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 flex-shrink-0">{fmtM(c.ca)} GNF</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-300">
                  <p className="text-sm">Aucune donnée disponible</p>
                </div>
              )}
            </div>

            {/* Heures de pointe */}
            <div className="card-neu p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">🕐 Heures de pointe</p>
              {data?.ventesParHeure?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.ventesParHeure} margin={{ top:5, right:5, bottom:0, left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                    <XAxis dataKey="_id" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}
                      tickFormatter={h => `${h}h`}/>
                    <YAxis tick={{ fontSize:9, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Bar dataKey="nb" name="Nb ventes" radius={[6,6,0,0]}>
                      {data.ventesParHeure.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % 3]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-300">
                  <p className="text-sm">Aucune donnée disponible</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
