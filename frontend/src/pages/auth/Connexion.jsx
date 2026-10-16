import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/auth/AuthShell';

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
    <AuthShell>
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
          <div className="text-right mt-1.5">
            <Link to="/mot-de-passe-oublie" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
          {loading ? <Loader size={16} className="animate-spin" /> : null}
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthShell>
  );
}
