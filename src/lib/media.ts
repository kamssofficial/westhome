import { uploadToDrive, deleteFromDrive } from "@/lib/gdrive";
import { uploadToR2, deleteFromR2, r2Configured, r2PublicUrl } from "@/lib/r2";

export interface UploadedMedia {
  /**
   * How the storefront should reach this file. Storage-native public URLs
   * (R2) are served straight from the CDN; Drive-backed media keeps the
   * `/api/images/<id>` proxy because Drive delivery links are not stable.
   */
  url: string;
  pathname: string;
  fileId?: string;
  storageKey?: string;
  provider: "r2" | "drive" | "local";
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

function oauthConfigured() {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

function driveConfigured() {
  return !!(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_CREDENTIALS_JSON || oauthConfigured());
}

/**
 * One place the UI and the upload route can ask "can this server store
 * images right now?" — and, when the answer is no, exactly which keys to set.
 */
export function storageStatus() {
  const r2 = r2Configured();
  const drive = driveConfigured();
  const configured = r2 || drive;
  return {
    r2: { configured: r2 },
    drive: { configured: drive },
    anyConfigured: configured,
    // Surfaced verbatim in the admin so a failed upload explains itself
    // instead of showing a bare "Upload failed (503)".
    missing: configured
      ? null
      : r2
        ? "Set R2_PUBLIC_URL to the bucket's public delivery URL."
        : "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL (Cloudflare R2).",
  };
}

/* ------------------------------------------------------------------ */
/*  Storage selection                                                   */
/* ------------------------------------------------------------------ */

/**
 * Provider order: R2, then Drive, then local disk.
 *
 * R2 leads because its objects are public CDN URLs — no per-file sharing
 * toggles, nothing to rotate. Drive is kept for installs that already run on
 * it. Local disk is a development convenience only: redeploys wipe it and
 * serverless runtimes have a read-only filesystem, so it must never be the
 * chosen path in production.
 */
export async function uploadMedia(folder: string, file: File, filename: string): Promise<UploadedMedia> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;
  const mimeType = file.type || "application/octet-stream";

  if (r2Configured()) {
    const result = await uploadToR2(folder, file, filename, mimeType);
    return { url: result.url, pathname: result.key, storageKey: result.key, provider: "r2" };
  }

  if (driveConfigured()) {
    const result = await uploadToDrive(folder, file, filename);
    if (result?.fileId) {
      return { url: `/api/images/${result.fileId}`, pathname: result.fileId, fileId: result.fileId, provider: "drive" };
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(storageStatus().missing || "Storage is not configured.");
  }

  // Dev-only fallback: local disk. Re-deploys wipe it, so this must never be
  // the chosen path in production.
  const fs = await import("fs");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "images", folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return { url: `/images/${folder}/${filename}`, pathname: key, storageKey: key, provider: "local" };
}

export async function deleteMedia(media: { fileId?: string; storageKey?: string; url?: string } | null | undefined): Promise<void> {
  if (!media) return;

  // Most call sites only persisted the public URL, so the R2 key has to be
  // recoverable from it. Anything that is not ours is left alone.
  const r2Base = r2PublicUrl("");
  const isR2Url = !!(r2Base && media.url?.startsWith(r2Base));
  const r2Key = media.storageKey || (isR2Url ? media.url!.slice(r2Base.length) : undefined);
  if (r2Key && r2Configured()) {
    try { await deleteFromR2(r2Key); return; } catch (err) { console.error("R2 delete failed:", err); }
  }
  if (media.fileId) {
    try { await deleteFromDrive(media.fileId); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
  // Drive-backed uploads are stored behind /api/images/{fileId}.
  const proxyMatch = media.url?.match(/^\/api\/images\/([^/]+)$/);
  if (proxyMatch) {
    try { await deleteFromDrive(proxyMatch[1]); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
}

export { r2PublicUrl };
