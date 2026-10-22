import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCircle, Save, Check, KeyRound, Eye, EyeOff, LogOut, ShieldCheck, Mail, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { fmtDate, inputCls } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

const ROLES = {
  admin:        { label: 'Administrateur', cls: 'bg-indigo-50 text-indigo-600' },
  gestionnaire: { label: 'Gestionnaire',   cls: 'bg-emerald-50 text-emerald-600' },
  lecteur:      { label: 'Lecteur',        cls: 'bg-slate-100 text-slate-600' },
};

// Force indicative du mot de passe (0 à 4) : longueur, majuscules + minuscules, chiffres, symboles.
const FORCE = [
  { label: 'Très faible', cls: 'bg-red-500',    texte: 'text-red-500' },
  { label: 'Faible',      cls: 'bg-orange-500', texte: 'text-orange-500' },
  { label: 'Moyen',       cls: 'bg-amber-400',  texte: 'text-amber-500' },
  { label: 'Bon',         cls: 'bg-lime-500',   texte: 'text-lime-600' },
  { label: 'Fort',        cls: 'bg-green-500',  texte: 'text-green-600' },
];
const forceMotDePasse = (m) => {
  let n = 0;
  if (m.length >= 8) n++;
  if (m.length >= 12) n++;
  if (/[a-z]/.test(m) && /[A-Z]/.test(m)) n++;
  if (/\d/.test(m)) n++;
  if (/[^A-Za-z0-9]/.test(m)) n++;
  return Math.min(n, 4);
};

// ─── Profil ──────────────────────────────────────────────────────────────────
function CarteProfil() {
  const { user, majSession } = useAuth();
  const qc = useQueryClient();
  const [nom, setNom] = useState(user?.nom || '');
  const [saved, setSaved] = useState(false);

  const { data: moi } = useQuery({
    queryKey: ['moi'],
    queryFn:  () => api.get('/auth/moi').then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: () => api.put('/auth/moi', { nom: nom.trim() }).then(r => r.data.data),
    onSuccess: (data) => {
      majSession({ ...user, ...data });
      qc.invalidateQueries({ queryKey: ['moi'] });
      setSaved(true);
      toast.success('Nom mis à jour ✓');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la mise à jour'),
  });

  const role = ROLES[user?.role] || ROLES.lecteur;
  const nomValide = nom.trim().length >= 2 && nom.trim().length <= 60;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white font-syne font-bold text-2xl shadow-md shadow-indigo-200 flex-shrink-0">
          {(user?.nom || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-syne text-lg font-bold text-slate-900 truncate">{user?.nom}</p>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1 ${role.cls}`}>
            <ShieldCheck size={11}/> {role.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Votre nom</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className={inputCls} maxLength={60} value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom"/>
            <button onClick={() => mutation.mutate()} disabled={!nomValide || nom.trim() === user?.nom || mutation.isPending}
              className={`btn flex-shrink-0 justify-center ${saved ? 'bg-green-500 text-white' : 'btn-primary'}`}>
              {mutation.isPending ? 'Enregistrement…' : saved ? <><Check size={15}/> Enregistré</> : <><Save size={15}/> Enregistrer</>}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Mail size={12}/> Adresse email</label>
          <input className={`${inputCls} !bg-slate-50 text-slate-500`} value={user?.email || ''} readOnly disabled/>
          <p className="text-[11px] text-slate-400">Pour changer d'adresse, demandez à l'administrateur.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Clock size={12}/> Dernière connexion</label>
          <input className={`${inputCls} !bg-slate-50 text-slate-500`} value={moi?.derniereConnexion ? fmtDate(moi.derniereConnexion) : '—'} readOnly disabled/>
        </div>
      </div>
    </div>
  );
}

// ─── Mot de passe ────────────────────────────────────────────────────────────
function CarteMotDePasse() {
  const { user, majSession } = useAuth();
  const [actuel, setActuel]       = useState('');
  const [nouveau, setNouveau]     = useState('');
  const [confirmation, setConf]   = useState('');
  const [visible, setVisible]     = useState(false);
  const [erreurActuel, setErreurActuel] = useState('');

  const force = forceMotDePasse(nouveau);
  const longueurOk   = nouveau.length >= 8 && nouveau.length <= 72;
  const identiques   = nouveau === confirmation;
  const different    = nouveau !== actuel;
  const pret = !!actuel && longueurOk && identiques && different;

  const mutation = useMutation({
    mutationFn: () => api.patch('/auth/mot-de-passe', { motDePasseActuel: actuel, nouveauMotDePasse: nouveau }),
    onSuccess: (res) => {
      majSession({ ...user, ...res.data.data }, res.data.token);
      setActuel(''); setNouveau(''); setConf(''); setErreurActuel('');
      toast.success('Mot de passe mis à jour ✓ Vos autres appareils sont déconnectés.', { duration: 6000 });
    },
    onError: (e) => {
      const msg = e.response?.data?.message || 'Erreur lors du changement de mot de passe';
      if (/actuel incorrect/i.test(msg)) setErreurActuel('Mot de passe actuel incorrect.');
      else toast.error(msg);
    },
  });

  const champ = (id, label, valeur, set, auto, extra) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} autoComplete={auto} className={`${inputCls} pr-11 ${extra || ''}`}
          value={valeur} maxLength={72} onChange={e => { set(e.target.value); if (id === 'mdp-actuel') setErreurActuel(''); }}/>
        {id === 'mdp-actuel' && (
          <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            {visible ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (pret && !mutation.isPending) mutation.mutate(); }} className="flex flex-col gap-4">
      {champ('mdp-actuel', 'Mot de passe actuel', actuel, setActuel, 'current-password', erreurActuel ? '!border-red-300' : '')}
      {erreurActuel && <p className="text-xs text-red-500 -mt-2">{erreurActuel}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {champ('mdp-nouveau', 'Nouveau mot de passe', nouveau, setNouveau, 'new-password')}
          {nouveau && (
            <div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < force || (force === 0 && i === 0) ? FORCE[force].cls : 'bg-slate-200'}`}/>
                ))}
              </div>
              <p className={`text-[11px] font-semibold mt-1 ${FORCE[force].texte}`}>{FORCE[force].label}</p>
            </div>
          )}
          {nouveau && !longueurOk && <p className="text-xs text-red-500">Entre 8 et 72 caractères.</p>}
          {nouveau && actuel && !different && <p className="text-xs text-red-500">Doit être différent de l'ancien.</p>}
        </div>
        <div className="flex flex-col gap-2">
          {champ('mdp-confirmation', 'Confirmer le nouveau mot de passe', confirmation, setConf, 'new-password')}
          {confirmation && !identiques && <p className="text-xs text-red-500">Les deux mots de passe ne sont pas identiques.</p>}
        </div>
      </div>

      <p className="text-xs text-slate-400">Après le changement, vos autres appareils seront déconnectés. Celui-ci reste connecté.</p>

      <div className="flex justify-end">
        <button type="submit" disabled={!pret || mutation.isPending} className="btn-primary shadow-md shadow-indigo-200 w-full sm:w-auto justify-center">
          {mutation.isPending ? 'Modification…' : <><KeyRound size={15}/> Changer le mot de passe</>}
        </button>
      </div>
    </form>
  );
}

// ─── Contenu réutilisable (page « Mon compte » et onglet de Paramètres) ───────────
// `entete` : titre propre au contenu, utile dans l'onglet de Paramètres ; la page a déjà le sien.
export function ContenuCompte({ entete = true }) {
  const { deconnexion } = useAuth();
  const section = (titre, sousTitre, enfant) => (
    <section className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="font-syne text-base font-bold text-slate-900">{titre}</h3>
      <p className="text-xs text-slate-400 mt-0.5 mb-4">{sousTitre}</p>
      {enfant}
    </section>
  );
  return (
    <div className="flex flex-col gap-5">
      {entete && (
        <div>
          <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Mon compte</h2>
          <p className="text-sm text-slate-400">Vos informations personnelles et votre sécurité</p>
        </div>
      )}
      {section('Profil', 'Comment vous apparaissez dans l\'application', <CarteProfil />)}
      {section('Mot de passe', 'Choisissez un mot de passe que vous n\'utilisez nulle part ailleurs', <CarteMotDePasse />)}
      <div className="flex justify-end">
        <button onClick={() => { deconnexion(); window.location.href = '/connexion'; }}
          className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 w-full sm:w-auto justify-center">
          <LogOut size={15}/> Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MonCompte() {
  return (
    <div className="min-h-screen bg-slate-100 p-5 lg:p-7">
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
          <UserCircle size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="font-syne text-2xl font-bold text-slate-900 tracking-tight">Mon compte</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gérez votre profil et votre mot de passe</p>
        </div>
      </div>
      <div className="max-w-2xl animate-fade-up-2">
        <ContenuCompte entete={false} />
      </div>
    </div>
  );
}
