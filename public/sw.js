// Lightweight PWA service worker (Network Pass-Through)
// Satisfies Chrome/Safari PWA installation criteria without caching database queries.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through handler directly to network (ensures database reads are never cached/stale)
  event.respondWith(fetch(event.request));
});
