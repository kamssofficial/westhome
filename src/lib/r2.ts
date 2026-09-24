import type { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 — the production media backend.
 *
 * R2 is S3-compatible, so the AWS SDK talks to it unchanged, and unlike Drive
 * it serves a real public CDN URL with no per-file sharing permissions to
 * manage. Google Drive support still exists (see ./gdrive) for installations
 * that already have OAuth credentials; this is the path new installs use.
 *
 * The client is created lazily and memoized: importing this module must never
 * throw, because every caller (including the admin status check) imports it in
 * environments where R2 may not be configured yet.
 */

let client: S3Client | null = null;
let clientKey = "";

function config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function r2Configured(): boolean {
  return config() !== null;
}

/** Public base URL for delivered objects, e.g. https://media.example.com */
function publicBase(): string | null {
  const url = process.env.R2_PUBLIC_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

export function r2PublicUrl(key: string): string | null {
  const base = publicBase();
  return base ? `${base}/${key.replace(/^\/+/, "")}` : null;
}

async function getClient(): Promise<S3Client | null> {
  const cfg = config();
  if (!cfg) return null;
  // Re-create only when the credential set changes (env can be edited in
  // development without a full restart).
  const key = `${cfg.accountId}|${cfg.accessKeyId}|${process.env.R2_ENDPOINT || ""}`;
  if (client && clientKey === key) return client;
  const { S3Client: Ctor } = await import("@aws-sdk/client-s3");
  // R2_ENDPOINT is an escape hatch for any other S3-compatible endpoint
  // (MinIO, another provider, or a local server in tests). Custom endpoints
  // need path-style addressing, because `bucket.<custom-host>` is not
  // resolvable outside R2's own DNS.
  const customEndpoint = process.env.R2_ENDPOINT;
  client = new Ctor({
    region: "auto",
    endpoint: customEndpoint || `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: !!customEndpoint,
  });
  clientKey = key;
  return client;
}

export interface R2UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export async function uploadToR2(
  folder: string,
  file: File | Buffer,
  filename: string,
  mimeType: string
): Promise<R2UploadResult> {
  const cfg = config();
  const s3 = await getClient();
  if (!cfg || !s3) throw new Error("R2 is not configured");

  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;
  const body = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
      // Catalog images are content-addressed by filename, never mutated in
      // place, so they can be cached hard at the edge.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const url = r2PublicUrl(key);
  if (!url) {
    throw new Error(
      "R2_BUCKET_NAME is set but R2_PUBLIC_URL is missing. Add the bucket's public delivery URL so uploaded images can be displayed."
    );
  }
  return { url, key, bucket: cfg.bucket };
}

export async function deleteFromR2(keyOrUrl: string): Promise<void> {
  const cfg = config();
  const s3 = await getClient();
  if (!cfg || !s3) return;

  // Accept a full public URL as well as a bare key.
  const base = publicBase();
  let key = keyOrUrl;
  if (base && key.startsWith(base)) key = key.slice(base.length);
  key = key.replace(/^\/+/, "");
  if (!key) return;

  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}
