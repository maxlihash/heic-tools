// HEIC Tools — service worker (offline cache, network-first for freshness)
const CACHE = 'heic-tools-v1';

// Bump ASSETS version when files change — or just let network-first handle it
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/',
      '/assets/styles.css',
      '/assets/converter.js',
      '/manifest.json',
    ]).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

// network-first: always try network, fall back to cache when offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only handle http/https GET requests
  if (e.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  e.respondWith((async () => {
    try {
      const netResp = await fetch(e.request);
      // Cache successful responses
      if (netResp.ok) {
        const clone = netResp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return netResp;
    } catch {
      // Offline — serve from cache
      const cached = await caches.match(e.request);
      return cached || new Response('Offline', { status: 503 });
    }
  })());
});
