// Cloudflare R2 object storage client (S3-compatible API via aws4fetch).
// Replaces @vercel/blob for image/media uploads.
//
// Required environment variables (set in Vercel + local .env):
//   R2_ACCOUNT_ID          - Cloudflare account ID
//   R2_ACCESS_KEY_ID       - R2 API token access key
//   R2_SECRET_ACCESS_KEY   - R2 API token secret
//   R2_BUCKET              - bucket name (e.g. "westhome-media")
//   R2_PUBLIC_BASE_URL     - public base URL: custom domain (https://images.westhome.in)
//                            or r2.dev (https://pub-<hash>.r2.dev)
//
// When these are unset (local dev), callers fall back to the local filesystem.

import { AwsClient } from "aws4fetch";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_BASE_URL);
}

let r2Client: AwsClient | null = null;

function getClient(): AwsClient {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured (missing R2_* environment variables)");
  }
  if (!r2Client) {
    r2Client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    });
  }
  return r2Client;
}

function endpointFor(key: string): string {
  const base = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function r2PublicUrl(key: string): string {
  const base = R2_PUBLIC_BASE_URL!.replace(/\/+$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Upload an object and return its public URL. */
export async function r2Put(
  key: string,
  body: BodyInit,
  contentType: string = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const cleanKey = key.replace(/^\/+/, "");
  const res = await getClient().fetch(endpointFor(cleanKey), {
    method: "PUT",
    body,
    // Keys are timestamped + random, so objects are immutable once written.
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 upload failed for ${cleanKey}: ${res.status} ${detail.slice(0, 200)}`);
  }
  return { key: cleanKey, url: r2PublicUrl(cleanKey) };
}
