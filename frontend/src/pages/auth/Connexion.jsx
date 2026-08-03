import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function Connexion() {
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', motDePasse: '' });
  const [showMdp, setShowMdp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const utilisateur = await connexion(form.email, form.motDePasse);
      toast.success(`Bienvenue, ${utilisateur.nom} !`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">StockBTP</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion de stock BTP</p>
        </div>

        {/* Card */}
        <div className="card p-7 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Adresse email</label>
              <input type="email" className="input" placeholder="vous@exemple.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label className="label">Mot de passe</label>
              <div className="relative">
                <input type={showMdp ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••"
                  value={form.motDePasse} onChange={e => setForm(f => ({ ...f, motDePasse: e.target.value }))} required />
                <button type="button" onClick={() => setShowMdp(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showMdp ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : null}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
