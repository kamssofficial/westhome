const CACHE_NAME = "westhome-v5";

// Only committed, immutable static assets are cached. API responses —
// including /api/images/<id> Drive proxies — must always hit the network:
// they are mutable backend data, and a poisoned cache entry there (e.g. an
// HTML fallback served with 200 during a deploy window) used to persist
// forever because the cache name never changed.
const CACHEABLE_PREFIXES = ["/images/", "/collections/"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Static assets only — never /api/*, never app shell, never Next bundles.
  if (!CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      // Guard: only cache real image responses, never an HTML fallback page
      // that happens to answer 200.
      const type = response.headers.get("Content-Type") || "";
      if (response.ok && type.startsWith("image/")) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
