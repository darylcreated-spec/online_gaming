const CACHE_NAME = 'winconcept-v29';

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Only intercept same-origin HTTP(S) requests; skip cross-origin & extension schemes
  if (url.origin !== self.location.origin || !url.protocol.startsWith("http")) {
    return;
  }

  // Never cache dynamic API responses or the Service Worker script itself
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") {
    return;
  }

  // Stale-while-revalidate strictly for immutable /_next/static/ assets and public images/fonts
  const staticExtensions = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".woff", ".woff2", ".ttf"];
  const isStatic = staticExtensions.some((ext) => url.pathname.endsWith(ext));

  if (isStatic || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache valid HTTP 200 OK basic responses (never poison cache with 404/500)
            if (networkResponse && networkResponse.ok && networkResponse.type === "basic") {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || new Response("", { status: 503, statusText: "Offline" }));

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Network-first with cached shell fallback for HTML page navigations
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === "basic") {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("/") || new Response("Offline", { status: 503 }))
        )
    );
    return;
  }
});

// === WEB PUSH NOTIFICATIONS ===
self.addEventListener("push", (event) => {
  let data = {
    title: "NLCB Live Draw Alert",
    body: "New official winning numbers have just dropped!",
    url: "/"
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/images/pwa-icon-192.png",
    badge: data.badge || "/images/pwa-icon-192.png",
    vibrate: [200, 100, 200],
    tag: "nlcb-live-draw",
    renotify: true,
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client && targetUrl && targetUrl !== "/") {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
