import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, UserX, Loader, X, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, roleLabel, roleBadgeCls } from '../../utils/format';

const ROLES = [
  { value: 'admin',        label: 'Administrateur',  desc: 'Accès complet' },
  { value: 'gestionnaire', label: 'Gestionnaire',    desc: 'Produits, ventes, stock' },
  { value: 'lecteur',      label: 'Lecteur',         desc: 'Consultation uniquement' },
];

function UserModal({ initial, onClose, onSubmit, loading }) {
  const [form, setForm] = useState(initial || { nom: '', email: '', motDePasse: '', role: 'gestionnaire' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="font-bold text-slate-900">{initial ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label className="label">Nom complet</label>
              <input className="input" value={form.nom} onChange={set('nom')} placeholder="Prénom Nom" required />
            </div>
            <div className="form-group col-span-2">
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="email@exemple.com" required />
            </div>
            {!initial && (
              <div className="form-group col-span-2">
                <label className="label">Mot de passe</label>
                <input type="password" className="input" value={form.motDePasse} onChange={set('motDePasse')} placeholder="Laisser vide = Bienvenue123!" />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="label">Rôle</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.role === r.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                    onChange={set('role')} className="hidden" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    form.role === r.value ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                  }`}>
                    {form.role === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{r.label}</p>
                    <p className="text-xs text-slate-400">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={loading} onClick={() => onSubmit(form)}>
            {loading && <Loader size={14} className="animate-spin" />}
            {initial ? 'Mettre à jour' : 'Créer l\'utilisateur'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Utilisateurs() {
  const { user: moi } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['utilisateurs'],
    queryFn:  () => api.get('/utilisateurs').then(r => r.data.data),
  });

  const creerMut = useMutation({
    mutationFn: b => api.post('/utilisateurs', b),
    onSuccess: () => { qc.invalidateQueries(['utilisateurs']); toast.success('Utilisateur créé !'); setModal(null); },
    onError:   e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const modifMut = useMutation({
    mutationFn: ({ id, b }) => api.put(`/utilisateurs/${id}`, b),
    onSuccess: () => { qc.invalidateQueries(['utilisateurs']); toast.success('Mis à jour'); setModal(null); },
    onError:   e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const suppMut = useMutation({
    mutationFn: id => api.delete(`/utilisateurs/${id}`),
    onSuccess: () => { qc.invalidateQueries(['utilisateurs']); toast.success('Utilisateur désactivé'); setConfirm(null); },
    onError:   e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const utilisateurs = data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">{utilisateurs.length} membre(s) dans votre équipe</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('creer')}>
          <Plus size={16} /> Inviter un utilisateur
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-12 text-center"><Loader size={24} className="animate-spin text-indigo-500 mx-auto" /></div>
        ) : utilisateurs.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">Aucun utilisateur encore</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {utilisateurs.map(u => (
              <div key={u._id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {u.nom?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{u.nom}</p>
                    {u._id === moi?._id && <span className="text-[10px] badge badge-blue">Vous</span>}
                  </div>
                  <p className="text-sm text-slate-400">{u.email}</p>
                </div>
                <span className={`badge ${roleBadgeCls(u.role)}`}>{roleLabel(u.role)}</span>
                <span className={`badge ${u.actif ? 'badge-green' : 'badge-gray'}`}>{u.actif ? 'Actif' : 'Inactif'}</span>
                <p className="text-xs text-slate-400 hidden sm:block">Depuis {formatDate(u.createdAt)}</p>
                {u._id !== moi?._id && (
                  <div className="flex gap-1">
                    <button className="btn-icon text-slate-400 hover:text-indigo-600" onClick={() => setModal(u)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon text-slate-400 hover:text-red-500" onClick={() => setConfirm(u)}>
                      <UserX size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <UserModal
          initial={modal !== 'creer' ? modal : null}
          onClose={() => setModal(null)}
          loading={creerMut.isPending || modifMut.isPending}
          onSubmit={b => modal === 'creer'
            ? creerMut.mutate(b)
            : modifMut.mutate({ id: modal._id, b })
          }
        />
      )}

      {confirm && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="modal-body text-center py-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <UserX size={20} className="text-red-500" />
              </div>
              <p className="font-bold text-slate-900 mb-1">Désactiver {confirm.nom} ?</p>
              <p className="text-sm text-slate-500">Il ne pourra plus accéder à l'application.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => suppMut.mutate(confirm._id)} disabled={suppMut.isPending}>
                {suppMut.isPending && <Loader size={14} className="animate-spin" />} Désactiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
