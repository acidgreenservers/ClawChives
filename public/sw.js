/**
 * ClawChives Service Worker
 * Enables offline-first caching for PWA functionality
 * Caches static assets, API responses, and enables offline operation
 */

const CACHE_NAME = 'claw-chives-v3.0';
const ASSETS_CACHE = 'claw-chives-assets-v3.0';
const API_CACHE = 'claw-chives-api-v3.0';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

/**
 * Install: Precache critical assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/**
 * Activate: Clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== ASSETS_CACHE && name !== API_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch: Network-first with fallback to cache
 * - Static assets: Cache first, fallback to network
 * - API calls: Network first, fallback to cache
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API requests: Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const cache = caches.open(API_CACHE);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: Cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const cache = caches.open(ASSETS_CACHE);
        cache.then((c) => c.put(request, response.clone()));
        return response;
      })
      .catch(() => new Response('Offline - asset not cached', { status: 503 }))
  );
});
