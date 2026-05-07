import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, ShoppingCart, CreditCard, Tag } from 'lucide-react';
import api from '../utils/api';

const fmt  = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const fmtM = (n) => { if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M'; if (n >= 1_000) return (n/1_000).toFixed(0)+'k'; return fmt(n); };
const COLORS = ['#3B82F6','#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} className="font-semibold" style={{ color: p.color }}>{p.name} : {fmt(p.value)} {p.name === 'CA' ? 'GNF' : ''}</p>)}
    </div>
  );
};

export default function Statistiques() {
  const [periode, setPeriode] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['stats', periode],
    queryFn: () => api.get(`/stats?periode=${periode}`).then(r => r.data.data),
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/></div>;

  const { kpis, ventesParJour, topProduits, topClients, parModePaiement, ventesParHeure } = data;
  const modeLabel = { especes:'Espèces', mobile_money:'Mobile Money', mixte:'Mixte' };

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Statistiques des ventes</h1>
          <p className="text-sm text-gray-400 mt-1">Analyse détaillée de votre activité commerciale</p>
        </div>
        <div className="flex gap-2">
          {[{value:'7',label:'7j'},{value:'30',label:'30j'},{value:'90',label:'3 mois'},{value:'365',label:'1 an'}].map(p=>(
            <button key={p.value} onClick={() => setPeriode(p.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${periode===p.value?'gradient-brand text-white shadow-md shadow-blue-200':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:"Chiffre d'affaires", value:fmtM(kpis.caMois)+' GNF', Icon:TrendingUp,  color:'text-blue-600',   bg:'bg-blue-50',   sub: kpis.tendanceCA>0?`↑ +${kpis.tendanceCA}%`:kpis.tendanceCA<0?`↓ ${kpis.tendanceCA}%`:'—', subColor:kpis.tendanceCA>=0?'text-green-500':'text-red-500' },
          { label:'Nombre de ventes',   value:fmt(kpis.nbVentesMois),    Icon:ShoppingCart,color:'text-indigo-600', bg:'bg-indigo-50', sub:'ce mois',             subColor:'text-gray-400' },
          { label:'Panier moyen',       value:fmtM(kpis.panierMoyen)+' GNF', Icon:CreditCard, color:'text-emerald-600',bg:'bg-emerald-50',sub:'par vente',        subColor:'text-gray-400' },
          { label:'Remises accordées',  value:fmtM(kpis.remisesTotales)+' GNF', Icon:Tag,   color:'text-amber-600',  bg:'bg-amber-50',  sub:'ce mois',            subColor:'text-gray-400' },
        ].map(k=>(
          <div key={k.label} className="card-neu p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{k.label}</p>
              <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center`}><k.Icon size={15} className={k.color}/></div>
            </div>
            <p className={`font-syne text-xl font-bold ${k.color} tracking-tight`}>{k.value}</p>
            <p className={`text-xs mt-1 ${k.subColor}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card-neu p-5 mb-4 animate-fade-up-3">
        <div className="mb-4"><p className="text-sm font-semibold text-gray-800">Évolution du chiffre d'affaires</p><p className="text-xs text-gray-400 mt-0.5">Sur les {periode} derniers jours</p></div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={ventesParJour.map(d=>({date:d._id?.slice(5),CA:d.ca,Ventes:d.nb}))} margin={{top:5,right:5,bottom:0,left:-10}}>
            <defs>
              <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2}/><stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
            <XAxis dataKey="date" tick={{fontSize:10,fill:'#9CA3AF'}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} tickLine={false} axisLine={false} tickFormatter={v=>fmtM(v)}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Area type="monotoneX" dataKey="CA" name="CA" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gCA)" dot={false} activeDot={{r:5,fill:'#3B82F6',stroke:'#fff',strokeWidth:2}}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4 animate-fade-up-4">
        <div className="card-neu p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Top 10 produits vendus</p>
          <div className="flex flex-col gap-3">
            {topProduits.map((p,i)=>{
              const pct = Math.round((p.ca/(topProduits[0]?.ca||1))*100);
              return (<div key={p._id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{background:COLORS[i]}}>{i+1}</span>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{p._id}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-500">{fmtM(p.ca)} GNF</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:COLORS[i]}}/></div>
              </div>);
            })}
            {topProduits.length===0 && <p className="text-sm text-gray-400 text-center py-6">Aucune vente sur cette période</p>}
          </div>
        </div>

        <div className="card-neu p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Top 10 clients</p>
          <div className="flex flex-col gap-2">
            {topClients.map((c,i)=>(
              <div key={c._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:COLORS[i]}}>{c._id?.charAt(0).toUpperCase()||'?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c._id||'Client comptoir'}</p>
                  <p className="text-xs text-gray-400">{c.nbAchats} achat(s) · panier moy. {fmtM(c.panier)} GNF</p>
                </div>
                <span className="text-sm font-bold text-blue-600 flex-shrink-0">{fmtM(c.ca)} GNF</span>
              </div>
            ))}
            {topClients.length===0 && <p className="text-sm text-gray-400 text-center py-6">Aucun client enregistré</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-up-4">
        <div className="card-neu p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Répartition par mode de paiement</p>
          <div className="flex flex-col gap-3">
            {parModePaiement.map((m,i)=>{
              const total = parModePaiement.reduce((s,x)=>s+x.nb,0);
              const pct = Math.round((m.nb/total)*100);
              return (<div key={m._id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{modeLabel[m._id]||m._id}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{m.nb} vente(s)</span><span className="text-xs font-bold" style={{color:COLORS[i]}}>{pct}%</span></div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,background:COLORS[i]}}/></div>
                <p className="text-xs text-gray-400 mt-0.5">{fmtM(m.ca)} GNF</p>
              </div>);
            })}
            {parModePaiement.length===0 && <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>}
          </div>
        </div>

        <div className="card-neu p-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">Heures de pointe</p>
          <p className="text-xs text-gray-400 mb-4">Nombre de ventes par heure</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={Array.from({length:24},(_,h)=>{const f=ventesParHeure.find(v=>v._id===h);return{heure:`${h}h`,nb:f?.nb||0};})} margin={{top:0,right:0,bottom:0,left:-20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
              <XAxis dataKey="heure" tick={{fontSize:9,fill:'#9CA3AF'}} tickLine={false} axisLine={false} interval={2}/>
              <YAxis tick={{fontSize:9,fill:'#9CA3AF'}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{fontSize:11,borderRadius:10,border:'1px solid #E5E7EB'}}/>
              <Bar dataKey="nb" name="Ventes" radius={[4,4,0,0]}>
                {Array.from({length:24},(_,i)=><Cell key={i} fill={i>=8&&i<=18?'#3B82F6':'#E5E7EB'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
