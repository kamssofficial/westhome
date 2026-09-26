import crypto from "crypto";

export interface S3Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

function readConfig(): Partial<S3Config> {
  return {
    endpoint: process.env.S3_ENDPOINT?.trim(),
    bucket: process.env.S3_DEFAULT_BUCKET?.trim(),
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim(),
    region: process.env.S3_REGION?.trim(),
  };
}

export function s3Configured(): boolean {
  const c = readConfig();
  return Boolean(c.endpoint && c.bucket && c.accessKeyId && c.secretAccessKey && c.region);
}

export function getS3Config(): S3Config {
  const c = readConfig();
  if (!c.endpoint || !c.bucket || !c.accessKeyId || !c.secretAccessKey || !c.region) {
    throw new Error("S3 storage is not fully configured.");
  }
  return c as S3Config;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(/%2F/g, "/");
}

function normalizeKey(key: string): string {
  const clean = key.replace(/^\/+/, "");
  if (!clean || clean.includes("\0") || clean.split("/").some((part) => part === "..")) {
    throw new Error("Invalid S3 object key.");
  }
  return clean;
}

function buildObjectUrl(config: S3Config, key: string): URL {
  const url = new URL(config.endpoint);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/${encodePathSegment(config.bucket)}/${encodePathSegment(key)}`;
  return url;
}

export function publicS3Url(key: string): string {
  return buildObjectUrl(getS3Config(), normalizeKey(key)).toString();
}

export function s3KeyFromUrl(value: string | undefined | null): string | null {
  if (!value || !s3Configured()) return null;
  try {
    const config = getS3Config();
    const actual = new URL(value);
    const endpoint = new URL(config.endpoint);
    if (actual.origin !== endpoint.origin) return null;

    const base = endpoint.pathname.replace(/\/+$/, "");
    const prefix = `${base}/${encodePathSegment(config.bucket)}/`;
    if (!actual.pathname.startsWith(prefix)) return null;

    const encodedKey = actual.pathname.slice(prefix.length);
    if (!encodedKey) return null;
    const key = encodedKey
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
    return normalizeKey(key);
  } catch {
    return null;
  }
}

function canonicalUri(config: S3Config, key: string): string {
  const basePath = new URL(config.endpoint).pathname.replace(/\/+$/, "");
  return `${basePath}/${encodePathSegment(config.bucket)}/${encodePathSegment(key)}`;
}

async function signedRequest(
  method: "PUT" | "DELETE" | "HEAD" | "GET",
  key: string,
  body?: Buffer,
  contentType?: string,
): Promise<Response> {
  const config = getS3Config();
  const url = buildObjectUrl(config, key);
  const host = url.host;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? Buffer.alloc(0));

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name].trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    canonicalUri(config, key),
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers,
    body: body ?? undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}

let healthCache: { ok: boolean; error?: string; checkedAt: number } | null = null;
const HEALTH_CACHE_MS = 2 * 60 * 1000;

export async function s3HealthCheck(force = false): Promise<{ ok: boolean; error?: string; checkedAt: number }> {
  if (!s3Configured()) {
    return { ok: false, error: "S3 credentials are not configured.", checkedAt: Date.now() };
  }
  if (!force && healthCache && Date.now() - healthCache.checkedAt < HEALTH_CACHE_MS) {
    return healthCache;
  }

  try {
    // The bucket is public-read, but a signed HEAD verifies the write credentials
    // and the endpoint without mutating any object.
    const probeKey = "_westhome_healthcheck.txt";
    let response = await signedRequest("HEAD", probeKey);
    if (response.status === 404) {
      const config = getS3Config();
      const bucketUrl = new URL(config.endpoint);
      const basePath = bucketUrl.pathname.replace(/\/+$/, "");
      bucketUrl.pathname = `${basePath}/${encodePathSegment(config.bucket)}`;
      const signed = await signedRequest("GET", "", undefined, undefined);
      response = signed;
    }
    const health = response.ok || response.status === 404
      ? { ok: true, checkedAt: Date.now() }
      : { ok: false, error: `S3 request failed with HTTP ${response.status}.`, checkedAt: Date.now() };
    healthCache = health;
    return health;
  } catch (error) {
    const health = {
      ok: false,
      error: error instanceof Error ? error.message : "S3 health check failed.",
      checkedAt: Date.now(),
    };
    healthCache = health;
    return health;
  }
}

export async function uploadToS3(
  folder: string,
  file: File | Buffer,
  filename: string,
): Promise<{ key: string; url: string; size: number; mimeType: string }> {
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const key = normalizeKey(`${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`);
  const mimeType =
    file instanceof File && file.type
      ? file.type
      : filename.toLowerCase().endsWith(".png")
        ? "image/png"
        : filename.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : filename.toLowerCase().endsWith(".gif")
            ? "image/gif"
            : "image/jpeg";

  const response = await signedRequest("PUT", key, buffer, mimeType);
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`S3 upload failed with HTTP ${response.status}: ${detail}`);
  }

  return { key, url: publicS3Url(key), size: buffer.byteLength, mimeType };
}

export async function deleteFromS3(key: string): Promise<void> {
  const response = await signedRequest("DELETE", normalizeKey(key));
  if (!response.ok && response.status !== 404) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`S3 delete failed with HTTP ${response.status}: ${detail}`);
  }
}
