/* Funny Station — Service Worker minimal (installabilité PWA + repli hors-ligne).
   Strategie : network-first pour les navigations (toujours frais quand en ligne),
   avec repli sur la derniere page mise en cache si le reseau tombe. On NE cache PAS
   les gros assets de jeu (ROMs, builds) — gere ailleurs. */
const CACHE = 'funny-station-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // On ne traite que les navigations (documents) — le reste passe au reseau normal.
  if (req.mode !== 'navigate') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match('/').then((r) => r || caches.match(req)))
  );
});
