import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Produits from './pages/Produits';
import Mouvements from './pages/Mouvements';
import Alertes from './pages/Alertes';
import Connexion from './pages/Connexion';
import Ventes from './pages/Ventes';
import Utilisateurs from './pages/Utilisateurs';
import Statistiques from './pages/Statistiques';
import Parametres from './pages/Parametres';
import Previsions from './pages/Previsions';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  );
  return user ? children : <Navigate to="/connexion" />;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>

              {/* Tous les rôles */}
              <Route index element={<Dashboard />} />
              <Route path="produits"   element={<Produits />} />
              <Route path="mouvements" element={<Mouvements />} />
              <Route path="alertes"    element={<Alertes />} />

              {/* Admin + Gestionnaire */}
              <Route path="ventes" element={
                <RoleRoute roles={['admin', 'gestionnaire']}><Ventes /></RoleRoute>
              } />

              {/* Admin uniquement */}
              <Route path="statistiques" element={
                <RoleRoute roles={['admin']}><Statistiques /></RoleRoute>
              } />
              <Route path="utilisateurs" element={
                <RoleRoute roles={['admin']}><Utilisateurs /></RoleRoute>
              } />
              <Route path="previsions" element={
                <RoleRoute roles={['admin']}><Previsions /></RoleRoute>
              } />
              <Route path="parametres" element={
                <RoleRoute roles={['admin']}><Parametres /></RoleRoute>
              } />

              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '500',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
