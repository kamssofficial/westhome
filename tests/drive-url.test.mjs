/**
 * Tests for src/lib/driveUrl.ts — the module that owns how Drive media is
 * addressed, and the normalizer that routes it back through the image proxy.
 *
 * Why: production rows were rewritten from the /api/images/<id> proxy path to
 * https://lh3.googleusercontent.com/d/<id>, where anonymous hotlinks get
 * rate-limited and the browser discards the non-image body as an opaque
 * response — so the image never renders. Anything that displays or deletes
 * that media must understand both shapes and get back to the proxy.
 *
 * Run: node --test tests/drive-url.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ID = "1-8RwujmwlvQEx8Fjt6kgpxSvhuJQTnDu";
const CDN = `https://lh3.googleusercontent.com/d/${ID}`;
const PROXY = `/api/images/${ID}`;

// One table drives both the probe and the assertions, so a case cannot drift
// out of sync with its expectation.
const CASES = [
  { label: "proxy path", url: PROXY, id: ID, proxied: PROXY },
  { label: "cdn url", url: CDN, id: ID, proxied: PROXY },
  { label: "cdn url with a size suffix", url: `${CDN}=s1600`, id: ID, proxied: PROXY },
  { label: "cdn url with a fragment", url: `${CDN}#frag`, id: ID, proxied: PROXY },
  { label: "cdn url with padding", url: `  ${CDN}  `, id: ID, proxied: PROXY },
  { label: "legacy local file under the proxy path", url: "/api/images/banners/hero-living-room.png", id: null, proxied: "/api/images/banners/hero-living-room.png" },
  { label: "proxy id decorated with an image extension", url: "/api/images/1VztGVSkhQpSO4PzWSJs2Fn4d0HB43dLQ.webp", id: "1VztGVSkhQpSO4PzWSJs2Fn4d0HB43dLQ", proxied: "/api/images/1VztGVSkhQpSO4PzWSJs2Fn4d0HB43dLQ" },
  { label: "short local filename keeps its extension", url: "/api/images/hero.webp", id: "hero.webp", proxied: "/api/images/hero.webp" },
  { label: "committed static asset", url: "/images/logo/westhome-logo-white.png", id: null, proxied: "/images/logo/westhome-logo-white.png" },
  { label: "a different drive url shape", url: "https://drive.google.com/uc?id=abc&export=view", id: null, proxied: "https://drive.google.com/uc?id=abc&export=view" },
  { label: "an empty string", url: "", id: null, proxied: null },
  { label: "null", url: null, id: null, proxied: null },
];

// The module is TypeScript and the runner is plain node — load it through tsx
// in a subprocess, as the other lib tests in this repo do.
function probe(urls) {
  const script = `
    import { driveFileIdFromUrl, proxiedMediaUrl } from "./src/lib/driveUrl.ts";
    const urls = ${JSON.stringify(urls)};
    console.log(JSON.stringify({
      ids: urls.map(driveFileIdFromUrl),
      proxied: urls.map(proxiedMediaUrl),
      absentId: driveFileIdFromUrl(),
      absentProxied: proxiedMediaUrl(),
    }));
  `;
  const stdout = execFileSync("node", ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });
  return JSON.parse(stdout);
}

const results = probe(CASES.map((c) => c.url));

describe("media url handling", () => {
  CASES.forEach(({ label, id, proxied }, i) => {
    it(`resolves ${label}`, () => {
      assert.equal(results.ids[i], id);
      assert.equal(results.proxied[i], proxied);
    });
  });

  it("handles absent input without throwing", () => {
    assert.equal(results.absentId, null);
    assert.equal(results.absentProxied, null);
  });
});
