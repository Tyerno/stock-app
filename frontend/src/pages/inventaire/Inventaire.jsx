import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Play, Printer, Search, Eye, EyeOff, CheckCircle2, Ban, ArrowLeft, WifiOff, History, AlertTriangle, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, inputCls } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';
import { imprimerFeuille } from '../../utils/inventaire';

const nb = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n ?? 0);
const dateCourte = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const msgErreur = (e, def) => e?.response?.data?.message || def;
const STATUT = {
  en_cours: { label: 'En cours', cls: 'bg-indigo-100 text-indigo-700' },
  valide:   { label: 'Validé',   cls: 'bg-emerald-100 text-emerald-700' },
  annule:   { label: 'Annulé',   cls: 'bg-slate-200 text-slate-500' },
};

// Le stock et ses dépendances changent après une validation.
const CLES = ['inventaires', 'inventaire', 'produits', 'produits-vente', 'dashboard', 'alertes', 'mouvements', 'previsions', 'prevision-produit'];

function BadgeEcart({ ecart }) {
  if (ecart === null || ecart === undefined) return null;
  if (ecart === 0) return <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><Check size={12} /> Conforme</span>;
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ecart > 0 ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-600'}`}>{ecart > 0 ? '+' : ''}{nb(ecart)} d'écart</span>;
}

// ─── Une ligne à compter ──────────────────────────────────────────────────────
function LigneComptage({ l, invId, aveugle, editable, onSauve }) {
  const [val, setVal] = useState(l.stockCompte === null || l.stockCompte === undefined ? '' : String(l.stockCompte));
  const [etat, setEtat] = useState('ok'); // ok | envoi | erreur
  const dernier = useRef(val);

  const enregistrer = async (v) => {
    if (v === dernier.current) return;
    setEtat('envoi');
    try {
      const r = await api.patch(`/inventaires/${invId}/lignes/${l._id}`, { stockCompte: v === '' ? null : Number(v) });
      dernier.current = v;
      setEtat('ok');
      onSauve(r.data.data);
    } catch (e) {
      setEtat('erreur');
      toast.error(msgErreur(e, `Enregistrement impossible pour « ${l.nomProduit} »`));
    }
  };

  const compte = l.stockCompte !== null && l.stockCompte !== undefined;
  return (
    <div className={`rounded-2xl border p-3.5 flex items-center gap-3 ${compte ? (l.ecart ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-100 bg-emerald-50/30') : 'border-slate-100 bg-white'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{l.nomProduit}</p>
        <p className="text-[11px] text-slate-400 truncate">{l.reference ? `${l.reference} · ` : ''}{l.unite}{!aveugle || compte ? ` · attendu ${nb(compte ? l.theoriqueAuComptage : l.stockActuel)}` : ''}</p>
        {compte && <div className="mt-1"><BadgeEcart ecart={l.ecart} /></div>}
      </div>
      {editable ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input type="number" inputMode="decimal" min="0" step="any" aria-label={`Quantité comptée ${l.nomProduit}`} placeholder="—"
            className="w-24 text-center text-lg font-bold bg-white border-2 border-slate-200 rounded-xl py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            value={val} onChange={(e) => { setVal(e.target.value); setEtat('ok'); }}
            onBlur={(e) => enregistrer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          <span className="w-4 flex-shrink-0">{etat === 'envoi' ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" /> : etat === 'erreur' ? <X size={14} className="text-red-500" /> : compte ? <Check size={14} className="text-emerald-500" /> : null}</span>
        </div>
      ) : (
        <p className="text-lg font-bold text-slate-800 flex-shrink-0">{compte ? nb(l.stockCompte) : '—'}</p>
      )}
    </div>
  );
}

// ─── Comptage en cours / consultation ─────────────────────────────────────────
function Comptage({ id, onRetour }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const peutCompter = user?.role === 'admin' || user?.role === 'gestionnaire';
  const peutValider = user?.role === 'admin';
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [aveugle, setAveugle] = useState(true);
  const [confirm, setConfirm] = useState(false);

  const { data: inv, isLoading, isError, refetch } = useQuery({
    queryKey: ['inventaire', id],
    queryFn: () => api.get(`/inventaires/${id}`).then((r) => r.data.data),
  });
  const { data: stocks } = useQuery({
    queryKey: ['produits', 'stock-inventaire'],
    enabled: !!inv && inv.statut === 'en_cours',
    queryFn: () => api.get('/produits', { params: { limit: 5000 } }).then((r) => r.data.data),
  });
  const stockPar = useMemo(() => new Map((stocks || []).map((p) => [String(p._id), p.quantiteStock])), [stocks]);

  const editable = inv?.statut === 'en_cours' && peutCompter;
  const lignes = useMemo(() => (inv?.lignes || []).map((l) => ({ ...l, stockActuel: stockPar.get(String(l.produit)) })), [inv, stockPar]);

  const resume = useMemo(() => {
    let comptes = 0, ecarts = 0, perte = 0, gain = 0;
    lignes.forEach((l) => {
      if (l.ecart === null || l.ecart === undefined) return;
      comptes++;
      if (l.ecart) { ecarts++; const v = l.ecart * (l.prixAchat || 0); if (v < 0) perte -= v; else gain += v; }
    });
    return { comptes, ecarts, perte: Math.round(perte), gain: Math.round(gain), total: lignes.length };
  }, [lignes]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return lignes.filter((l) => {
      if (filtre === 'acompter' && l.ecart !== null && l.ecart !== undefined) return false;
      if (filtre === 'comptes' && (l.ecart === null || l.ecart === undefined)) return false;
      if (filtre === 'ecarts' && !l.ecart) return false;
      return !t || `${l.nomProduit} ${l.reference || ''} ${l.categorie || ''}`.toLowerCase().includes(t);
    });
  }, [lignes, q, filtre]);

  const majLigne = (maj) => qc.setQueryData(['inventaire', id], (old) => old && ({
    ...old, lignes: old.lignes.map((l) => (String(l._id) === String(maj._id) ? { ...l, stockCompte: maj.stockCompte, theoriqueAuComptage: maj.theoriqueAuComptage, ecart: maj.ecart } : l)),
  }));
  const actualiser = () => qc.invalidateQueries({ predicate: (x) => CLES.includes(x.queryKey[0]) });

  const valider = useMutation({
    mutationFn: () => api.post(`/inventaires/${id}/valider`).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setConfirm(false); actualiser(); },
    onError: (e) => { toast.error(msgErreur(e, 'Validation impossible')); setConfirm(false); },
  });
  const annuler = useMutation({
    mutationFn: () => api.post(`/inventaires/${id}/annuler`).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); actualiser(); onRetour(); },
    onError: (e) => toast.error(msgErreur(e, 'Annulation impossible')),
  });

  if (isLoading) return <CenteredSpinner />;
  if (isError || !inv) return <div className="card-neu"><EmptyState icon={WifiOff} title="Inventaire indisponible" action={<button className="btn-secondary" onClick={() => refetch()}>Réessayer</button>} /></div>;

  const st = STATUT[inv.statut];
  const pct = resume.total ? Math.round((resume.comptes / resume.total) * 100) : 0;
  const lignesEcart = lignes.filter((l) => l.ecart).sort((a, b) => Math.abs(b.ecart * b.prixAchat) - Math.abs(a.ecart * a.prixAchat));

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onRetour} className="self-start flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Retour</button>

      <div className="card-neu p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h2 className="font-syne text-lg font-bold text-slate-900">{inv.numero}</h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-xs text-slate-400">{inv.perimetre} · démarré le {dateCourte(inv.createdAt)}{inv.creePar?.nom ? ` par ${inv.creePar.nom}` : ''}{inv.dateValidation ? ` · validé le ${dateCourte(inv.dateValidation)}` : ''}</p>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-slate-600">{resume.comptes} / {resume.total} produits comptés</span><span className="text-slate-400">{pct}%</span></div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full gradient-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-slate-50 rounded-xl p-2.5"><p className="text-[10px] text-slate-400 uppercase tracking-wider">Écarts</p><p className="font-syne text-lg font-bold text-slate-800">{resume.ecarts}</p></div>
          <div className="bg-red-50 rounded-xl p-2.5"><p className="text-[10px] text-red-400 uppercase tracking-wider">Pertes</p><p className="text-sm font-bold text-red-600 mt-1">{fmt(resume.perte)} GNF</p></div>
          <div className="bg-sky-50 rounded-xl p-2.5"><p className="text-[10px] text-sky-500 uppercase tracking-wider">Gains</p><p className="text-sm font-bold text-sky-600 mt-1">{fmt(resume.gain)} GNF</p></div>
        </div>

        {inv.statut === 'en_cours' && (
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="btn-secondary" onClick={() => { if (!imprimerFeuille(inv)) toast.error('Autorisez les fenêtres pop-up pour imprimer'); }}><Printer size={15} /> Feuille de comptage</button>
            {peutValider && <button className="btn gradient-brand text-white" onClick={() => setConfirm(true)} disabled={resume.comptes === 0}><CheckCircle2 size={15} /> Terminer et corriger le stock</button>}
            {peutCompter && <button className="btn bg-red-50 text-red-600 hover:bg-red-100" disabled={annuler.isPending} onClick={() => { if (window.confirm(`Annuler l'inventaire ${inv.numero} ? Le stock ne sera pas modifié.`)) annuler.mutate(); }}><Ban size={15} /> Annuler</button>}
          </div>
        )}
        {inv.statut === 'en_cours' && !peutValider && <p className="text-xs text-slate-400 mt-3">Seul l'administrateur peut valider l'inventaire et corriger le stock.</p>}
        {inv.statut === 'en_cours' && !peutCompter && <p className="text-xs text-slate-400 mt-3">Vous pouvez consulter l'inventaire, mais pas saisir de comptage.</p>}
      </div>

      {inv.statut === 'valide' && lignesEcart.length > 0 && (
        <div className="card-neu p-4">
          <p className="text-sm font-bold text-slate-800 mb-2">Écarts corrigés dans le stock</p>
          <div className="divide-y divide-slate-100">
            {lignesEcart.map((l) => (
              <div key={l._id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><p className="text-sm text-slate-800 truncate">{l.nomProduit}</p><p className="text-[11px] text-slate-400">compté {nb(l.stockCompte)} · attendu {nb(l.theoriqueAuComptage)}</p></div>
                <div className="text-right flex-shrink-0"><BadgeEcart ecart={l.ecart} /><p className="text-[11px] text-slate-400 mt-0.5">{fmt(Math.abs(l.ecart * l.prixAchat))} GNF</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {inv.statut === 'valide' && lignesEcart.length === 0 && <div className="card-neu"><EmptyState icon={CheckCircle2} title="Aucun écart" description="Le stock affiché correspondait exactement à ce qui a été compté." /></div>}

      {inv.statut === 'en_cours' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit à compter…" className={`${inputCls} pl-10`} />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {[['tous', 'Tous'], ['acompter', 'À compter'], ['comptes', 'Comptés'], ['ecarts', 'Écarts']].map(([k, label]) => (
              <button key={k} onClick={() => setFiltre(k)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filtre === k ? 'gradient-brand text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{label}</button>
            ))}
            <button onClick={() => setAveugle((a) => !a)} className="flex-shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-white border-slate-200 text-slate-600" title="Masque le stock attendu pour ne pas influencer le comptage">
              {aveugle ? <EyeOff size={13} /> : <Eye size={13} />} {aveugle ? 'Comptage à l\'aveugle' : 'Stock attendu visible'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {visibles.length === 0 ? <div className="card-neu"><EmptyState icon={ClipboardCheck} title="Aucun produit dans cette sélection" /></div>
              : visibles.map((l) => <LigneComptage key={l._id} l={l} invId={id} aveugle={aveugle} editable={editable} onSauve={majLigne} />)}
          </div>
        </>
      )}

      {confirm && (
        <Modal open onClose={() => setConfirm(false)} icon={AlertTriangle} title="Terminer l'inventaire ?" subtitle={inv.numero}
          footer={<>
            <button className="btn-secondary" onClick={() => setConfirm(false)}>Continuer à compter</button>
            <button className="btn gradient-brand text-white disabled:opacity-50" disabled={valider.isPending} onClick={() => valider.mutate()}>{valider.isPending ? 'Correction…' : 'Corriger le stock'}</button>
          </>}>
          <div className="flex flex-col gap-3 text-sm text-slate-600">
            <p><strong>{resume.comptes}</strong> produit(s) compté(s) sur {resume.total}. Les {resume.total - resume.comptes} autres ne seront pas modifiés.</p>
            <p><strong>{resume.ecarts}</strong> écart(s) seront corrigés dans le stock : pertes {fmt(resume.perte)} GNF, gains {fmt(resume.gain)} GNF.</p>
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3">Cette action modifie le stock et ne peut pas être annulée. Chaque correction est enregistrée dans les mouvements et dans le journal.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Accueil : démarrer + historique ──────────────────────────────────────────
function Accueil({ liste, onOuvrir }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const peutCompter = user?.role === 'admin' || user?.role === 'gestionnaire';
  const [categorie, setCategorie] = useState('');
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data.data) });

  const demarrer = useMutation({
    mutationFn: () => api.post('/inventaires', { categorie: categorie || undefined }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ['inventaires'] }); onOuvrir(r.data._id); },
    onError: (e) => {
      toast.error(msgErreur(e, 'Impossible de démarrer l\'inventaire'));
      if (e?.response?.status === 409 && e.response.data?.data?._id) onOuvrir(e.response.data.data._id);
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {peutCompter && (
        <div className="card-neu p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center flex-shrink-0"><ClipboardCheck size={20} className="text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Nouvel inventaire</p>
              <p className="text-xs text-slate-400 mt-0.5">Comptez ce qu'il y a vraiment en rayon. L'application compare avec le stock affiché et corrige les écarts, avec traçabilité.</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={inputCls} aria-label="Périmètre">
                  <option value="">Tous les produits</option>
                  {(cats || []).map((c) => <option key={c._id} value={c._id}>Catégorie : {c.nom}</option>)}
                </select>
                <button className="btn gradient-brand text-white sm:flex-shrink-0 disabled:opacity-60" disabled={demarrer.isPending} onClick={() => demarrer.mutate()}><Play size={15} /> {demarrer.isPending ? 'Préparation…' : 'Démarrer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3"><History size={15} className="text-indigo-500" /> Historique des inventaires</p>
        {liste.length === 0 ? <div className="card-neu"><EmptyState icon={ClipboardCheck} title="Aucun inventaire pour le moment" description="Faites un inventaire régulièrement (chaque mois par exemple) pour garder un stock exact." /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liste.map((i) => {
              const st = STATUT[i.statut]; const r = i.resume;
              return (
                <button key={i._id} type="button" onClick={() => onOuvrir(i._id)} className="text-left card-neu p-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1"><p className="text-sm font-bold text-slate-800">{i.numero}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></div>
                  <p className="text-xs text-slate-400">{i.perimetre} · {dateCourte(i.createdAt)}</p>
                  <p className="text-xs text-slate-500 mt-2">{r.nbComptes}/{r.nbLignes} comptés · {r.nbEcarts} écart(s){r.valeurPerte ? ` · pertes ${fmt(r.valeurPerte)} GNF` : ''}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Inventaire() {
  const [ouvertId, setOuvertId] = useState(null);
  const [auto, setAuto] = useState(true);
  const { data: liste, isLoading, isError, refetch } = useQuery({ queryKey: ['inventaires'], queryFn: () => api.get('/inventaires').then((r) => r.data.data) });

  // À l'arrivée, on rouvre directement l'inventaire en cours s'il y en a un
  useEffect(() => {
    if (auto && liste) { const c = liste.find((i) => i.statut === 'en_cours'); if (c) setOuvertId(c._id); setAuto(false); }
  }, [liste, auto]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-5 lg:p-7">
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0"><ClipboardCheck size={20} className="text-white" /></div>
        <div>
          <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Inventaire</h1>
          <p className="text-sm text-slate-400 mt-0.5">Comptage physique et correction du stock</p>
        </div>
      </div>
      {isLoading ? <CenteredSpinner /> : isError ? (
        <div className="card-neu"><EmptyState icon={WifiOff} title="Inventaires indisponibles" action={<button className="btn-secondary" onClick={() => refetch()}>Réessayer</button>} /></div>
      ) : ouvertId ? (
        <Comptage id={ouvertId} onRetour={() => { setOuvertId(null); refetch(); }} />
      ) : (
        <Accueil liste={liste || []} onOuvrir={setOuvertId} />
      )}
    </div>
  );
}
