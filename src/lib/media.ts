// Relative with an explicit extension, like src/lib/rate-limit.ts -> ./redis.ts:
// these modules are imported directly by the node test runner, which does not
// know the "@/" tsconfig alias.
import { uploadToDrive, deleteFromDrive } from "./gdrive.ts";
import { driveFileIdFromUrl } from "./driveUrl.ts";

export interface UploadedMedia {
  /**
   * How the storefront should reach this file. Drive-backed media is served
   * through the `/api/images/<fileId>` proxy because Drive delivery links
   * are not stable; local files (development only) are served statically.
   */
  url: string;
  pathname: string;
  fileId?: string;
  storageKey?: string;
  provider: "drive" | "local";
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
  const drive = driveConfigured();
  return {
    drive: { configured: drive },
    anyConfigured: drive,
    // Surfaced verbatim in the admin so a failed upload explains itself
    // instead of showing a bare "Upload failed (503)".
    missing: drive
      ? null
      : "Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN (project Settings → Environment) so uploads are stored on Google Drive.",
  };
}

/* ------------------------------------------------------------------ */
/*  Storage selection                                                   */
/* ------------------------------------------------------------------ */

/**
 * Provider order: Google Drive, then local disk (development only).
 *
 * Drive is the production backend for westhome.in: the catalog's existing
 * images already live there, and the site already ships the `/api/images/`
 * proxy that serves them. Local disk is a development convenience only:
 * redeploys wipe it and serverless runtimes have a read-only filesystem,
 * so it must never be the chosen path in production.
 */
export async function uploadMedia(folder: string, file: File, filename: string): Promise<UploadedMedia> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;

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

export async function deleteMedia(media: { fileId?: string; url?: string } | null | undefined): Promise<void> {
  if (!media) return;
  // The file id is either passed straight in or embedded in the stored URL,
  // which may be the /api/images/{fileId} proxy path or a direct Drive/CDN
  // url. Both shapes have to resolve, or deleting an image in the admin
  // would quietly leave the Drive file behind.
  const fileId = media.fileId ?? driveFileIdFromUrl(media.url);
  if (!fileId) return;
  try {
    await deleteFromDrive(fileId);
  } catch (err) {
    console.error("Drive delete failed:", err);
  }
}
