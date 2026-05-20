import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Layout from './components/layout/Layout';

// Auth
import Connexion from './pages/auth/Connexion';

// Pages
import Dashboard    from './pages/dashboard/Dashboard';
import Produits     from './pages/produits/Produits';
import Ventes       from './pages/ventes/Ventes';
import NouvelleVente from './pages/ventes/NouvelleVente';
import Mouvements   from './pages/mouvements/Mouvements';
import Alertes      from './pages/alertes/Alertes';
import Utilisateurs from './pages/utilisateurs/Utilisateurs';
import Parametres   from './pages/parametres/Parametres';
import Statistiques from './pages/statistiques/Statistiques';
import Previsions   from './pages/previsions/Previsions';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/connexion" element={!user ? <Connexion /> : <Navigate to="/" />} />

      {/* App */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index                  element={<Dashboard />} />
        <Route path="produits"        element={<Produits />} />
        <Route path="ventes"          element={<Ventes />} />
        <Route path="ventes/nouvelle" element={
          <ProtectedRoute roles={['admin', 'gestionnaire']}>
            <NouvelleVente />
          </ProtectedRoute>
        } />
        <Route path="mouvements"   element={<Mouvements />} />
        <Route path="alertes"      element={<Alertes />} />
        <Route path="statistiques" element={<Statistiques />} />
        <Route path="previsions"   element={<Previsions />} />
        <Route path="utilisateurs" element={
          <ProtectedRoute roles={['admin']}>
            <Utilisateurs />
          </ProtectedRoute>
        } />
        <Route path="parametres" element={
          <ProtectedRoute roles={['admin']}>
            <Parametres />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { borderRadius: '12px', fontSize: '14px', fontWeight: 500 },
            success: { style: { background: '#10b981', color: 'white' } },
            error:   { style: { background: '#ef4444', color: 'white' } },
          }} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
