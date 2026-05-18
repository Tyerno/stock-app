import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Building2, Loader, ToggleLeft, ToggleRight, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatDate } from '../../utils/format';

const planCfg = {
  gratuit:    { label: 'Gratuit',    cls: 'badge-gray'   },
  pro:        { label: 'Pro',        cls: 'badge-blue'   },
  enterprise: { label: 'Enterprise', cls: 'badge-purple' },
};
const statutCfg = {
  actif:    { label: 'Actif',    cls: 'badge-green' },
  suspendu: { label: 'Suspendu', cls: 'badge-red'   },
  expire:   { label: 'Expiré',   cls: 'badge-amber' },
};

const SECTEUR_EMOJI = { boutique:'🛍', quincaillerie:'🔧', pharmacie:'💊', alimentation:'🥗', btp:'🏗', electronique:'📱', autre:'📦' };

export default function SuperAdminEntreprises() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filtrePlan, setFiltrePlan] = useState('');
  const [planModal, setPlanModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sa-entreprises', search, filtrePlan],
    queryFn:  () => api.get('/superadmin/entreprises', { params: { search, plan: filtrePlan, limit: 50 } }).then(r => r.data),
  });

  const toggleMut = useMutation({
    mutationFn: id => api.put(`/superadmin/entreprises/${id}/toggle`),
    onSuccess: (res) => { qc.invalidateQueries(['sa-entreprises']); toast.success(res.data.message); },
    onError:   e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const planMut = useMutation({
    mutationFn: ({ id, plan, statut }) => api.put(`/superadmin/entreprises/${id}/plan`, { plan, statut }),
    onSuccess: () => { qc.invalidateQueries(['sa-entreprises']); toast.success('Plan modifié'); setPlanModal(null); },
    onError:   e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const entreprises = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Entreprises</h1>
          <p className="page-subtitle">{data?.total || 0} entreprise(s) inscrite(s)</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filtrePlan} onChange={e => setFiltrePlan(e.target.value)}>
          <option value="">Tous les plans</option>
          <option value="gratuit">Gratuit</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>
        ) : entreprises.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Aucune entreprise trouvée</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Secteur</th>
                  <th>Plan</th>
                  <th>Statut</th>
                  <th>Utilisateurs</th>
                  <th>Produits</th>
                  <th>Inscrit le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entreprises.map(e => {
                  const p = planCfg[e.abonnement?.plan]    || planCfg.gratuit;
                  const s = statutCfg[e.abonnement?.statut] || statutCfg.actif;
                  return (
                    <tr key={e._id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                            {SECTEUR_EMOJI[e.secteur] || '📦'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{e.nom}</p>
                            <p className="text-xs text-slate-400">{e.contact?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="capitalize text-slate-500">{e.secteur}</td>
                      <td><span className={`badge ${p.cls}`}>{p.label}</span></td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>{e.stats?.users || 0}</td>
                      <td>{e.stats?.produits || 0}</td>
                      <td className="text-xs text-slate-400">{formatDate(e.createdAt)}</td>
                      <td>
                        <div className="flex gap-2">
                          {/* Changer plan */}
                          <button className="btn-icon text-slate-400 hover:text-indigo-600" title="Gérer plan"
                            onClick={() => setPlanModal(e)}>
                            <CreditCard size={15} />
                          </button>
                          {/* Activer/désactiver */}
                          <button className={`btn-icon ${e.actif ? 'text-emerald-500 hover:text-red-500' : 'text-slate-400 hover:text-emerald-500'}`}
                            title={e.actif ? 'Désactiver' : 'Activer'}
                            onClick={() => toggleMut.mutate(e._id)}
                            disabled={toggleMut.isPending}>
                            {e.actif ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal plan */}
      {planModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPlanModal(null)}>
          <div className="modal max-w-sm">
            <div className="modal-header">
              <h3 className="font-bold">Modifier le plan — {planModal.nom}</h3>
            </div>
            <div className="modal-body space-y-3">
              {['gratuit','pro','enterprise'].map(plan => (
                <button key={plan}
                  onClick={() => planMut.mutate({ id: planModal._id, plan, statut: 'actif' })}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-left transition-all hover:border-indigo-400 ${
                    planModal.abonnement?.plan === plan ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100'
                  }`}>
                  <span className={`badge ${planCfg[plan].cls} mb-1`}>{planCfg[plan].label}</span>
                  <p className="text-xs text-slate-500 mt-1">
                    { plan === 'gratuit'    ? '50 produits · 2 utilisateurs'          : '' }
                    { plan === 'pro'        ? 'Illimité · 10 utilisateurs · Stats'    : '' }
                    { plan === 'enterprise' ? 'Illimité · Équipe illimitée · API'     : '' }
                  </p>
                </button>
              ))}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">Statut abonnement</p>
                <div className="flex gap-2">
                  {['actif','suspendu'].map(st => (
                    <button key={st}
                      onClick={() => planMut.mutate({ id: planModal._id, plan: planModal.abonnement?.plan, statut: st })}
                      className={`btn btn-sm ${st === planModal.abonnement?.statut ? 'btn-primary' : 'btn-secondary'}`}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPlanModal(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
