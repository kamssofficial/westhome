import { uploadToDrive, deleteFromDrive } from "@/lib/gdrive";
import { AwsClient } from "aws4fetch";

const VERCELL_BLOB_API = "https://vercel.com/api/blob";

export interface UploadedMedia {
  url: string;
  pathname: string;
  fileId?: string;
  provider: "r2" | "blob" | "drive" | "local";
}

/* ------------------------------------------------------------------ */
/*  Cloudflare R2                                                      */
/* ------------------------------------------------------------------ */

function r2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_BASE_URL
  );
}

function r2Client() {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  });
}

function r2Endpoint(key: string): string {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
}

async function r2Put(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!r2Configured()) throw new Error("R2 not configured");
  const res = await r2Client().fetch(r2Endpoint(key), {
    method: "PUT",
    body: new Uint8Array(body),
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const base = process.env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, "");
  return `${base}/${key}`;
}

async function r2Del(url: string): Promise<void> {
  if (!r2Configured()) return;
  const base = process.env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, "");
  if (!url.startsWith(base)) return;
  const key = url.slice(base.length + 1);
  const res = await r2Client().fetch(r2Endpoint(key), { method: "DELETE" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`R2 delete failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Vercel Blob                                                        */
/* ------------------------------------------------------------------ */

function blobStoreIdFromToken(token: string): string {
  return token.split("_")[3] || "";
}

async function vercelBlobPut(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const storeId = blobStoreIdFromToken(token);
  const pathname = key.replace(/^\/+/, "");
  const params = new URLSearchParams({ pathname });
  const res = await fetch(`${VERCELL_BLOB_API}/put?${params.toString()}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-vercel-blob-store-id": storeId,
      "x-vercel-blob-access": "public",
      "x-content-type": contentType || "application/octet-stream",
      "x-add-random-suffix": "0",
      "x-api-version": "12",
      "x-api-blob-request-id": `${storeId}:${Date.now()}:${Math.random()
        .toString(16)
        .slice(2)}`,
      "x-api-blob-request-attempt": "0",
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Vercel Blob upload failed (${res.status}): ${detail.slice(0, 200)}`
    );
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Vercel Blob upload returned no URL");
  }
  return data.url;
}

async function vercelBlobDel(url: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  const storeId = blobStoreIdFromToken(token);
  const res = await fetch(`${VERCELL_BLOB_API}?id=${encodeURIComponent(storeId)}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-vercel-blob-store-id": storeId,
      "x-api-version": "12",
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Vercel Blob delete failed (${res.status}): ${detail.slice(0, 200)}`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Upload — tries each backend in order, falls back to local disk     */
/* ------------------------------------------------------------------ */

/**
 * Upload a file to the first configured storage backend, in order of
 * preference: Cloudflare R2 (cheapest, fastest, no egress fees),
 * then Vercel Blob, then Google Drive, then local disk (dev only).
 *
 * When no backend is configured in production, throws a clear error
 * listing exactly which backends are missing.
 */
export async function uploadMedia(
  folder: string,
  file: File,
  filename: string
): Promise<UploadedMedia> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;

  // 1. Cloudflare R2 (preferred — cheapest, no egress)
  if (r2Configured()) {
    try {
      const url = await r2Put(key, buffer, file.type);
      return { url, pathname: key, provider: "r2" };
    } catch (err: any) {
      console.error("R2 upload failed, falling back:", err?.message || err);
    }
  }

  // 2. Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const url = await vercelBlobPut(key, buffer, file.type);
      return { url, pathname: key, provider: "blob" };
    } catch (err: any) {
      console.error("Vercel Blob upload failed, falling back:", err?.message || err);
    }
  }

  // 3. Google Drive
  const driveConfigured = !!(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_CREDENTIALS_JSON);
  if (driveConfigured) {
    try {
      const result = await uploadToDrive(folder, file, filename);
      if (result && result.fileId) {
        return {
          url: `/api/images/${result.fileId}`,
          pathname: result.fileId,
          fileId: result.fileId,
          provider: "drive",
        };
      }
      console.warn("Drive upload returned no fileId, falling back");
    } catch (err: any) {
      console.error("Drive upload failed, falling back:", err?.message || err);
    }
  }

  // 4. Local disk (dev only)
  if (process.env.NODE_ENV === "production") {
    const missing: string[] = [];
    if (!r2Configured()) missing.push("Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL)");
    if (!process.env.BLOB_READ_WRITE_TOKEN) missing.push("Vercel Blob (BLOB_READ_WRITE_TOKEN)");
    if (!driveConfigured) missing.push("Google Drive (GOOGLE_CREDENTIALS_PATH/JSON)");
    throw new Error(
      `Storage is not configured. No backend available: ${missing.join(", ")}.`
    );
  }

  const fs = await import("fs");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "images", folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return { url: `/images/${folder}/${filename}`, pathname: `${folder}/${filename}`, provider: "local" };
}

/* ------------------------------------------------------------------ */
/*  Delete — best-effort across all backends                           */
/* ------------------------------------------------------------------ */

/**
 * Best-effort deletion across all backends. Never throws — callers can
 * rely on cleanup failing silently rather than breaking the primary request.
 */
export async function deleteMedia(
  media: { fileId?: string; url?: string } | null | undefined
): Promise<void> {
  if (!media) return;

  // Drive (fileId-based)
  if (media.fileId) {
    try {
      await deleteFromDrive(media.fileId);
      return;
    } catch (err: any) {
      console.error("Drive delete failed:", err?.message || err);
    }
  }

  if (!media.url) return;

  // R2 (public base URL match)
  if (r2Configured() && media.url.startsWith(process.env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, ""))) {
    try {
      await r2Del(media.url);
      return;
    } catch (err: any) {
      console.error("R2 delete failed:", err?.message || err);
    }
  }

  // Vercel Blob (URL match)
  if (media.url.includes("blob.vercel-storage.com")) {
    try {
      await vercelBlobDel(media.url);
    } catch (err: any) {
      console.error("Vercel Blob delete failed:", err?.message || err);
    }
  }
}
