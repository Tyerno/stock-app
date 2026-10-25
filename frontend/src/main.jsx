import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enregistrerSW } from './utils/pwa';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

enregistrerSW((appliquer) => {
  window.__appliquerMaj = appliquer;
  window.dispatchEvent(new Event('pwa-update'));
});
