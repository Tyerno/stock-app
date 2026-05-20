import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Package, ArrowDownCircle,
  CheckCircle, Bell, Zap, RefreshCw, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmt, inputCls } from '../../utils/format';

// ─── Modal entrée rapide de stock ─────────────────────────────────────────────
function ModaleEntreeRapide({ produit, onClose }) {
  const qc = useQueryClient();
  const [quantite, setQuantite]   = useState('');
  const [motif, setMotif]         = useState('Réapprovisionnement');

  const mutation = useMutation({
    mutationFn: () => api.post(`/produits/${produit._id}/entree`, {
      quantite: Number(quantite),
      motif,
      prixUnitaire: produit.prixAchat,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertes'] });
      qc.invalidateQueries({ queryKey: ['produits'] });
      toast.success(`✓ ${quantite} ${produit.unite} ajoutés à "${produit.nom}"`);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const stockApres = produit.quantiteStock + Number(quantite || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <ArrowDownCircle size={17} className="text-green-600"/>
            </div>
            <div>
              <h3 className="font-syne font-bold text-gray-900">Réapprovisionner</h3>
              <p className="text-xs text-gray-400 truncate max-w-[180px]">{produit.nom}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={14}/></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Stock actuel */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${produit.quantiteStock === 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
            <span className="text-sm text-gray-600">Stock actuel</span>
            <span className={`font-bold ${produit.quantiteStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {fmt(produit.quantiteStock)} {produit.unite}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Quantité à ajouter ({produit.unite}) *</label>
            <input type="number" min="0.01" step="any" className={inputCls} value={quantite}
              onChange={e => setQuantite(e.target.value)} placeholder="0" autoFocus/>
          </div>

          {/* Suggestions quantité */}
          <div className="flex gap-2 flex-wrap">
            {[10, 50, 100, 200].map(v => (
              <button key={v} onClick={() => setQuantite(v.toString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${Number(quantite) === v ? 'gradient-brand text-white border-transparent shadow-md' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                +{v}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Motif</label>
            <input className={inputCls} value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex: Livraison fournisseur"/>
          </div>

          {/* Stock après */}
          {quantite > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-50 border border-green-100 font-bold">
              <span className="text-sm text-gray-600">Stock après entrée</span>
              <span className="text-lg text-green-600">{fmt(stockApres)} {produit.unite}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 bg-gray-50">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all border border-gray-200">
            Annuler
          </button>
          <button onClick={() => mutation.mutate()} disabled={!quantite || Number(quantite) <= 0 || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-all shadow-md shadow-green-200 disabled:opacity-50">
            {mutation.isPending ? 'En cours…' : <><Check size={14}/> Confirmer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card alerte ──────────────────────────────────────────────────────────────
function CarteAlerte({ produit, type, onReappro }) {
  const isRupture = type === 'rupture';

  return (
    <div className={`card-neu border-2 p-4 transition-all hover:-translate-y-0.5 duration-200 ${isRupture ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'}`}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isRupture ? 'bg-red-500 dot-live' : 'bg-amber-400'}`}/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{produit.nom}</p>
            {produit.reference && <p className="text-[10px] font-mono text-gray-400">{produit.reference}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${isRupture ? 'bg-red-500 text-white' : 'bg-amber-400 text-white'}`}>
          {isRupture ? 'Rupture' : 'Faible'}
        </span>
      </div>

      {/* Catégorie */}
      {produit.categorie && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: produit.categorie.couleur || '#6B7280' }}/>
          <span className="text-[10px] text-gray-400">{produit.categorie.nom}</span>
        </div>
      )}

      {/* Stock info */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`rounded-xl p-2.5 text-center border ${isRupture ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200'}`}>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Stock actuel</p>
          <p className={`text-base font-bold ${isRupture ? 'text-red-600' : 'text-amber-600'}`}>
            {fmt(produit.quantiteStock)}
          </p>
          <p className="text-[9px] text-gray-400">{produit.unite}</p>
        </div>
        <div className="bg-gray-100 rounded-xl p-2.5 text-center border border-gray-200">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Seuil alerte</p>
          <p className="text-base font-bold text-gray-600">{fmt(produit.seuilAlerte)}</p>
          <p className="text-[9px] text-gray-400">{produit.unite}</p>
        </div>
      </div>

      {/* Barre visuelle */}
      {!isRupture && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-amber-400 transition-all duration-700"
              style={{ width: `${Math.min(100, (produit.quantiteStock / produit.seuilAlerte) * 100)}%` }}/>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            {Math.round((produit.quantiteStock / produit.seuilAlerte) * 100)}% du seuil
          </p>
        </div>
      )}

      {/* Bouton action */}
      <button onClick={() => onReappro(produit)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold transition-all active:scale-95">
        <ArrowDownCircle size={13}/> Réapprovisionner maintenant
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function Alertes() {
  const [produitReappro, setProduitReappro] = useState(null);
  const [onglet, setOnglet] = useState('tous');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['alertes'],
    queryFn:  () => api.get('/alertes').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const ruptures = data?.ruptures || [];
  const faibles  = data?.faibles  || [];
  const total    = ruptures.length + faibles.length;

  const produitsFiltres = onglet === 'rupture' ? ruptures
    : onglet === 'faible' ? faibles
    : [...ruptures, ...faibles];

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${total > 0 ? 'bg-red-500 shadow-red-200' : 'bg-green-500 shadow-green-200'}`}>
            <Bell size={18} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Alertes Stock</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {total === 0 ? 'Tous les stocks sont dans la normale ✓' : `${total} produit(s) nécessitent votre attention`}
            </p>
          </div>
        </div>

        <button onClick={() => refetch()}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all text-sm ${isFetching ? 'animate-spin' : ''}`}>
          <RefreshCw size={14}/> <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
        </div>
      ) : total === 0 ? (

        /* Tout est OK */
        <div className="card-neu flex flex-col items-center py-20 text-center animate-fade-up-2">
          <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center mb-4 animate-float">
            <CheckCircle size={36} className="text-green-500"/>
          </div>
          <h2 className="font-syne text-xl font-bold text-gray-900 mb-2">Tout est parfait ! ✓</h2>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            Aucun produit n'est en rupture ou en stock faible. Votre gestion de stock est exemplaire.
          </p>
          <div className="flex items-center gap-2 mt-6 bg-green-50 border border-green-100 px-4 py-2.5 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-green-400 dot-live"/>
            <span className="text-xs font-semibold text-green-600">Surveillance automatique active</span>
          </div>
        </div>

      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 animate-fade-up-2">
            <div className="card-neu p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Package size={20} className="text-red-600"/>
              </div>
              <div>
                <p className="font-syne text-2xl font-bold text-red-600">{ruptures.length}</p>
                <p className="text-xs text-gray-400">Rupture(s) totale(s)</p>
              </div>
            </div>
            <div className="card-neu p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600"/>
              </div>
              <div>
                <p className="font-syne text-2xl font-bold text-amber-600">{faibles.length}</p>
                <p className="text-xs text-gray-400">Stock(s) faible(s)</p>
              </div>
            </div>
            <div className="card-neu p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-blue-600"/>
              </div>
              <div>
                <p className="font-syne text-2xl font-bold text-blue-600">{total}</p>
                <p className="text-xs text-gray-400">Total alertes actives</p>
              </div>
            </div>
          </div>

          {/* Onglets filtre */}
          <div className="flex bg-white border border-gray-200 rounded-2xl p-1 gap-1 mb-5 w-fit animate-fade-up-3">
            {[
              { id:'tous',    label:`Tous (${total})` },
              { id:'rupture', label:`Ruptures (${ruptures.length})` },
              { id:'faible',  label:`Faibles (${faibles.length})` },
            ].map(o => (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${onglet === o.id ? 'gradient-brand text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Grille alertes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up-4">
            {produitsFiltres.map(p => (
              <CarteAlerte
                key={p._id}
                produit={p}
                type={ruptures.find(r => r._id === p._id) ? 'rupture' : 'faible'}
                onReappro={setProduitReappro}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal réapprovisionnement */}
      {produitReappro && (
        <ModaleEntreeRapide
          produit={produitReappro}
          onClose={() => setProduitReappro(null)}
        />
      )}
    </div>
  );
}
