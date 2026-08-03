import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Package, TrendingDown, AlertTriangle, Banknote,
  ArrowDownCircle, ArrowUpCircle, ShoppingCart, Activity,
  Eye, Zap, ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import KpiCard, { AnimatedBar } from '../../components/common/KpiCard';
import Table from '../../components/ui/Table';
import { fmt, fmtM } from '../../utils/format';


// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-slate-400 text-xs mb-2 font-medium">{label}</p>
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


// ─── Skeleton loader ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">
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
    entree:     'bg-indigo-50 text-indigo-600 border border-indigo-100',
    sortie:     'bg-red-50 text-red-600 border border-red-100',
    ajustement: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    retour:     'bg-violet-50 text-violet-600 border border-violet-100',
    perte:      'bg-orange-50 text-orange-600 border border-orange-100',
  };
  const typeLbl = { entree:'Entrée', sortie:'Sortie', ajustement:'Ajust.', retour:'Retour', perte:'Perte' };

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">

      {/* Header animé */}
      <div className="flex items-center justify-between mb-7 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center animate-float">
              <Zap size={13} className="text-white" />
            </div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">
              Bonjour, <span className="text-gradient-brand">{user?.nom}</span> 👋
            </h1>
          </div>
          <p className="text-sm text-slate-400 ml-9">
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-4 py-2 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 dot-live" />
          <span className="text-xs font-medium text-slate-500">Données en direct</span>
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
              <p className="text-sm font-bold text-slate-800">Entrées vs Sorties</p>
              <p className="text-xs text-slate-400 mt-0.5">Évolution sur 14 jours</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ background:'#4F46E5' }}/>
                <span className="text-xs text-slate-400">Entrées</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ background:'#A5B4FC' }}/>
                <span className="text-xs text-slate-400">Sorties</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={grapheData} margin={{ top:5, right:5, bottom:0, left:-10 }}>
              <defs>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4F46E5" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#A5B4FC" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#A5B4FC" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Area type="monotoneX" dataKey="entree" name="Entrées" stroke="#4F46E5" strokeWidth={2.5} fill="url(#gE)" dot={false} activeDot={{ r:6, fill:'#4F46E5', stroke:'#fff', strokeWidth:2, filter:'drop-shadow(0 0 4px rgba(79,70,229,0.5))' }}/>
              <Area type="monotoneX" dataKey="sortie"  name="Sorties"  stroke="#A5B4FC" strokeWidth={2.5} fill="url(#gS)" dot={false} activeDot={{ r:6, fill:'#A5B4FC', stroke:'#fff', strokeWidth:2, filter:'drop-shadow(0 0 4px rgba(165,180,252,0.5))' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes */}
        <div className="card-neu p-5 animate-fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-800">Alertes stock</p>
            <Link to="/alertes" className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
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
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">{p.nom}</span>
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
        <div className="xl:col-span-2 animate-fade-up-4">
          <div className="card-neu overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/80">
              <p className="text-sm font-bold text-slate-800">Derniers mouvements</p>
              <Link to="/mouvements" className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">
                Voir tout <ChevronRight size={12}/>
              </Link>
            </div>
            <Table columns={['Produit','Type', { label:'Quantité', align:'right' },'Par','Date']}>
              {derniersMouvements?.map(m => (
                <tr key={m._id} className="group">
                  <td className="text-sm font-semibold text-slate-800 max-w-[160px] truncate group-hover:text-indigo-700 transition-colors">{m.produit?.nom}</td>
                  <td>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${typeCfg[m.type]}`}>{typeLbl[m.type]}</span>
                  </td>
                  <td className="text-sm font-mono text-slate-600 text-right">{fmt(m.quantite)} <span className="text-slate-400 text-xs">{m.produit?.unite}</span></td>
                  <td className="text-xs text-slate-400">{m.utilisateur?.nom||'—'}</td>
                  <td className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </Table>
          </div>
        </div>

        {/* Top produits avec barres animées */}
        <div className="card-neu p-5 animate-fade-up-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-slate-800">Top produits</p>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">30 jours</span>
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
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[130px] group-hover:text-slate-900 transition-colors">{p.nom}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">{p.count}</span>
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
    entree:'bg-indigo-50 text-indigo-600', sortie:'bg-red-50 text-red-600',
    ajustement:'bg-indigo-50 text-indigo-600', retour:'bg-violet-50 text-violet-600', perte:'bg-orange-50 text-orange-600',
  };
  const typeLbl = { entree:'Entrée', sortie:'Sortie', ajustement:'Ajust.', retour:'Retour', perte:'Perte' };

  const actions = [
    { label:'Nouvelle vente',   to:'/ventes',     Icon:ShoppingCart,   cls:'gradient-brand text-white shadow-lg shadow-indigo-200 hover:opacity-90' },
    { label:'Voir les produits',to:'/produits',   Icon:Package,         cls:'bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600' },
    { label:'Voir alertes',     to:'/alertes',    Icon:AlertTriangle,   cls:'bg-amber-50 border-2 border-amber-200 text-amber-700 hover:bg-amber-100' },
    { label:'Mouvements',       to:'/mouvements', Icon:ArrowDownCircle, cls:'bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">
      <div className="mb-7 animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
            <Zap size={13} className="text-white"/>
          </div>
          <h1 className="font-syne text-2xl font-bold text-slate-900">
            Bonjour, <span className="text-gradient-brand">{user?.nom}</span> 👋
          </h1>
        </div>
        <p className="text-sm text-slate-400 ml-9">{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</p>
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
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <AlertTriangle size={14} className="text-amber-500"/> Alertes à traiter
            </p>
            <Link to="/alertes" className="flex items-center gap-1 text-xs text-indigo-500 font-semibold hover:text-indigo-700 transition-colors">Voir tout <ChevronRight size={12}/></Link>
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
                  <span className="text-xs font-medium text-slate-700 truncate">{p.nom}</span>
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
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-4">
            <Zap size={14} className="text-indigo-500"/> Actions rapides
          </p>
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
      <div className="animate-fade-up-4">
        <div className="card-neu overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">Derniers mouvements</p>
            <Link to="/mouvements" className="flex items-center gap-1 text-xs text-indigo-500 font-semibold hover:text-indigo-700 transition-colors">Voir tout <ChevronRight size={12}/></Link>
          </div>
          <Table columns={['Produit','Type', { label:'Quantité', align:'right' },'Date']}>
            {derniersMouvements?.slice(0,6).map(m => (
              <tr key={m._id} className="group">
                <td className="text-sm font-semibold text-slate-800 max-w-[180px] truncate group-hover:text-indigo-700 transition-colors">{m.produit?.nom}</td>
                <td><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${typeCfg[m.type]}`}>{typeLbl[m.type]}</span></td>
                <td className="text-sm font-mono text-slate-600 text-right">{fmt(m.quantite)} {m.produit?.unite}</td>
                <td className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </Table>
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
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">
      <div className="mb-7 animate-fade-up">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-syne text-2xl font-bold text-slate-900">Bonjour, {user?.nom} 👋</h1>
          <div className="flex items-center gap-1.5 bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-full">
            <Eye size={10} className="text-slate-500"/>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lecture seule</span>
          </div>
        </div>
        <p className="text-sm text-slate-400">{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</p>
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
          <p className="text-sm font-bold text-slate-800 mb-4">État des alertes</p>
          {alertes?.length === 0 ? (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-4 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 dot-live"/>
              <span className="text-sm font-medium">Tous les stocks sont dans la normale ✓</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alertes?.map(p=>(
                <div key={p._id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${p.quantiteStock===0?'bg-red-50 border-red-100':'bg-amber-50 border-amber-100'}`}>
                  <span className="text-xs font-medium text-slate-700 truncate">{p.nom}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${p.quantiteStock===0?'text-red-600 bg-red-100':'text-amber-700 bg-amber-100'}`}>
                    {p.quantiteStock===0?'Rupture':`${p.quantiteStock} ${p.unite}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-neu p-5 flex flex-col items-center justify-center text-center animate-fade-up-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 animate-float">
            <Eye size={26} className="text-slate-400"/>
          </div>
          <h3 className="font-syne font-bold text-slate-700 mb-2">Accès consultation</h3>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
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
