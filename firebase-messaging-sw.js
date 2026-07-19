'use strict';

// TomatoDev does not register web push against the production Firebase project.
// This inert worker only cleans up a stale TomatoDev messaging registration if
// an older cached page happens to request this script once more.
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
