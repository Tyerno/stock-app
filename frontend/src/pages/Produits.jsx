import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, LayoutGrid, List,
  Package, ArrowDownCircle, ArrowUpCircle,
  Pencil, Trash2, X, Check, ChevronDown,
  TrendingUp, AlertTriangle, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

const UNITES = ['unité','kg','tonne','m','m²','m³','litre','sac','palette','lot'];

const inputCls = "w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300";

// ─── Badge statut stock ───────────────────────────────────────────────────────
function StatutBadge({ produit }) {
  if (produit.quantiteStock === 0)
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">Rupture</span>;
  if (produit.quantiteStock <= produit.seuilAlerte)
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-600">Stock faible</span>;
  return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-600">En stock</span>;
}

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-blue-200">
              <Package size={16} className="text-white"/>
            </div>
            <div>
              <h3 className="font-syne font-bold text-gray-900">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <p className="text-xs text-gray-400">{isEdit ? produit.nom : 'Remplissez les informations'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-all">
            <X size={15}/>
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto p-6 flex flex-col gap-5">

          {/* Infos de base */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📦 Informations de base</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Nom du produit *</label>
                <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Ciment Portland 42.5"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Référence</label>
                <input className={inputCls} value={form.reference} onChange={e => set('reference', e.target.value.toUpperCase())} placeholder="Ex: CIM-001"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Catégorie *</label>
                <select className={inputCls} value={form.categorie} onChange={e => set('categorie', e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {categories?.map(c => <option key={c._id} value={c._id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Unité *</label>
                <select className={inputCls} value={form.unite} onChange={e => set('unite', e.target.value)}>
                  {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Description</label>
                <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description optionnelle"/>
              </div>
            </div>
          </div>

          {/* Prix */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💰 Prix et stock</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Prix d'achat (GNF) *</label>
                <input type="number" min="0" className={inputCls} value={form.prixAchat} onChange={e => set('prixAchat', Number(e.target.value))} placeholder="0"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Prix de vente (GNF) *</label>
                <input type="number" min="0" className={inputCls} value={form.prixVente} onChange={e => set('prixVente', Number(e.target.value))} placeholder="0"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">
                  {isEdit ? 'Stock actuel' : 'Stock initial'}
                </label>
                <input type="number" min="0" className={inputCls} value={form.quantiteStock}
                  onChange={e => set('quantiteStock', Number(e.target.value))} placeholder="0"
                  disabled={isEdit}/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Seuil d'alerte</label>
                <input type="number" min="0" className={inputCls} value={form.seuilAlerte} onChange={e => set('seuilAlerte', Number(e.target.value))} placeholder="10"/>
              </div>
            </div>

            {/* Marge calculée */}
            {form.prixAchat > 0 && form.prixVente > 0 && (
              <div className={`mt-3 flex items-center gap-3 px-4 py-3 rounded-xl border ${marge >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <TrendingUp size={16} className={marge >= 0 ? 'text-green-600' : 'text-red-500'}/>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">Marge bénéficiaire</p>
                  <p className="text-xs text-gray-400">Bénéfice par {form.unite} : {fmt(form.prixVente - form.prixAchat)} GNF</p>
                </div>
                <span className={`text-lg font-bold ${marge >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {marge}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">
            Annuler
          </button>
          <button onClick={() => mutation.mutate(form)} disabled={!form.nom || !form.categorie || mutation.isPending}
            className="px-5 py-2 rounded-xl text-sm font-semibold gradient-brand text-white hover:opacity-90 transition-all shadow-md shadow-blue-200 disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Enregistrement…</> : <><Check size={14}/> {isEdit ? 'Mettre à jour' : 'Créer le produit'}</>}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEntree ? 'bg-green-100' : 'bg-red-100'}`}>
              {isEntree ? <ArrowDownCircle size={18} className="text-green-600"/> : <ArrowUpCircle size={18} className="text-red-500"/>}
            </div>
            <div>
              <h3 className="font-syne font-bold text-gray-900">{isEntree ? 'Entrée de stock' : 'Sortie de stock'}</h3>
              <p className="text-xs text-gray-400 truncate max-w-[200px]">{produit.nom}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={15}/></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Stock actuel */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isEntree ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
            <span className="text-sm text-gray-600">Stock actuel</span>
            <span className="font-bold text-gray-900">{fmt(produit.quantiteStock)} {produit.unite}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Quantité ({produit.unite}) *</label>
            <input type="number" min="0.01" step="any" className={inputCls} value={form.quantite}
              onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} placeholder="0"/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">
              {isEntree ? 'Prix d\'achat unitaire (GNF)' : 'Prix de vente unitaire (GNF)'}
            </label>
            <input type="number" min="0" className={inputCls} value={form.prixUnitaire}
              onChange={e => setForm(f => ({ ...f, prixUnitaire: e.target.value }))}
              placeholder={isEntree ? fmt(produit.prixAchat) : fmt(produit.prixVente)}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Motif</label>
            <input className={inputCls} value={form.motif}
              onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}
              placeholder={isEntree ? 'Ex: Livraison fournisseur' : 'Ex: Usage chantier'}/>
          </div>

          {/* Nouveau stock prévu */}
          {form.quantite > 0 && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border font-bold ${isEntree ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
              <span className="text-sm text-gray-600">Stock après {isEntree ? 'entrée' : 'sortie'}</span>
              <span className={`text-lg ${isEntree ? 'text-green-600' : 'text-amber-600'}`}>
                {fmt(isEntree
                  ? produit.quantiteStock + Number(form.quantite)
                  : Math.max(0, produit.quantiteStock - Number(form.quantite))
                )} {produit.unite}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Annuler</button>
          <button onClick={() => mutation.mutate(form)} disabled={!form.quantite || mutation.isPending}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2 ${isEntree ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>
            {mutation.isPending ? 'Enregistrement…' : isEntree ? <><ArrowDownCircle size={14}/> Confirmer l'entrée</> : <><ArrowUpCircle size={14}/> Confirmer la sortie</>}
          </button>
        </div>
      </div>
    </div>
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
            <p className="text-sm font-bold text-gray-900 truncate">{produit.nom}</p>
            {produit.reference && <p className="text-[10px] font-mono text-gray-400">{produit.reference}</p>}
          </div>
        </div>
        <StatutBadge produit={produit}/>
      </div>

      {/* Catégorie */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: produit.categorie?.couleur || '#3B82F6' }}/>
        <span className="text-[10px] text-gray-400 font-medium">{produit.categorie?.nom}</span>
      </div>

      {/* Stock bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Stock</span>
          <span className="font-bold text-gray-800">{fmt(produit.quantiteStock)} {produit.unite}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:barColor }}/>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Seuil d'alerte : {produit.seuilAlerte} {produit.unite}</p>
      </div>

      {/* Prix */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Achat</p>
          <p className="text-sm font-bold text-gray-700">{fmt(produit.prixAchat)}</p>
          <p className="text-[9px] text-gray-400">GNF</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider">Vente</p>
          <p className="text-sm font-bold text-blue-600">{fmt(produit.prixVente)}</p>
          <p className="text-[9px] text-gray-400">GNF</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
        <button onClick={() => onEntree(produit)} title="Entrée stock"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-green-50 text-green-600 text-xs font-semibold hover:bg-green-100 transition-all">
          <ArrowDownCircle size={12}/> Entrée
        </button>
        <button onClick={() => onSortie(produit)} title="Sortie stock"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-all">
          <ArrowUpCircle size={12}/> Sortie
        </button>
        <button onClick={() => onEdit(produit)} title="Modifier"
          className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <Pencil size={14}/>
        </button>
        <button onClick={() => onSupprimer(produit)} title="Supprimer"
          className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
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

  const { data, isLoading } = useQuery({
    queryKey: ['produits', search, catFiltre, statutFiltre],
    queryFn:  () => api.get('/produits', {
      params: { search, categorie:catFiltre||undefined, statut:statutFiltre||undefined, limit:100 }
    }).then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/produits/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['produits'] }); toast.success('Produit archivé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const onSupprimer = (p) => {
    if (window.confirm(`Archiver "${p.nom}" ?`)) deleteMutation.mutate(p._id);
  };

  const produits = data?.data || [];
  const stats = {
    total:    produits.length,
    rupture:  produits.filter(p => p.quantiteStock === 0).length,
    faible:   produits.filter(p => p.quantiteStock > 0 && p.quantiteStock <= p.seuilAlerte).length,
    valeur:   produits.reduce((s, p) => s + p.quantiteStock * p.prixAchat, 0),
  };

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div>
          <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Produits</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stats.total} produit(s) dans le catalogue</p>
        </div>
        <button onClick={() => setModaleForm({})}
          className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-200 active:scale-95">
          <Plus size={15}/> Nouveau produit
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:'Total produits', value:stats.total,           color:'text-blue-600',   bg:'bg-blue-50',   Icon:Package },
          { label:'En rupture',     value:stats.rupture,         color:'text-red-600',    bg:'bg-red-50',    Icon:AlertTriangle },
          { label:'Stock faible',   value:stats.faible,          color:'text-amber-600',  bg:'bg-amber-50',  Icon:AlertTriangle },
          { label:'Valeur stock',   value:fmt(stats.valeur)+' GNF', color:'text-green-600', bg:'bg-green-50', Icon:Tag },
        ].map((k, i) => (
          <div key={k.label} className={`card-neu p-4 animate-fade-up-${i+1}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{k.label}</p>
              <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center`}>
                <k.Icon size={15} className={k.color}/>
              </div>
            </div>
            <p className={`font-syne text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Barre recherche + filtres + vue */}
      <div className="flex flex-col gap-3 mb-5 animate-fade-up-3">
        <div className="flex items-center gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400 shadow-sm"
              placeholder="Rechercher un produit par nom ou référence…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          {/* Filtres */}
          <button onClick={() => setFiltres(v => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${filtresOpen || catFiltre || statutFiltre ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
            <Filter size={14}/> Filtres
            {(catFiltre || statutFiltre) && <span className="w-2 h-2 rounded-full bg-blue-500"/>}
          </button>

          {/* Switch vue */}
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            <button onClick={() => setVue('grille')}
              className={`p-2 rounded-lg transition-all ${vue === 'grille' ? 'gradient-brand text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutGrid size={15}/>
            </button>
            <button onClick={() => setVue('liste')}
              className={`p-2 rounded-lg transition-all ${vue === 'liste' ? 'gradient-brand text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
              <List size={15}/>
            </button>
          </div>
        </div>

        {/* Filtres avancés */}
        {filtresOpen && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 animate-fade-up shadow-sm">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Catégorie</label>
              <select className={inputCls} value={catFiltre} onChange={e => setCatFiltre(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {categories?.map(c => <option key={c._id} value={c._id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Statut du stock</label>
              <select className={inputCls} value={statutFiltre} onChange={e => setStatut(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="rupture">En rupture</option>
                <option value="faible">Stock faible</option>
                <option value="normal">Stock normal</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setCatFiltre(''); setStatut(''); setFiltres(false); }}
                className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all border border-gray-200">
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Filtres catégories rapides */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setCatFiltre('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${!catFiltre ? 'gradient-brand text-white shadow-md shadow-blue-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            Tous
          </button>
          {categories?.map(c => (
            <button key={c._id} onClick={() => setCatFiltre(catFiltre === c._id ? '' : c._id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${catFiltre === c._id ? 'text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={catFiltre === c._id ? { background: c.couleur } : {}}>
              <div className="w-2 h-2 rounded-full" style={{ background: c.couleur }}/>
              {c.nom}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
        </div>
      ) : produits.length === 0 ? (
        <div className="card-neu flex flex-col items-center py-20 text-gray-300">
          <Package size={40} className="mb-3 opacity-30"/>
          <p className="text-sm">Aucun produit trouvé</p>
          <button onClick={() => setModaleForm({})} className="mt-4 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold">
            Ajouter un produit
          </button>
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
        <div className="card-neu overflow-hidden animate-fade-up-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Produit','Catégorie','Stock','Seuil','Prix achat','Prix vente','Marge','Statut','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produits.map(p => {
                  const marge = p.prixAchat > 0 ? (((p.prixVente-p.prixAchat)/p.prixAchat)*100).toFixed(1) : 0;
                  return (
                    <tr key={p._id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: p.categorie?.couleur || '#3B82F6' }}>
                            {p.nom.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{p.nom}</p>
                            {p.reference && <p className="text-[10px] font-mono text-gray-400">{p.reference}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{p.categorie?.nom}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-gray-800 whitespace-nowrap">{fmt(p.quantiteStock)} {p.unite}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-400">{p.seuilAlerte} {p.unite}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{fmt(p.prixAchat)} GNF</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-blue-600 whitespace-nowrap">{fmt(p.prixVente)} GNF</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-bold ${Number(marge) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{marge}%</span>
                      </td>
                      <td className="px-4 py-3.5"><StatutBadge produit={p}/></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModaleStock({ produit:p, type:'entree' })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all" title="Entrée">
                            <ArrowDownCircle size={14}/>
                          </button>
                          <button onClick={() => setModaleStock({ produit:p, type:'sortie' })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Sortie">
                            <ArrowUpCircle size={14}/>
                          </button>
                          <button onClick={() => setModaleForm(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => onSupprimer(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
