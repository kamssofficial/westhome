/**
 * End-to-end test for the R2 media path.
 *
 * Unlike tests/media-upload.test.mjs (which mocks the SDK to assert command
 * payloads), this runs the *real* @aws-sdk/client-s3 against a local
 * S3-compatible HTTP server. It proves the parts a mock cannot: that the
 * client actually signs and sends a request, that the response parses, and
 * that the public URL we hand back matches where the bytes landed.
 *
 * Run: node --test tests/r2-integration.test.mjs
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
  "1f15c4890000000d4944415478da63fccf c0500f0004850181".replace(/\s/g, "") +
  "0000000049454e44ae426082",
  "hex"
);

/** Records every request and answers like a minimal S3 endpoint. */
function startFakeS3() {
  const objects = new Map();
  const requests = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });
      const key = decodeURIComponent(req.url.split("?")[0]).replace(/^\/[^/]+\//, "");
      if (req.method === "PUT") {
        objects.set(key, body);
        res.writeHead(200, { etag: '"deadbeef"' });
        res.end();
      } else if (req.method === "DELETE") {
        objects.delete(key);
        res.writeHead(204);
        res.end();
      } else if (req.method === "GET" || req.method === "HEAD") {
        if (!objects.has(key)) {
          res.writeHead(404);
          res.end();
        } else {
          res.writeHead(200, { "content-type": "image/png" });
          res.end(objects.get(key));
        }
      } else {
        res.writeHead(405);
        res.end();
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port, objects, requests });
    });
  });
}

let s3;
let r2;
let prevEnv = {};

before(async () => {
  s3 = await startFakeS3();
  r2 = await import("../src/lib/r2.ts");
  prevEnv = { ...process.env };
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-e2e";
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "ak-e2e";
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "sk-e2e";
  process.env.R2_BUCKET_NAME = "westhome-e2e";
  process.env.R2_PUBLIC_URL = "https://cdn.westhome.in";
  process.env.R2_ENDPOINT = `http://127.0.0.1:${s3.port}`;
});

after(async () => {
  process.env = prevEnv;
  await new Promise((resolve) => s3.server.close(resolve));
});

describe("R2 upload over the wire", () => {
  it("uploads bytes to the bucket and returns a retrievable public URL", async () => {
    const result = await r2.uploadToR2("products", PNG, "hero-shot.png", "image/png");

    // 1. The bytes really arrived, unmodified, at the right key.
    const stored = s3.objects.get("products/hero-shot.png");
    assert.ok(stored, "object was stored under the expected key");
    assert.ok(stored.equals(PNG), "stored bytes are byte-identical to what was sent");

    // 2. The request was a well-formed, authenticated S3 PUT.
    //    The SDK appends bookkeeping params (?x-id=PutObject), so compare paths.
    const pathOf = (r) => r.url.split("?")[0];
    const put = s3.requests.find((r) => r.method === "PUT");
    assert.ok(put, "a PUT was issued");
    assert.equal(pathOf(put), "/westhome-e2e/products/hero-shot.png", "path-style addressing used");
    assert.equal(put.headers["content-type"], "image/png");
    assert.match(String(put.headers.authorization), /^AWS4-HMAC-SHA256/, "request was SigV4-signed");
    // The credential scope proves the configured key was actually used.
    assert.match(String(put.headers.authorization), /Credential=ak-e2e\/.*\/s3\/aws4_request/);

    // 3. The URL we return to the database is the delivery URL for that key.
    assert.equal(result.url, "https://cdn.westhome.in/products/hero-shot.png");
    assert.equal(result.bucket, "westhome-e2e");
  });

  it("deletes by public URL, the way product deletion calls it", async () => {
    await r2.uploadToR2("products", PNG, "to-delete.png", "image/png");
    assert.ok(s3.objects.has("products/to-delete.png"));

    // Callers only persist the public URL, so delete must recover the key.
    await r2.deleteFromR2("https://cdn.westhome.in/products/to-delete.png");

    const del = s3.requests.filter((r) => r.method === "DELETE").pop();
    assert.ok(del, "a DELETE was issued");
    assert.equal(del.url.split("?")[0], "/westhome-e2e/products/to-delete.png");
    assert.ok(!s3.objects.has("products/to-delete.png"), "object is gone from the bucket");
  });
});
