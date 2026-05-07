import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Package, TrendingDown, AlertTriangle, Banknote,
  ArrowDownCircle, ArrowUpCircle, ShoppingCart, Activity,
  TrendingUp, Eye, Zap, ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const fmt  = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtM = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
  return fmt(n);
};

// ─── Hook: compteur animé ─────────────────────────────────────────────────────
function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const numTarget = parseFloat(String(target).replace(/[^0-9.]/g, '')) || 0;
    if (numTarget === 0) { setValue(0); return; }

    const startTime = performance.now();
    const startVal  = 0;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);
      setValue(Math.round(startVal + (numTarget - startVal) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Compteur animé ───────────────────────────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '', className = '' }) {
  const count = useAnimatedCounter(value);
  const isLarge = typeof value === 'string' && value.includes('M');
  const display = isLarge
    ? (count / 1_000_000).toFixed(1) + 'M'
    : new Intl.NumberFormat('fr-FR').format(count);

  return <span className={className}>{prefix}{display}{suffix}</span>;
}

// ─── Barre de progression animée ─────────────────────────────────────────────
function AnimatedBar({ percent, color, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percent), 300 + delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width:      `${width}%`,
          background: color,
          transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <p className="text-sm font-bold" style={{ color: p.color }}>
            {p.name} : <span className="text-white">{fmt(p.value)}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card premium ─────────────────────────────────────────────────────────
const KPI_CONFIG = {
  blue:   { glow: 'kpi-glow-blue',   bar: '#3B82F6', top: 'from-blue-500 to-blue-400',     icon: 'bg-blue-50',   iconColor: '#3B82F6' },
  red:    { glow: 'kpi-glow-red',    bar: '#EF4444', top: 'from-red-500 to-red-400',       icon: 'bg-red-50',    iconColor: '#EF4444' },
  amber:  { glow: 'kpi-glow-amber',  bar: '#F59E0B', top: 'from-amber-500 to-yellow-400',  icon: 'bg-amber-50',  iconColor: '#F59E0B' },
  violet: { glow: 'kpi-glow-violet', bar: '#6366F1', top: 'from-violet-500 to-indigo-500', icon: 'bg-violet-50', iconColor: '#6366F1' },
  green:  { glow: 'kpi-glow-green',  bar: '#10B981', top: 'from-emerald-500 to-green-400', icon: 'bg-emerald-50',iconColor: '#10B981' },
};

function KpiCard({ label, value, sub, Icon, accent, progress, delay, trend }) {
  const cfg = KPI_CONFIG[accent];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`card-kpi p-5 animate-fade-up-${delay} ${cfg.glow}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Barre top colorée */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cfg.top} transition-all duration-300 ${hovered ? 'h-1' : ''}`} />

      {/* Fond décoratif subtil */}
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-5 bg-gradient-to-br ${cfg.top} transition-all duration-300 ${hovered ? 'opacity-10 w-24 h-24' : ''}`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <div className={`w-9 h-9 rounded-xl ${cfg.icon} flex items-center justify-center transition-transform duration-300 ${hovered ? 'scale-110' : ''}`}>
            <Icon size={17} style={{ color: cfg.iconColor }} />
          </div>
        </div>

        <div className="mb-1">
          <p className="font-syne text-2xl font-bold text-gray-900 tracking-tight animate-count-up">
            <AnimatedCounter value={value} />
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">{sub}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
              {trend >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {progress !== undefined && (
          <AnimatedBar percent={progress} color={cfg.bar} delay={delay * 100} />
        )}
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="mb-6">
        <div className="skeleton h-7 w-64 mb-2" />
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-2 skeleton h-72 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 skeleton h-56 rounded-2xl" />
        <div className="skeleton h-56 rounded-2xl" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD ADMIN
// ════════════════════════════════════════════════════════════════════════════
function DashboardAdmin({ data, user }) {
  const { kpis, graphe30Jours, topProduits, derniersMouvements, alertes } = data;

  const grapheMap = {};
  (graphe30Jours || []).forEach(({ _id, quantite }) => {
    if (!grapheMap[_id.date]) grapheMap[_id.date] = { date: _id.date?.slice(5) };
    grapheMap[_id.date][_id.type] = quantite;
  });
  const grapheData = Object.values(grapheMap).slice(-14);

  const total = kpis.totalProduits || 1;

  const typeCfg = {
    entree:     'bg-blue-50 text-blue-600 border border-blue-100',
    sortie:     'bg-red-50 text-red-600 border border-red-100',
    ajustement: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    retour:     'bg-violet-50 text-violet-600 border border-violet-100',
    perte:      'bg-orange-50 text-orange-600 border border-orange-100',
  };
  const typeLbl = { entree:'Entrée', sortie:'Sortie', ajustement:'Ajust.', retour:'Retour', perte:'Perte' };

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">

      {/* Header animé */}
      <div className="flex items-center justify-between mb-7 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center animate-float">
              <Zap size={13} className="text-white" />
            </div>
            <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">
              Bonjour, <span className="text-gradient-brand">{user?.nom}</span> 👋
            </h1>
          </div>
          <p className="text-sm text-gray-400 ml-9">
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 dot-live" />
          <span className="text-xs font-medium text-gray-500">Données en direct</span>
          <Activity size={13} className="text-emerald-400" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard delay="1" label="Produits actifs"  value={kpis.totalProduits}   sub="dans le catalogue"  Icon={Package}         accent="blue"   progress={Math.round(((total-kpis.produitsRupture)/total)*100)} />
        <KpiCard delay="2" label="Ruptures"          value={kpis.produitsRupture} sub="stocks à zéro"     Icon={TrendingDown}    accent="red"    progress={Math.min(100,Math.round((kpis.produitsRupture/total)*100))} />
        <KpiCard delay="3" label="Stocks faibles"    value={kpis.produitsFaibles} sub="sous le seuil"     Icon={AlertTriangle}   accent="amber"  progress={Math.min(100,Math.round((kpis.produitsFaibles/total)*100))} />
        <KpiCard delay="4" label="Valeur du stock"   value={fmtM(kpis.valeurStock)+' GNF'} sub="coût d'achat" Icon={Banknote}  accent="violet" progress={68} />
        <KpiCard delay="1" label="Entrées ce mois"   value={kpis.entreesMois}     sub="mouvements"        Icon={ArrowDownCircle} accent="green"  progress={55} />
        <KpiCard delay="2" label="Sorties ce mois"   value={kpis.sortiesMois}     sub="mouvements"        Icon={ArrowUpCircle}   accent="red"    progress={42} />
      </div>

      {/* Graphe + Alertes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">

        {/* Graphe courbes */}
        <div className="xl:col-span-2 card-neu p-5 animate-fade-up-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-800">Entrées vs Sorties</p>
              <p className="text-xs text-gray-400 mt-0.5">Évolution sur 14 jours</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-400">Entrées</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-xs text-gray-400">Sorties</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={grapheData} margin={{ top:5, right:5, bottom:0, left:-10 }}>
              <defs>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3B82F6" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366F1" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Area type="monotoneX" dataKey="entree" name="Entrées" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gE)" dot={false} activeDot={{ r:6, fill:'#3B82F6', stroke:'#fff', strokeWidth:2, filter:'drop-shadow(0 0 4px rgba(59,130,246,0.6))' }}/>
              <Area type="monotoneX" dataKey="sortie"  name="Sorties"  stroke="#6366F1" strokeWidth={2.5} fill="url(#gS)" dot={false} activeDot={{ r:6, fill:'#6366F1', stroke:'#fff', strokeWidth:2, filter:'drop-shadow(0 0 4px rgba(99,102,241,0.6))' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes */}
        <div className="card-neu p-5 animate-fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800">Alertes stock</p>
            <Link to="/alertes" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors">
              Voir tout <ChevronRight size={12}/>
            </Link>
          </div>
          {alertes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-emerald-500">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 animate-float">
                <Package size={20} className="text-emerald-500"/>
              </div>
              <p className="text-sm font-medium">Tout est OK ✓</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto scrollbar-hide">
              {alertes?.slice(0,7).map((p, i) => (
                <div key={p._id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-default ${p.quantiteStock === 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.quantiteStock === 0 ? 'bg-red-400 dot-live' : 'bg-amber-400'}`}/>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[110px]">{p.nom}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${p.quantiteStock === 0 ? 'text-red-600 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
                    {p.quantiteStock === 0 ? 'Rupture' : `${p.quantiteStock} ${p.unite}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mouvements + Top produits */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Table mouvements */}
        <div className="xl:col-span-2 card-neu overflow-hidden animate-fade-up-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/80">
            <p className="text-sm font-bold text-gray-800">Derniers mouvements</p>
            <Link to="/mouvements" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors">
              Voir tout <ChevronRight size={12}/>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {['Produit','Type','Quantité','Par','Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {derniersMouvements?.map((m, i) => (
                  <tr key={m._id}
                    className="border-b border-gray-50 hover:bg-blue-50/40 transition-all duration-150 group"
                    style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800 max-w-[160px] truncate group-hover:text-blue-700 transition-colors">{m.produit?.nom}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${typeCfg[m.type]}`}>{typeLbl[m.type]}</span>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-600">{fmt(m.quantite)} <span className="text-gray-400 text-xs">{m.produit?.unite}</span></td>
                    <td className="px-5 py-3 text-xs text-gray-400">{m.utilisateur?.nom||'—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top produits avec barres animées */}
        <div className="card-neu p-5 animate-fade-up-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-gray-800">Top produits</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">30 jours</span>
          </div>
          <div className="flex flex-col gap-4">
            {topProduits?.map((p, i) => {
              const COLORS = ['#3B82F6','#6366F1','#10B981','#F59E0B','#EF4444'];
              const max = topProduits[0]?.count || 1;
              const pct = Math.round((p.count / max) * 100);
              return (
                <div key={p._id} className="group cursor-default">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: COLORS[i] }}>
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[130px] group-hover:text-gray-900 transition-colors">{p.nom}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{p.count}</span>
                  </div>
                  <AnimatedBar percent={pct} color={COLORS[i]} delay={i * 120} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD GESTIONNAIRE
// ════════════════════════════════════════════════════════════════════════════
function DashboardGestionnaire({ data, user }) {
  const navigate  = useNavigate();
  const { kpis, alertes, derniersMouvements } = data;

  const typeCfg = {
    entree:'bg-blue-50 text-blue-600', sortie:'bg-red-50 text-red-600',
    ajustement:'bg-indigo-50 text-indigo-600', retour:'bg-violet-50 text-violet-600', perte:'bg-orange-50 text-orange-600',
  };
  const typeLbl = { entree:'Entrée', sortie:'Sortie', ajustement:'Ajust.', retour:'Retour', perte:'Perte' };

  const actions = [
    { label:'Nouvelle vente',   to:'/ventes',     Icon:ShoppingCart,   cls:'gradient-brand text-white shadow-lg shadow-blue-200 hover:opacity-90' },
    { label:'Voir les produits',to:'/produits',   Icon:Package,         cls:'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600' },
    { label:'Voir alertes',     to:'/alertes',    Icon:AlertTriangle,   cls:'bg-amber-50 border-2 border-amber-200 text-amber-700 hover:bg-amber-100' },
    { label:'Mouvements',       to:'/mouvements', Icon:ArrowDownCircle, cls:'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="mb-7 animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
            <Zap size={13} className="text-white"/>
          </div>
          <h1 className="font-syne text-xl font-bold text-gray-900">
            Bonjour, <span className="text-gradient-brand">{user?.nom}</span> 👋
          </h1>
        </div>
        <p className="text-sm text-gray-400 ml-9">{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label:'Produits actifs', value:kpis.totalProduits,   Icon:Package,      accent:'blue'  },
          { label:'Ruptures',        value:kpis.produitsRupture, Icon:TrendingDown, accent:'red'   },
          { label:'Stocks faibles',  value:kpis.produitsFaibles, Icon:AlertTriangle,accent:'amber' },
          { label:'Sorties ce mois', value:kpis.sortiesMois,     Icon:ShoppingCart, accent:'green' },
        ].map((k, i) => (
          <KpiCard key={k.label} delay={i+1} label={k.label} value={k.value} sub="" Icon={k.Icon} accent={k.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Alertes */}
        <div className="card-neu p-5 animate-fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800">⚠️ Alertes à traiter</p>
            <Link to="/alertes" className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:text-blue-700 transition-colors">Voir tout <ChevronRight size={12}/></Link>
          </div>
          {alertes?.length === 0 ? (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 dot-live"/>
              <span className="text-sm font-medium">Tous les stocks sont dans la normale ✓</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alertes?.slice(0,5).map(p => (
                <div key={p._id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.01] ${p.quantiteStock === 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                  <span className="text-xs font-medium text-gray-700 truncate">{p.nom}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${p.quantiteStock === 0 ? 'text-red-600 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
                    {p.quantiteStock === 0 ? 'Rupture' : `${p.quantiteStock} ${p.unite}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="card-neu p-5 animate-fade-up-3">
          <p className="text-sm font-bold text-gray-800 mb-4">⚡ Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(a => (
              <button key={a.to} onClick={() => navigate(a.to)}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl font-semibold text-xs transition-all duration-200 hover:scale-105 active:scale-95 ${a.cls}`}>
                <a.Icon size={22}/>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Derniers mouvements */}
      <div className="card-neu overflow-hidden animate-fade-up-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-800">Derniers mouvements</p>
          <Link to="/mouvements" className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:text-blue-700 transition-colors">Voir tout <ChevronRight size={12}/></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['Produit','Type','Quantité','Date'].map(h=><th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody>
              {derniersMouvements?.slice(0,6).map(m=>(
                <tr key={m._id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-all group">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800 max-w-[180px] truncate group-hover:text-blue-700 transition-colors">{m.produit?.nom}</td>
                  <td className="px-5 py-3"><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${typeCfg[m.type]}`}>{typeLbl[m.type]}</span></td>
                  <td className="px-5 py-3 text-sm font-mono text-gray-600">{fmt(m.quantite)} {m.produit?.unite}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD LECTEUR
// ════════════════════════════════════════════════════════════════════════════
function DashboardLecteur({ data, user }) {
  const { kpis, alertes } = data;

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="mb-7 animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-syne text-xl font-bold text-gray-900">Bonjour, {user?.nom} 👋</h1>
          <div className="flex items-center gap-1.5 bg-gray-200 border border-gray-300 px-2.5 py-1 rounded-full">
            <Eye size={10} className="text-gray-500"/>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lecture seule</span>
          </div>
        </div>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up-2">
        {[
          { label:'Produits en stock', value:kpis.totalProduits,   Icon:Package,      accent:'blue'   },
          { label:'En rupture',        value:kpis.produitsRupture, Icon:TrendingDown, accent:'red'    },
          { label:'Stocks faibles',    value:kpis.produitsFaibles, Icon:AlertTriangle,accent:'amber'  },
          { label:'Valeur du stock',   value:fmtM(kpis.valeurStock)+' GNF', Icon:Banknote, accent:'violet' },
        ].map((k, i) => (
          <KpiCard key={k.label} delay={i+1} label={k.label} value={k.value} sub="" Icon={k.Icon} accent={k.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-up-3">
        <div className="card-neu p-5">
          <p className="text-sm font-bold text-gray-800 mb-4">État des alertes</p>
          {alertes?.length === 0 ? (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-4 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 dot-live"/>
              <span className="text-sm font-medium">Tous les stocks sont dans la normale ✓</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alertes?.map(p=>(
                <div key={p._id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${p.quantiteStock===0?'bg-red-50 border-red-100':'bg-amber-50 border-amber-100'}`}>
                  <span className="text-xs font-medium text-gray-700 truncate">{p.nom}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${p.quantiteStock===0?'text-red-600 bg-red-100':'text-amber-700 bg-amber-100'}`}>
                    {p.quantiteStock===0?'Rupture':`${p.quantiteStock} ${p.unite}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-neu p-5 flex flex-col items-center justify-center text-center animate-fade-up-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 animate-float">
            <Eye size={26} className="text-gray-400"/>
          </div>
          <h3 className="font-syne font-bold text-gray-700 mb-2">Accès consultation</h3>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
            Vous pouvez consulter les produits, le stock et les mouvements. Pour effectuer des actions, contactez votre administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTEUR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => api.get('/dashboard').then(r => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (user?.role === 'admin')        return <DashboardAdmin        data={data} user={user} />;
  if (user?.role === 'gestionnaire') return <DashboardGestionnaire data={data} user={user} />;
  return <DashboardLecteur data={data} user={user} />;
}
