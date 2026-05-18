import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ShoppingCart, Loader, Eye, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatMontant, formatDateHeure } from '../../utils/format';

export default function Ventes() {
  const { devise, peutEcrire, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ventes', search],
    queryFn:  () => api.get('/ventes', { params: { search, limit: 50 } }).then(r => r.data),
  });

  const annulerMutation = useMutation({
    mutationFn: (id) => api.put(`/ventes/${id}/annuler`),
    onSuccess: () => { qc.invalidateQueries(['ventes']); qc.invalidateQueries(['produits']); toast.success('Vente annulée, stock restauré'); setConfirm(null); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const ventes = data?.data || [];

  const modeLabel = { especes: 'Espèces', virement: 'Virement', mobile_money: 'Mobile Money', credit: 'Crédit', autre: 'Autre' };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventes</h1>
          <p className="page-subtitle">{data?.total || 0} vente(s) enregistrée(s)</p>
        </div>
        {peutEcrire && (
          <Link to="/ventes/nouvelle" className="btn-primary">
            <Plus size={16} /> Nouvelle vente
          </Link>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Rechercher par numéro, client…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>
        ) : ventes.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune vente trouvée</p>
            {peutEcrire && <Link to="/ventes/nouvelle" className="btn-primary mt-4 inline-flex"><Plus size={14} />Enregistrer une vente</Link>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Total</th>
                  <th>Paiement</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventes.map(v => (
                  <tr key={v._id}>
                    <td className="font-mono font-semibold text-indigo-600">{v.numero}</td>
                    <td>{v.client?.nom || 'Comptoir'}</td>
                    <td>{v.lignes?.length} article(s)</td>
                    <td className="font-bold">{formatMontant(v.totalNet, devise)}</td>
                    <td><span className="badge badge-gray">{modeLabel[v.modePaiement]}</span></td>
                    <td className="text-slate-500 text-xs">{formatDateHeure(v.createdAt)}</td>
                    <td>
                      <span className={v.statut === 'validee' ? 'badge-green badge' : 'badge-red badge'}>
                        {v.statut === 'validee' ? 'Validée' : 'Annulée'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button className="btn-icon text-slate-400 hover:text-indigo-600" onClick={() => setDetail(v)}>
                          <Eye size={14} />
                        </button>
                        {isAdmin && v.statut === 'validee' && (
                          <button className="btn-icon text-slate-400 hover:text-red-500" onClick={() => setConfirm(v)}>
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Détail vente */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3 className="font-bold text-slate-900">{detail.numero}</h3>
                <p className="text-xs text-slate-500">{formatDateHeure(detail.createdAt)} · {detail.client?.nom}</p>
              </div>
              <button onClick={() => setDetail(null)} className="btn-icon"><XCircle size={16} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Produit</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead>
                  <tbody>
                    {detail.lignes?.map((l, i) => (
                      <tr key={i}>
                        <td>{l.nomProduit || l.produit?.nom}</td>
                        <td>{l.quantite}</td>
                        <td className="font-mono">{formatMontant(l.prixUnitaire, devise)}</td>
                        <td className="font-bold">{formatMontant(l.total, devise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span>{formatMontant(detail.sousTotal, devise)}</span></div>
                {detail.remise > 0 && <div className="flex justify-between text-emerald-600"><span>Remise ({detail.remise}{detail.remiseType === 'percent' ? '%' : ` ${devise}`})</span><span>- {formatMontant(detail.sousTotal - detail.totalNet, devise)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>Total net</span><span className="text-indigo-600">{formatMontant(detail.totalNet, devise)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation annulation */}
      {confirm && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="modal-body text-center py-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <XCircle size={20} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900 mb-1">Annuler la vente {confirm.numero} ?</p>
              <p className="text-sm text-slate-500">Le stock sera automatiquement restauré.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Non, garder</button>
              <button className="btn-danger" onClick={() => annulerMutation.mutate(confirm._id)}
                disabled={annulerMutation.isPending}>
                {annulerMutation.isPending && <Loader size={14} className="animate-spin" />}
                Oui, annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
