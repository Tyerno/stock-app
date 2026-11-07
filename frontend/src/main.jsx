import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enregistrerSW } from './utils/pwa';

// Réveille le serveur (hébergement gratuit : il s'endort après 15 min) dès l'ouverture de l'app,
// pendant que l'utilisateur lit l'écran de connexion.
try {
  fetch(`${import.meta.env.VITE_API_URL || '/api'}/health`, { cache: 'no-store' }).catch(() => {});
} catch { /* sans effet */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

enregistrerSW((appliquer) => {
  window.__appliquerMaj = appliquer;
  window.dispatchEvent(new Event('pwa-update'));
});
