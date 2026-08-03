import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, LayoutGrid, List,
  Package, ArrowDownCircle, ArrowUpCircle,
  Pencil, Trash2, Check, ChevronDown,
  TrendingUp, AlertTriangle, Tag, Wallet, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, inputCls } from '../../utils/format';
import StatutBadge from '../../components/common/StatutBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Table from '../../components/ui/Table';
import { CenteredSpinner } from '../../components/ui/LoadingState';

const UNITES = ['unité','kg','tonne','m','m²','m³','litre','sac','palette','lot'];

// ─── Modal formulaire produit ─────────────────────────────────────────────────
function ModaleProduit({ produit, categories, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!produit?._id;
  const [form, setForm] = useState({
    nom:            produit?.nom            || '',
    reference:      produit?.reference      || '',
    description:    produit?.description    || '',
    categorie:      produit?.categorie?._id || produit?.categorie || '',
    unite:          produit?.unite          || 'unité',
    prixAchat:      produit?.prixAchat      || '',
    prixVente:      produit?.prixVente      || '',
    quantiteStock:  produit?.quantiteStock  || '',
    seuilAlerte:    produit?.seuilAlerte    || 10,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const marge = form.prixAchat && form.prixVente
    ? (((form.prixVente - form.prixAchat) / form.prixAchat) * 100).toFixed(1)
    : 0;

  const mutation = useMutation({
    mutationFn: (d) => isEdit
      ? api.put(`/produits/${produit._id}`, d)
      : api.post('/produits', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produits'] });
      toast.success(isEdit ? 'Produit mis à jour ✓' : 'Produit créé ✓');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal
      open
      onClose={onClose}
      icon={Package}
      title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      subtitle={isEdit ? produit.nom : 'Remplissez les informations'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button onClick={() => mutation.mutate(form)} disabled={!form.nom || !form.categorie || mutation.isPending}
            className="btn-primary">
            {mutation.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Enregistrement…</> : <><Check size={14}/> {isEdit ? 'Mettre à jour' : 'Créer le produit'}</>}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">

          {/* Infos de base */}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Package size={13}/> Informations de base
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Nom du produit *</label>
                <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Ciment Portland 42.5"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Référence</label>
                <input className={inputCls} value={form.reference} onChange={e => set('reference', e.target.value.toUpperCase())} placeholder="Ex: CIM-001"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Catégorie *</label>
                <select className={inputCls} value={form.categorie} onChange={e => set('categorie', e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {categories?.map(c => <option key={c._id} value={c._id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Unité *</label>
                <select className={inputCls} value={form.unite} onChange={e => set('unite', e.target.value)}>
                  {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Description</label>
                <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description optionnelle"/>
              </div>
            </div>
          </div>

          {/* Prix */}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Wallet size={13}/> Prix et stock
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Prix d'achat (GNF) *</label>
                <input type="number" min="0" className={inputCls} value={form.prixAchat} onChange={e => set('prixAchat', Number(e.target.value))} placeholder="0"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Prix de vente (GNF) *</label>
                <input type="number" min="0" className={inputCls} value={form.prixVente} onChange={e => set('prixVente', Number(e.target.value))} placeholder="0"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">
                  {isEdit ? 'Stock actuel' : 'Stock initial'}
                </label>
                <input type="number" min="0" className={inputCls} value={form.quantiteStock}
                  onChange={e => set('quantiteStock', Number(e.target.value))} placeholder="0"
                  disabled={isEdit}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Seuil d'alerte</label>
                <input type="number" min="0" className={inputCls} value={form.seuilAlerte} onChange={e => set('seuilAlerte', Number(e.target.value))} placeholder="10"/>
              </div>
            </div>

            {/* Marge calculée */}
            {form.prixAchat > 0 && form.prixVente > 0 && (
              <div className={`mt-3 flex items-center gap-3 px-4 py-3 rounded-xl border ${marge >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <TrendingUp size={16} className={marge >= 0 ? 'text-green-600' : 'text-red-500'}/>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">Marge bénéficiaire</p>
                  <p className="text-xs text-slate-400">Bénéfice par {form.unite} : {fmt(form.prixVente - form.prixAchat)} GNF</p>
                </div>
                <span className={`text-lg font-bold ${marge >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {marge}%
                </span>
              </div>
            )}
          </div>
      </div>
    </Modal>
  );
}

// ─── Modal entrée/sortie de stock ─────────────────────────────────────────────
function ModaleStock({ produit, type, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ quantite:'', motif:'', prixUnitaire:'' });

  const mutation = useMutation({
    mutationFn: (d) => api.post(`/produits/${produit._id}/${type}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produits'] });
      toast.success(`${type === 'entree' ? 'Entrée' : 'Sortie'} de stock enregistrée ✓`);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const isEntree = type === 'entree';

  return (
    <Modal
      open
      onClose={onClose}
      icon={isEntree ? ArrowDownCircle : ArrowUpCircle}
      title={isEntree ? 'Entrée de stock' : 'Sortie de stock'}
      subtitle={produit.nom}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => mutation.mutate(form)} disabled={!form.quantite || mutation.isPending}
            className={`btn ${isEntree ? 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200' : 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200'}`}>
            {mutation.isPending ? 'Enregistrement…' : isEntree ? <><ArrowDownCircle size={14}/> Confirmer l'entrée</> : <><ArrowUpCircle size={14}/> Confirmer la sortie</>}
          </button>
        </>
      }
    >
        <div className="flex flex-col gap-4">
          {/* Stock actuel */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isEntree ? 'bg-green-50 border-green-100' : 'bg-indigo-50 border-indigo-100'}`}>
            <span className="text-sm text-slate-600">Stock actuel</span>
            <span className="font-bold text-slate-900">{fmt(produit.quantiteStock)} {produit.unite}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Quantité ({produit.unite}) *</label>
            <input type="number" min="0.01" step="any" className={inputCls} value={form.quantite}
              onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} placeholder="0"/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              {isEntree ? 'Prix d\'achat unitaire (GNF)' : 'Prix de vente unitaire (GNF)'}
            </label>
            <input type="number" min="0" className={inputCls} value={form.prixUnitaire}
              onChange={e => setForm(f => ({ ...f, prixUnitaire: e.target.value }))}
              placeholder={isEntree ? fmt(produit.prixAchat) : fmt(produit.prixVente)}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Motif</label>
            <input className={inputCls} value={form.motif}
              onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
              placeholder={isEntree ? 'Ex: Livraison fournisseur' : 'Ex: Usage chantier'}/>
          </div>

          {/* Nouveau stock prévu */}
          {form.quantite > 0 && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border font-bold ${isEntree ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
              <span className="text-sm text-slate-600">Stock après {isEntree ? 'entrée' : 'sortie'}</span>
              <span className={`text-lg ${isEntree ? 'text-green-600' : 'text-amber-600'}`}>
                {fmt(isEntree
                  ? produit.quantiteStock + Number(form.quantite)
                  : Math.max(0, produit.quantiteStock - Number(form.quantite))
                )} {produit.unite}
              </span>
            </div>
          )}
        </div>
    </Modal>
  );
}

// ─── Card produit (vue grille) ────────────────────────────────────────────────
function ProduitCard({ produit, onEdit, onEntree, onSortie, onSupprimer }) {
  const pct = produit.seuilAlerte > 0
    ? Math.min(100, (produit.quantiteStock / (produit.seuilAlerte * 3)) * 100)
    : 100;
  const barColor = produit.quantiteStock === 0 ? '#EF4444'
    : produit.quantiteStock <= produit.seuilAlerte ? '#F59E0B' : '#10B981';

  return (
    <div className="card-neu p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
            style={{ background: produit.categorie?.couleur || '#3B82F6' }}>
            {produit.nom.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{produit.nom}</p>
            {produit.reference && <p className="text-[10px] font-mono text-slate-400">{produit.reference}</p>}
          </div>
        </div>
        <StatutBadge produit={produit}/>
      </div>

      {/* Catégorie */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: produit.categorie?.couleur || '#3B82F6' }}/>
        <span className="text-[10px] text-slate-400 font-medium">{produit.categorie?.nom}</span>
      </div>

      {/* Stock bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Stock</span>
          <span className="font-bold text-slate-800">{fmt(produit.quantiteStock)} {produit.unite}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:barColor }}/>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Seuil d'alerte : {produit.seuilAlerte} {produit.unite}</p>
      </div>

      {/* Prix */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Achat</p>
          <p className="text-sm font-bold text-slate-700">{fmt(produit.prixAchat)}</p>
          <p className="text-[9px] text-slate-400">GNF</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-2.5 text-center border border-indigo-100">
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Vente</p>
          <p className="text-sm font-bold text-indigo-600">{fmt(produit.prixVente)}</p>
          <p className="text-[9px] text-slate-400">GNF</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
        <button onClick={() => onEntree(produit)} title="Entrée stock"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-green-50 text-green-600 text-xs font-semibold hover:bg-green-100 transition-all">
          <ArrowDownCircle size={12}/> Entrée
        </button>
        <button onClick={() => onSortie(produit)} title="Sortie stock"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-all">
          <ArrowUpCircle size={12}/> Sortie
        </button>
        <button onClick={() => onEdit(produit)} title="Modifier"
          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
          <Pencil size={14}/>
        </button>
        <button onClick={() => onSupprimer(produit)} title="Supprimer"
          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function Produits() {
  const qc = useQueryClient();
  const [vue, setVue]               = useState('grille');
  const [search, setSearch]         = useState('');
  const [catFiltre, setCatFiltre]   = useState('');
  const [statutFiltre, setStatut]   = useState('');
  const [filtresOpen, setFiltres]   = useState(false);
  const [modaleForm, setModaleForm] = useState(null);
  const [modaleStock, setModaleStock] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['produits', search, catFiltre, statutFiltre],
    queryFn:  () => api.get('/produits', {
      params: { search, categorie:catFiltre||undefined, statut:statutFiltre||undefined, limit:100 }
    }).then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data.data),
  });

  const [aSupprimer, setASupprimer] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/produits/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['produits'] }); toast.success('Produit archivé'); setASupprimer(null); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const onSupprimer = (p) => setASupprimer(p);

  const produits = data?.data || [];
  const stats = {
    total:    produits.length,
    rupture:  produits.filter(p => p.quantiteStock === 0).length,
    faible:   produits.filter(p => p.quantiteStock > 0 && p.quantiteStock <= p.seuilAlerte).length,
    valeur:   produits.reduce((s, p) => s + p.quantiteStock * p.prixAchat, 0),
  };

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <Package size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Produits</h1>
            <p className="text-sm text-slate-400 mt-0.5">{stats.total} produit(s) dans le catalogue</p>
          </div>
        </div>
        <button onClick={() => setModaleForm({})} className="btn-primary shadow-lg shadow-indigo-200 active:scale-95 w-full sm:w-auto justify-center">
          <Plus size={15}/> Nouveau produit
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:'Total produits', value:stats.total,           color:'text-indigo-600', bg:'bg-indigo-50', border:'border-l-indigo-500', Icon:Package },
          { label:'En rupture',     value:stats.rupture,         color:'text-red-600',    bg:'bg-red-50',    border:'border-l-red-500',    Icon:AlertTriangle },
          { label:'Stock faible',   value:stats.faible,          color:'text-amber-600',  bg:'bg-amber-50',  border:'border-l-amber-500',  Icon:AlertTriangle },
          { label:'Valeur stock',   value:fmt(stats.valeur)+' GNF', color:'text-green-600', bg:'bg-green-50', border:'border-l-green-500', Icon:Tag },
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

      {/* Barre recherche + filtres + vue */}
      <div className="flex flex-col gap-3 mb-5 animate-fade-up-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 shadow-sm"
              placeholder="Rechercher un produit par nom ou référence…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtres */}
            <button onClick={() => setFiltres(v => !v)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${filtresOpen || catFiltre || statutFiltre ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
              <Filter size={14}/> Filtres
              {(catFiltre || statutFiltre) && <span className="w-2 h-2 rounded-full bg-indigo-500"/>}
            </button>

            {/* Switch vue */}
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 flex-shrink-0">
              <button onClick={() => setVue('grille')}
                className={`p-2 rounded-lg transition-all ${vue === 'grille' ? 'gradient-brand text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={15}/>
              </button>
              <button onClick={() => setVue('liste')}
                className={`p-2 rounded-lg transition-all ${vue === 'liste' ? 'gradient-brand text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                <List size={15}/>
              </button>
            </div>
          </div>
        </div>

        {/* Filtres avancés */}
        {filtresOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 animate-fade-up shadow-sm">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Catégorie</label>
              <select className={inputCls} value={catFiltre} onChange={e => setCatFiltre(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {categories?.map(c => <option key={c._id} value={c._id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Statut du stock</label>
              <select className={inputCls} value={statutFiltre} onChange={e => setStatut(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="rupture">En rupture</option>
                <option value="faible">Stock faible</option>
                <option value="normal">Stock normal</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setCatFiltre(''); setStatut(''); setFiltres(false); }}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-all border border-slate-200">
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Filtres catégories rapides */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setCatFiltre('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!catFiltre ? 'gradient-brand text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            Tous
          </button>
          {categories?.map(c => (
            <button key={c._id} onClick={() => setCatFiltre(catFiltre === c._id ? '' : c._id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${catFiltre === c._id ? 'text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
              style={catFiltre === c._id ? { background: c.couleur } : {}}>
              <div className="w-2 h-2 rounded-full" style={{ background: c.couleur }}/>
              {c.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <div className="card-neu">
          <EmptyState
            icon={WifiOff}
            title="Impossible de charger les produits"
            description="Une erreur est survenue lors du chargement. Vérifiez votre connexion et réessayez."
          />
        </div>
      ) : produits.length === 0 ? (
        <div className="card-neu">
          <EmptyState
            icon={Package}
            title="Aucun produit trouvé"
            action={
              <button onClick={() => setModaleForm({})} className="btn-primary">
                Ajouter un produit
              </button>
            }
          />
        </div>
      ) : vue === 'grille' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up-4">
          {produits.map(p => (
            <ProduitCard key={p._id} produit={p}
              onEdit={setModaleForm}
              onEntree={p => setModaleStock({ produit:p, type:'entree' })}
              onSortie={p => setModaleStock({ produit:p, type:'sortie' })}
              onSupprimer={onSupprimer}/>
          ))}
        </div>
      ) : (
        /* Vue liste */
        <div className="animate-fade-up-4">
          <Table columns={[
            'Produit', 'Catégorie',
            { label: 'Stock', align: 'right' },
            { label: 'Seuil', align: 'right' },
            { label: 'Prix achat', align: 'right' },
            { label: 'Prix vente', align: 'right' },
            { label: 'Marge', align: 'right' },
            'Statut', 'Actions',
          ]}>
                {produits.map(p => {
                  const marge = p.prixAchat > 0 ? (((p.prixVente-p.prixAchat)/p.prixAchat)*100).toFixed(1) : 0;
                  return (
                    <tr key={p._id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors group">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: p.categorie?.couleur || '#3B82F6' }}>
                            {p.nom.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{p.nom}</p>
                            {p.reference && <p className="text-[10px] font-mono text-slate-400">{p.reference}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{p.categorie?.nom}</span>
                      </td>
                      <td className="text-sm font-bold text-slate-800 whitespace-nowrap text-right">{fmt(p.quantiteStock)} {p.unite}</td>
                      <td className="text-sm text-slate-400 text-right">{p.seuilAlerte} {p.unite}</td>
                      <td className="text-sm text-slate-600 whitespace-nowrap text-right">{fmt(p.prixAchat)} GNF</td>
                      <td className="text-sm font-semibold text-indigo-600 whitespace-nowrap text-right">{fmt(p.prixVente)} GNF</td>
                      <td className="text-right">
                        <span className={`text-xs font-bold ${Number(marge) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{marge}%</span>
                      </td>
                      <td><StatutBadge produit={p}/></td>
                      <td>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModaleStock({ produit:p, type:'entree' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-all" title="Entrée">
                            <ArrowDownCircle size={14}/>
                          </button>
                          <button onClick={() => setModaleStock({ produit:p, type:'sortie' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Sortie">
                            <ArrowUpCircle size={14}/>
                          </button>
                          <button onClick={() => setModaleForm(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => onSupprimer(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </Table>
        </div>
      )}

      {/* Modales */}
      {modaleForm !== null && (
        <ModaleProduit
          produit={modaleForm._id ? modaleForm : null}
          categories={categories}
          onClose={() => setModaleForm(null)}
        />
      )}
      {modaleStock && (
        <ModaleStock
          produit={modaleStock.produit}
          type={modaleStock.type}
          onClose={() => setModaleStock(null)}
        />
      )}
      <ConfirmDialog
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        onConfirm={() => deleteMutation.mutate(aSupprimer._id)}
        title={aSupprimer ? `Archiver "${aSupprimer.nom}" ?` : ''}
        message="Le produit sera archivé et n'apparaîtra plus dans le catalogue actif."
        confirmLabel="Archiver"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
