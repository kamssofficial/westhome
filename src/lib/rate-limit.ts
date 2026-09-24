/**
 * Rate limiter for API endpoints.
 *
 * With GCP Memorystore (Redis) configured (MEMORYSTORE_HOST set), limits are
 * GLOBAL across every instance via the shared Redis limiter in redis.ts.
 * Without Redis, this falls back to the original per-process in-memory
 * limiter (per-instance limits, reset on restart) — the app must keep its
 * protection even before the cache is provisioned.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 5 });
 *   const allowed = await limiter.checkAsync(req);
 *   if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *
 * The async variant is preferred; check() remains for any caller that cannot
 * await, and always uses the in-memory path.
 */

// NOTE: the explicit .ts extension is required for `node --test` (raw ESM
// resolution of tests/redis-lib.test.mjs), and is equally valid for the Next
// bundler. Keep both importers of ./redis using the same explicit specifier.
import { checkRateLimit as redisCheckRateLimit, MEMORYSTORE_CONFIGURED } from "./redis.ts";

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
    /**
     * Shared, async limit check. Global across instances when Redis is
     * configured (fail-open if Redis is unreachable); otherwise it uses the
     * in-memory fallback below.
     */
    async checkAsync(req: Request): Promise<boolean> {
      if (MEMORYSTORE_CONFIGURED) {
        return redisCheckRateLimit(`api:${keyFn(req)}`, max, windowMs);
      }
      return this.check(req);
    },

    /** Synchronous, per-instance check (in-memory only). */
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
