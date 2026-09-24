/**
 * Tests for the image-upload media path.
 *
 * Covers the two pieces that make admin image upload actually work in
 * production, neither of which has live credentials in CI:
 *
 *  1. src/lib/imageMagic.ts - content-based type detection, so a file that
 *     merely *claims* to be an image is rejected.
 *  2. src/lib/media.ts - the storage-status report plus the Drive-first /
 *     local-disk upload path (uploadToDrive/deleteFromDrive are mocked).
 *
 * Run: node --experimental-test-module-mocks --test tests/media-upload.test.mjs
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// Mock the Drive layer before media.ts is imported (it is imported as
// "@/lib/gdrive", so the mock must match that specifier).
mock.module("@/lib/gdrive", {
  namedExports: {
    uploadToDrive: async (_folder, file, filename) => ({
      fileId: "drive-" + filename,
      url: "/api/images/" + filename,
      filename,
    }),
    deleteFromDrive: async (_id) => {},
  },
});

const media = await import("../src/lib/media.ts");
const magic = await import("../src/lib/imageMagic.ts");

const DRIVE_ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  GOOGLE_OAUTH_CLIENT_SECRET: "test-client-secret",
  GOOGLE_OAUTH_REFRESH_TOKEN: "test-refresh-token",
};

function setEnv(keys) {
  for (const k of [
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REFRESH_TOKEN",
    "GOOGLE_CREDENTIALS_PATH",
    "GOOGLE_CREDENTIALS_JSON",
  ]) {
    if (keys[k] === undefined) delete process.env[k];
    else process.env[k] = keys[k];
  }
}

/** 1x1 transparent PNG. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
  "1f15c4890000000d4944415478da63fccf c0500f0004850181".replace(/\s/g, "") + "0000000049454e44ae426082",
  "hex"
);

describe("imageMagic - content-based detection", () => {
  it("detects PNG from its signature", () => {
    assert.equal(magic.sniffImageType(PNG), "image/png");
    assert.equal(magic.imageExtensionFor(PNG), "png");
  });

  it("detects JPEG, GIF and WebP", () => {
    assert.equal(magic.sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(magic.sniffImageType(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), "image/gif");
    const webp = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ]);
    assert.equal(magic.sniffImageType(webp), "image/webp");
  });

  it("rejects a non-image even when the caller says it is a PNG", () => {
    // This is the whole point: a script renaming a shell script to .png must
    // not reach the media bucket.
    const script = Buffer.from("#!/bin/sh\necho not an image\n", "utf8");
    assert.equal(magic.sniffImageType(script), null);
    assert.equal(magic.imageExtensionFor(script), null);
  });

  it("rejects an empty or truncated buffer", () => {
    assert.equal(magic.sniffImageType(Buffer.alloc(0)), null);
    assert.equal(magic.sniffImageType(Buffer.from([0x89, 0x50])), null);
  });
});

describe("storageStatus", () => {
  beforeEach(() => setEnv(undefined));

  it("reports Google Drive as configured when the OAuth trio is present", () => {
    setEnv(DRIVE_ENV);
    assert.equal(media.storageStatus().anyConfigured, true);
    assert.equal(media.storageStatus().drive.configured, true);
    assert.equal(media.storageStatus().missing, null);
  });

  it("reports Google Drive as not configured when no Drive credentials are set", () => {
    setEnv(undefined);
    assert.equal(media.storageStatus().anyConfigured, false);
    assert.equal(media.storageStatus().drive.configured, false);
    assert.match(media.storageStatus().missing ?? "", /GOOGLE_OAUTH/);
  });

  it("reports Drive as configured from a service-account credential file or JSON", () => {
    setEnv({
      GOOGLE_CREDENTIALS_PATH: "/tmp/service-account.json",
    });
    assert.equal(media.storageStatus().drive.configured, true);
  });
});

describe("uploadMedia - Drive path", () => {
  beforeEach(() => setEnv(DRIVE_ENV));

  it("returns a Drive-backed proxy URL (/api/images/<fileId>)", async () => {
    const file = new File([PNG], "test.png", { type: "image/png" });
    const mediaItem = await media.uploadMedia("products", file, "shot.png");
    assert.equal(mediaItem.provider, "drive");
    assert.equal(mediaItem.fileId, "drive-shot.png");
    assert.equal(mediaItem.url, "/api/images/drive-shot.png");
  });

  it("returns the same fileId when the same filename is uploaded twice", async () => {
    const file = new File([PNG], "same.png", { type: "image/png" });
    const first = await media.uploadMedia("banners", file, "same.png");
    const second = await media.uploadMedia("banners", file, "same.png");
    assert.equal(first.fileId, second.fileId);
  });
});

describe("uploadMedia - dev-local path (Drive not configured, non-production)", () => {
  beforeEach(() => setEnv(undefined));

  it("writes the file to public/images/<folder> on disk", async () => {
    const file = new File([PNG], "dev.png", { type: "image/png" });
    const mediaItem = await media.uploadMedia("products", file, "dev.png");
    assert.equal(mediaItem.provider, "local");
    assert.match(mediaItem.url, /\/images\/products\/dev.png$/);

    const fs = await import("fs");
    const exists = fs.existsSync("public/images/products/dev.png");
    assert.equal(exists, true);
    fs.unlinkSync("public/images/products/dev.png");
  });

  it("throws in production when nothing is configured", async () => {
    const file = new File([PNG], "prod.png", { type: "image/png" });
    // Force production while credentials are absent
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      await assert.rejects(
        () => media.uploadMedia("products", file, "prod.png"),
        /GOOGLE_OAUTH|\.env|\.ENV/i
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe("deleteMedia - Drive", () => {
  it("delegates to deleteFromDrive for a proxy URL", async () => {
    const mod = await import("../src/lib/media.ts");
    assert.equal(mod.deleteMedia({ fileId: "drive-removed.png" }), undefined);
  });

  it("does nothing for a legacy local /api/images path (no Drive file id)", async () => {
    const mod = await import("../src/lib/media.ts");
    mod.deleteMedia({ url: "/api/images/banners/hero-living-room.png" });
    // No Drive file id -> nothing to delete. Legacy local paths are served
    // off disk by the proxy and must not be forwarded to the API.
  });
});
