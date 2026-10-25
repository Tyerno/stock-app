/* StockBTP — service worker
 * - Coque de l'application (assets versionnés) : cache d'abord
 * - Pages : réseau d'abord, repli sur l'index en cache (hors-ligne)
 * - Données : lecture seule, liste blanche de GET, réseau d'abord puis dernier état connu
 * - Jamais de cache pour : auth, utilisateurs, journal, sauvegarde, bons, inventaires, ni aucune écriture
 */
const VERSION = 'v1';
const CACHE_APP = `stockbtp-app-${VERSION}`;
const CACHE_API = `stockbtp-api-${VERSION}`;
const API_MAX = 80;
const API_OK = /^\/api\/(dashboard|produits|categories|alertes|ventes|mouvements|dettes|stats|previsions|boutique)(\/|$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_APP).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(noms.filter((n) => ![CACHE_APP, CACHE_API].includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'CLEAR_API') event.waitUntil(caches.delete(CACHE_API));
});

async function limiter(cache) {
  const cles = await cache.keys();
  if (cles.length > API_MAX) await Promise.all(cles.slice(0, cles.length - API_MAX).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Données (même origine ou API distante)
  if (API_OK.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_API);
        try {
          const res = await fetch(req);
          if (res.ok) {
            cache.put(req.url, res.clone()).then(() => limiter(cache)).catch(() => {});
          }
          return res;
        } catch (err) {
          const hit = await cache.match(req.url);
          if (hit) return hit;
          throw err;
        }
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // autres routes API : jamais en cache

  // Assets versionnés (nom haché) : cache d'abord
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(CACHE_APP).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Navigation : réseau d'abord, repli sur l'index en cache
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_APP);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put('/', res.clone());
          return res;
        } catch {
          return (await cache.match('/')) || Response.error();
        }
      })()
    );
  }
});
