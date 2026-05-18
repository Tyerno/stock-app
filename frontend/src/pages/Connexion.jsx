import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Lock, Mail, ArrowRight, Package, BarChart2, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Connexion() {
  const navigate = useNavigate();
  const { connexion } = useAuth();
  const [form, setForm]       = useState({ email: '', motDePasse: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.email || !form.motDePasse) return setError('Veuillez remplir tous les champs');
    setLoading(true);
    setError('');
    try {
      await connexion(form.email, form.motDePasse);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { Icon: Package,  label: 'Gestion de stock en temps réel' },
    { Icon: BarChart2,label: 'Statistiques et rapports avancés' },
    { Icon: Brain,    label: 'Prévisions par Intelligence Artificielle' },
  ];

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — Branding ── */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 flex-col justify-between p-12 relative overflow-hidden">

        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"/>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-600/5 blur-2xl"/>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={18} className="text-white"/>
          </div>
          <div>
            <p className="font-syne text-xl font-bold text-white">StockBTP</p>
            <p className="text-xs text-gray-500">Gestion de stock intelligente</p>
          </div>
        </div>

        {/* Contenu central */}
        <div className="relative">
          <h1 className="font-syne text-4xl font-bold text-white leading-tight mb-4">
            Votre stock,<br/>
            <span className="text-gradient-brand">sous contrôle.</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-10">
            Gérez votre boutique de matériaux de construction avec précision.
            Ventes, stocks, prévisions — tout en un.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-4">
            {features.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-blue-400"/>
                </div>
                <span className="text-sm text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs text-gray-600">© 2026 StockBTP — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Panneau droit — Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-blue-200">
            <Zap size={16} className="text-white"/>
          </div>
          <p className="font-syne text-lg font-bold text-gray-900">StockBTP</p>
        </div>

        <div className="w-full max-w-sm">

          {/* Titre */}
          <div className="mb-8">
            <h2 className="font-syne text-2xl font-bold text-gray-900 mb-1">Bon retour 👋</h2>
            <p className="text-sm text-gray-400">Connectez-vous à votre espace de gestion</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Adresse email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="votre@email.com"
                  className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 shadow-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.motDePasse}
                  onChange={e => setForm(f => ({ ...f, motDePasse: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-2xl pl-10 pr-11 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300 shadow-sm"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl animate-fade-up">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"/>
                {error}
              </div>
            )}

            {/* Bouton */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl gradient-brand text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 active:scale-95 mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Connexion en cours…</>
              ) : (
                <>Se connecter <ArrowRight size={16}/></>
              )}
            </button>
          </form>

          {/* Identifiants démo */}
          <div className="mt-8 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Compte de démonstration</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Email</span>
                <button onClick={() => setForm(f => ({ ...f, email:'admin@stock.com' }))}
                  className="font-mono font-semibold text-blue-600 hover:underline">
                  admin@stock.com
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Mot de passe</span>
                <button onClick={() => setForm(f => ({ ...f, motDePasse:'admin123' }))}
                  className="font-mono font-semibold text-blue-600 hover:underline">
                  admin123
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            StockBTP — Matériaux de construction · Conakry
          </p>
        </div>
      </div>
    </div>
  );
}
