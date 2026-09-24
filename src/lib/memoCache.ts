/**
 * Tiny in-memory TTL cache for hot, read-mostly public data.
 *
 * The storefront origin runs as a single small instance; the catalog reads
 * below (product lists, product detail, category tiles, sitemap, Merchant
 * feed) hit PostgreSQL on every request, which shows up as multi-second
 * responses whenever the instance is busy or waking from a free-tier spin
 * down. This cache keeps the most recent result of each hot read in the
 * instance's memory so bursts of shoppers share one database round trip
 * instead of thousands.
 *
 * Correctness model:
 *  - TTLs are SHORT (minutes) and every admin write path that changes catalog
 *    data calls `memoInvalidate*` right after committing, so admin edits
 *    appear immediately despite the TTLs.
 *  - Single-flight: concurrent callers on a miss share ONE in-flight loader
 *    promise — a burst of requests can never stampede the database or re-run
 *    the multi-second feed/sitemap builders in parallel.
 *  - Stale-while-revalidate: once an entry expires, callers still get the
 *    previous value instantly while a background refresh runs. A rebuild is
 *    paid by nobody's request latency (bounded by MAX_STALE_MULTIPLIER).
 *  - Failure backoff: a failed loader is not retried on every request; after
 *    a failure the key fast-fails for a short backoff window, protecting the
 *    origin when the database is down.
 *  - Pure module, no imports from db/auth — safe to unit-test and safe to
 *    import from route handlers, sitemap, and the feed generator.
 */

type Entry<T> = { value: T; expires: number; fetchedAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const failedAt = new Map<string, number>();

function evictIfNeeded(): void {
  while (store.size >= MAX_ENTRIES) {
    const eldest = store.keys().next().value;
    if (eldest === undefined) break;
    store.delete(eldest);
  }
}

/** Build (or join) the single in-flight load for `key`. */
function refresh<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const lastFail = failedAt.get(key);
  if (lastFail && Date.now() - lastFail < failureBackoffMs(ttlMs)) {
    // Fast-fail during the backoff window without re-invoking the loader.
    return Promise.reject(new Error(`memo: loader for "${key}" failed recently; backing off`));
  }

  const p = (async () => {
    try {
      const value = await loader();
      evictIfNeeded();
      const now = Date.now();
      store.set(key, { value, expires: now + ttlMs, fetchedAt: now });
      failedAt.delete(key);
      return value;
    } catch (err) {
      failedAt.set(key, Date.now());
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/**
 * Return the cached value for `key` when present and unexpired. On expiry the
 * stale value is served immediately (up to MAX_STALE_MULTIPLIER × TTL) while
 * a background refresh runs; only a cold or over-stale entry blocks on the
 * loader — and then only for the single caller that wins the in-flight slot.
 */
export async function memo<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && hit.expires > now) return hit.value;

  if (hit && now < hit.fetchedAt + ttlMs * MAX_STALE_MULTIPLIER) {
    // Serve stale now; refresh out of band so no visitor pays the rebuild.
    void refresh(key, ttlMs, loader).catch(() => {
      /* background refresh failure is non-fatal — stale stays servable */
    });
    return hit.value;
  }

  return refresh(key, ttlMs, loader);
}

/** Get an unexpired value without a loader (for handlers that build responses inline). */
export function memoGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  return null;
}

/** Store a value computed by the caller (paired with memoGet). */
export function memoSet<T>(key: string, ttlMs: number, value: T): void {
  evictIfNeeded();
  const now = Date.now();
  store.set(key, { value, expires: now + ttlMs, fetchedAt: now });
}

/** Invalidate one key (used after writes to that specific resource). */
export function memoInvalidate(prefix: string, key: string): void {
  const full = `${prefix}:${key}`;
  store.delete(full);
  inflight.delete(full);
  failedAt.delete(full);
}

/** Invalidate every entry under a namespace (used after broad admin writes). */
export function memoInvalidateNamespace(prefix: string): void {
  const tag = `${prefix}:`;
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(tag)) store.delete(k);
  }
  for (const k of Array.from(inflight.keys())) {
    if (k.startsWith(tag)) inflight.delete(k);
  }
  for (const k of Array.from(failedAt.keys())) {
    if (k.startsWith(tag)) failedAt.delete(k);
  }
}

/**
 * Drop all catalog-derived caches. Call after any admin write that changes
 * products, categories, or anything the sitemap/Merchant feed advertise —
 * admin edits then appear immediately despite the TTLs.
 */
export function memoInvalidateCatalog(): void {
  memoInvalidateNamespace(NS.products);
  memoInvalidateNamespace(NS.product);
  memoInvalidateNamespace(NS.categories);
  memoInvalidateNamespace(NS.sitemap);
  memoInvalidateNamespace(NS.feed);
  // The Redis shared cache (GCP Memorystore) holds catalog responses too;
  // drop that layer as well. Fire-and-forget: the in-process caches above
  // are the correctness-critical ones, and Redis keys carry their own TTLs
  // so a failed flush only lengthens staleness to the cache window.
  void import("./redis.ts").then(({ cacheFlushAll }) => cacheFlushAll()).catch(() => {});
}

/** Test helper: drop everything. */
export function memoClear(): void {
  store.clear();
  inflight.clear();
  failedAt.clear();
}

/** Test helper: current number of live entries. */
export function memoSize(): number {
  return store.size;
}

// ── Namespaces and TTLs ─────────────────────────────────────────────────────

/**
 * Catalog reads: 5 minutes. Admin writes invalidate instantly, so this only
 * bounds how long an out-of-band change (e.g. direct DB edit) can linger.
 */
export const CATALOG_TTL_MS = 300_000;
/**
 * SEO/feed XML: 30 minutes; Merchant Center fetches daily and crawlers honour
 * the ISR revalidate. With stale-while-revalidate below, even a rebuild never
 * blocks a response after the first successful build in the process lifetime.
 */
export const SEO_XML_TTL_MS = 1_800_000;

export const NS = {
  products: "products",
  product: "product",
  categories: "categories",
  sitemap: "sitemap",
  feed: "feed",
} as const;

// Hard cap so pathological cache-key variance can't grow memory unbounded.
const MAX_ENTRIES = 500;

// An expired entry stays servable (while a background refresh runs) for up to
// this multiple of its TTL. Prevents serving arbitrarily old data if the
// background refresh keeps failing.
const MAX_STALE_MULTIPLIER = 12;

/** Backoff before re-attempting a failed loader: proportional but bounded. */
function failureBackoffMs(ttlMs: number): number {
  return Math.min(30_000, Math.max(250, ttlMs));
}
