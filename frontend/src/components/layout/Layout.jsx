import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Package, ShoppingCart, ArrowLeftRight,
  Bell, Users, Settings, LogOut, Menu, X,
  Zap, BarChart2, Brain,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const navPrincipal = [
  { to: '/',           label: 'Dashboard',   Icon: LayoutDashboard, exact: true },
  { to: '/produits',   label: 'Produits',    Icon: Package },
  { to: '/ventes',     label: 'Ventes',      Icon: ShoppingCart },
  { to: '/mouvements', label: 'Mouvements',  Icon: ArrowLeftRight },
  { to: '/alertes',    label: 'Alertes',     Icon: Bell, badge: true },
  { to: '/statistiques', label: 'Statistiques', Icon: BarChart2 },
  { to: '/previsions', label: 'Prévisions',  Icon: Brain },
];

const navAdmin = [
  { to: '/utilisateurs', label: 'Utilisateurs', Icon: Users },
  { to: '/parametres',   label: 'Paramètres',   Icon: Settings },
];

function SidebarContent({ user, nav, alertesCount, onClose, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">StockBTP</p>
            <p className="text-[10px] text-slate-400">Gestion de stock</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide space-y-0.5">
        {nav.map(({ to, label, Icon, exact, badge }) => (
          <NavLink key={to} to={to} end={exact}
            onClick={onClose}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && alertesCount > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {alertesCount > 9 ? '9+' : alertesCount}
              </span>
            )}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {navAdmin.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} onClick={onClose}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={16} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.nom?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.nom}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button onClick={onLogout} title="Déconnexion"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: alertesData } = useQuery({
    queryKey:        ['alertes-count'],
    queryFn:         () => api.get('/alertes').then(r => r.data.data),
    refetchInterval: 60_000,
  });
  const alertesCount = (alertesData?.ruptures?.length || 0) + (alertesData?.faibles?.length || 0);

  const handleLogout = () => { deconnexion(); navigate('/connexion'); };
  const sidebarProps = { user, nav: navPrincipal, alertesCount, onLogout: handleLogout };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-56 flex-col bg-white border-r border-slate-100 flex-shrink-0">
        <SidebarContent {...sidebarProps} onClose={() => {}} />
      </aside>

      {/* Sidebar mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-white flex-shrink-0 flex flex-col animate-slide-up">
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 z-10">
              <X size={16} />
            </button>
            <SidebarContent {...sidebarProps} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden btn-icon">
            <Menu size={18} />
          </button>
          <PageTitle />
          <div className="ml-auto flex items-center gap-2">
            {alertesCount > 0 && (
              <NavLink to="/alertes" className="relative btn-icon text-slate-500">
                <Bell size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {alertesCount > 9 ? '9+' : alertesCount}
                </span>
              </NavLink>
            )}
            <button onClick={handleLogout} className="btn-ghost btn-sm hidden sm:flex">
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PageTitle() {
  const { pathname } = useLocation();
  const titles = {
    '/':                '/dashboard',
    '/produits':        'Produits',
    '/ventes':          'Ventes',
    '/ventes/nouvelle': 'Nouvelle vente',
    '/mouvements':      'Mouvements de stock',
    '/alertes':         'Alertes',
    '/statistiques':    'Statistiques',
    '/previsions':      'Prévisions IA',
    '/utilisateurs':    'Utilisateurs',
    '/parametres':      'Paramètres',
  };
  return (
    <h1 className="font-bold text-slate-900 text-base">
      {titles[pathname] || 'StockBTP'}
    </h1>
  );
}
