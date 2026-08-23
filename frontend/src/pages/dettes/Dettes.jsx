import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HandCoins, Plus, Search, Check, WifiOff, Wallet, User, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, fmtDate, inputCls } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';

const STATUTS = [
  { id: '',        label: 'Toutes' },
  { id: 'EN_COURS', label: 'En cours' },
  { id: 'PAYEE',    label: 'Soldées' },
];

// ─── Modale : nouvelle dette ───────────────────────────────────────────────
function ModaleNouvelleDette({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nom: '', telephone: '', montantInitial: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (d) => api.post('/dettes', {
      client: { nom: d.nom, telephone: d.telephone },
      montantInitial: Number(d.montantInitial),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dettes'] });
      toast.success('Dette enregistrée ✓');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal
      open
      onClose={onClose}
      icon={HandCoins}
      title="Nouvelle dette"
      subtitle="Enregistrer un crédit client"
      size="sm"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={() => mutation.mutate(form)}
          disabled={!form.nom || !form.montantInitial || Number(form.montantInitial) <= 0 || mutation.isPending}
          className="btn-primary">
          {mutation.isPending ? 'Enregistrement…' : <><Check size={14}/> Enregistrer</>}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Nom du client *</label>
          <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Mamadou Diallo"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Téléphone</label>
          <input className={inputCls} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="Ex: 622 00 00 00"/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Montant de la dette (GNF) *</label>
          <input type="number" min="1" className={inputCls} value={form.montantInitial}
            onChange={e => set('montantInitial', e.target.value)} placeholder="0"/>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modale : détail + encaissement d'un paiement ──────────────────────────
function ModaleDetailDette({ dette, onClose }) {
  const qc = useQueryClient();
  const [montant, setMontant] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/dettes/${dette._id}/paiement`, { montant: Number(montant), note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dettes'] });
      toast.success('Paiement enregistré ✓');
      setMontant(''); setNote('');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const soldee = dette.statut === 'PAYEE';

  return (
    <Modal
      open
      onClose={onClose}
      icon={User}
      title={dette.client?.nom}
      subtitle={dette.client?.telephone || 'Cahier de dettes'}
      footer={!soldee && <>
        <button onClick={onClose} className="btn-secondary">Fermer</button>
        <button onClick={() => mutation.mutate()}
          disabled={!montant || Number(montant) <= 0 || Number(montant) > dette.montantRestant || mutation.isPending}
          className="btn bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200">
          {mutation.isPending ? 'Enregistrement…' : <><Check size={14}/> Encaisser</>}
        </button>
      </>}>
      <div className="flex flex-col gap-5">

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Initial</p>
            <p className="font-syne text-sm font-bold text-slate-800">{fmt(dette.montantInitial)}</p>
          </div>
          <div className={`rounded-2xl p-3 text-center border ${soldee ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Restant</p>
            <p className={`font-syne text-sm font-bold ${soldee ? 'text-green-600' : 'text-amber-600'}`}>{fmt(dette.montantRestant)}</p>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-3 text-center border border-indigo-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Statut</p>
            <p className="text-xs font-bold text-indigo-600 mt-1">{soldee ? 'Soldée' : 'En cours'}</p>
          </div>
        </div>

        {/* Historique des paiements */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            <Receipt size={13}/> Historique des paiements
          </p>
          {dette.paiements?.length ? (
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {[...dette.paiements].reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{fmt(p.montant)} GNF</p>
                    {p.note && <p className="text-[11px] text-slate-400">{p.note}</p>}
                  </div>
                  <p className="text-[11px] text-slate-400">{fmtDate(p.date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Aucun paiement enregistré pour l'instant.</p>
          )}
        </div>

        {/* Nouveau paiement */}
        {!soldee && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Wallet size={13}/> Enregistrer un paiement
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min="1" max={dette.montantRestant} className={inputCls} value={montant}
                onChange={e => setMontant(e.target.value)} placeholder={`Max ${fmt(dette.montantRestant)}`}/>
              <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optionnel)"/>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────
export default function Dettes() {
  const [search, setSearch]   = useState('');
  const [statut, setStatut]   = useState('');
  const [modaleForm, setModaleForm]     = useState(false);
  const [detteSelectionnee, setDetteSelectionnee] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dettes', statut, search],
    queryFn: () => api.get('/dettes', { params: { statut: statut || undefined, search: search || undefined } })
      .then(r => r.data.data),
  });

  const dettes = data || [];
  const totalDu       = dettes.filter(d => d.statut === 'EN_COURS').reduce((s, d) => s + d.montantRestant, 0);
  const nbEnCours      = dettes.filter(d => d.statut === 'EN_COURS').length;
  const nbSoldees       = dettes.filter(d => d.statut === 'PAYEE').length;

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <HandCoins size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Cahier de dettes</h1>
            <p className="text-sm text-slate-400 mt-0.5">Suivi des ventes à crédit</p>
          </div>
        </div>
        <button onClick={() => setModaleForm(true)} className="btn-primary shadow-lg shadow-indigo-200 active:scale-95 w-full sm:w-auto justify-center">
          <Plus size={15}/> Nouvelle dette
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:'Total dû',        value:fmt(totalDu)+' GNF', color:'text-red-600',    bg:'bg-red-50',    border:'border-l-red-500',    Icon:Wallet },
          { label:'Dettes en cours', value:nbEnCours,           color:'text-amber-600',  bg:'bg-amber-50',  border:'border-l-amber-500',  Icon:HandCoins },
          { label:'Dettes soldées',  value:nbSoldees,           color:'text-green-600',  bg:'bg-green-50',  border:'border-l-green-500',  Icon:Check },
        ].map((k, i) => (
          <div key={k.label} className={`card-neu border-l-4 ${k.border} p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 animate-fade-up-${i+1}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
                <k.Icon size={16} className={k.color}/>
              </div>
            </div>
            <p className={`font-syne text-2xl font-bold ${k.color} leading-none`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Recherche + filtre statut */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 animate-fade-up-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 shadow-sm"
            placeholder="Rechercher un client…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 gap-1">
          {STATUTS.map(s => (
            <button key={s.id} onClick={() => setStatut(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statut === s.id ? 'gradient-brand text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <div className="card-neu">
          <EmptyState icon={WifiOff} title="Impossible de charger le cahier de dettes" description="Vérifiez votre connexion et réessayez."/>
        </div>
      ) : dettes.length === 0 ? (
        <div className="card-neu">
          <EmptyState icon={HandCoins} title="Aucune dette enregistrée"
            description="Les ventes à crédit apparaîtront ici."
            action={<button onClick={() => setModaleForm(true)} className="btn-primary">Nouvelle dette</button>}/>
        </div>
      ) : (
        <>
          {/* Vue carte — mobile */}
          <div className="sm:hidden flex flex-col gap-3 animate-fade-up-4">
            {dettes.map(d => (
              <div key={d._id} className="card-neu p-4 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => setDetteSelectionnee(d)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.client?.nom}</p>
                    <p className="text-xs text-slate-400 truncate">{d.client?.telephone || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${d.statut === 'PAYEE' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {d.statut === 'PAYEE' ? 'Soldée' : 'En cours'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Restant</p>
                    <p className={`text-sm font-bold ${d.statut === 'PAYEE' ? 'text-green-600' : 'text-red-500'}`}>{fmt(d.montantRestant)} GNF</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Initial</p>
                    <p className="text-sm text-slate-600">{fmt(d.montantInitial)} GNF</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vue tableau — tablette / desktop */}
          <div className="hidden sm:block animate-fade-up-4">
          <Table columns={['Client','Téléphone', { label:'Montant initial', align:'right' }, { label:'Restant', align:'right' }, 'Statut', 'Date']}>
            {dettes.map(d => (
              <tr key={d._id} className="cursor-pointer group" onClick={() => setDetteSelectionnee(d)}>
                <td className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{d.client?.nom}</td>
                <td className="text-xs text-slate-400">{d.client?.telephone || '—'}</td>
                <td className="text-sm text-slate-600 text-right">{fmt(d.montantInitial)} GNF</td>
                <td className={`text-sm font-bold text-right ${d.statut === 'PAYEE' ? 'text-green-600' : 'text-red-500'}`}>{fmt(d.montantRestant)} GNF</td>
                <td>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${d.statut === 'PAYEE' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {d.statut === 'PAYEE' ? 'Soldée' : 'En cours'}
                  </span>
                </td>
                <td className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(d.createdAt)}</td>
              </tr>
            ))}
          </Table>
          </div>
        </>
      )}

      {modaleForm && <ModaleNouvelleDette onClose={() => setModaleForm(false)} />}
      {detteSelectionnee && <ModaleDetailDette dette={detteSelectionnee} onClose={() => setDetteSelectionnee(null)} />}
    </div>
  );
}
