import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, MailCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import AuthShell from '../../components/auth/AuthShell';

export default function MotDePasseOublie() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [envoye, setEnvoye]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/mot-de-passe-oublie', { email });
      setEnvoye(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible d\'envoyer la demande. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {envoye ? (
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <MailCheck size={26} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Vérifiez votre boîte mail</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Si un compte actif existe avec <strong className="text-slate-700">{email}</strong>, un email contenant
            un lien de réinitialisation vient d'être envoyé. Le lien est valable 30 minutes.
          </p>
          <p className="text-xs text-slate-400 mt-3">Pensez à regarder dans vos courriers indésirables.</p>
          <Link to="/connexion" className="btn-secondary w-full justify-center mt-6">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Mot de passe oublié ?</h2>
            <p className="text-sm text-slate-500 mt-1">
              Saisissez l'adresse email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.
            </p>
          </div>

          <div className="form-group">
            <label className="label">Adresse email</label>
            <input type="email" className="input" placeholder="vous@exemple.com" autoFocus
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading || !email}>
            {loading ? <Loader size={16} className="animate-spin" /> : null}
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>

          <Link to="/connexion" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
