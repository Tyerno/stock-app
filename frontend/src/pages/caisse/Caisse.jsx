import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, ChevronLeft, ChevronRight, Plus, Trash2, Lock, CheckCircle2, AlertTriangle,
  MessageCircle, Copy, Check, TrendingUp, Receipt, History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { fmt, fmtDate, inputCls } from '../../utils/format';
import { lireBoutiqueLocale } from '../../utils/boutique';
import { envoyerCaisse } from '../../utils/rapportsPdf';
import { prechargerPdf } from '../../utils/recuPdf';
import { CenteredSpinner } from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  CATEGORIES_DEPENSE, libelleCategorie, aujourdhui, decaler, jourLong, attendues, texteCaisse,
} from '../../utils/caisse';

function Kpi({ label, valeur, sous, ton = 'text-slate-900' }) {
  return (
    <div className="card-neu p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`font-syne text-xl font-bold mt-1 ${ton}`}>{valeur}</p>
      {sous && <p className="text-[11px] text-slate-400 mt-0.5">{sous}</p>}
    </div>
  );
}

function FormDepense({ jour, onFait }) {
  const vide = { libelle: '', montant: '', categorie: 'transport', payeCaisse: true };
  const [f, setF] = useState(vide);
  const m = useMutation({
    mutationFn: () => api.post('/caisse/depenses', { ...f, montant: Number(f.montant), date: jour }).then((r) => r.data),
    onSuccess: (r) => { toast.success(r.message); setF(vide); onFait(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Dépense non enregistrée'),
  });
  const ok = f.libelle.trim() && Number(f.montant) >= 1;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok && !m.isPending) m.mutate(); }} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
      <div className="sm:col-span-4 flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-slate-500">À quoi sert-elle ?</label>
        <input className={inputCls} maxLength={120} value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="Ex : transport du ciment" />
      </div>
      <div className="sm:col-span-3 flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-slate-500">Montant (GNF)</label>
        <input className={inputCls} inputMode="numeric" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value.replace(/[^\d]/g, '') })} placeholder="15000" />
      </div>
      <div className="sm:col-span-3 flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-slate-500">Type</label>
        <select className={inputCls} value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })}>
          {CATEGORIES_DEPENSE.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <button disabled={!ok || m.isPending} className="btn btn-primary sm:col-span-2 justify-center disabled:opacity-40"><Plus size={14} /> Ajouter</button>
      <label className="sm:col-span-12 flex items-center gap-2 text-xs text-slate-500">
        <input type="checkbox" checked={f.payeCaisse} onChange={(e) => setF({ ...f, payeCaisse: e.target.checked })} />
        Payée avec l'argent de la caisse (décochez si payée par Mobile Money, banque ou de votre poche)
      </label>
    </form>
  );
}

export default function Caisse() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [jour, setJour] = useState(aujourdhui());
  const [fond, setFond] = useState('');
  const [comptees, setComptees] = useState('');
  const [note, setNote] = useState('');
  const [aSupprimer, setASupprimer] = useState(null);
  const [copie, setCopie] = useState(false);

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['caisse', jour],
    queryFn: () => api.get('/caisse/jour', { params: { date: jour } }).then((r) => r.data.data),
  });
  const { data: historique } = useQuery({
    queryKey: ['clotures'],
    queryFn: () => api.get('/caisse/clotures', { params: { limit: 14 } }).then((r) => r.data.data),
  });

  // Préremplissage à chaque changement de jour : clôture existante, sinon le comptage de la veille comme fond de caisse.
  useEffect(() => {
    if (!c) return;
    if (c.cloture) { setFond(String(c.cloture.fondOuverture ?? 0)); setComptees(String(c.cloture.especesComptees)); setNote(c.cloture.note || ''); }
    else { setFond(c.precedente ? String(c.precedente.especesComptees) : ''); setComptees(''); setNote(''); }
  }, [c?.jour, c?.cloture?._id, c?.cloture?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const rafraichir = () => { qc.invalidateQueries({ queryKey: ['caisse'] }); qc.invalidateQueries({ queryKey: ['clotures'] }); qc.invalidateQueries({ queryKey: ['rapport-jour'] }); };

  const suppr = useMutation({
    mutationFn: (id) => api.delete(`/caisse/depenses/${id}`),
    onSuccess: () => { toast.success('Dépense supprimée'); setASupprimer(null); rafraichir(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Suppression impossible'),
  });
  const cloturer = useMutation({
    mutationFn: () => api.post('/caisse/cloture', { date: jour, especesComptees: Number(comptees), fondOuverture: Number(fond) || 0, note }).then((r) => r.data),
    onSuccess: () => { toast.success('Caisse clôturée'); rafraichir(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Clôture impossible'),
  });

  const att = c ? attendues(c, fond) : 0;
  const saisi = comptees !== '' && Number.isFinite(Number(comptees));
  const ecart = saisi ? Math.round(Number(comptees) - att) : null;
  const texte = c ? texteCaisse(c, { nomBoutique: lireBoutiqueLocale().nom, fond, comptees: saisi ? comptees : undefined, note }) : '';
  const [envoiPdf, setEnvoiPdf] = useState(false);
  const envoyerPdf = async () => {
    setEnvoiPdf(true);
    try { await envoyerCaisse(c, { fond, comptees: saisi ? comptees : undefined, note }); } catch { toast.error('Création du PDF impossible'); } finally { setEnvoiPdf(false); }
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { toast.error('Copie impossible'); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200"><Wallet size={20} className="text-white" /></div>
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Caisse du jour</h1>
            <p className="text-sm text-slate-400 capitalize">{jourLong(jour)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-icon" onClick={() => setJour(decaler(jour, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
          <input type="date" className={inputCls + ' !w-auto'} value={jour} max={aujourdhui()} onChange={(e) => e.target.value && setJour(e.target.value)} />
          <button className="btn-icon disabled:opacity-30" disabled={jour >= aujourdhui()} onClick={() => setJour(decaler(jour, 1))} aria-label="Jour suivant"><ChevronRight size={16} /></button>
        </div>
      </div>

      {isLoading && <CenteredSpinner />}
      {isError && <div className="card-neu"><EmptyState icon={AlertTriangle} title="Caisse indisponible" description="Vérifiez votre connexion et réessayez." /></div>}

      {c && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Chiffre d'affaires" valeur={`${fmt(c.ventes.ca)} GNF`} ton="text-indigo-600" sous={`${c.ventes.nb} vente(s)${c.ventes.credit ? ` · dont ${fmt(c.ventes.credit)} à crédit` : ''}`} />
            <Kpi label="Encaissé" valeur={`${fmt(c.ventes.ca - c.ventes.credit + c.encaissementsDettes)} GNF`} ton="text-emerald-600" sous={c.encaissementsDettes ? `dont dettes payées ${fmt(c.encaissementsDettes)}` : 'ventes payées'} />
            <Kpi label="Dépenses" valeur={`${fmt(c.depenses.total)} GNF`} ton="text-amber-600" sous={`${c.depenses.liste.length} dépense(s)`} />
            <Kpi label="Bénéfice net estimé" valeur={`${fmt(c.beneficeNet)} GNF`} ton={c.beneficeNet >= 0 ? 'text-emerald-600' : 'text-red-600'} sous="marge − dépenses" />
          </div>

          {/* Dépenses */}
          <div className="card-neu p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3"><Receipt size={15} className="text-amber-500" /> Dépenses du jour</p>
            <FormDepense jour={jour} onFait={rafraichir} />
            {c.depenses.liste.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {c.depenses.liste.map((d) => (
                  <li key={d._id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{d.libelle}</p>
                      <p className="text-[11px] text-slate-400">{libelleCategorie(d.categorie)} · {d.payeCaisse ? 'payée en caisse' : 'hors caisse'}{d.utilisateur?.nom ? ` · ${d.utilisateur.nom}` : ''}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 whitespace-nowrap">−{fmt(d.montant)}</p>
                    {isAdmin && <button className="btn-icon text-slate-400 hover:text-red-500" onClick={() => setASupprimer(d)} aria-label="Supprimer"><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-400 mt-4">Aucune dépense enregistrée ce jour.</p>}
          </div>

          {/* Clôture */}
          <div className="card-neu p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Lock size={15} className="text-indigo-500" /> Clôture de caisse</p>
              {c.cloture && <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Clôturée par {c.cloture.utilisateur?.nom || '—'}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-slate-500">Fond de caisse au matin</label>
                  <input className={inputCls + ' !w-36 text-right'} inputMode="numeric" value={fond} onChange={(e) => setFond(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
                </div>
                <Ligne l="+ Ventes en espèces" v={c.ventes.parMode.especes} />
                {c.ventes.parMode.mixte > 0 && <Ligne l="+ Ventes en paiement mixte" v={c.ventes.parMode.mixte} aide="comptées en espèces" />}
                {c.encaissementsDettes > 0 && <Ligne l="+ Dettes encaissées" v={c.encaissementsDettes} />}
                {!!c.retours?.especesNet && <Ligne l={c.retours.especesNet < 0 ? '− Retours remboursés en espèces' : '+ Suppléments d\'échange'} v={c.retours.especesNet} />}
                {c.depenses.caisse > 0 && <Ligne l="− Dépenses payées en caisse" v={-c.depenses.caisse} />}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-bold text-slate-900">
                  <span>Espèces attendues</span><span>{fmt(att)} GNF</span>
                </div>
                {c.ventes.parMode.mobile_money > 0 && <p className="text-[11px] text-slate-400">Mobile Money ({fmt(c.ventes.parMode.mobile_money)} GNF) : à vérifier sur votre téléphone, hors caisse.</p>}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Espèces réellement comptées</label>
                  <input className={inputCls + ' text-lg font-bold'} inputMode="numeric" value={comptees} onChange={(e) => setComptees(e.target.value.replace(/[^\d]/g, ''))} placeholder="Comptez les billets" />
                </div>
                {ecart !== null && (
                  <div className={`rounded-xl p-3 text-sm font-semibold flex items-center gap-2 ${ecart === 0 ? 'bg-emerald-50 text-emerald-700' : ecart < 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                    {ecart === 0 ? <><CheckCircle2 size={16} /> Caisse juste</> : <><AlertTriangle size={16} /> {ecart < 0 ? 'Il manque' : 'Il y a en trop'} {fmt(Math.abs(ecart))} GNF</>}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Note (facultatif)</label>
                  <input className={inputCls} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : erreur de monnaie à un client" />
                </div>
                <button onClick={() => cloturer.mutate()} disabled={!saisi || cloturer.isPending} className="btn btn-primary w-full justify-center disabled:opacity-40">
                  {cloturer.isPending ? 'Enregistrement…' : c.cloture ? 'Refaire la clôture' : 'Clôturer la caisse'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              <button onClick={envoyerPdf} onMouseEnter={prechargerPdf} onTouchStart={prechargerPdf} disabled={envoiPdf} className="btn btn-secondary disabled:opacity-50"><MessageCircle size={14} /> {envoiPdf ? 'Préparation du PDF…' : 'Envoyer en PDF'}</button>
              <button onClick={copier} className="btn btn-secondary">{copie ? <Check size={14} /> : <Copy size={14} />} {copie ? 'Copié' : 'Copier le texte'}</button>
            </div>
          </div>

          {/* Historique */}
          {historique?.length > 0 && (
            <div className="card-neu p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3"><History size={15} className="text-slate-400" /> Dernières clôtures</p>
              <ul className="divide-y divide-slate-100">
                {historique.map((h) => (
                  <li key={h.jour}>
                    <button onClick={() => setJour(h.jour)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 rounded-lg px-1">
                      <span className="text-sm font-semibold text-slate-800 w-28">{new Date(h.jour + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' })}</span>
                      <span className="flex-1 text-xs text-slate-400 truncate">Compté {fmt(h.especesComptees)} GNF{h.note ? ` · ${h.note}` : ''}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.ecart === 0 ? 'bg-emerald-100 text-emerald-700' : h.ecart < 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                        {h.ecart === 0 ? 'Juste' : `${h.ecart > 0 ? '+' : '−'}${fmt(Math.abs(h.ecart))}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={!!aSupprimer} onClose={() => setASupprimer(null)} onConfirm={() => suppr.mutate(aSupprimer._id)}
        title="Supprimer cette dépense ?" message={aSupprimer ? `« ${aSupprimer.libelle} » — ${fmt(aSupprimer.montant)} GNF. La caisse et le bénéfice seront recalculés.` : ''} />
    </div>
  );
}

function Ligne({ l, v, aide }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{l}{aide && <span className="text-[10px] text-slate-400 ml-1">({aide})</span>}</span>
      <span className={v < 0 ? 'text-red-500' : ''}>{v < 0 ? '−' : ''}{fmt(Math.abs(v))}</span>
    </div>
  );
}
