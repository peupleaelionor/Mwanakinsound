/*
 * Mwanakin Sound — service worker (offline shell).
 *
 * v1 scope: cache the app shell & static assets for instant repeat loads on
 * flaky African networks. Audio is intentionally NOT cached here yet — offline
 * downloads are a premium feature handled separately (see docs/ARCHITECTURE).
 * The architecture is ready: bump CACHE_VERSION and extend the fetch handler.
 */
const CACHE_VERSION = 'mwanakin-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle same-origin GET navigations & static assets. Never intercept
  // audio streams or Supabase API calls — those must stay live.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.includes('/storage/')) return;

  // Stale-while-revalidate for the shell.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
