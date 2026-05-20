import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Loader, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatMontant, formatNombre } from '../../utils/format';

const MODES_PAIEMENT = [
  { value: 'especes',      label: '💵 Espèces' },
  { value: 'mobile_money', label: '📱 Mobile Money' },
  { value: 'virement',     label: '🏦 Virement' },
  { value: 'credit',       label: '🤝 Crédit' },
];

export default function NouvelleVente() {
  const devise = localStorage.getItem('boutique_devise') || 'GNF';
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const [search,      setSearch]      = useState('');
  const [panier,      setPanier]      = useState([]);
  const [client,      setClient]      = useState({ nom: '', telephone: '' });
  const [remise,      setRemise]      = useState(0);
  const [remiseType,  setRemiseType]  = useState('percent');
  const [modePaie,    setModePaie]    = useState('especes');
  const [notes,       setNotes]       = useState('');

  // Recherche produits
  const { data: prodData } = useQuery({
    queryKey: ['produits-caisse', search],
    queryFn:  () => api.get('/produits', { params: { search, limit: 20, actif: true } }).then(r => r.data),
    enabled:  search.length >= 1,
  });
  const produits = prodData?.data || [];

  // Calculs
  const sousTotal     = panier.reduce((s, l) => s + l.total, 0);
  const montantRemise = remiseType === 'percent' ? sousTotal * remise / 100 : Number(remise);
  const totalNet      = sousTotal - montantRemise;

  const ajouterAuPanier = useCallback((produit) => {
    setPanier(prev => {
      const exist = prev.find(l => l.produit._id === produit._id);
      if (exist) {
        if (exist.quantite >= produit.quantiteStock) {
          toast.error(`Stock max : ${produit.quantiteStock} ${produit.unite}`);
          return prev;
        }
        return prev.map(l => l.produit._id === produit._id
          ? { ...l, quantite: l.quantite + 1, total: (l.quantite + 1) * l.prixUnitaire }
          : l
        );
      }
      if (produit.quantiteStock === 0) {
        toast.error('Produit en rupture de stock');
        return prev;
      }
      return [...prev, {
        produit, quantite: 1,
        prixUnitaire: produit.prixVente,
        total: produit.prixVente,
      }];
    });
    setSearch('');
  }, []);

  const modifierQuantite = (id, delta) => {
    setPanier(prev => prev
      .map(l => l.produit._id === id
        ? { ...l,
            quantite: Math.max(1, Math.min(l.produit.quantiteStock, l.quantite + delta)),
            total: Math.max(1, Math.min(l.produit.quantiteStock, l.quantite + delta)) * l.prixUnitaire,
          }
        : l
      )
    );
  };

  const modifierPrix = (id, prix) => {
    setPanier(prev => prev.map(l => l.produit._id === id
      ? { ...l, prixUnitaire: Number(prix), total: l.quantite * Number(prix) }
      : l
    ));
  };

  const retirerDuPanier = (id) => setPanier(prev => prev.filter(l => l.produit._id !== id));

  const mutation = useMutation({
    mutationFn: (body) => api.post('/ventes', body),
    onSuccess: (res) => {
      qc.invalidateQueries(['ventes']);
      qc.invalidateQueries(['produits']);
      qc.invalidateQueries(['dashboard']);
      qc.invalidateQueries(['alertes']);
      toast.success(`Vente ${res.data.data.numero} enregistrée !`);
      navigate('/ventes');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la vente'),
  });

  const validerVente = () => {
    if (panier.length === 0) return toast.error('Le panier est vide');
    mutation.mutate({
      client: client.nom ? client : { nom: 'Comptoir' },
      lignes: panier.map(l => ({
        produit: l.produit._id,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
      })),
      remise, remiseType, modePaiement: modePaie, notes,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/ventes')} className="btn-icon">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Nouvelle vente</h1>
          <p className="page-subtitle">Enregistrement caisse</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Recherche produits ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Barre de recherche */}
          <div className="card p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 text-base"
                placeholder="Rechercher un produit à ajouter…"
                value={search}
                autoFocus
                onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Résultats */}
            {search.length >= 1 && (
              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                {produits.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">Aucun produit trouvé</p>
                ) : produits.map(p => (
                  <button key={p._id}
                    onClick={() => ajouterAuPanier(p)}
                    disabled={p.quantiteStock === 0}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <ShoppingCart size={14} className="text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.nom}</p>
                      <p className="text-xs text-slate-400">{p.reference} · Stock: {p.quantiteStock} {p.unite}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-indigo-600">{formatMontant(p.prixVente, devise)}</p>
                      {p.quantiteStock === 0 && <p className="text-xs text-red-500">Rupture</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panier */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Panier</h2>
              <span className="badge badge-blue">{panier.length} article(s)</span>
            </div>

            {panier.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Ajoutez des produits en les recherchant</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {panier.map(l => (
                  <div key={l.produit._id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{l.produit.nom}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Prix modifiable */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">PU:</span>
                          <input
                            type="number"
                            className="w-28 text-xs border border-slate-200 rounded-lg px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            value={l.prixUnitaire}
                            onChange={e => modifierPrix(l.produit._id, e.target.value)}
                            min="0"
                          />
                          <span className="text-xs text-slate-400">{devise}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantité */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => modifierQuantite(l.produit._id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center font-bold text-slate-800">{l.quantite}</span>
                      <button onClick={() => modifierQuantite(l.produit._id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Total ligne */}
                    <div className="w-28 text-right flex-shrink-0">
                      <p className="font-bold text-slate-800">{formatMontant(l.total, devise)}</p>
                    </div>

                    <button onClick={() => retirerDuPanier(l.produit._id)}
                      className="btn-icon text-slate-300 hover:text-red-500 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Récapitulatif & paiement ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Client (facultatif)</h3>
            <input className="input" placeholder="Nom du client"
              value={client.nom} onChange={e => setClient(c => ({ ...c, nom: e.target.value }))} />
            <input className="input" placeholder="Téléphone"
              value={client.telephone} onChange={e => setClient(c => ({ ...c, telephone: e.target.value }))} />
          </div>

          {/* Remise */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Remise</h3>
            <div className="flex gap-2">
              <select className="input w-auto"
                value={remiseType} onChange={e => { setRemiseType(e.target.value); setRemise(0); }}>
                <option value="percent">%</option>
                <option value="montant">{devise}</option>
              </select>
              <input type="number" className="input flex-1"
                placeholder={remiseType === 'percent' ? 'Ex: 5' : 'Ex: 5000'}
                value={remise} onChange={e => setRemise(Number(e.target.value))}
                min="0" max={remiseType === 'percent' ? 100 : sousTotal} />
            </div>
          </div>

          {/* Mode paiement */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm">Mode de paiement</h3>
            <div className="grid grid-cols-2 gap-2">
              {MODES_PAIEMENT.map(m => (
                <button key={m.value}
                  onClick={() => setModePaie(m.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    modePaie === m.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Totaux */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Sous-total</span>
              <span className="font-mono">{formatMontant(sousTotal, devise)}</span>
            </div>
            {montantRemise > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Remise</span>
                <span className="font-mono">- {formatMontant(montantRemise, devise)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <span className="font-bold text-slate-900">Total net</span>
              <span className="font-bold text-xl text-indigo-600">{formatMontant(totalNet, devise)}</span>
            </div>
          </div>

          {/* Notes */}
          <textarea className="input resize-none" rows={2}
            placeholder="Notes (facultatif)"
            value={notes} onChange={e => setNotes(e.target.value)} />

          {/* Valider */}
          <button className="btn-primary w-full justify-center py-4 text-base"
            onClick={validerVente}
            disabled={panier.length === 0 || mutation.isPending}>
            {mutation.isPending
              ? <><Loader size={18} className="animate-spin" /> Enregistrement…</>
              : <><Check size={18} /> Valider la vente · {formatMontant(totalNet, devise)}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
