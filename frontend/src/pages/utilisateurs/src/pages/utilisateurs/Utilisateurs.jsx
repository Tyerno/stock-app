import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserCheck, UserX, KeyRound, Eye, EyeOff, Users, WifiOff, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { inputCls } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import { CenteredSpinner } from '../../components/ui/LoadingState';

const ROLES = [
  { value:'admin',        label:'Administrateur', desc:'Accès complet',               color:'bg-violet-100 text-violet-700' },
  { value:'gestionnaire', label:'Gestionnaire',   desc:'Gestion produits et ventes',  color:'bg-indigo-100 text-indigo-700' },
  { value:'lecteur',      label:'Lecteur',         desc:'Consultation uniquement',     color:'bg-slate-100 text-slate-600' },
];

function RoleBadge({ role }) {
  const r = ROLES.find(r => r.value === role);
  return <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${r?.color}`}>{r?.label}</span>;
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
    <Modal
      open
      onClose={onClose}
      icon={Users}
      title={isEdit ? 'Modifier le compte' : 'Nouveau compte'}
      subtitle={isEdit ? user.nom : 'Créer un accès employé'}
      footer={<>
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </>}>

      <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500">Nom complet *</label>
        <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Jean Dupont"/>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500">Adresse email *</label>
        <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@boutique.com"/>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Mot de passe *</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className={inputCls + ' pr-10'}
              value={form.motDePasse} onChange={e => set('motDePasse', e.target.value)} placeholder="Minimum 6 caractères"/>
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-500">Rôle *</label>
        {ROLES.map(r => (
          <div key={r.value} onClick={() => set('role', r.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.role === r.value ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.role === r.value ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
              {form.role === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{r.label}</p>
              <p className="text-xs text-slate-400">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
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
    <Modal
      open
      onClose={onClose}
      icon={KeyRound}
      title="Changer le mot de passe"
      subtitle={user.nom}
      size="sm"
      footer={<>
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={valider} disabled={mutation.isPending}
          className="btn bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200">
          {mutation.isPending ? '…' : 'Changer'}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500">Nouveau mot de passe</label>
        <div className="relative">
          <input type={showPwd ? 'text' : 'password'} className={inputCls + ' pr-10'}
            value={form.motDePasse} onChange={e => setForm(f => ({ ...f, motDePasse: e.target.value }))} placeholder="Minimum 6 caractères"/>
          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500">Confirmer</label>
        <input type="password" className={inputCls}
          value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Répétez le mot de passe"/>
      </div>
      </div>
    </Modal>
  );
}

export default function Utilisateurs() {
  const { user: moi } = useAuth();
  const qc = useQueryClient();
  const [modaleF, setModaleF]     = useState(null);
  const [modalePwd, setModalePwd] = useState(null);
  const [aDesactiver, setADesactiver] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['utilisateurs'],
    queryFn:  () => api.get('/utilisateurs').then(r => r.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/utilisateurs/${id}/toggle`),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey:['utilisateurs'] }); toast.success(r.data.message); setADesactiver(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const demanderToggle = (u) => {
    if (u.actif) setADesactiver(u);        // désactivation → confirmation
    else toggleMutation.mutate(u._id);      // réactivation → immédiat
  };

  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <Users size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Utilisateurs</h1>
            <p className="text-sm text-slate-400 mt-0.5">Gérez les comptes de vos employés</p>
          </div>
        </div>
        <button onClick={() => setModaleF({})} className="btn-primary shadow-lg shadow-indigo-200 active:scale-95 w-full sm:w-auto justify-center">
          <Plus size={15}/> Nouveau compte
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 animate-fade-up-2">
        {[
          { label:'Total comptes', value:data?.length || 0,                       color:'text-indigo-600', bg:'bg-indigo-50', border:'border-l-indigo-500', Icon:Users },
          { label:'Actifs',        value:data?.filter(u => u.actif).length || 0,  color:'text-green-600',  bg:'bg-green-50',  border:'border-l-green-500',  Icon:UserCheck },
          { label:'Désactivés',    value:data?.filter(u => !u.actif).length || 0, color:'text-red-500',    bg:'bg-red-50',    border:'border-l-red-500',    Icon:UserX },
        ].map((s, i) => (
          <div key={s.label} className={`card-neu border-l-4 ${s.border} p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 animate-fade-up-${i+1}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.Icon size={16} className={s.color}/>
              </div>
            </div>
            <p className={`font-syne text-2xl font-bold ${s.color} leading-none`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contenu */}
      {isLoading ? (
        <CenteredSpinner />
      ) : isError ? (
        <div className="card-neu">
          <EmptyState
            icon={WifiOff}
            title="Impossible de charger les utilisateurs"
            description="Une erreur est survenue lors du chargement. Vérifiez votre connexion et réessayez."
          />
        </div>
      ) : (data?.length || 0) === 0 ? (
        <div className="card-neu">
          <EmptyState icon={Users} title="Aucun utilisateur" description="Créez le premier compte employé." />
        </div>
      ) : (
        <>
          {/* Vue carte — mobile */}
          <div className="sm:hidden flex flex-col gap-3 animate-fade-up-3">
            {data.map(u => (
              <div key={u._id} className="card-neu p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {u.nom?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.nom}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><Mail size={10}/> {u.email}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${u.actif ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {u.actif ? '● Actif' : '● Désactivé'}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={u.role}/>
                    {u._id === moi?._id && <span className="text-[10px] text-indigo-500 font-medium">C'est vous</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModaleF(u)} title="Modifier"
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Pencil size={15}/></button>
                    <button onClick={() => setModalePwd(u)} title="Changer mot de passe"
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><KeyRound size={15}/></button>
                    {u._id !== moi?._id && (
                      <button onClick={() => demanderToggle(u)} title={u.actif ? 'Désactiver' : 'Activer'}
                        className={`p-2 rounded-lg transition-all ${u.actif ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                        {u.actif ? <UserX size={15}/> : <UserCheck size={15}/>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau — tablette / desktop */}
          <div className="hidden sm:block animate-fade-up-3">
            <Table columns={['Employé','Email','Rôle','Statut','Dernière connexion', { label: 'Actions', align: 'right' }]}>
              {data.map(u => (
                <tr key={u._id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {u.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{u.nom}</p>
                        {u._id === moi?._id && <p className="text-[10px] text-indigo-500 font-medium">C'est vous</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-slate-500">{u.email}</td>
                  <td><RoleBadge role={u.role}/></td>
                  <td>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${u.actif ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {u.actif ? '● Actif' : '● Désactivé'}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400">
                    {u.derniereConnexion ? new Date(u.derniereConnexion).toLocaleDateString('fr-FR') : 'Jamais'}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModaleF(u)} title="Modifier"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Pencil size={14}/></button>
                      <button onClick={() => setModalePwd(u)} title="Changer mot de passe"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><KeyRound size={14}/></button>
                      {u._id !== moi?._id && (
                        <button onClick={() => demanderToggle(u)} title={u.actif ? 'Désactiver' : 'Activer'}
                          className={`p-1.5 rounded-lg transition-all ${u.actif ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                          {u.actif ? <UserX size={14}/> : <UserCheck size={14}/>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      )}

      {modaleF !== null && <ModaleUtilisateur user={modaleF._id ? modaleF : null} onClose={() => setModaleF(null)}/>}
      {modalePwd && <ModaleMotDePasse user={modalePwd} onClose={() => setModalePwd(null)}/>}

      <ConfirmDialog
        open={!!aDesactiver}
        onClose={() => setADesactiver(null)}
        onConfirm={() => toggleMutation.mutate(aDesactiver._id)}
        title={aDesactiver ? `Désactiver le compte de ${aDesactiver.nom} ?` : ''}
        message="Cette personne ne pourra plus se connecter à l'application tant que le compte n'est pas réactivé."
        confirmLabel="Désactiver"
        danger
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
