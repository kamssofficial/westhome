import { uploadToDrive, deleteFromDrive } from "@/lib/gdrive";

export interface UploadedMedia {
  url: `/api/images/${string}`;
  pathname: string;
  fileId?: string;
  provider: "drive" | "local";
}

/* ------------------------------------------------------------------ */
/*  Google Drive                                                        */
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

export function storageStatus() {
  const drive = driveConfigured();
  return {
    drive: { configured: drive },
    anyConfigured: drive,
  };
}

/* ------------------------------------------------------------------ */
/*  Storage selection                                                   */
/* ------------------------------------------------------------------ */

// Google Drive is the only production media backend; local public/ disk is a
// dev convenience (re-deploys wipe it, so it must never be chosen in prod).
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
    throw new Error("Storage is not configured. Set GOOGLE_OAUTH_* (or GOOGLE_CREDENTIALS_JSON / GOOGLE_CREDENTIALS_PATH).");
  }

  // Dev-only fallback: local disk. Re-deploys wipe it, so this must never be
  // the chosen path in production.
  const fs = await import("fs");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "images", folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return { url: `/images/${folder}/${filename}` as `/api/images/${string}`, pathname: key, provider: "local" };
}

export async function deleteMedia(media: { fileId?: string; url?: string } | null | undefined): Promise<void> {
  if (!media) return;
  if (media.fileId) {
    try { await deleteFromDrive(media.fileId); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
  // Drive-backed uploads are stored behind /api/images/{fileId}.
  const proxyMatch = media.url?.match(/^\/api\/images\/([^/]+)$/);
  if (proxyMatch) {
    try { await deleteFromDrive(proxyMatch[1]); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
}
