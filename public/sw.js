const CACHE_NAME = "westhome-v6";

// Immutable, content-addressed assets are cached cache-first. App data and
// everything else must always hit the network.
//
// /api/images/<id>.webp is safe to cache: the .webp suffix URLs are emitted by
// normalizeImageUrl, always resolve to the same Drive file for a given id,
// and are always served as WebP (no content negotiation → no Vary poisoning).
// The old v5 rule excluded all of /api/* because plain /api/images/<id> URLs
// are Accept-negotiated and a poisoned entry used to persist forever; the
// suffix-only rule plus the image/ Content-Type guard below keep that safety.
const CACHEABLE_PREFIXES = ["/images/", "/collections/"];
const CACHEABLE_IMAGE_SUFFIX = "/api/images/";

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

  const isStatic = CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  // Only the deterministic .webp form of proxy images — never the negotiated
  // plain-id form, never any other /api/* route.
  const isDeterministicProxyImage =
    url.pathname.startsWith(CACHEABLE_IMAGE_SUFFIX) && url.pathname.endsWith(".webp");
  if (!isStatic && !isDeterministicProxyImage) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      // Guard: only cache real image responses, never an HTML fallback page
      // or JSON error that happens to answer 200.
      const type = response.headers.get("Content-Type") || "";
      if (response.ok && type.startsWith("image/")) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
