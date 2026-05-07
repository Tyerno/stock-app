import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, ChevronDown, LogOut, User,
  Settings, X, Package, ShoppingCart, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

// ─── Horloge en direct ────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden md:flex flex-col items-end">
      <span className="text-xs font-bold text-gray-200 font-mono">
        {time.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      </span>
      <span className="text-[10px] text-gray-500">
        {time.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })}
      </span>
    </div>
  );
}

// ─── Recherche globale ────────────────────────────────────────────────────────
function GlobalSearch({ onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState({ produits: [], ventes: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults({ produits: [], ventes: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [p, v] = await Promise.all([
          api.get('/produits', { params: { search: query, limit: 5 } }),
          api.get('/ventes',   { params: { search: query, limit: 5 } }),
        ]);
        setResults({ produits: p.data.data || [], ventes: v.data.data || [] });
      } catch { setResults({ produits: [], ventes: [] }); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const goTo = (path) => { navigate(path); onClose(); };

  const hasResults = results.produits.length > 0 || results.ventes.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="w-full max-w-xl animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un produit, une vente, un client…"
              className="flex-1 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
            {loading && <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0"/>}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
              <X size={15}/>
            </button>
          </div>

          {/* Résultats */}
          {hasResults && (
            <div className="max-h-80 overflow-y-auto scrollbar-hide">
              {results.produits.length > 0 && (
                <div className="p-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">Produits</p>
                  {results.produits.map(p => (
                    <button key={p._id} onClick={() => goTo('/produits')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-all text-left group">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-blue-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">{p.nom}</p>
                        <p className="text-xs text-gray-400">{p.quantiteStock} {p.unite} · {p.categorie?.nom}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.quantiteStock === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {p.quantiteStock === 0 ? 'Rupture' : 'En stock'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.ventes.length > 0 && (
                <div className="p-2 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">Ventes</p>
                  {results.ventes.map(v => (
                    <button key={v._id} onClick={() => goTo('/ventes')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-all text-left group">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart size={14} className="text-indigo-600"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 font-mono group-hover:text-blue-700">{v.numero}</p>
                        <p className="text-xs text-gray-400">{v.client?.nom || 'Comptoir'} · {new Intl.NumberFormat('fr-FR').format(v.totalNet)} GNF</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {query.length >= 2 && !loading && !hasResults && (
            <div className="p-8 text-center text-gray-400">
              <Search size={24} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">Aucun résultat pour "<strong>{query}</strong>"</p>
            </div>
          )}

          {!query && (
            <div className="p-4">
              <p className="text-xs text-gray-400 text-center">Tapez au moins 2 caractères pour rechercher</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                {[['Produits', '/produits'], ['Ventes', '/ventes'], ['Alertes', '/alertes']].map(([label, path]) => (
                  <button key={path} onClick={() => goTo(path)}
                    className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Raccourci clavier */}
        <p className="text-center text-xs text-gray-500 mt-3">Appuyez sur <kbd className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">Échap</kbd> pour fermer</p>
      </div>
    </div>
  );
}

// ─── Panneau notifications ────────────────────────────────────────────────────
function NotifPanel({ alertes, onClose }) {
  const navigate = useNavigate();
  const ruptures = alertes?.ruptures || [];
  const faibles  = alertes?.faibles  || [];
  const total    = ruptures.length + faibles.length;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-scale-in overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gray-700"/>
          <p className="text-sm font-bold text-gray-800">Notifications</p>
          {total > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{total}</span>}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={13}/></button>
      </div>

      <div className="max-h-72 overflow-y-auto scrollbar-hide">
        {total === 0 ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
              <Bell size={18} className="text-green-500"/>
            </div>
            <p className="text-sm font-medium text-gray-600">Tout est OK ✓</p>
            <p className="text-xs text-gray-400 mt-1">Aucune alerte de stock</p>
          </div>
        ) : (
          <div className="p-2">
            {ruptures.map(p => (
              <div key={p._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                onClick={() => { navigate('/alertes'); onClose(); }}>
                <div className="w-2 h-2 rounded-full bg-red-500 dot-live flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.nom}</p>
                  <p className="text-[10px] text-red-500 font-medium">Rupture totale de stock</p>
                </div>
              </div>
            ))}
            {faibles.map(p => (
              <div key={p._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-all cursor-pointer"
                onClick={() => { navigate('/alertes'); onClose(); }}>
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.nom}</p>
                  <p className="text-[10px] text-amber-600 font-medium">Stock faible · {p.quantiteStock} {p.unite}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="border-t border-gray-100 p-2">
          <button onClick={() => { navigate('/alertes'); onClose(); }}
            className="w-full text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-xl transition-all">
            Voir toutes les alertes →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Menu profil ──────────────────────────────────────────────────────────────
function ProfileMenu({ user, onClose, onLogout }) {
  const navigate = useNavigate();
  const roleLabel = { admin:'Administrateur', gestionnaire:'Gestionnaire', lecteur:'Lecteur' };
  const roleColor = { admin:'bg-violet-100 text-violet-700', gestionnaire:'bg-blue-100 text-blue-700', lecteur:'bg-gray-100 text-gray-600' };

  return (
    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 animate-scale-in overflow-hidden">
      {/* Infos utilisateur */}
      <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user?.nom?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.nom}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColor[user?.role]}`}>
            {roleLabel[user?.role]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2">
        {user?.role === 'admin' && (
          <button onClick={() => { navigate('/parametres'); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-left group">
            <Settings size={15} className="text-gray-400 group-hover:text-blue-600 transition-colors"/>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Paramètres</span>
          </button>
        )}
        <button onClick={() => { navigate('/utilisateurs'); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-left group">
          <User size={15} className="text-gray-400 group-hover:text-blue-600 transition-colors"/>
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Mon profil</span>
        </button>
      </div>

      <div className="border-t border-gray-100 p-2">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-all text-left group">
          <LogOut size={15} className="text-gray-400 group-hover:text-red-500 transition-colors"/>
          <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">Déconnexion</span>
        </button>
      </div>
    </div>
  );
}

// ─── Navbar principale ────────────────────────────────────────────────────────
export default function Navbar({ onMenuClick, pageTitle }) {
  const { user, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen]   = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Fermer avec Échap
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); setProfileOpen(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Alertes pour les notifs
  const { data: alertes } = useQuery({
    queryKey: ['alertes-notif'],
    queryFn:  () => api.get('/alertes').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const totalNotifs = (alertes?.ruptures?.length || 0) + (alertes?.faibles?.length || 0);

  const handleLogout = () => { deconnexion(); navigate('/connexion'); };

  return (
    <>
      {/* Overlay recherche */}
      {searchOpen && (
        <div>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]" onClick={() => setSearchOpen(false)}/>
          <GlobalSearch onClose={() => setSearchOpen(false)} />
        </div>
      )}

      <header className="fixed top-0 right-0 left-0 lg:left-56 z-40 h-14 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/40 flex items-center px-4 gap-3">

        {/* Hamburger mobile */}
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
          <Menu size={18}/>
        </button>

        {/* Titre page */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-gray-500 text-xs hidden sm:block">StockBTP</span>
          <span className="text-gray-500 text-xs hidden sm:block">/</span>
          <span className="font-syne text-sm font-bold text-white truncate">{pageTitle}</span>
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2">

          {/* Horloge */}
          <LiveClock />

          {/* Séparateur */}
          <div className="w-px h-5 bg-gray-700 hidden md:block"/>

          {/* Recherche */}
          <button onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl px-3 py-1.5 transition-all group">
            <Search size={13} className="text-gray-400 group-hover:text-white transition-colors"/>
            <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors hidden sm:block">Rechercher…</span>
            <kbd className="hidden sm:block text-[9px] font-mono bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
              className={`relative p-2 rounded-xl transition-all ${notifOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Bell size={17}/>
              {totalNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center dot-live">
                  {totalNotifs > 9 ? '9+' : totalNotifs}
                </span>
              )}
            </button>
            {notifOpen && <NotifPanel alertes={alertes} onClose={() => setNotifOpen(false)} />}
          </div>

          {/* Profil */}
          <div className="relative">
            <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all ${profileOpen ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
              <div className="w-7 h-7 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/30">
                {user?.nom?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-gray-300 hidden sm:block max-w-[80px] truncate">{user?.nom}</span>
              <ChevronDown size={12} className={`text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}/>
            </button>
            {profileOpen && <ProfileMenu user={user} onClose={() => setProfileOpen(false)} onLogout={handleLogout} />}
          </div>
        </div>
      </header>

      {/* Raccourci Ctrl+K */}
      <SearchShortcut onOpen={() => setSearchOpen(true)} />
    </>
  );
}

function SearchShortcut({ onOpen }) {
  useEffect(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); onOpen(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
  return null;
}
