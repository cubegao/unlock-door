// Service Worker for offline caching
const CACHE_NAME = 'unlock-door-v1';

const ASSETS = [
  '/unlock-door/',
  '/unlock-door/index.html',
  '/unlock-door/manifest.json',
  '/unlock-door/favicon.svg',
  '/unlock-door/config.js',
  '/unlock-door/css/style.css',
  '/unlock-door/js/curl-parser.js',
  '/unlock-door/js/api.js',
  '/unlock-door/js/share.js',
  '/unlock-door/js/app.js',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests within our scope
  if (event.request.method !== 'GET') return;
  if (!event.request.url.includes('/unlock-door/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: return from cache
        return caches.match(event.request);
      })
  );
});
