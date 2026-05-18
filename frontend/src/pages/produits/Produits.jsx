import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Edit2, Trash2, Loader, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatMontant, formatNombre, statutStockBadge } from '../../utils/format';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProduitForm({ initial, categories, onSubmit, loading, onClose }) {
  const { devise } = useAuth();
  const [form, setForm] = useState(initial || {
    nom: '', reference: '', description: '', categorie: '',
    unite: 'unité', prixAchat: '', prixVente: '', quantiteStock: '', seuilAlerte: 5,
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const marge = form.prixAchat && form.prixVente
    ? Math.round(((form.prixVente - form.prixAchat) / form.prixAchat) * 100)
    : null;

  return (
    <>
      <div className="modal-body space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2">
            <label className="label">Nom du produit *</label>
            <input className="input" value={form.nom} onChange={set('nom')} placeholder="Ex: Ciment Portland 50kg" required />
          </div>
          <div className="form-group">
            <label className="label">Référence</label>
            <input className="input" value={form.reference} onChange={set('reference')} placeholder="Auto-générée" />
          </div>
          <div className="form-group">
            <label className="label">Catégorie</label>
            <select className="input" value={form.categorie} onChange={set('categorie')}>
              <option value="">Sans catégorie</option>
              {categories?.map(c => <option key={c._id} value={c._id}>{c.nom}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Prix d'achat ({devise})</label>
            <input type="number" className="input" value={form.prixAchat} onChange={set('prixAchat')} placeholder="0" min="0" required />
          </div>
          <div className="form-group">
            <label className="label">
              Prix de vente ({devise})
              {marge !== null && <span className={`ml-2 text-xs font-bold ${marge >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {marge >= 0 ? '+' : ''}{marge}% marge
              </span>}
            </label>
            <input type="number" className="input" value={form.prixVente} onChange={set('prixVente')} placeholder="0" min="0" required />
          </div>
          <div className="form-group">
            <label className="label">Stock initial</label>
            <input type="number" className="input" value={form.quantiteStock} onChange={set('quantiteStock')} placeholder="0" min="0" />
          </div>
          <div className="form-group">
            <label className="label">Seuil d'alerte</label>
            <input type="number" className="input" value={form.seuilAlerte} onChange={set('seuilAlerte')} placeholder="5" min="0" />
          </div>
          <div className="form-group">
            <label className="label">Unité</label>
            <input className="input" value={form.unite} onChange={set('unite')} placeholder="unité, kg, litre…" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={set('description')} placeholder="Facultatif" />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={loading} onClick={() => {
          // FIX: supprimer les champs vides pour éviter le cast ObjectId("")
          const payload = { ...form };
          if (!payload.categorie)     delete payload.categorie;
          if (!payload.reference)     delete payload.reference;
          if (!payload.description)   delete payload.description;
          if (payload.quantiteStock === '') payload.quantiteStock = 0;
          if (payload.seuilAlerte   === '') payload.seuilAlerte   = 5;
          onSubmit(payload);
        }}>
          {loading && <Loader size={14} className="animate-spin" />}
          {initial ? 'Mettre à jour' : 'Ajouter le produit'}
        </button>
      </div>
    </>
  );
}

export default function Produits() {
  const { devise, peutEcrire, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [modal, setModal]     = useState(null); // null | 'creer' | {produit}
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['produits', search, filtreCat],
    queryFn:  () => api.get('/produits', { params: { search, categorie: filtreCat, limit: 100 } }).then(r => r.data),
  });

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data.data),
  });

  const creerMutation = useMutation({
    mutationFn: (body) => api.post('/produits', body),
    onSuccess: () => { qc.invalidateQueries(['produits']); toast.success('Produit créé !'); setModal(null); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const modifierMutation = useMutation({
    mutationFn: ({ id, body }) => api.put(`/produits/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['produits']); toast.success('Produit mis à jour'); setModal(null); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const supprimerMutation = useMutation({
    mutationFn: (id) => api.delete(`/produits/${id}`),
    onSuccess: () => { qc.invalidateQueries(['produits']); toast.success('Produit archivé'); setConfirm(null); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const produits = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Produits</h1>
          <p className="page-subtitle">{data?.total || 0} produit(s) en catalogue</p>
        </div>
        {peutEcrire && (
          <button className="btn-primary" onClick={() => setModal('creer')}>
            <Plus size={16} /> Nouveau produit
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Rechercher un produit…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto min-w-36" value={filtreCat} onChange={e => setFiltreCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {cats?.map(c => <option key={c._id} value={c._id}>{c.nom}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>
        ) : produits.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun produit trouvé</p>
            {peutEcrire && <button className="btn-primary mt-4" onClick={() => setModal('creer')}><Plus size={14} />Ajouter un produit</button>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Prix achat</th>
                  <th>Prix vente</th>
                  <th>Stock</th>
                  <th>Statut</th>
                  {peutEcrire && <th></th>}
                </tr>
              </thead>
              <tbody>
                {produits.map(p => {
                  const badge = statutStockBadge(p);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div>
                          <p className="font-semibold text-slate-800">{p.nom}</p>
                          <p className="text-xs text-slate-400">{p.reference}</p>
                        </div>
                      </td>
                      <td>
                        {p.categorie ? (
                          <span className="badge badge-blue">{p.categorie.nom}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="font-mono text-slate-600">{formatMontant(p.prixAchat, devise)}</td>
                      <td className="font-mono font-semibold">{formatMontant(p.prixVente, devise)}</td>
                      <td className="font-semibold">{formatNombre(p.quantiteStock)} <span className="text-xs font-normal text-slate-400">{p.unite}</span></td>
                      <td><span className={badge.cls}>{badge.label}</span></td>
                      {peutEcrire && (
                        <td>
                          <div className="flex gap-1 justify-end">
                            <button className="btn-icon text-slate-400 hover:text-indigo-600" onClick={() => setModal(p)}>
                              <Edit2 size={14} />
                            </button>
                            {isAdmin && (
                              <button className="btn-icon text-slate-400 hover:text-red-500" onClick={() => setConfirm(p)}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal créer */}
      {modal === 'creer' && (
        <Modal title="Nouveau produit" onClose={() => setModal(null)}>
          <ProduitForm categories={cats} onClose={() => setModal(null)}
            loading={creerMutation.isPending}
            onSubmit={(body) => creerMutation.mutate(body)} />
        </Modal>
      )}

      {/* Modal modifier */}
      {modal && modal !== 'creer' && (
        <Modal title="Modifier le produit" onClose={() => setModal(null)}>
          <ProduitForm initial={modal} categories={cats} onClose={() => setModal(null)}
            loading={modifierMutation.isPending}
            onSubmit={(body) => modifierMutation.mutate({ id: modal._id, body })} />
        </Modal>
      )}

      {/* Confirmation suppression */}
      {confirm && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="modal-body text-center py-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900 mb-1">Archiver ce produit ?</p>
              <p className="text-sm text-slate-500">"{confirm.nom}" sera masqué du catalogue.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => supprimerMutation.mutate(confirm._id)}
                disabled={supprimerMutation.isPending}>
                {supprimerMutation.isPending && <Loader size={14} className="animate-spin" />}
                Archiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
