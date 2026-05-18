import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Loader, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const SECTEURS = [
  { value: 'boutique',      label: '🛍  Boutique' },
  { value: 'quincaillerie', label: '🔧 Quincaillerie' },
  { value: 'pharmacie',     label: '💊 Pharmacie' },
  { value: 'alimentation',  label: '🥗 Alimentation' },
  { value: 'btp',           label: '🏗  BTP / Construction' },
  { value: 'electronique',  label: '📱 Électronique' },
  { value: 'autre',         label: '📦 Autre' },
];

export default function Inscription() {
  const { inscription } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nomEntreprise: '', secteur: 'boutique',
    nom: '', email: '', motDePasse: '', confirmer: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.motDePasse !== form.confirmer)
      return toast.error('Les mots de passe ne correspondent pas');
    if (form.motDePasse.length < 6)
      return toast.error('Mot de passe : 6 caractères minimum');

    setLoading(true);
    try {
      await inscription(form);
      toast.success('Compte créé ! Bienvenue 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Créer votre espace</h1>
          <p className="text-slate-500 text-sm mt-1">Gratuit · Sans carte bancaire · En 2 minutes</p>
        </div>

        <div className="card p-7 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Entreprise */}
            <div className="p-4 bg-indigo-50 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                <Building2 size={15} />
                <span>Votre entreprise</span>
              </div>
              <div className="form-group">
                <label className="label">Nom de l'entreprise</label>
                <input className="input bg-white" placeholder="Ex: Quincaillerie Alpha" value={form.nomEntreprise} onChange={set('nomEntreprise')} required />
              </div>
              <div className="form-group">
                <label className="label">Secteur d'activité</label>
                <select className="input bg-white" value={form.secteur} onChange={set('secteur')}>
                  {SECTEURS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Admin */}
            <div className="space-y-4">
              <p className="font-semibold text-sm text-slate-600">Votre compte administrateur</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Prénom & Nom</label>
                  <input className="input" placeholder="Ibrahima Sow" value={form.nom} onChange={set('nom')} required />
                </div>
                <div className="form-group">
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="vous@exemple.com" value={form.email} onChange={set('email')} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Mot de passe</label>
                  <input type="password" className="input" placeholder="6 caractères min." value={form.motDePasse} onChange={set('motDePasse')} required />
                </div>
                <div className="form-group">
                  <label className="label">Confirmer</label>
                  <input type="password" className="input" placeholder="Répéter" value={form.confirmer} onChange={set('confirmer')} required />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : null}
              {loading ? 'Création…' : 'Créer mon espace gratuitement'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Déjà un compte ?{' '}
            <Link to="/connexion" className="text-indigo-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-500">
          {[['📦','Gestion stock'],['💰','Caisse & ventes'],['📊','Tableaux de bord']].map(([emoji, label]) => (
            <div key={label} className="bg-white/70 rounded-xl p-3">
              <div className="text-xl mb-1">{emoji}</div>
              <div className="font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
