import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      const e = localStorage.getItem('entreprise');
      const t = localStorage.getItem('token');
      if (u && t) { setUser(JSON.parse(u)); setEntreprise(e ? JSON.parse(e) : null); }
    } catch { clearSession(); }
    finally { setLoading(false); }
  }, []);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('entreprise');
    setUser(null); setEntreprise(null);
  };

  const connexion = async (email, motDePasse) => {
    const res = await api.post('/auth/login', { email, motDePasse });
    const { token, utilisateur, entreprise: ent } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(utilisateur));
    if (ent) localStorage.setItem('entreprise', JSON.stringify(ent));
    setUser(utilisateur);
    setEntreprise(ent || null);
    return { utilisateur, entreprise: ent };
  };

  const inscription = async (data) => {
    const res = await api.post('/auth/inscription', data);
    const { token, utilisateur, entreprise: ent } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(utilisateur));
    if (ent) localStorage.setItem('entreprise', JSON.stringify(ent));
    setUser(utilisateur);
    setEntreprise(ent || null);
    return res.data;
  };

  const deconnexion = () => clearSession();

  const updateEntreprise = (ent) => {
    setEntreprise(ent);
    localStorage.setItem('entreprise', JSON.stringify(ent));
  };

  const devise = entreprise?.parametres?.devise || 'GNF';
  const plan   = entreprise?.abonnement?.plan   || 'gratuit';

  return (
    <AuthContext.Provider value={{
      user, entreprise, loading, devise, plan,
      connexion, inscription, deconnexion, updateEntreprise,
      isSuperAdmin: user?.role === 'superadmin',
      isAdmin:      ['superadmin', 'admin'].includes(user?.role),
      peutEcrire:   ['superadmin', 'admin', 'gestionnaire'].includes(user?.role),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être dans AuthProvider');
  return ctx;
};
