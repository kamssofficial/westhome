/**
 * Tests for src/lib/categoryImages.ts — normalizeImageUrl, the display-URL
 * rewrite that routes legacy raw Google Drive image URLs through the WebP
 * image proxy at /api/images/<fileId>.
 *
 * Run: node --test tests/image-url-normalizer.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── Inline the pure logic for direct testing ────────────────────────────────
// (avoids ESM/TS import issues — same code as categoryImages.ts, tested in
// situ; keep in sync with the source when it changes)

export function normalizeImageUrl(url) {
  if (!url) return url ?? null;

  // Already proxied (new uploads) or another app-local asset — leave as is.
  if (url.startsWith("/")) return url;

  // Raw Drive delivery host: https://lh3.googleusercontent.com/d/<fileId>[=wNNN]
  const driveDirect = url.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})(?:[=?].*)?$/);
  if (driveDirect) return `/api/images/${driveDirect[1]}`;

  // Legacy share shape: https://drive.google.com/uc?id=<fileId>&export=view|download
  const driveUc = url.match(/^https:\/\/drive\.google\.com\/uc\?id=([A-Za-z0-9_-]{10,})(?:&.*)?$/);
  if (driveUc) return `/api/images/${driveUc[1]}`;

  // Any other absolute URL (e.g. Cloudflare-hosted media) stays untouched.
  return url;
}

// ── Raw Drive delivery host ─────────────────────────────────────────────────

describe("normalizeImageUrl — raw lh3.googleusercontent URLs", () => {
  it("rewrites the plain /d/<id> shape to the proxy", () => {
    assert.equal(
      normalizeImageUrl("https://lh3.googleusercontent.com/d/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"),
      "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"
    );
  });

  it("strips the =wNNN size suffix (image is re-served content-negotiated)", () => {
    assert.equal(
      normalizeImageUrl("https://lh3.googleusercontent.com/d/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt=w3840"),
      "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"
    );
  });

  it("strips query-style parameters (?w=…)", () => {
    assert.equal(
      normalizeImageUrl("https://lh3.googleusercontent.com/d/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt?w=1200"),
      "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"
    );
  });

  it("handles hyphen/underscore Drive IDs", () => {
    assert.equal(
      normalizeImageUrl("https://lh3.googleusercontent.com/d/1a2B3c4D5e6F7g8H9i-J_k"),
      "/api/images/1a2B3c4D5e6F7g8H9i-J_k"
    );
  });
});

// ── Legacy share shape ──────────────────────────────────────────────────────

describe("normalizeImageUrl — drive.google.com/uc URLs", () => {
  it("rewrites uc?id=<id>&export=view", () => {
    assert.equal(
      normalizeImageUrl("https://drive.google.com/uc?id=1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt&export=view"),
      "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"
    );
  });

  it("rewrites uc?id=<id>&export=download", () => {
    assert.equal(
      normalizeImageUrl("https://drive.google.com/uc?id=1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt&export=download"),
      "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"
    );
  });

  it("rewrites bare uc?id=<id>", () => {
    assert.equal(
      normalizeImageUrl("https://drive.google.com/uc?id=1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"),
      "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"
    );
  });
});

// ── URLs that must NOT change ───────────────────────────────────────────────

describe("normalizeImageUrl — passthrough cases", () => {
  it("leaves app-local /api/images uploads alone", () => {
    assert.equal(normalizeImageUrl("/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt"), "/api/images/1EGkbefqxdQi0ZoRHLAEAMSNPfjdPgxYt");
  });

  it("leaves local static assets alone", () => {
    assert.equal(normalizeImageUrl("/images/banners/hero-living-room.png"), "/images/banners/hero-living-room.png");
    assert.equal(normalizeImageUrl("/images/products/frame-tiger-illustration.png"), "/images/products/frame-tiger-illustration.png");
  });

  it("leaves non-Drive absolute URLs alone", () => {
    assert.equal(
      normalizeImageUrl("https://images.westhome.in/products/carpet.jpg"),
      "https://images.westhome.in/products/carpet.jpg"
    );
  });

  it("does not rewrite a googleusercontent URL on a different path", () => {
    // Only the /d/ delivery shape is proxied; other lh3 paths are untouched.
    const url = "https://lh3.googleusercontent.com/a/ACg8ocJabc123=s96-c";
    assert.equal(normalizeImageUrl(url), url);
  });

  it("returns null/undefined-like input unchanged", () => {
    assert.equal(normalizeImageUrl(null), null);
    assert.equal(normalizeImageUrl(undefined), null);
    assert.equal(normalizeImageUrl(""), "");
  });

  it("does not match a too-short ID (10+ chars required)", () => {
    const url = "https://lh3.googleusercontent.com/d/short";
    assert.equal(normalizeImageUrl(url), url);
  });
});
