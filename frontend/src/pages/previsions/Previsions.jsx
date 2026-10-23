import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  Brain, TrendingUp, AlertTriangle, Package, ShoppingCart, ChevronRight,
  Zap, Clock, RefreshCw, ShieldCheck, Factory, WifiOff, Search, Sparkles, Download,
  Moon, Layers, CheckCircle2, Info, Truck, CalendarDays, Gauge,
} from 'lucide-react';
import api from '../../utils/api';
import { fmt, fmtM } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nb = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n ?? 0);
const jourCourt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—');
const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const RISQUE_CFG = {
  rupture:  { label: 'Rupture',  dot: 'bg-red-500',    card: 'border-red-200 bg-red-50/40',       badge: 'bg-red-500 text-white',    txt: 'text-red-600',    stroke: '#EF4444' },
  critique: { label: 'Critique', dot: 'bg-orange-500', card: 'border-orange-200 bg-orange-50/40', badge: 'bg-orange-500 text-white', txt: 'text-orange-600', stroke: '#F97316' },
  eleve:    { label: 'Élevé',    dot: 'bg-amber-400',  card: 'border-amber-200 bg-amber-50/40',   badge: 'bg-amber-500 text-white',  txt: 'text-amber-600',  stroke: '#F59E0B' },
  moyen:    { label: 'Moyen',    dot: 'bg-indigo-400', card: 'border-indigo-100 bg-indigo-50/30', badge: 'bg-indigo-500 text-white', txt: 'text-indigo-600', stroke: '#6366F1' },
  faible:   { label: 'Faible',   dot: 'bg-green-400',  card: 'border-slate-100 bg-white',         badge: 'bg-green-500 text-white',  txt: 'text-green-600',  stroke: '#10B981' },
};

const INSIGHT_CFG = {
  danger:  { Icon: AlertTriangle, box: 'border-red-200 bg-red-50',       ico: 'bg-red-100 text-red-600' },
  warning: { Icon: TrendingUp,    box: 'border-amber-200 bg-amber-50',   ico: 'bg-amber-100 text-amber-600' },
  info:    { Icon: Info,          box: 'border-indigo-100 bg-indigo-50', ico: 'bg-indigo-100 text-indigo-600' },
  success: { Icon: CheckCircle2,  box: 'border-green-200 bg-green-50',   ico: 'bg-green-100 text-green-600' },
};

const ETAT_CFG = {
  dormant:  { label: 'Dormant',   cls: 'bg-slate-200 text-slate-600' },
  surstock: { label: 'Surstock',  cls: 'bg-sky-100 text-sky-700' },
  nouveau:  { label: 'Nouveau',   cls: 'bg-violet-100 text-violet-700' },
};

const CONF_CFG = {
  bonne:   { label: 'Confiance élevée',   cls: 'text-green-600',  bar: 'bg-green-500' },
  moyenne: { label: 'Confiance moyenne',  cls: 'text-amber-600',  bar: 'bg-amber-500' },
  faible:  { label: 'Confiance faible',   cls: 'text-slate-500',  bar: 'bg-slate-400' },
};

// ─── Petits composants ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unite = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{jourCourt(label)}</p>
      {payload.filter(p => p.name && !String(p.name).startsWith('_')).map(p => (
        <p key={p.name} className="font-bold" style={{ color: p.color || p.stroke }}>
          {p.name} : {Array.isArray(p.value) ? `${nb(p.value[0])} – ${nb(p.value[1])}` : nb(p.value)} {unite}
        </p>
      ))}
    </div>
  );
};

function ScoreSante({ score }) {
  const r = 38, c = 2 * Math.PI * r;
  const col = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const lib = score >= 75 ? 'Stock sain' : score >= 50 ? 'À surveiller' : 'Sous tension';
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="9" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-syne text-2xl font-bold text-slate-900 leading-none">{score}</span>
          <span className="text-[9px] text-slate-400 mt-0.5">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Santé du stock</p>
        <p className="font-syne text-lg font-bold" style={{ color: col }}>{lib}</p>
      </div>
    </div>
  );
}

function Confiance({ p, detail = false }) {
  const c = CONF_CFG[p.confiance] || CONF_CFG.faible;
  return (
    <div className={detail ? '' : 'min-w-0'}>
      <div className="flex items-center justify-between text-[9px] mb-1">
        <span className={`font-semibold ${c.cls}`}>{detail ? c.label : 'Confiance'}</span>
        <span className="text-slate-400">{p.fiabilite}%</span>
      </div>
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${p.fiabilite}%` }} />
      </div>
    </div>
  );
}

function Spark({ data, color }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={34}>
      <AreaChart data={d} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={color} fillOpacity={0.12} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Modal détail produit ─────────────────────────────────────────────────────
function ModalDetailProduit({ produitId, periode, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['prevision-produit', produitId, periode],
    queryFn: () => api.get(`/previsions/${produitId}?jours=${periode}`).then(r => r.data.data),
  });
  const p = data?.prevision;
  const cfg = RISQUE_CFG[p?.risque] || RISQUE_CFG.faible;

  const proj = useMemo(() => (data?.projections || []).map(x => ({ ...x, bande: [x.stockMin, x.stockMax] })), [data]);
  const hist = useMemo(() => (data?.historique || []).slice(-60), [data]);
  const saison = useMemo(() => (p?.saisonnalite || []).map((v, i) => ({ j: JOURS[i], v })), [p]);
  const aSaison = p && Math.max(...p.saisonnalite) - Math.min(...p.saisonnalite) > 0.05;

  return (
    <Modal open onClose={onClose} icon={Brain} title="Analyse IA détaillée" subtitle={p?.nomProduit} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : isError || !p ? (
        <EmptyState icon={WifiOff} title="Analyse indisponible" description="Impossible de charger l'analyse de ce produit." />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Conseil */}
          <div className={`rounded-2xl border-2 p-4 ${cfg.card}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={15} className="text-indigo-600" />
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Conseil de l'IA</p>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{p.conseil}</p>
            {p.quantiteACommander > 0 && p.valeurCommande > 0 && (
              <p className="text-xs text-slate-500 mt-1">Budget estimé : {fmt(p.valeurCommande)} GNF ({fmt(p.prixAchat)} GNF / {p.unite})</p>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Stock actuel', value: `${nb(p.stockActuel)} ${p.unite}`, color: 'text-slate-900' },
              { label: 'Demande / jour', value: `${nb(p.consommationAjustee)}`, sub: p.unite, color: 'text-indigo-600' },
              { label: 'Rupture dans', value: p.joursAvantRupture !== null ? `${p.joursAvantRupture} j` : '∞',
                sub: p.joursAvantRuptureMin !== null && p.joursAvantRupture !== null ? `entre ${p.joursAvantRuptureMin} et ${p.joursAvantRuptureMax ?? '30+'} j` : '',
                color: p.joursAvantRupture !== null && p.joursAvantRupture <= p.delaiLivraison ? 'text-red-600' : 'text-green-600' },
              { label: 'À commander', value: `${nb(p.quantiteACommander)}`, sub: p.unite, color: 'text-indigo-600' },
            ].map(k => (
              <div key={k.label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`font-syne text-lg font-bold ${k.color}`}>{k.value}</p>
                {k.sub && <p className="text-[10px] text-slate-400">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Projection avec bande de confiance */}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1">
              <TrendingUp size={14} className="text-indigo-500" /> Stock prévu — 30 prochains jours
            </p>
            <p className="text-[11px] text-slate-400 mb-3">La zone claire montre l'incertitude : le stock réel devrait rester dans cette bande (80 % de chances).</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={proj} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gBande" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={jourCourt} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip unite={p.unite} />} />
                {p.pointCommande > 0 && (
                  <ReferenceLine y={p.pointCommande} stroke="#6366F1" strokeDasharray="4 4"
                    label={{ value: 'Point de commande', position: 'insideTopRight', fontSize: 9, fill: '#6366F1' }} />
                )}
                <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="bande" name="Fourchette" stroke="none" fill="url(#gBande)" isAnimationActive={false} />
                <Area type="monotone" dataKey="stock" name="Stock prévu" stroke="#4F46E5" strokeWidth={2.5} fill="none" dot={false}
                  activeDot={{ r: 5, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Historique des ventes */}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
              <BarChartIcon /> Ventes réelles — 60 derniers jours
            </p>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={hist} margin={{ top: 0, right: 5, bottom: 0, left: -10 }}>
                <XAxis dataKey="_id" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={jourCourt} interval={9} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={34} />
                <Tooltip content={<CustomTooltip unite={p.unite} />} />
                <Bar dataKey="quantite" name="Vendu" fill="#818CF8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rythme hebdomadaire */}
          {aSaison && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1">
                <CalendarDays size={14} className="text-indigo-500" /> Rythme de la semaine
              </p>
              <p className="text-[11px] text-slate-400 mb-2">Ventes par jour par rapport à la moyenne (1 = moyenne). Détecté automatiquement.</p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={saison} margin={{ top: 0, right: 5, bottom: 0, left: -25 }}>
                  <XAxis dataKey="j" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <ReferenceLine y={1} stroke="#CBD5E1" strokeDasharray="3 3" />
                  <Tooltip formatter={(v) => [`×${v}`, 'Intensité']} />
                  <Bar dataKey="v" fill="#A5B4FC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Paramètres de réapprovisionnement */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { Icon: Truck, label: 'Délai livraison', value: `${p.delaiLivraison} j${p.delaiEstime ? ' *' : ''}` },
              { Icon: ShieldCheck, label: 'Stock de sécurité', value: `${nb(p.stockSecurite)} ${p.unite}` },
              { Icon: Gauge, label: 'Point de commande', value: `${nb(p.pointCommande)} ${p.unite}` },
              { Icon: Layers, label: 'Classe ABC', value: p.classeABC },
            ].map(k => (
              <div key={k.label} className="flex items-center gap-2.5 bg-white border border-slate-100 rounded-2xl p-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0"><k.Icon size={14} className="text-indigo-500" /></div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-tight">{k.label}</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{k.value}</p>
                </div>
              </div>
            ))}
          </div>
          {p.delaiEstime && <p className="text-[11px] text-slate-400 -mt-2">* Délai par défaut (7 jours). Renseignez le délai réel du fournisseur dans la fiche produit pour des prévisions plus justes.</p>}

          {/* Explications */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Brain size={15} className="text-indigo-600" />
              <p className="text-sm font-bold text-indigo-800">Comment l'IA est arrivée à ce résultat</p>
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-700 list-disc pl-4">
              {p.raisons.map((r, i) => <li key={i}>{r}</li>)}
              {p.fournisseur?.nom && <li>Fournisseur habituel : <strong>{p.fournisseur.nom}</strong>{p.fournisseur.contact ? ` (${p.fournisseur.contact})` : ''}.</li>}
            </ul>
            <div className="mt-3"><Confiance p={p} detail /></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function BarChartIcon() {
  return <Package size={14} className="text-indigo-500" />;
}

// ─── Carte produit ────────────────────────────────────────────────────────────
function CartePrevision({ p, onClick }) {
  const cfg = RISQUE_CFG[p.risque] || RISQUE_CFG.faible;
  const etat = ETAT_CFG[p.etat];
  const pct = p.joursAvantRupture === null ? 100 : Math.min(100, (p.joursAvantRupture / 30) * 100);
  return (
    <button type="button" onClick={() => onClick(p.produitId)}
      className={`text-left card-neu border-2 p-4 hover:-translate-y-0.5 transition-all duration-200 ${cfg.card}`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${p.risque === 'rupture' || p.risque === 'critique' ? 'dot-live' : ''}`} />
          <p className="text-sm font-bold text-slate-800 truncate">{p.nomProduit}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${cfg.badge}`}>{cfg.label}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        {p.reference && <span className="text-[10px] font-mono text-slate-400 truncate">{p.reference}</span>}
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500" title="Classe ABC (importance des ventes)">{p.classeABC}</span>
        {etat && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${etat.cls}`}>{etat.label}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Stock</p>
          <p className="text-sm font-bold text-slate-800">{nb(p.stockActuel)} <span className="text-[9px] text-slate-400">{p.unite}</span></p>
        </div>
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Rupture dans</p>
          <p className={`text-sm font-bold ${cfg.txt}`}>{p.joursAvantRupture !== null ? `${p.joursAvantRupture} j` : '∞'}</p>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[9px] text-slate-400 mb-1">
          <span>{nb(p.consommationAjustee)} {p.unite}/jour prévus</span>
          {p.etat !== 'nouveau' && p.totalVendu30j > 0 && (
            <span className={`font-semibold ${p.tendance > 5 ? 'text-orange-500' : p.tendance < -5 ? 'text-sky-500' : 'text-slate-400'}`}>
              {p.tendance > 5 ? '↑' : p.tendance < -5 ? '↓' : '→'} {Math.abs(p.tendance)}%
            </span>
          )}
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cfg.stroke }} />
        </div>
      </div>

      <Spark data={p.sparkline} color={cfg.stroke} />
      <p className="text-[11px] text-slate-600 leading-snug mt-1 min-h-[30px]">{p.conseil}</p>

      <div className="flex items-center justify-between gap-3 mt-2">
        <div className="flex-1"><Confiance p={p} /></div>
        <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
      </div>
    </button>
  );
}

// ─── Plan d'achats ────────────────────────────────────────────────────────────
function exporterCSV(lignes) {
  const sep = ';';
  const ent = ['Produit', 'Référence', 'Fournisseur', 'Quantité à commander', 'Unité', 'Prix achat (GNF)', 'Montant (GNF)', 'Commander avant', 'Rupture estimée (jours)', 'Priorité'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = lignes.map(p => [p.nomProduit, p.reference, p.fournisseur?.nom, p.quantiteACommander, p.unite, p.prixAchat, p.valeurCommande,
    p.dateCommande || 'maintenant', p.joursAvantRupture ?? '', (RISQUE_CFG[p.risque] || {}).label].map(esc).join(sep));
  const blob = new Blob(['﻿' + [ent.map(esc).join(sep), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `plan-achats-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function PlanAchats({ lignes, onOpen }) {
  const total = lignes.reduce((s, p) => s + p.valeurCommande, 0);
  const groupes = useMemo(() => {
    const m = new Map();
    lignes.forEach(p => {
      const k = p.fournisseur?.nom || 'Fournisseur non renseigné';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    });
    return [...m.entries()];
  }, [lignes]);

  if (!lignes.length) return <div className="card-neu"><EmptyState icon={CheckCircle2} title="Rien à commander" description="Tous vos produits ont un stock suffisant selon les prévisions." /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 card-neu p-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Budget total du plan d'achats</p>
          <p className="font-syne text-2xl font-bold text-slate-900">{fmt(total)} GNF</p>
          <p className="text-xs text-slate-400">{lignes.length} produit{lignes.length > 1 ? 's' : ''} · {groupes.length} fournisseur{groupes.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => exporterCSV(lignes)}><Download size={15} /> Exporter (Excel)</button>
      </div>
      {groupes.map(([nom, items]) => (
        <div key={nom} className="card-neu overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Factory size={14} className="text-indigo-500" />{nom}</p>
            <p className="text-xs font-bold text-indigo-600">{fmt(items.reduce((s, p) => s + p.valeurCommande, 0))} GNF</p>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map(p => {
              const cfg = RISQUE_CFG[p.risque] || RISQUE_CFG.faible;
              return (
                <button key={p.produitId} type="button" onClick={() => onOpen(p.produitId)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.nomProduit}</p>
                    <p className="text-[11px] text-slate-400">
                      {p.dateCommande && p.joursAvantCommande > 0 ? `À commander avant le ${jourCourt(p.dateCommande)}` : 'À commander maintenant'}
                      {p.joursAvantRupture !== null ? ` · rupture dans ${p.joursAvantRupture} j` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-indigo-600">{nb(p.quantiteACommander)} {p.unite}</p>
                    <p className="text-[11px] text-slate-400">{fmt(p.valeurCommande)} GNF</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function Previsions() {
  const [periode, setPeriode] = useState('30');
  const [filtre, setFiltre] = useState('tous');
  const [vue, setVue] = useState('produits');
  const [recherche, setRecherche] = useState('');
  const [selection, setSelection] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['previsions', periode],
    queryFn: () => api.get(`/previsions?jours=${periode}`).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const stats = data?.stats || {};
  const liste = data?.previsions || [];

  const filtres = [
    { id: 'tous', label: 'Tous', count: liste.length },
    { id: 'rupture', label: 'Rupture', count: stats.enRupture || 0 },
    { id: 'critique', label: 'Critique', count: stats.risqueCritique || 0 },
    { id: 'eleve', label: 'Élevé', count: stats.risqueEleve || 0 },
    { id: 'moyen', label: 'Moyen', count: stats.risqueMoyen || 0 },
    { id: 'faible', label: 'Faible', count: stats.risqueFaible || 0 },
    { id: 'dormant', label: 'Dormants', count: stats.nbDormants || 0 },
    { id: 'surstock', label: 'Surstock', count: stats.nbSurstock || 0 },
  ];

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return liste.filter(p => {
      if (filtre === 'dormant' || filtre === 'surstock') { if (p.etat !== filtre) return false; }
      else if (filtre !== 'tous' && p.risque !== filtre) return false;
      if (!q) return true;
      return `${p.nomProduit} ${p.reference || ''} ${p.fournisseur?.nom || ''}`.toLowerCase().includes(q);
    });
  }, [liste, filtre, recherche]);

  const achats = useMemo(
    () => liste.filter(p => p.quantiteACommander > 0).sort((a, b) => {
      const o = { rupture: 0, critique: 1, eleve: 2, moyen: 3, faible: 4 };
      return o[a.risque] - o[b.risque] || (a.joursAvantCommande ?? 999) - (b.joursAvantCommande ?? 999);
    }),
    [liste]
  );

  const ouvrirInsight = (ins) => { if (ins.produitIds?.[0]) setSelection(ins.produitIds[0]); };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-5 lg:p-7">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Prévisions IA</h1>
            <p className="text-sm text-slate-400 mt-0.5">Demande, ruptures et achats anticipés automatiquement</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 gap-1" title="Période d'observation affichée">
            {[{ v: '7', l: '7j' }, { v: '30', l: '30j' }, { v: '60', l: '60j' }, { v: '90', l: '90j' }].map(p => (
              <button key={p.v} onClick={() => setPeriode(p.v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${periode === p.v ? 'gradient-brand text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>{p.l}</button>
            ))}
          </div>
          <button onClick={() => refetch()} aria-label="Actualiser" className={`btn-secondary ${isFetching ? 'opacity-70' : ''}`}>
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center animate-pulse"><Brain size={22} className="text-white" /></div>
          <p className="text-sm text-slate-400">Analyse de vos ventes en cours…</p>
        </div>
      ) : isError ? (
        <EmptyState icon={WifiOff} title="Impossible de charger les prévisions" description="Une erreur est survenue lors du chargement. Vérifiez votre connexion et réessayez." />
      ) : liste.length === 0 ? (
        <div className="card-neu"><EmptyState icon={Brain} title="Aucun produit à analyser" description="Ajoutez des produits et enregistrez des ventes : l'IA commencera à prévoir automatiquement." /></div>
      ) : (
        <>
          {/* Synthèse */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 animate-fade-up-2">
            <div className="card-neu p-5 flex flex-col justify-between gap-4">
              <ScoreSante score={stats.scoreSante ?? 0} />
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Valeur du stock</p>
                  <p className="text-sm font-bold text-slate-800">{fmtM(stats.valeurStock)} GNF</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Confiance moyenne</p>
                  <p className="text-sm font-bold text-slate-800">{stats.fiabiliteMoyenne ?? 0}%</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              {[
                { label: 'À commander', value: stats.commandesUrgentes || 0, Icon: Zap, color: 'text-red-600', bg: 'bg-red-50', border: 'border-l-red-500', f: 'critique' },
                { label: 'En rupture', value: stats.enRupture || 0, Icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-l-orange-500', f: 'rupture' },
                { label: 'Budget urgent', value: `${fmtM(stats.valeurCommandeEstimee || 0)}`, sub: 'GNF', Icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-l-indigo-500', v: 'achats' },
                { label: 'Stock dormant', value: `${fmtM(stats.valeurDormante || 0)}`, sub: 'GNF immobilisés', Icon: Moon, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-l-slate-400', f: 'dormant' },
              ].map((k) => (
                <button key={k.label} type="button"
                  onClick={() => { if (k.v) setVue(k.v); else { setVue('produits'); setFiltre(k.f === 'critique' ? 'tous' : k.f); } }}
                  className={`text-left card-neu border-l-4 ${k.border} p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{k.label}</p>
                    <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}><k.Icon size={16} className={k.color} /></div>
                  </div>
                  <p className={`font-syne text-2xl font-bold ${k.color} leading-none`}>{k.value}</p>
                  {k.sub && <p className="text-[10px] text-slate-400 mt-1">{k.sub}</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Ce que l'IA a remarqué */}
          {data.insights?.length > 0 && (
            <div className="mb-5 animate-fade-up-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3"><Sparkles size={15} className="text-indigo-500" /> Ce que l'IA a remarqué</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.insights.map((ins, i) => {
                  const c = INSIGHT_CFG[ins.niveau] || INSIGHT_CFG.info;
                  const cliquable = !!ins.produitIds?.length;
                  return (
                    <button key={i} type="button" disabled={!cliquable} onClick={() => ouvrirInsight(ins)}
                      className={`text-left flex gap-3 border rounded-2xl p-4 ${c.box} ${cliquable ? 'hover:shadow-md hover:-translate-y-0.5 transition-all' : 'cursor-default'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.ico}`}><c.Icon size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{ins.titre}</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ins.texte}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Onglets */}
          <div className="flex items-center gap-2 mb-4">
            {[{ id: 'produits', label: 'Produits', Icon: Package }, { id: 'achats', label: `Plan d'achats (${achats.length})`, Icon: ShoppingCart }].map(t => (
              <button key={t.id} onClick={() => setVue(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${vue === t.id ? 'gradient-brand text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}>
                <t.Icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {vue === 'achats' ? (
            <PlanAchats lignes={achats} onOpen={setSelection} />
          ) : (
            <>
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un produit, une référence, un fournisseur…"
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
                {filtres.map(r => (
                  <button key={r.id} onClick={() => setFiltre(r.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border
                      ${filtre === r.id
                        ? (RISQUE_CFG[r.id]?.badge || 'gradient-brand text-white') + ' border-transparent shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {r.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${filtre === r.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{r.count}</span>
                  </button>
                ))}
              </div>

              {filtrees.length === 0 ? (
                <div className="card-neu"><EmptyState icon={Brain} title="Aucun produit dans cette sélection" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up-4">
                  {filtrees.map(p => <CartePrevision key={p.produitId} p={p} onClick={setSelection} />)}
                </div>
              )}
            </>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-6">
            <Clock size={11} /> Prévisions calculées à partir de vos ventes et retours des 3 à 6 derniers mois, mises à jour à chaque ouverture. Plus l'historique s'allonge, plus elles sont précises.
          </p>
        </>
      )}

      {selection && <ModalDetailProduit produitId={selection} periode={periode} onClose={() => setSelection(null)} />}
    </div>
  );
}
