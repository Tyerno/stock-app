import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowLeftRight, Bell,
  LogOut, Zap, ShoppingCart, X, ChevronRight,
  BarChart2, Users, Settings, Brain // eslint-disable-line no-unused-vars
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import Navbar from './Navbar';

const navParRole = {
  admin: [
    { section: 'Principal' },
    { to: '/',             label: 'Dashboard',    Icon: LayoutDashboard },
    { to: '/produits',     label: 'Produits',     Icon: Package },
    { to: '/ventes',       label: 'Ventes',       Icon: ShoppingCart },
    { section: 'Analyse' },
    { to: '/statistiques', label: 'Statistiques', Icon: BarChart2 },
    { to: '/previsions',   label: 'Prévisions IA', Icon: Brain },
    { section: 'Stock' },
    { to: '/mouvements',   label: 'Mouvements',   Icon: ArrowLeftRight },
    { to: '/alertes',      label: 'Alertes',      Icon: Bell, badge: true },
    { section: 'Équipe' },
    { to: '/utilisateurs', label: 'Utilisateurs', Icon: Users },
  ],
  gestionnaire: [
    { section: 'Principal' },
    { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
    { to: '/produits',   label: 'Produits',   Icon: Package },
    { to: '/ventes',     label: 'Ventes',     Icon: ShoppingCart },
    { section: 'Stock' },
    { to: '/mouvements', label: 'Mouvements', Icon: ArrowLeftRight },
    { to: '/alertes',    label: 'Alertes',    Icon: Bell, badge: true },
  ],
  lecteur: [
    { section: 'Consultation' },
    { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
    { to: '/produits',   label: 'Produits',   Icon: Package },
    { to: '/mouvements', label: 'Mouvements', Icon: ArrowLeftRight },
    { to: '/alertes',    label: 'Alertes',    Icon: Bell, badge: true },
  ],
};

const pageTitles = {
  '/':              'Dashboard',
  '/produits':      'Produits',
  '/ventes':        'Ventes',
  '/statistiques':  'Statistiques',
  '/mouvements':    'Mouvements',
  '/alertes':       'Alertes',
  '/utilisateurs':  'Utilisateurs',
  '/parametres':    'Paramètres',
  '/previsions':     'Prévisions IA',
};

function RolePill({ role }) {
  const cfg = {
    admin:        { label: 'Admin',        cls: 'bg-violet-500/20 text-violet-300' },
    gestionnaire: { label: 'Gestionnaire', cls: 'bg-blue-500/20 text-blue-300' },
    lecteur:      { label: 'Lecteur',      cls: 'bg-gray-500/20 text-gray-400' },
  };
  const r = cfg[role] || cfg.lecteur;
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.cls}`}>{r.label}</span>;
}

export default function Layout() {
  const { user, deconnexion } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: alertesCount } = useQuery({
    queryKey: ['alertes-count'],
    queryFn:  () => api.get('/alertes').then(r => r.data.data.total),
    refetchInterval: 60_000,
  });

  const nav       = navParRole[user?.role] || navParRole.lecteur;
  const pageTitle = pageTitles[location.pathname] || 'StockBTP';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <p className="font-syne text-sm font-bold text-white tracking-tight">StockBTP</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Matériaux de construction</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
        {nav.map((item, i) => {
          if (item.section) return (
            <p key={i} className="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-3 mt-4 mb-1 first:mt-1">
              {item.section}
            </p>
          );
          const { to, label, Icon, badge } = item;
          return (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'gradient-brand text-white shadow-md shadow-blue-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && alertesCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {alertesCount}
                    </span>
                  )}
                  {isActive && <ChevronRight size={12} className="opacity-60" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Paramètres + User */}
      <div className="px-3 pb-4 border-t border-gray-700/50 pt-3 flex flex-col gap-2">
        {/* Bouton paramètres */}
        {user?.role === 'admin' && (
          <NavLink to="/parametres" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'gradient-brand text-white shadow-md shadow-blue-500/25' : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
              }`
            }>
            <Settings size={15}/>
            <span>Paramètres</span>
          </NavLink>
        )}

        {/* Infos utilisateur */}
        <div className="flex justify-center mb-1">
          <RolePill role={user?.role} />
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700/30">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.nom?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{user?.nom}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
          <button onClick={() => { deconnexion(); navigate('/connexion'); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={13} />
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-[9px] text-gray-700 mt-1">StockBTP v1.0.0</p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 bg-gray-800 flex-col z-50 border-r border-gray-700/40">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-gray-800 flex flex-col z-10 animate-slide-in">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all">
              <X size={16} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col lg:ml-56">
        <Navbar onMenuClick={() => setSidebarOpen(true)} pageTitle={pageTitle} />
        <main className="flex-1 pt-14">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
