import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle,
  Package, ShoppingCart, ChevronRight, X,
  Zap, Clock, BarChart2, RefreshCw
} from 'lucide-react';
import api from '../../utils/api';
import { fmt, fmtM } from '../../utils/format';

// ─── Config risque ────────────────────────────────────────────────────────────
const RISQUE_CFG = {
  rupture:  { label:'Rupture',   cls:'bg-red-100 text-red-700 border-red-200',     dot:'bg-red-500',     card:'border-red-200 bg-red-50/30',     badge:'bg-red-500 text-white' },
  critique: { label:'Critique',  cls:'bg-orange-100 text-orange-700 border-orange-200', dot:'bg-orange-500', card:'border-orange-200 bg-orange-50/30', badge:'bg-orange-500 text-white' },
  eleve:    { label:'Élevé',     cls:'bg-amber-100 text-amber-700 border-amber-200',   dot:'bg-amber-400',   card:'border-amber-200 bg-amber-50/30',   badge:'bg-amber-500 text-white' },
  moyen:    { label:'Moyen',     cls:'bg-blue-100 text-blue-700 border-blue-200',      dot:'bg-blue-400',    card:'border-blue-100 bg-blue-50/20',     badge:'bg-blue-500 text-white' },
  faible:   { label:'Faible',    cls:'bg-green-100 text-green-700 border-green-200',   dot:'bg-green-400',   card:'border-gray-100 bg-white',          badge:'bg-green-500 text-white' },
};

// ─── Tooltip graphe ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name} : {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Modal détail produit ─────────────────────────────────────────────────────
function ModalDetailProduit({ produitId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['prevision-produit', produitId],
    queryFn:  () => api.get(`/previsions/${produitId}`).then(r => r.data.data),
  });

  // const cfg = data ? RISQUE_CFG[data.prevision?.risque] || RISQUE_CFG.faible : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <Brain size={16} className="text-white"/>
            </div>
            <div>
              <h3 className="font-syne font-bold text-gray-900">Analyse IA détaillée</h3>
              <p className="text-xs text-gray-400">{data?.prevision?.nomProduit}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-all">
            <X size={15}/>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="overflow-y-auto p-6 flex flex-col gap-5">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'Stock actuel',      value:`${fmt(data.prevision.stockActuel)} ${data.prevision.unite}`, color:'text-gray-900' },
                { label:'Consommation/jour', value:`${data.prevision.consommationAjustee} ${data.prevision.unite}`, color:'text-blue-600' },
                { label:'Jours avant rupture', value: data.prevision.joursAvantRupture !== null ? `${data.prevision.joursAvantRupture} jours` : '∞', color: data.prevision.joursAvantRupture <= 7 ? 'text-red-600' : 'text-green-600' },
                { label:'À commander',       value:`${fmt(data.prevision.quantiteACommander)} ${data.prevision.unite}`, color:'text-indigo-600' },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{k.label}</p>
                  <p className={`font-syne text-lg font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Tendance */}
            <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl border ${data.prevision.tendance >= 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              {data.prevision.tendance >= 0
                ? <TrendingUp size={20} className="text-red-500 flex-shrink-0"/>
                : <TrendingDown size={20} className="text-green-500 flex-shrink-0"/>
              }
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Tendance de consommation : <span className={data.prevision.tendance >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {data.prevision.tendance >= 0 ? '+' : ''}{data.prevision.tendance}%
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data.prevision.tendance >= 0
                    ? 'La consommation accélère — commander plus rapidement'
                    : 'La consommation ralentit — stock moins urgent'}
                </p>
              </div>
              <div className="ml-auto text-right flex-shrink-0">
                <p className="text-[10px] text-gray-400">Fiabilité IA</p>
                <p className="text-sm font-bold text-gray-700">{data.prevision.fiabilite}%</p>
              </div>
            </div>

            {/* Graphe projection */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">📈 Projection stock — 30 prochains jours</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.projections} margin={{ top:5, right:5, bottom:0, left:-10 }}>
                  <defs>
                    <linearGradient id="gStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:9, fill:'#9CA3AF' }} tickLine={false} axisLine={false}
                    tickFormatter={d => d?.slice(5)} interval={4}/>
                  <YAxis tick={{ fontSize:9, fill:'#9CA3AF' }} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <ReferenceLine y={data.prevision.seuilAlerte} stroke="#F59E0B" strokeDasharray="4 4"
                    label={{ value:'Seuil alerte', position:'right', fontSize:9, fill:'#F59E0B' }}/>
                  <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4"
                    label={{ value:'Rupture', position:'right', fontSize:9, fill:'#EF4444' }}/>
                  <Area type="monotone" dataKey="stock" name="Stock prévu" stroke="#3B82F6"
                    strokeWidth={2.5} fill="url(#gStock)" dot={false}
                    activeDot={{ r:5, fill:'#3B82F6', stroke:'#fff', strokeWidth:2 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recommandation */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-blue-600"/>
                <p className="text-sm font-bold text-blue-800">Recommandation IA</p>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {data.prevision.joursAvantRupture !== null && data.prevision.joursAvantRupture <= 30 && (
                  <p>⚠️ <strong>Rupture estimée dans {data.prevision.joursAvantRupture} jours</strong> si aucune commande n'est passée.</p>
                )}
                {data.prevision.quantiteACommander > 0 && (
                  <p>📦 Commander <strong>{fmt(data.prevision.quantiteACommander)} {data.prevision.unite}</strong> pour atteindre un stock optimal de 45 jours.</p>
                )}
                <p>🛡 Stock de sécurité recommandé : <strong>{fmt(data.prevision.stockSecurite)} {data.prevision.unite}</strong> (15 jours).</p>
                {data.prevision.fournisseur?.nom && (
                  <p>🏭 Fournisseur habituel : <strong>{data.prevision.fournisseur.nom}</strong>
                    {data.prevision.fournisseur.delaiLivraison ? ` — délai ${data.prevision.fournisseur.delaiLivraison} jours` : ''}.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Carte produit ────────────────────────────────────────────────────────────
function CartePrevision({ p, onClick }) {
  const cfg = RISQUE_CFG[p.risque] || RISQUE_CFG.faible;
  return (
    <div onClick={() => onClick(p.produitId)}
      className={`card-neu border-2 p-4 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 ${cfg.card}`}>

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${p.risque === 'rupture' || p.risque === 'critique' ? 'dot-live' : ''}`}/>
          <p className="text-sm font-bold text-gray-800 truncate">{p.nomProduit}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {p.reference && (
        <p className="text-[10px] font-mono text-gray-400 mb-2">{p.reference}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Stock</p>
          <p className="text-sm font-bold text-gray-800">{fmt(p.stockActuel)} <span className="text-[9px] text-gray-400">{p.unite}</span></p>
        </div>
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Jours restants</p>
          <p className={`text-sm font-bold ${p.joursAvantRupture <= 7 ? 'text-red-600' : p.joursAvantRupture <= 15 ? 'text-amber-600' : 'text-green-600'}`}>
            {p.joursAvantRupture !== null ? p.joursAvantRupture : '∞'}
          </p>
        </div>
      </div>

      {/* Barre de stock */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] text-gray-400 mb-1">
          <span>Consommation/jour : {p.consommationAjustee} {p.unite}</span>
          <span className={`font-semibold ${p.tendance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {p.tendance >= 0 ? '↑' : '↓'} {Math.abs(p.tendance)}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, p.joursAvantRupture !== null ? Math.min(100, (p.joursAvantRupture / 30) * 100) : 100)}%`,
              background: p.risque === 'rupture' || p.risque === 'critique' ? '#EF4444' : p.risque === 'eleve' ? '#F59E0B' : '#10B981',
            }}/>
        </div>
      </div>

      {/* Commande recommandée */}
      {p.quantiteACommander > 0 && (
        <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={11} className="text-indigo-500"/>
            <span className="text-[10px] text-gray-600">À commander</span>
          </div>
          <span className="text-xs font-bold text-indigo-600">{fmt(p.quantiteACommander)} {p.unite}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-gray-400">Fiabilité : {p.fiabilite}%</span>
        <ChevronRight size={13} className="text-gray-400"/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function Previsions() {
  const [periode, setPeriode]         = useState('30');
  const [filtreRisque, setFiltreRisque] = useState('tous');
  const [produitSelectionne, setProduitSelectionne] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['previsions', periode],
    queryFn:  () => api.get(`/previsions?jours=${periode}`).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const previsionsFiltrees = data?.previsions?.filter(p =>
    filtreRisque === 'tous' || p.risque === filtreRisque
  ) || [];

  const risques = [
    { id:'tous',     label:'Tous',      count: data?.previsions?.length || 0 },
    { id:'rupture',  label:'Rupture',   count: data?.stats?.enRupture || 0 },
    { id:'critique', label:'Critique',  count: data?.stats?.risqueCritique || 0 },
    { id:'eleve',    label:'Élevé',     count: data?.stats?.risqueEleve || 0 },
    { id:'moyen',    label:'Moyen',     count: data?.stats?.risqueMoyen || 0 },
    { id:'faible',   label:'Faible',    count: data?.stats?.risqueFaible || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-blue-200">
            <Brain size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Prévisions IA</h1>
            <p className="text-xs text-gray-400 mt-0.5">Analyse intelligente de votre stock</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Période */}
          <div className="flex bg-white border border-gray-200 rounded-2xl p-1 gap-1">
            {[{v:'7',l:'7j'},{v:'30',l:'30j'},{v:'60',l:'60j'},{v:'90',l:'90j'}].map(p => (
              <button key={p.v} onClick={() => setPeriode(p.v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${periode === p.v ? 'gradient-brand text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                {p.l}
              </button>
            ))}
          </div>

          {/* Rafraîchir */}
          <button onClick={() => refetch()}
            className={`p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all ${isFetching ? 'animate-spin text-blue-500' : ''}`}>
            <RefreshCw size={15}/>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center animate-pulse">
            <Brain size={22} className="text-white"/>
          </div>
          <p className="text-sm text-gray-400">Analyse IA en cours…</p>
        </div>
      ) : (
        <>
          {/* KPIs globaux */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 animate-fade-up-2">
            {[
              { label:'Commandes urgentes', value:data?.stats?.commandesUrgentes||0,     Icon:Zap,         color:'text-red-600',    bg:'bg-red-50' },
              { label:'Risque critique',    value:data?.stats?.risqueCritique||0,         Icon:AlertTriangle,color:'text-orange-600', bg:'bg-orange-50' },
              { label:'Risque élevé',       value:data?.stats?.risqueEleve||0,            Icon:Clock,       color:'text-amber-600',  bg:'bg-amber-50' },
              { label:'Stock OK',           value:data?.stats?.risqueFaible||0,           Icon:Package,     color:'text-green-600',  bg:'bg-green-50' },
            ].map((k, i) => (
              <div key={k.label} className={`card-neu p-4 animate-fade-up-${i+1}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-tight">{k.label}</p>
                  <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
                    <k.Icon size={15} className={k.color}/>
                  </div>
                </div>
                <p className={`font-syne text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Valeur commande estimée */}
          {data?.stats?.commandesUrgentes > 0 && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-5 flex items-center justify-between animate-fade-up-3 shadow-lg shadow-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <BarChart2 size={18} className="text-white"/>
                </div>
                <div>
                  <p className="text-white font-syne font-bold text-lg">
                    {fmtM(data?.stats?.valeurCommandeEstimee)} GNF
                  </p>
                  <p className="text-blue-200 text-xs">Valeur totale des commandes urgentes estimées</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{data?.stats?.commandesUrgentes}</p>
                <p className="text-blue-200 text-xs">produit(s) à commander</p>
              </div>
            </div>
          )}

          {/* Filtres risque */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4 animate-fade-up-3">
            {risques.map(r => (
              <button key={r.id} onClick={() => setFiltreRisque(r.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border
                  ${filtreRisque === r.id
                    ? r.id === 'tous' ? 'gradient-brand text-white border-transparent shadow-md'
                      : `${RISQUE_CFG[r.id]?.badge || 'bg-gray-800 text-white'} border-transparent shadow-md`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                {r.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${filtreRisque === r.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {r.count}
                </span>
              </button>
            ))}
          </div>

          {/* Grille prévisions */}
          {previsionsFiltrees.length === 0 ? (
            <div className="card-neu flex flex-col items-center py-16 text-gray-300">
              <Brain size={36} className="mb-3 opacity-30"/>
              <p className="text-sm">Aucun produit dans cette catégorie</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up-4">
              {previsionsFiltrees.map(p => (
                <CartePrevision key={p.produitId} p={p} onClick={setProduitSelectionne}/>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal détail */}
      {produitSelectionne && (
        <ModalDetailProduit
          produitId={produitSelectionne}
          onClose={() => setProduitSelectionne(null)}
        />
      )}
    </div>
  );
}
