import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Target, Pencil, Check, Crown, Sparkles, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, fmtM, inputCls } from '../../utils/format';

const PERIODES = [
  { id: 'jour',    label: "Aujourd'hui", vs: 'hier' },
  { id: 'semaine', label: '7 jours',     vs: 'les 7 jours précédents' },
  { id: '30j',     label: '30 jours',    vs: 'les 30 jours précédents' },
  { id: 'mois',    label: 'Ce mois',     vs: 'la même période du mois dernier' },
];
const MODES = { especes: 'Espèces', mobile: 'Mobile Money', mixte: 'Mixte' };
const jourCourt = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function Evolution({ actuel, precedent, inverse = false }) {
  if (!precedent) return <span className="text-[11px] text-slate-400">nouveau</span>;
  const pct = Math.round(((actuel - precedent) / precedent) * 100);
  if (pct === 0) return <span className="text-[11px] text-slate-400 inline-flex items-center gap-0.5"><Minus size={11} />stable</span>;
  const bon = inverse ? pct < 0 : pct > 0;
  const Icone = pct > 0 ? TrendingUp : TrendingDown;
  return <span className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${bon ? 'text-emerald-600' : 'text-red-500'}`}><Icone size={12} />{pct > 0 ? '+' : ''}{pct} %</span>;
}

function Carte({ titre, valeur, actuel, precedent, sous, ton = 'text-slate-900', inverse }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{titre}</p>
      <p className={`font-syne text-xl font-bold mt-1 truncate ${ton}`}>{valeur}</p>
      <div className="mt-0.5 flex items-center gap-2 min-h-[16px]">
        {actuel !== undefined && <Evolution actuel={actuel} precedent={precedent} inverse={inverse} />}
        {sous && <span className="text-[11px] text-slate-400 truncate">{sous}</span>}
      </div>
    </div>
  );
}

function Info({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">{p.name} : {fmt(p.value)} GNF</p>)}
    </div>
  );
}

function Objectif({ o }) {
  const qc = useQueryClient();
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState('');
  const m = useMutation({
    mutationFn: (montant) => api.put('/dashboard/objectif', { montant }),
    onSuccess: () => { toast.success('Objectif enregistré'); setEdition(false); qc.invalidateQueries({ queryKey: ['activite'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Enregistrement impossible'),
  });
  const pct = o.montant > 0 ? Math.min(100, Math.round((o.caMois / o.montant) * 100)) : 0;
  const atteint = o.montant > 0 && o.caMois >= o.montant;
  const surLaBonneVoie = o.montant > 0 && o.projection >= o.montant;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Target size={15} className="text-indigo-500" /> Objectif du mois</p>
        {!edition && <button onClick={() => { setSaisie(o.montant ? String(o.montant) : ''); setEdition(true); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1"><Pencil size={12} />{o.montant ? 'Modifier' : 'Définir'}</button>}
      </div>
      {edition ? (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate(Number(saisie) || 0); }}>
          <input autoFocus type="number" min="0" inputMode="numeric" className={inputCls} placeholder="Chiffre d'affaires visé (GNF)" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
          <button type="submit" disabled={m.isPending} className="btn-primary whitespace-nowrap"><Check size={14} /> OK</button>
        </form>
      ) : o.montant > 0 ? (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="font-syne text-2xl font-bold text-slate-900">{fmt(o.caMois)} <span className="text-xs font-normal text-slate-400">/ {fmt(o.montant)} GNF</span></p>
            <span className={`font-syne text-lg font-bold ${atteint ? 'text-emerald-600' : 'text-indigo-600'}`}>{pct} %</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-all duration-700 ${atteint ? 'bg-emerald-500' : 'gradient-brand'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {atteint ? '🎉 Objectif atteint : bravo !'
              : <>Jour {o.joursEcoules}/{o.joursDuMois}. {surLaBonneVoie ? <span className="text-emerald-600 font-semibold">Au rythme actuel, vous finirez vers {fmtM(o.projection)} GNF.</span> : <span className="text-amber-600 font-semibold">Au rythme actuel : environ {fmtM(o.projection)} GNF.</span>}{' '}
                Il faut encore <b>{fmt(o.resteParJour)} GNF par jour</b> pour y arriver.</>}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Fixez un objectif de chiffre d'affaires pour suivre votre progression jour après jour.</p>
      )}
    </div>
  );
}

// Construit les phrases d'analyse à partir des chiffres (aucune IA : des règles simples et vérifiables).
function analyses(d, vs) {
  const L = [];
  const { actuel: a, precedent: p } = d;
  if (a.nbVentes === 0) return ["Aucune vente sur cette période pour l'instant."];
  if (p.ca > 0) {
    const pct = Math.round(((a.ca - p.ca) / p.ca) * 100);
    if (pct >= 5) L.push(`Le chiffre d'affaires est en hausse de ${pct} % par rapport à ${vs}.`);
    else if (pct <= -5) L.push(`Le chiffre d'affaires baisse de ${Math.abs(pct)} % par rapport à ${vs}.`);
    else L.push(`Le chiffre d'affaires est stable par rapport à ${vs}.`);
  }
  if (a.ca > 0) { const taux = Math.round((a.margeBrute / a.ca) * 100); L.push(`Marge brute estimée : ${taux} % du chiffre d'affaires.`); }
  if (a.depenses > 0 && a.margeBrute > 0) L.push(`Les dépenses représentent ${Math.round((a.depenses / a.margeBrute) * 100)} % de la marge.`);
  if (a.benefice < 0) L.push('⚠ Les dépenses dépassent la marge sur cette période : le bénéfice estimé est négatif.');
  if (d.meilleurJour && d.periode !== 'jour') L.push(`Meilleur jour : ${jourCourt(d.meilleurJour.date)} (${fmt(d.meilleurJour.ca)} GNF).`);
  const star = d.topProduits[0];
  if (star) L.push(`Produit vedette : ${star.nom}, ${fmt(star.ca)} GNF de ventes.`);
  const rentable = [...d.topProduits].sort((x, y) => y.marge - x.marge)[0];
  if (rentable && rentable.nom !== star?.nom) L.push(`Le plus rentable : ${rentable.nom} (${fmt(rentable.marge)} GNF de marge).`);
  if (a.retours.nb > 0) L.push(`${a.retours.nb} retour${a.retours.nb > 1 ? 's' : ''} ou échange${a.retours.nb > 1 ? 's' : ''} pour ${fmt(a.retours.valeur)} GNF.`);
  return L.slice(0, 6);
}

export default function ActiviteCommerciale() {
  const [periode, setPeriode] = useState('semaine');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activite', periode],
    queryFn: () => api.get('/dashboard/activite', { params: { periode } }).then((r) => r.data.data),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const meta = PERIODES.find((p) => p.id === periode);

  return (
    <section className="mb-7 flex flex-col gap-4" aria-label="Activité commerciale">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-syne text-lg font-bold text-slate-900">Activité commerciale</h2>
        <div className="inline-flex rounded-xl bg-white border border-slate-200 p-1 gap-0.5">
          {PERIODES.map((p) => (
            <button key={p.id} onClick={() => setPeriode(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periode === p.id ? 'gradient-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{p.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="h-64 rounded-2xl bg-white border border-slate-100 animate-pulse" />
        : isError || !data ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><WifiOff size={16} /> Activité indisponible pour le moment.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Carte titre="Chiffre d'affaires" valeur={`${fmt(data.actuel.ca)} GNF`} actuel={data.actuel.ca} precedent={data.precedent.ca} sous={`vs ${meta.vs}`} />
              <Carte titre="Ventes" valeur={data.actuel.nbVentes} actuel={data.actuel.nbVentes} precedent={data.precedent.nbVentes} sous={data.actuel.nbVentes ? `panier ${fmt(data.actuel.panierMoyen)}` : ''} />
              <Carte titre="Marge brute estimée" valeur={`${fmt(data.actuel.margeBrute)} GNF`} actuel={data.actuel.margeBrute} precedent={data.precedent.margeBrute} sous={data.actuel.ca > 0 ? `${Math.round((data.actuel.margeBrute / data.actuel.ca) * 100)} % du CA` : ''} />
              <Carte titre="Bénéfice net estimé" valeur={`${fmt(data.actuel.benefice)} GNF`} actuel={data.actuel.benefice} precedent={data.precedent.benefice} sous={data.actuel.depenses ? `après ${fmt(data.actuel.depenses)} de dépenses` : ''} ton={data.actuel.benefice < 0 ? 'text-red-600' : 'text-emerald-600'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-100 p-4">
                <p className="text-sm font-bold text-slate-800 mb-3">{periode === 'jour' ? '7 derniers jours' : 'Jour par jour'}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.serie.map((j) => ({ ...j, jour: jourCourt(j.date) }))} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25} /><stop offset="100%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gBen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="jour" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={fmtM} />
                    <Tooltip content={<Info />} />
                    <Area type="monotone" dataKey="ca" name="Chiffre d'affaires" stroke="#4F46E5" strokeWidth={2.5} fill="url(#gCA)" dot={false} />
                    <Area type="monotone" dataKey="benefice" name="Bénéfice net" stroke="#10B981" strokeWidth={2} fill="url(#gBen)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Objectif o={data.objectif} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Sparkles size={15} className="text-amber-500" /> En clair</p>
                <ul className="flex flex-col gap-2">
                  {analyses(data, meta.vs).map((t) => <li key={t} className="text-xs text-slate-600 leading-relaxed">• {t}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <p className="text-sm font-bold text-slate-800 mb-3">Meilleurs produits</p>
                {data.topProduits.length === 0 ? <p className="text-xs text-slate-400">Pas encore de vente.</p> : (
                  <ul className="flex flex-col gap-2.5">
                    {data.topProduits.map((p, i) => (
                      <li key={p.nom} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-700"><span className="text-slate-300 font-bold mr-1.5">{i + 1}</span>{p.nom}</span>
                        <span className="font-semibold text-slate-900 whitespace-nowrap">{fmtM(p.ca)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <p className="text-sm font-bold text-slate-800 mb-3">Meilleurs clients</p>
                {data.topClients.length === 0 ? <p className="text-xs text-slate-400">Aucun client nommé sur la période.</p> : (
                  <ul className="flex flex-col gap-2.5">
                    {data.topClients.map((c, i) => (
                      <li key={c.nom} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-700 flex items-center gap-1.5">{i === 0 ? <Crown size={12} className="text-amber-500" /> : <span className="text-slate-300 font-bold">{i + 1}</span>}{c.nom}</span>
                        <span className="font-semibold text-slate-900 whitespace-nowrap">{fmtM(c.ca)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {data.modes.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {data.modes.map((m) => <span key={m._id} className="text-[11px] rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">{MODES[m._id] || m._id} · {fmtM(m.ca)}</span>)}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Bénéfice estimé : ventes − prix d'achat actuel des produits − dépenses, retours et échanges inclus. Les chiffres d'une vente hors connexion apparaissent après son envoi.</p>
          </>
        )}
    </section>
  );
}
