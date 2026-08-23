import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Layout from './components/layout/Layout';

// Auth
import Connexion from './pages/auth/Connexion';

// Pages (chargées à la demande, par route)
const Dashboard     = lazy(() => import('./pages/dashboard/Dashboard'));
const Produits      = lazy(() => import('./pages/produits/Produits'));
const Ventes         = lazy(() => import('./pages/ventes/Ventes'));
const NouvelleVente  = lazy(() => import('./pages/ventes/NouvelleVente'));
const Mouvements     = lazy(() => import('./pages/mouvements/Mouvements'));
const Alertes        = lazy(() => import('./pages/alertes/Alertes'));
const Utilisateurs   = lazy(() => import('./pages/utilisateurs/Utilisateurs'));
const Parametres     = lazy(() => import('./pages/parametres/Parametres'));
const Statistiques   = lazy(() => import('./pages/statistiques/Statistiques'));
const Previsions     = lazy(() => import('./pages/previsions/Previsions'));
const Dettes         = lazy(() => import('./pages/dettes/Dettes'));

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="dettes"       element={<Dettes />} />
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
    </Suspense>
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
