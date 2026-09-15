const CACHE_NAME = "westhome-v3";
const STATIC_CACHE = "westhome-static-v3";

const PRECACHE_URLS = ["/manifest.json", "/favicon.ico"];

self.addEventListener("install", (event) => {
  caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {});
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Only intercept images for caching
  if (url.pathname.startsWith("/images/") || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response("", { status: 408 }));
      })
    );
  }
  // Everything else passes through unintercepted
});
