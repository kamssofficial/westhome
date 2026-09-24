/**
 * Tests for the image-upload media path.
 *
 * Covers the two pieces that make admin image upload actually work in
 * production, neither of which has live credentials in CI:
 *
 *  1. src/lib/r2.ts — Cloudflare R2 (S3-compatible) client wiring: endpoint
 *     construction, the PutObject/DeleteObject payloads, public URL building
 *     and key extraction. Exercised against a mocked @aws-sdk/client-s3.
 *  2. src/lib/imageMagic.ts — content-based type detection, so a file that
 *     merely *claims* to be an image is rejected.
 *
 * Run: node --experimental-test-module-mocks --test tests/media-upload.test.mjs
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// --- Mock the AWS SDK before r2.ts is imported ------------------------------
const sent = [];
class FakeS3Client {
  constructor(config) {
    this.config = config;
    sent.push({ type: "construct", config });
  }
  async send(command) {
    sent.push({ type: "send", name: command.constructor.name, input: command.input });
    return {};
  }
}
class PutObjectCommand {
  constructor(input) { this.input = input; }
}
class DeleteObjectCommand {
  constructor(input) { this.input = input; }
}
mock.module("@aws-sdk/client-s3", {
  namedExports: { S3Client: FakeS3Client, PutObjectCommand, DeleteObjectCommand },
});

const r2 = await import("../src/lib/r2.ts");
const magic = await import("../src/lib/imageMagic.ts");

const R2_ENV = {
  CLOUDFLARE_ACCOUNT_ID: "acct123",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "ak-test",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "sk-test",
  R2_BUCKET_NAME: "westhome-media",
  R2_PUBLIC_URL: "https://media.westhome.in/",
};

function setEnv(keys) {
  for (const k of [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
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

describe("imageMagic — content-based detection", () => {
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

describe("r2 — configuration detection", () => {
  beforeEach(() => { sent.length = 0; });
  afterEach(() => setEnv({}));

  it("reports unconfigured when no keys are present", () => {
    setEnv({});
    assert.equal(r2.r2Configured(), false);
  });

  it("requires the full credential set", () => {
    for (const key of [
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ]) {
      sent.length = 0;
      setEnv({ ...R2_ENV, [key]: undefined });
      assert.equal(r2.r2Configured(), false, `${key} is required`);
    }
  });

  it("treats a missing R2_PUBLIC_URL as configured but undeliverable", () => {
    // Deliberate split: the object can still be written, so uploads are
    // attempted, but uploadToR2 refuses to return an unserveable URL. This
    // keeps a half-configured bucket from silently 404-ing every image.
    const { R2_PUBLIC_URL: _drop, ...noPublic } = R2_ENV;
    setEnv(noPublic);
    assert.equal(r2.r2Configured(), true);
  });

  it("is configured when every key is present", () => {
    setEnv(R2_ENV);
    assert.equal(r2.r2Configured(), true);
  });
});

describe("r2 — public URL building", () => {
  beforeEach(() => { sent.length = 0; });
  afterEach(() => setEnv({}));

  it("joins the public base with the object key", () => {
    setEnv(R2_ENV);
    assert.equal(r2.r2PublicUrl("products/123-abc.png"), "https://media.westhome.in/products/123-abc.png");
  });

  it("tolerates a trailing slash on the base and a leading slash on the key", () => {
    setEnv(R2_ENV);
    assert.equal(r2.r2PublicUrl("/products/x.png"), "https://media.westhome.in/products/x.png");
  });
});

describe("r2 — uploadToR2", () => {
  beforeEach(() => { sent.length = 0; });
  afterEach(() => setEnv({}));

  it("PUTs the object to the account endpoint and returns the public URL", async () => {
    setEnv(R2_ENV);
    const result = await r2.uploadToR2("products", PNG, "shot.png", "image/png");

    const constructed = sent.find((s) => s.type === "construct");
    assert.ok(constructed, "S3 client was constructed");
    assert.equal(constructed.config.region, "auto");
    assert.equal(
      constructed.config.endpoint,
      "https://acct123.r2.cloudflarestorage.com",
      "endpoint is derived from the account id"
    );
    assert.equal(constructed.config.credentials.accessKeyId, "ak-test");

    const put = sent.find((s) => s.type === "send");
    assert.equal(put.name, "PutObjectCommand");
    assert.equal(put.input.Bucket, "westhome-media");
    assert.equal(put.input.Key, "products/shot.png");
    assert.equal(put.input.ContentType, "image/png");
    assert.ok(put.input.CacheControl.includes("immutable"), "catalog images are cached hard");

    assert.equal(result.url, "https://media.westhome.in/products/shot.png");
    assert.equal(result.key, "products/shot.png");
  });

  it("strips leading/trailing slashes from the folder", async () => {
    setEnv(R2_ENV);
    await r2.uploadToR2("/banners/", PNG, "hero.png", "image/png");
    const put = sent.find((s) => s.type === "send");
    assert.equal(put.input.Key, "banners/hero.png");
  });

  it("throws a clear error when the bucket public URL is missing", async () => {
    const { R2_PUBLIC_URL: _drop, ...noPublic } = R2_ENV;
    setEnv(noPublic);
    // Still "configured" for the client, but undeliverable — this must not
    // silently return a broken URL.
    await assert.rejects(
      () => r2.uploadToR2("products", PNG, "x.png", "image/png"),
      /R2_PUBLIC_URL/
    );
  });

  it("refuses to run unconfigured", async () => {
    setEnv({});
    await assert.rejects(() => r2.uploadToR2("products", PNG, "x.png", "image/png"), /not configured/i);
  });
});

describe("r2 — deleteFromR2", () => {
  beforeEach(() => { sent.length = 0; });
  afterEach(() => setEnv({}));

  it("deletes by bare key", async () => {
    setEnv(R2_ENV);
    await r2.deleteFromR2("products/old.png");
    const del = sent.find((s) => s.type === "send");
    assert.equal(del.name, "DeleteObjectCommand");
    assert.equal(del.input.Key, "products/old.png");
    assert.equal(del.input.Bucket, "westhome-media");
  });

  it("derives the key from a full public URL (the shape callers persist)", async () => {
    setEnv(R2_ENV);
    await r2.deleteFromR2("https://media.westhome.in/products/old.png");
    const del = sent.find((s) => s.type === "send");
    assert.equal(del.input.Key, "products/old.png");
  });

  it("is a no-op when R2 is not configured", async () => {
    setEnv({});
    await r2.deleteFromR2("products/old.png");
    assert.equal(sent.length, 0, "nothing sent when storage is absent");
  });
});
