import { uploadToDrive, deleteFromDrive } from "@/lib/gdrive";

export interface UploadedMedia {
  url: string;
  pathname: string;
  fileId?: string;
  provider: "drive" | "local";
}

/* ------------------------------------------------------------------ */
/*  Google Drive                                                        */
/* ------------------------------------------------------------------ */

export function storageStatus() {
  const oauthConfigured = !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
  const drive = !!(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_CREDENTIALS_JSON || oauthConfigured);
  return {
    drive: { configured: drive },
    anyConfigured: drive,
  };
}

export async function uploadMedia(folder: string, file: File, filename: string): Promise<UploadedMedia> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;
  const oauthConfigured = !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
  const driveConfigured = !!(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_CREDENTIALS_JSON || oauthConfigured);
  if (driveConfigured) {
    const result = await uploadToDrive(folder, file, filename);
    if (result?.fileId) return { url: `/api/images/${result.fileId}`, pathname: result.fileId, fileId: result.fileId, provider: "drive" };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Storage is not configured. Configure GOOGLE_OAUTH_* (or GOOGLE_CREDENTIALS_PATH / GOOGLE_CREDENTIALS_JSON).");
  }
  const fs = await import("fs");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "images", folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return { url: `/images/${folder}/${filename}`, pathname: key, provider: "local" };
}

export async function deleteMedia(media: { fileId?: string; url?: string } | null | undefined): Promise<void> {
  if (!media) return;
  if (media.fileId) {
    try { await deleteFromDrive(media.fileId); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
  if (!media.url) return;
  // Drive-backed uploads are stored behind /api/images/{fileId}.
  const proxyMatch = media.url.match(/^\/api\/images\/([^/]+)$/);
  if (proxyMatch) {
    try { await deleteFromDrive(proxyMatch[1]); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
}