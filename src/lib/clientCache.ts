const PREFIX = "wh-cache-";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const INFLIGHT = new Map<string, Promise<unknown>>();

interface CacheEntry<T> {
  data: T;
  expires: number;
}

/**
 * Get cached data or fetch fresh. Shows cached instantly, refreshes in background.
 *
 * Usage:
 *   const products = await cachedFetch("/api/products?featured=true", { ttl: 60_000 });
 */
export async function cachedFetch<T>(
  url: string,
  options?: { ttl?: number; forceRefresh?: boolean }
): Promise<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const key = PREFIX + url;
  const now = Date.now();

  // Return cached data immediately if valid
  if (!options?.forceRefresh) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (entry.expires > now) {
          return entry.data;
        }
      }
    } catch {}
  }

  // Share an in-flight request with every component asking for the same
  // resource during the current load. This removes duplicate catalog/settings
  // requests when Header, Settings, and Home mount together.
  const existing = INFLIGHT.get(key);
  if (existing) return existing as Promise<T>;

  const request = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data: T = await res.json();

    try {
      const entry: CacheEntry<T> = { data, expires: Date.now() + ttl };
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      clearExpiredCache();
      try {
        sessionStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + ttl }));
      } catch {}
    }

    return data;
  })();

  INFLIGHT.set(key, request);
  try {
    return await request;
  } finally {
    if (INFLIGHT.get(key) === request) INFLIGHT.delete(key);
  }
}

/**
 * Read a fresh cache entry synchronously and do nothing else.
 *
 * Safe to call during render (including inside a useState initializer): it never
 * fetches and never schedules an update, so it cannot produce the "state update on
 * a component that hasn't mounted yet" warning. Revalidate from a useEffect with
 * cachedFetch({ forceRefresh: true }) instead.
 */
export function readCached<T>(url: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + url);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.expires > Date.now()) return entry.data;
  } catch {}
  return null;
}

/**
 * Store a value the caller fetched itself.
 *
 * `cachedFetch` couples fetching and storing, which does not suit callers that
 * need their own request handling (auth redirects, silent background refreshes,
 * custom error states). Those fetch normally and hand the result here.
 */
export function writeCached<T>(url: string, data: T, ttl?: number): void {
  const entry: CacheEntry<T> = { data, expires: Date.now() + (ttl ?? DEFAULT_TTL) };
  try {
    sessionStorage.setItem(PREFIX + url, JSON.stringify(entry));
  } catch {
    // Quota exceeded — drop expired entries and retry once before giving up.
    clearExpiredCache();
    try {
      sessionStorage.setItem(PREFIX + url, JSON.stringify(entry));
    } catch {}
  }
}

/**
 * Clear all expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  for (const k of keys) {
    try {
      const entry: CacheEntry<any> = JSON.parse(sessionStorage.getItem(k) || "{}");
      if (!entry.expires || entry.expires <= now) {
        sessionStorage.removeItem(k);
      }
    } catch {
      sessionStorage.removeItem(k);
    }
  }
}

/**
 * Manually invalidate a cache entry
 */
export function invalidateCache(url: string) {
  sessionStorage.removeItem(PREFIX + url);
}
