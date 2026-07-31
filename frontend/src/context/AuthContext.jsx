import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      const t = localStorage.getItem('token');
      if (u && t) setUser(JSON.parse(u));
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const connexion = async (email, motDePasse) => {
    const res = await api.post('/auth/connexion', { email, motDePasse });

    const { token, data: utilisateur } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(utilisateur));
    setUser(utilisateur);
    return utilisateur;
  };

  const deconnexion = () => clearSession();

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      connexion,
      deconnexion,
      isAdmin:    ['admin'].includes(user?.role),
      peutEcrire: ['admin', 'gestionnaire'].includes(user?.role),
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
