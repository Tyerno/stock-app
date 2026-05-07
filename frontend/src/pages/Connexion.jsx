import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Connexion() {
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: 'admin@stock.com', motDePasse: 'admin123' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await connexion(form.email, form.motDePasse);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300";

  return (
    <div className="min-h-screen flex">
      {/* Panel gauche décoratif */}
      <div className="hidden lg:flex w-1/2 bg-gray-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }} />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/40" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="font-syne text-3xl font-bold text-white mb-3">StockBTP</h1>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Gérez votre stock de matériaux de construction avec simplicité et efficacité.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { label: 'Produits',     value: '142',     color: '#3B82F6' },
              { label: 'Ventes/mois',  value: '89',      color: '#6366F1' },
              { label: 'Valeur stock', value: '48M GNF', color: '#10B981' },
              { label: 'Alertes',      value: '3',       color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} className="bg-gray-700/50 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="font-syne text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel droit */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200" style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
              <Zap size={20} className="text-white"/>
            </div>
            <h1 className="font-syne text-xl font-bold text-gray-900">StockBTP</h1>
          </div>

          <h2 className="font-syne text-2xl font-bold text-gray-900 mb-1">Bon retour 👋</h2>
          <p className="text-sm text-gray-400 mb-8">Connectez-vous à votre espace de gestion</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Adresse email</label>
              <input type="email" className={inputCls} value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="email"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Mot de passe</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} className={inputCls + ' pr-10'} value={form.motDePasse}
                  onChange={e => setForm(f => ({ ...f, motDePasse: e.target.value }))} required autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Connexion…</>
              ) : (
                <>Se connecter <ArrowRight size={15}/></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400">Compte démo</p>
            <p className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">admin@stock.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
