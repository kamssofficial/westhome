/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 5 });
 *   const allowed = limiter.check(ip);
 *   if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *
 * In production on Vercel, each instance has its own memory so limits are
 * per-isolate.  This is sufficient to slow brute-force attacks; for strict
 * global limits use Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup so the map doesn't grow unbounded in long-lived processes
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Window duration in milliseconds (default: 60 000 = 1 minute) */
  windowMs?: number;
  /** Max requests per window (default: 10) */
  max?: number;
  /** Custom key function — defaults to extracting IP from x-forwarded-for or connection */
  keyFn?: (req: Request) => string;
}

export function rateLimit(opts: RateLimitOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 10;
  const keyFn = opts.keyFn ?? defaultKeyFn;

  cleanup();

  return {
    /** Returns true if the request is allowed, false if rate-limited. */
    check(req: Request): boolean {
      const key = keyFn(req);
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      entry.count++;
      return entry.count <= max;
    },

    /** Returns remaining requests in the current window. */
    remaining(req: Request): number {
      const key = keyFn(req);
      const entry = store.get(key);
      if (!entry || entry.resetAt <= Date.now()) return max;
      return Math.max(0, max - entry.count);
    },
  };
}

function defaultKeyFn(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}
