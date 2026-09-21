/**
 * Tiny in-memory TTL cache for hot, read-mostly public data.
 *
 * The storefront origin runs as a single small instance; the catalog reads
 * below (product lists, product detail, category tiles, sitemap, Merchant
 * feed) hit PostgreSQL on every request, which shows up as multi-second
 * responses whenever the instance is busy or waking from a free-tier spin
 * down. This cache keeps the most recent result of each hot read in the
 * instance's memory with a short time-to-live, so bursts of shoppers share
 * one database round trip instead of thousands.
 *
 * Correctness model:
 *  - TTLs are SHORT (seconds to a minute) so a missed invalidation can only
 *    serve stale data briefly.
 *  - Every admin write path that changes catalog data calls `memoInvalidate*`
 *    right after committing, so admin edits appear immediately.
 *  - "Not found" results are cached too (negative caching) so repeated 404
 *    probes don't hammer the database.
 *  - Pure module, no imports from db/auth — safe to unit-test and safe to
 *    import from route handlers, sitemap, and the feed generator.
 */

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

function evictIfNeeded(): void {
  while (store.size >= MAX_ENTRIES) {
    const eldest = store.keys().next().value;
    if (eldest === undefined) break;
    store.delete(eldest);
  }
}

/**
 * Return the cached value for `key` when present and unexpired, otherwise
 * call `loader`, store its result for `ttlMs`, and return it.
 */
export async function memo<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const value = await loader();
  evictIfNeeded();
  store.set(key, { value, expires: now + ttlMs });
  return value;
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
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/** Invalidate one key (used after writes to that specific resource). */
export function memoInvalidate(prefix: string, key: string): void {
  store.delete(`${prefix}:${key}`);
}

/** Invalidate every entry under a namespace (used after broad admin writes). */
export function memoInvalidateNamespace(prefix: string): void {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(`${prefix}:`)) store.delete(k);
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
}

/** Test helper: drop everything. */
export function memoClear(): void {
  store.clear();
}

/** Test helper: current number of live entries. */
export function memoSize(): number {
  return store.size;
}

// ── Namespaces and TTLs ─────────────────────────────────────────────────────

/** Catalog reads: 60 s keeps browsing snappy and still honors admin edits. */
export const CATALOG_TTL_MS = 60_000;
/** SEO/feed XML: 5 min; Merchant Center fetches daily anyway. */
export const SEO_XML_TTL_MS = 300_000;

export const NS = {
  products: "products",
  product: "product",
  categories: "categories",
  sitemap: "sitemap",
  feed: "feed",
} as const;

// Hard cap so pathological cache-key variance can't grow memory unbounded.
const MAX_ENTRIES = 500;
