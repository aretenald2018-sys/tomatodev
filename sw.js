// Service Worker for TomatoDev.
// Cache names are deliberately owned by this app because TomatoDev and the
// production app currently share the github.io origin.
const CACHE_PREFIX = 'tomatodev-';
const CACHE_VERSION = 'tomatodev-v20260721z3-farm-sync-workout-input';
const RUNTIME_CACHE = 'tomatodev-runtime';
importScripts('./runtime-assets.js');
const STATIC_ASSETS = self.TOMATO_STATIC_ASSETS;

const APP_SCOPE_URL = new URL('./', self.registration.scope);
const APP_FALLBACK_URL = new URL('./index.html', APP_SCOPE_URL).href;

async function matchOwnedCache(request) {
  const staticCache = await caches.open(CACHE_VERSION);
  const staticResponse = await staticCache.match(request);
  if (staticResponse) return staticResponse;

  const runtimeCache = await caches.open(RUNTIME_CACHE);
  return runtimeCache.match(request);
}

self.addEventListener('install', (event) => {
  console.log('[SW] Install event fired');
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      console.log('[SW] Caching static assets');
      const results = await Promise.allSettled(
        // A cache-version change must not repopulate the new SW cache from the
        // browser HTTP cache. Otherwise a fresh app shell can be paired with
        // stale modules/CSS that happen to have the same URL.
        STATIC_ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' })))
      );
      const failures = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failures.push({
            url: STATIC_ASSETS[index],
            error: (result.reason && result.reason.message)
              ? result.reason.message
              : String(result.reason),
          });
        }
      });
      if (failures.length) {
        console.error(`[SW] Precache failed for ${failures.length}/${STATIC_ASSETS.length} files:`);
        failures.forEach(failure => console.error(`  - ${failure.url}: ${failure.error}`));
        throw new Error(`Precache failed for ${failures.length}/${STATIC_ASSETS.length} files`);
      }
      console.log(`[SW] Precached ${STATIC_ASSETS.length} assets successfully`);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event fired');
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((name) => (
          name.startsWith(CACHE_PREFIX)
          && name !== CACHE_VERSION
          && name !== RUNTIME_CACHE
        ))
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type !== 'SKIP_WAITING') return;
  // Keep the message event alive until activation is requested. Without
  // waitUntil(), a backgrounded mobile client can reload while this update is
  // still waiting, leaving the old worker in control.
  const activation = self.skipWaiting();
  if (typeof event.waitUntil === 'function') event.waitUntil(activation);
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  const isAppDocument = (
    request.mode === 'navigate'
    || request.destination === 'document'
    || url.pathname === APP_SCOPE_URL.pathname
    || url.href === APP_FALLBACK_URL
  );
  const isCodeAsset = (
    url.pathname.endsWith('.html')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
  );

  // App documents and code are network-first so a newly deployed app shell
  // cannot be paired with stale modules.
  if (isAppDocument || isCodeAsset) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const cached = await matchOwnedCache(request);
          if (cached) return cached;
          if (isAppDocument) {
            const staticCache = await caches.open(CACHE_VERSION);
            return staticCache.match(APP_FALLBACK_URL);
          }
          return undefined;
        })
    );
    return;
  }

  // Images and fonts are cache-first, but only within TomatoDev-owned caches.
  if (url.hostname === 'fonts.googleapis.com' || url.pathname.match(/\.(woff2|woff|png|jpg|jpeg|svg|gif|ico)$/)) {
    event.respondWith(
      matchOwnedCache(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        }).catch(() => matchOwnedCache(request));
      })
    );
    return;
  }

  // Other GET requests are network-first with an app-owned fallback.
  event.respondWith(
    fetch(request).catch(() => matchOwnedCache(request))
  );
});

console.log('[SW] Service Worker loaded');
