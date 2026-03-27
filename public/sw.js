/**
 * ClawChives Service Worker
 * Enables offline-first caching for PWA functionality
 * Caches static assets, API responses, and enables offline operation
 */

const CACHE_NAME = 'claw-chives-v3.1';
const ASSETS_CACHE = 'claw-chives-assets-v3.1';
const API_CACHE = 'claw-chives-api-v3.1';

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
 * - /api/skill: Always pass through to network (public, read-only)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Public skill endpoint: Always fetch from network, no service worker interception
  if (url.pathname === '/api/skill') {
    return; // Let the browser handle it directly
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
        .catch(() => caches.match(request).then(res => res || new Response(JSON.stringify({ error: 'Offline - API not reachable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
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
