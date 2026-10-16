import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Loader, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import AuthShell from '../../components/auth/AuthShell';

export default function ReinitialiserMotDePasse() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const [mdp, setMdp]             = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showMdp, setShowMdp]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [lienInvalide, setLienInvalide] = useState(false);

  const tropCourt = mdp.length > 0 && mdp.length < 8;
  const differents = confirmation.length > 0 && mdp !== confirmation;
  const valide     = mdp.length >= 8 && mdp === confirmation;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setLoading(true);
    try {
      await api.post(`/auth/reinitialiser-mot-de-passe/${encodeURIComponent(token)}`, { motDePasse: mdp });
      toast.success('Mot de passe mis à jour. Connectez-vous.');
      navigate('/connexion', { replace: true });
    } catch (err) {
      if (err.response?.status === 400 && /lien/i.test(err.response?.data?.message || '')) setLienInvalide(true);
      else toast.error(err.response?.data?.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (lienInvalide) {
    return (
      <AuthShell>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Lien invalide ou expiré</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Ce lien n'est plus valable (il expire après 30 minutes et ne sert qu'une seule fois). Refaites une demande pour en recevoir un nouveau.
          </p>
          <Link to="/mot-de-passe-oublie" className="btn-primary w-full justify-center mt-6">Refaire une demande</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Nouveau mot de passe</h2>
          <p className="text-sm text-slate-500 mt-1">Choisissez un mot de passe d'au moins 8 caractères.</p>
        </div>

        <div className="form-group">
          <label className="label">Nouveau mot de passe</label>
          <div className="relative">
            <input type={showMdp ? 'text' : 'password'} className="input pr-10" autoFocus autoComplete="new-password"
              value={mdp} onChange={e => setMdp(e.target.value)} required />
            <button type="button" onClick={() => setShowMdp(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showMdp ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {tropCourt && <p className="text-xs text-red-500 mt-1">Au moins 8 caractères.</p>}
        </div>

        <div className="form-group">
          <label className="label">Confirmer le mot de passe</label>
          <input type={showMdp ? 'text' : 'password'} className="input" autoComplete="new-password"
            value={confirmation} onChange={e => setConfirmation(e.target.value)} required />
          {differents && <p className="text-xs text-red-500 mt-1">Les deux mots de passe ne sont pas identiques.</p>}
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading || !valide}>
          {loading ? <Loader size={16} className="animate-spin" /> : null}
          {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </button>

        <Link to="/connexion" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>
      </form>
    </AuthShell>
  );
}
