import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, X, UserCheck, UserX, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const inputCls = "w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300";

const ROLES = [
  { value:'admin',        label:'Administrateur', desc:'Accès complet',               color:'bg-violet-100 text-violet-700' },
  { value:'gestionnaire', label:'Gestionnaire',   desc:'Gestion produits et ventes',  color:'bg-blue-100 text-blue-700' },
  { value:'lecteur',      label:'Lecteur',         desc:'Consultation uniquement',     color:'bg-gray-100 text-gray-600' },
];

function RoleBadge({ role }) {
  const r = ROLES.find(r => r.value === role);
  return <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${r?.color}`}>{r?.label}</span>;
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-syne font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><X size={15}/></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

function ModaleUtilisateur({ user, onClose }) {
  const qc     = useQueryClient();
  const isEdit = !!user?._id;
  const [form, setForm]     = useState({ nom:user?.nom||'', email:user?.email||'', motDePasse:'', role:user?.role||'gestionnaire' });
  const [showPwd, setShowPwd] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/utilisateurs/${user._id}`, d) : api.post('/utilisateurs', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['utilisateurs'] });
      toast.success(isEdit ? 'Compte mis à jour ✓' : 'Compte créé ✓');
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal title={isEdit ? 'Modifier le compte' : 'Nouveau compte'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Annuler</button>
        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
          className="px-5 py-2 rounded-xl text-sm font-semibold gradient-brand text-white hover:opacity-90 transition-all shadow-md shadow-blue-200 disabled:opacity-50">
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </>}>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500">Nom complet *</label>
        <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Jean Dupont"/>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500">Adresse email *</label>
        <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@boutique.com"/>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">Mot de passe *</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className={inputCls + ' pr-10'}
              value={form.motDePasse} onChange={e => set('motDePasse', e.target.value)} placeholder="Minimum 6 caractères"/>
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-500">Rôle *</label>
        {ROLES.map(r => (
          <div key={r.value} onClick={() => set('role', r.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.role === r.value ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.role === r.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
              {form.role === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{r.label}</p>
              <p className="text-xs text-gray-400">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ModaleMotDePasse({ user, onClose }) {
  const [form, setForm]     = useState({ motDePasse:'', confirm:'' });
  const [showPwd, setShowPwd] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/utilisateurs/${user._id}/mot-de-passe`, { motDePasse: form.motDePasse }),
    onSuccess: () => { toast.success('Mot de passe mis à jour ✓'); onClose(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const valider = () => {
    if (form.motDePasse.length < 6) return toast.error('Minimum 6 caractères');
    if (form.motDePasse !== form.confirm) return toast.error('Les mots de passe ne correspondent pas');
    mutation.mutate();
  };

  return (
    <Modal title={`Changer le mot de passe — ${user.nom}`} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Annuler</button>
        <button onClick={valider} disabled={mutation.isPending}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-md shadow-amber-200 disabled:opacity-50">
          {mutation.isPending ? '…' : 'Changer'}
        </button>
      </>}>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500">Nouveau mot de passe</label>
        <div className="relative">
          <input type={showPwd ? 'text' : 'password'} className={inputCls + ' pr-10'}
            value={form.motDePasse} onChange={e => setForm(f => ({ ...f, motDePasse: e.target.value }))} placeholder="Minimum 6 caractères"/>
          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500">Confirmer</label>
        <input type="password" className={inputCls}
          value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Répétez le mot de passe"/>
      </div>
    </Modal>
  );
}

export default function Utilisateurs() {
  const { user: moi } = useAuth();
  const qc = useQueryClient();
  const [modaleF, setModaleF]     = useState(null);
  const [modalePwd, setModalePwd] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['utilisateurs'],
    queryFn:  () => api.get('/utilisateurs').then(r => r.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/utilisateurs/${id}/toggle`),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey:['utilisateurs'] }); toast.success(r.data.message); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <div className="min-h-screen bg-gray-100 p-5 lg:p-7">
      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="font-syne text-xl font-bold text-gray-900 tracking-tight">Utilisateurs</h1>
          <p className="text-sm text-gray-400 mt-1">Gérez les comptes de vos employés</p>
        </div>
        <button onClick={() => setModaleF({})}
          className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-200 hover:opacity-90 active:scale-95">
          <Plus size={15}/> Nouveau compte
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:'Total comptes',  value:data?.length || 0,                        color:'text-blue-600'  },
          { label:'Actifs',         value:data?.filter(u => u.actif).length || 0,   color:'text-green-600' },
          { label:'Désactivés',     value:data?.filter(u => !u.actif).length || 0,  color:'text-red-500'   },
        ].map(s => (
          <div key={s.label} className="card-neu p-4 text-center">
            <p className={`font-syne text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="card-neu overflow-hidden animate-fade-up-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Employé','Email','Rôle','Statut','Dernière connexion',''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.map(u => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {u.nom?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{u.nom}</p>
                          {u._id === moi?._id && <p className="text-[10px] text-blue-500 font-medium">C'est vous</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role}/></td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${u.actif ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {u.actif ? '● Actif' : '● Désactivé'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {u.derniereConnexion ? new Date(u.derniereConnexion).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModaleF(u)} title="Modifier"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                        <button onClick={() => setModalePwd(u)} title="Changer mot de passe"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><KeyRound size={14}/></button>
                        {u._id !== moi?._id && (
                          <button onClick={() => toggleMutation.mutate(u._id)} title={u.actif ? 'Désactiver' : 'Activer'}
                            className={`p-1.5 rounded-lg transition-all ${u.actif ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                            {u.actif ? <UserX size={14}/> : <UserCheck size={14}/>}
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

      {modaleF !== null && <ModaleUtilisateur user={modaleF._id ? modaleF : null} onClose={() => setModaleF(null)}/>}
      {modalePwd && <ModaleMotDePasse user={modalePwd} onClose={() => setModalePwd(null)}/>}
    </div>
  );
}
