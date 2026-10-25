// Utilitaires PWA : enregistrement du service worker, mise à jour, nettoyage à la déconnexion.

export function viderCachePWA() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_API' });
    if (window.caches) caches.keys().then((ks) => ks.filter((k) => k.startsWith('stockbtp-api')).forEach((k) => caches.delete(k)));
  } catch { /* sans effet */ }
}

// onUpdate(appliquer) est appelé quand une nouvelle version est prête.
export function enregistrerSW(onUpdate) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const signaler = (sw) => onUpdate?.(() => sw.postMessage({ type: 'SKIP_WAITING' }));
      if (reg.waiting && navigator.serviceWorker.controller) signaler(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) signaler(sw);
        });
      });
      let recharge = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recharge) return;
        recharge = true;
        window.location.reload();
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch { /* hors HTTPS ou refusé */ }
  });
}
