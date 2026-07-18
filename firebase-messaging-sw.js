'use strict';

// Messaging remains disabled until a TomatoDev-only sender is configured. This
// inert worker only cleans up a stale registration from an older cached page.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'tomatodev-fcm-disabled' }));
  })());
});
