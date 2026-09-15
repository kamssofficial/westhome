const PREFIX = "wh-cache-";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

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

  // Fetch fresh data
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data: T = await res.json();

  // Cache it
  try {
    const entry: CacheEntry<T> = { data, expires: now + ttl };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — clear old entries and retry
    clearExpiredCache();
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, expires: now + ttl }));
    } catch {}
  }

  return data;
}

/**
 * Return cached data immediately (if available), then fetch fresh in background
 * and call onUpdate with the fresh data. Perfect for showing instantly on navigation.
 */
export function cachedFetchWithBackgroundRefresh<T>(
  url: string,
  options?: { ttl?: number; onUpdate?: (data: T) => void }
): T | null {
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const key = PREFIX + url;
  const now = Date.now();

  let cachedData: T | null = null;

  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (entry.expires > now) {
        cachedData = entry.data;
      }
    }
  } catch {}

  // Background refresh (fire-and-forget)
  if (options?.onUpdate) {
    fetch(url)
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data: any) => {
        if (data) {
          // Update cache
          try {
            sessionStorage.setItem(
              key,
              JSON.stringify({ data, expires: now + ttl })
            );
          } catch {}
          options.onUpdate!(data);
        }
      })
      .catch(() => {});
  }

  return cachedData;
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
