import fs from "fs";
import path from "path";
import stream from "stream";

// ---------------------------------------------------------------------------
// Config — reads from env at call time so Next.js cold-start works
// ---------------------------------------------------------------------------

function credentialsPath(): string | undefined {
  return process.env.GOOGLE_CREDENTIALS_PATH;
}

function credentialsJson(): Record<string, unknown> | undefined {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Drive client — lazy import so we can create an auth-bound drive instance
// per request without top-level auth side-effects.
// ---------------------------------------------------------------------------

async function driveClient(auth: Awaited<ReturnType<typeof getAuth>>) {
  const { google } = await import("googleapis");
  return google.drive({ version: "v3", auth });
}

// ---------------------------------------------------------------------------
// Auth — service account preferred, falls back to application-default
// ---------------------------------------------------------------------------

const SCOPE_DRIVE = "https://www.googleapis.com/auth/drive";

// Every image-proxy miss previously re-ran GoogleAuth construction (and for
// service accounts, token fetching) before the download. Memoize the client
// per credential shape so a gallery of cold images pays auth once, not per
// file.
let authPromise: Promise<Awaited<ReturnType<typeof buildAuth>>> | null = null;
let authKey = "";

function currentAuthKey(): string {
  return [
    process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ? "set" : "",
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? "set" : "",
    process.env.GOOGLE_CREDENTIALS_PATH || "",
    process.env.GOOGLE_CREDENTIALS_JSON ? "set" : "",
  ].join("|");
}

async function buildAuth() {
  if (
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    const { google } = await import("googleapis");
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return auth;
  }

  const credsPath = credentialsPath();
  const credsJson = credentialsJson();

  if (credsPath && fs.existsSync(credsPath)) {
    const { google } = await import("googleapis");
    return new google.auth.GoogleAuth({
      keyFile: credsPath,
      scopes: [SCOPE_DRIVE],
    });
  }

  if (credsJson && credsJson.type === "service_account") {
    const { google } = await import("googleapis");
    return new google.auth.GoogleAuth({
      credentials: credsJson,
      scopes: [SCOPE_DRIVE],
    });
  }

  throw new Error(
    "Google Drive credentials are not configured. Set GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN or GOOGLE_CREDENTIALS_JSON/PATH."
  );
}

async function getAuth() {
  const key = currentAuthKey();
  if (!authPromise || key !== authKey) {
    authPromise = buildAuth();
    authKey = key;
    authPromise.catch(() => {
      // Allow a retry on the next call if construction failed.
      if (authKey === key) authPromise = null;
    });
  }
  return authPromise;
}

// ---------------------------------------------------------------------------
// Drive helpers
// ---------------------------------------------------------------------------

interface GDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  size?: string;
  mimeType: string;
}

/**
 * Return the Drive folder ID for a given logical folder name.
 * First call per process hits Drive and caches the result in memory.
 */
async function resolveFolderId(folder: string): Promise<string> {
  const auth = await getAuth();
  const drive = await driveClient(auth);

  const cached = FOLDER_CACHE.get(folder);
  if (cached) return cached;

  // Try to find an existing folder with the matching name under the configured parent
  const parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const q = parentId
    ? `name = '${escapeQuery(folder)}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${escapeQuery(folder)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const match = res.data.files?.[0];
  if (match) {
    FOLDER_CACHE.set(folder, match.id);
    return match.id;
  }

  // Folder doesn't exist yet — create it
  const createRes = await drive.files.create({
    requestBody: {
      name: folder,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const newId = createRes.data.id;
  if (!newId) throw new Error(`Failed to create Drive folder: ${folder}`);

  FOLDER_CACHE.set(folder, newId);
  return newId;
}

const FOLDER_CACHE = new Map<string, string>();

function escapeQuery(s: string): string {
  return s.replace(/'/g, "\\'");
}

/**
 * Upload a file to Drive into the given folder. Returns the file metadata.
 */
async function uploadFile(
  folder: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<GDriveFile> {
  const folderId = await resolveFolderId(folder);
  const auth = await getAuth();
  const drive = await driveClient(auth);

  const media = {
    mimeType,
    body: stream.Readable.from(buffer),
  };

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType,
    },
    media,
    fields: "id, name, webViewLink, webContentLink, size, mimeType",
    supportsAllDrives: true,
  });

  const file = res.data;
  if (!file || !file.id) throw new Error("Drive upload returned no file id");

  // The image proxy's fast path fetches files from the public Drive delivery
  // host (lh3.googleusercontent.com/d/<id>), which only works for files that
  // are link-readable. Service-account uploads are private by default, so
  // grant an anonymous reader permission — without it every newly uploaded
  // image 404s until an admin opens Drive and enables sharing manually.
  await makeLinkReadable(drive, file.id);

  return {
    id: file.id,
    name: file.name,
    webViewLink: file.webViewLink ?? "",
    webContentLink: file.webContentLink ?? "",
    size: file.size,
    mimeType: file.mimeType ?? mimeType,
  };
}

/**
 * Grant "anyone with the link can view" on a Drive file. Best-effort: a
 * workspace policy that blocks anonymous links must not fail the upload —
 * the image proxy falls back to authenticated download in that case.
 */
async function makeLinkReadable(drive: Awaited<ReturnType<typeof driveClient>>, fileId: string): Promise<void> {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch (err) {
    console.warn(`Could not grant link-sharing on Drive file ${fileId}:`, err);
  }
}

/**
 * Delete a file by Drive file ID.
 */
async function deleteFile(fileId: string): Promise<void> {
  const auth = await getAuth();
  const drive = await driveClient(auth);
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

/**
 * Build a public URL for a Drive file.

 There are two practical options for serving Drive files externally:
 1. `webContentLink` — direct download link, works without Drive sharing
    if the service account owns the file and access is granted.
 2. Public web link — requires the file to be shared publicly.

 This helper prefers `webContentLink` because it does not require Drive
 "Make available to anyone with the link" sharing on every upload, which is
 the smoother path for a service account that owns its own files.

 If you want the prettier `https://drive.google.com/uc?id=...` style URL,
 swap the implementation here.
 */
export function publicUrl(file: GDriveFile): string {
  // Drive direct-content link for owned files (preferred — no public sharing needed).
  if (file.webContentLink) return file.webContentLink;

  // Fallback to the embed/share link.
  if (file.webViewLink) return file.webViewLink;

  // Last resort: construct a shareable link from the id.
  // NOTE: this only works if the file is shared publicly or accessible to the
  // requesting client; for a service account-owned file this is unlikely to work
  // without a separate permission grant, so prefer webContentLink above.
  return `https://drive.google.com/uc?id=${file.id}&export=view`;
}

// ---------------------------------------------------------------------------
// Public API used by the upload routes and the image proxy
// ---------------------------------------------------------------------------

export interface UploadResult {
  url: string;
  filename: string;
  fileId: string;
  size?: number;
  mimeType: string;
}

export async function uploadToDrive(
  folder: string,
  file: File | Buffer,
  filename: string
): Promise<UploadResult> {
  const mimeType = file instanceof File ? file.type : "application/octet-stream";
  const buffer =
    file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

  const driveFile = await uploadFile(folder, filename, mimeType, buffer);

  return {
    url: publicUrl(driveFile),
    filename: driveFile.name,
    fileId: driveFile.id,
    size: driveFile.size ? Number(driveFile.size) : undefined,
    mimeType: driveFile.mimeType,
  };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  await deleteFile(fileId);
}

/**
 * Resolve a Drive file's public URL by its file id.
 * Used by the image proxy route to serve Drive-stored images.
 */
export async function driveFileUrl(fileId: string): Promise<string> {
  const auth = await getAuth();
  const drive = await driveClient(auth);
  const res = await drive.files.get({
    fileId,
    fields: "id, name, webViewLink, webContentLink, mimeType",
    supportsAllDrives: true,
  });
  const file = res.data;
  if (!file || !file.id) throw new Error(`Drive file not found: ${fileId}`);
  return publicUrl(file as GDriveFile);
}

/**
 * Download a Drive file's binary content using the authenticated API,
 * streaming it directly from Drive. Unlike `webContentLink`, this works for
 * service-account-owned files without any public Drive sharing settings.
 * Used by the image proxy route so drive-stored images actually render.
 */
function sniffMimeType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function driveDownload(
  fileId: string
): Promise<{ data: Buffer; mimeType: string }> {
  const auth = await getAuth();
  const drive = await driveClient(auth);
  const res: any = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  const raw = res?.data;
  if (!raw || typeof raw.byteLength !== "number" || raw.byteLength === 0) {
    throw new Error(`Drive download returned empty content: ${fileId}`);
  }
  const data = Buffer.from(raw as ArrayBuffer);
  const headerType = res?.headers?.["content-type"];
  const mimeType =
    headerType && headerType !== "application/octet-stream"
      ? String(headerType)
      : sniffMimeType(data) ?? "application/octet-stream";
return { data, mimeType };
}
