import { uploadToDrive, deleteFromDrive } from "@/lib/gdrive";

const VERCELL_BLOB_API = "https://vercel.com/api/blob";

export interface UploadedMedia {
  url: string;
  pathname: string;
  fileId?: string;
  provider: "drive" | "blob" | "local";
}

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

/**
 * Upload a file to the first configured storage backend, in order of
 * preference: Google Drive (served via the authenticated /api/images proxy),
 * then Vercel Blob (raw HTTP API, no SDK dependency), then local disk
 * (development only — never persists on Vercel serverless instances).
 *
 * When no backend is configured, production deployments throw a clear
 * "Storage is not configured" error instead of silently writing to
 * ephemeral local disk.
 */
export async function uploadMedia(
  folder: string,
  file: File,
  filename: string
): Promise<UploadedMedia> {
  const buffer = Buffer.from(await file.arrayBuffer());
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
    } catch (driveErr: any) {
      console.error("Drive upload failed, falling back:", driveErr?.message || driveErr);
    }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const pathname = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;
      const url = await vercelBlobPut(pathname, buffer, file.type);
      return { url, pathname, provider: "blob" };
    } catch (blobErr: any) {
      console.error("Vercel Blob upload failed, falling back:", blobErr?.message || blobErr);
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Storage is not configured. Set GOOGLE_CREDENTIALS_* or BLOB_READ_WRITE_TOKEN env vars."
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

/**
 * Best-effort deletion across all backends. Never throws — callers can rely
 * on cleanup failing silently rather than breaking the primary request.
 */
export async function deleteMedia(
  media: { fileId?: string; url?: string } | null | undefined
): Promise<void> {
  if (!media) return;
  if (media.fileId) {
    try {
      await deleteFromDrive(media.fileId);
      return;
    } catch (err: any) {
      console.error("Drive delete failed:", err?.message || err);
    }
  }
  if (media.url && media.url.includes("blob.vercel-storage.com")) {
    try {
      await vercelBlobDel(media.url);
    } catch (err: any) {
      console.error("Vercel Blob delete failed:", err?.message || err);
    }
  }
}