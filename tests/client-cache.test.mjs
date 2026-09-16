/**
 * Tests for src/lib/clientCache.ts — the sessionStorage cache that lets pages
 * paint instantly from a previous visit.
 *
 * Two of its functions have to be used from very different places, and mixing
 * them up is what caused a render-phase fetch: `readCached` may be called during
 * render (it touches no network and schedules no state update), while
 * `cachedFetch({ forceRefresh: true })` belongs in a useEffect after mount.
 * These tests pin down both halves of that contract.
 *
 * Run: node --test tests/client-cache.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

// The module is TypeScript and the test runner is plain node, so run the probe
// through tsx in a subprocess and report the results back as JSON. The probe
// also stands in for the browser globals the module reaches for.
function probeCache() {
  const script = `
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      key: (i) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    };

    let fetchCalls = [];
    let failNext = false;
    globalThis.fetch = (url) => {
      fetchCalls.push(url);
      if (failNext) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, json: async () => ({ mark: "fresh" }) });
    };

    const { readCached, cachedFetch } = await import("./src/lib/clientCache.ts");
    const URL_A = "/api/categories";
    const out = {};

    // 1. Nothing cached, nothing fetched.
    out.emptyRead = readCached(URL_A);
    out.fetchCallsAfterEmptyRead = fetchCalls.length;

    // 2. Revalidate after mount: returns fresh data and rewrites the cache.
    out.refreshed = await cachedFetch(URL_A, { ttl: 60_000, forceRefresh: true });
    out.fetchCallsAfterRefresh = fetchCalls.length;
    out.keysAfterRefresh = [...store.keys()];

    // 3. The next render reads that cache synchronously, without a request.
    out.cachedRead = readCached(URL_A);
    out.fetchCallsAfterCachedRead = fetchCalls.length;

    // 4. Without forceRefresh a fresh entry short-circuits the network entirely.
    out.secondFetch = await cachedFetch(URL_A, { ttl: 60_000 });
    out.fetchCallsAfterSecondFetch = fetchCalls.length;

    // 5. Expiry: an out-of-date entry is ignored by readCached.
    store.set("wh-cache-" + URL_A, JSON.stringify({ data: { mark: "stale" }, expires: Date.now() - 1 }));
    out.expiredRead = readCached(URL_A);

    // 6. A failing response rejects, so callers can fall back.
    failNext = true;
    try {
      await cachedFetch(URL_A, { ttl: 60_000, forceRefresh: true });
      out.failedRefresh = "resolved";
    } catch (error) {
      out.failedRefresh = "threw: " + error.message;
    }

    console.log(JSON.stringify(out));
  `;

  const stdout = execFileSync("node", ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });
  return JSON.parse(stdout);
}

const out = probeCache();

describe("readCached", () => {
  it("returns null when nothing is cached", () => {
    assert.equal(out.emptyRead, null);
  });

  it("never issues a request — it is safe to call during render", () => {
    assert.equal(out.fetchCallsAfterEmptyRead, 0);
    assert.equal(out.fetchCallsAfterCachedRead, out.fetchCallsAfterRefresh);
  });

  it("returns the entry written by a background refresh", () => {
    assert.deepEqual(out.cachedRead, { mark: "fresh" });
  });

  it("ignores an expired entry", () => {
    assert.equal(out.expiredRead, null);
  });
});

describe("cachedFetch", () => {
  it("forceRefresh writes the cache key readCached looks for", () => {
    assert.deepEqual(out.refreshed, { mark: "fresh" });
    assert.equal(out.fetchCallsAfterRefresh, 1);
    assert.deepEqual(out.keysAfterRefresh, ["wh-cache-/api/categories"]);
  });

  it("serves a fresh entry without hitting the network", () => {
    assert.equal(out.fetchCallsAfterSecondFetch, out.fetchCallsAfterRefresh);
  });

  it("rejects when the response is not ok, so callers can fall back", () => {
    assert.match(out.failedRefresh, /^threw: Fetch failed: 500$/);
  });
});
