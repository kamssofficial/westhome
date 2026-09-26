import fs from "fs";
import path from "path";
import stream from "stream";
import { DRIVE_PROXY_PREFIX } from "@/lib/driveUrl";

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
// Error classification + health probe
//
// The upload route can only show the admin something useful if auth failures
// are recognized in code. storageStatus() reports env-key PRESENCE, which is
// always true once variables exist — a revoked/expired refresh token still
// looks "configured" and only an actual Drive call fails. These helpers turn
// that failure into an actionable message instead of a generic 503.
// ---------------------------------------------------------------------------

export type DriveErrorKind = "auth" | "api" | "network" | "unknown";

export interface ClassifiedDriveError {
  kind: DriveErrorKind;
  error: string;
  action: string;
}

const REMINT_ACTION =
  "Re-run `npm run drive:token` (scripts/mint-drive-token.mjs), replace GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN in the hosting environment, and redeploy.";

/**
 * Map a googleapis/token-endpoint failure to an admin-actionable message.
 * Pure function over the error object so it is testable without network.
 */
export function classifyDriveError(err: unknown): ClassifiedDriveError {
  const e = err as {
    code?: string | number;
    message?: string;
    response?: { status?: number; data?: { error?: string; error_description?: string } };
  };
  const apiError = e?.response?.data?.error || "";
  const apiDescription = e?.response?.data?.error_description || "";
  const msg = `${e?.message || (typeof err === "string" ? err : "")} ${apiError} ${apiDescription}`;
  const status = e?.response?.status ?? (typeof e?.code === "number" ? e.code : undefined);

  if (/invalid_grant/i.test(msg)) {
    if (/expired|revoked/i.test(msg)) {
      return {
        kind: "auth",
        error: "The Google Drive refresh token has expired or was revoked.",
        action: REMINT_ACTION,
      };
    }
    return {
      kind: "auth",
      error: "Google rejected the Drive credentials (invalid_grant).",
      action: REMINT_ACTION,
    };
  }
  if (/invalid_client|unauthorized_client|UNREGISTERED|client_secret/i.test(msg)) {
    return {
      kind: "auth",
      error: "Google rejected the OAuth client (client id/secret mismatch, or the client was deleted).",
      action: "Recreate the OAuth client and re-run `npm run drive:token`, then update the GOOGLE_OAUTH_* environment values.",
    };
  }
  if (
    /could not load the default credentials|could not automatically determine credentials|default credentials were not found|credentials are not configured|storage is not configured|not configured/i.test(
      msg
    )
  ) {
    return {
      kind: "auth",
      error: "No usable Google Drive credentials are configured on this host.",
      action: "Run `npm run drive:token` and add the three GOOGLE_OAUTH_* values to the hosting environment, then redeploy.",
    };
  }
  if (status === 401) {
    return {
      kind: "auth",
      error: "Google Drive rejected the request as unauthenticated.",
      action: REMINT_ACTION,
    };
  }
  if (/storageQuotaExceeded|storage quota/i.test(msg)) {
    return {
      kind: "api",
      error: "The Google account backing Drive storage is out of quota.",
      action: "Free up Google Drive storage for the account that owns the uploads (or upgrade its Google One plan), then retry.",
    };
  }
  if (/accessNotConfigured|has not been used|is disabled|SERVICE_DISABLED/i.test(msg)) {
    return {
      kind: "api",
      error: "The Google Drive API is not enabled on the credentials' Google Cloud project.",
      action: "Enable the Drive API in Google Cloud Console (APIs & Services -> Library), then retry.",
    };
  }
  if (status === 403 || /insufficient permissions|The user does not have sufficient permissions/i.test(msg)) {
    return {
      kind: "api",
      error: "Google Drive denied the operation for this account.",
      action: `Grant the Drive scope/permission needed for uploads, or check the sharing settings of the target folder. (${msg.trim() || "no detail"})`,
    };
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(msg)) {
    return {
      kind: "network",
      error: "Could not reach Google's servers.",
      action: "This is usually transient — retry the upload in a minute.",
    };
  }
  return {
    kind: "unknown",
    error: "Upload failed. Please try again.",
    action: "If it keeps failing, check the server logs for the underlying error.",
  };
}

export interface DriveHealth {
  ok: boolean;
  /** Which credential path was exercised. */
  mode: "oauth" | "service_account" | "adc" | "none";
  kind?: DriveErrorKind;
  error?: string;
  action?: string;
  checkedAt: number;
}

let healthCache: DriveHealth | null = null;
const HEALTH_CACHE_MS = 2 * 60 * 1000;

/**
 * Actually exercise the credentials (refresh/fetch an access token) instead of
 * just checking that env keys exist. Cheap, cached for 2 minutes so a dashboard
 * poll cannot burn Google's token-endpoint quota.
 */
export async function driveHealthCheck(force = false): Promise<DriveHealth> {
  if (!force && healthCache && Date.now() - healthCache.checkedAt < HEALTH_CACHE_MS) {
    return healthCache;
  }
  const probed = await probeDrive();
  healthCache = { ...probed, checkedAt: Date.now() };
  return healthCache;
}

const NO_CREDENTIALS_HEALTH = (): Omit<DriveHealth, "checkedAt"> => ({
  ok: false,
  mode: "none",
  kind: "auth",
  error: "No Google Drive credentials are configured.",
  action: "Run `npm run drive:token` and add the three GOOGLE_OAUTH_* values to the hosting environment, then redeploy.",
});

async function probeDrive(): Promise<Omit<DriveHealth, "checkedAt">> {
  const { google } = await import("googleapis");
  try {
    if (
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    ) {
      const oauth = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET
      );
      oauth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
      const res = await oauth.getAccessToken();
      if (!res?.token) {
        return {
          ok: false,
          mode: "oauth",
          kind: "auth",
          error: "The configured Google credentials returned no access token.",
          action: REMINT_ACTION,
        };
      }
      return { ok: true, mode: "oauth" };
    }

    const credsPath = credentialsPath();
    const credsJson = credentialsJson();
    const hasServiceAccount =
      (credsPath && fs.existsSync(credsPath)) || (credsJson && credsJson.type === "service_account");
    if (!hasServiceAccount) return NO_CREDENTIALS_HEALTH();
    const mode: DriveHealth["mode"] = "service_account";

    const auth =
      credsPath && fs.existsSync(credsPath)
        ? new google.auth.GoogleAuth({ keyFile: credsPath, scopes: [SCOPE_DRIVE] })
        : new google.auth.GoogleAuth({ credentials: credsJson, scopes: [SCOPE_DRIVE] });

    const client = await auth.getClient();
    const res = await client.getAccessToken();
    if (!res?.token) {
      return {
        ok: false,
        mode,
        kind: "auth",
        error: "The configured Google service account returned no access token.",
        action: "Check the service-account key and that the Drive API is enabled for its project.",
      };
    }
    return { ok: true, mode };
  } catch (err) {
    return { ok: false, mode: "none", ...classifyDriveError(err) };
  }
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
 * Build the stored URL for a Drive file.

 Every consumer of stored media goes through this app's own
 `/api/images/<fileId>` proxy: Google rate-limits anonymous hotlinks to its
 CDN (the browser then discards the non-image response and the image never
 renders), and Drive's own `webContentLink`/`webViewLink` shapes are not
 recognized by the URL normalizer or the admin delete path. The proxy route
 serves the bytes from either the authenticated Drive API or the CDN copy
 server-side, so it is the only shape that always renders.
 */
export function publicUrl(file: GDriveFile): string {
  return `${DRIVE_PROXY_PREFIX}${file.id}`;
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

function extMimeType(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return null;
}

export async function uploadToDrive(
  folder: string,
  file: File | Buffer,
  filename: string
): Promise<UploadResult> {
  // Browsers occasionally send a File with an empty .type; Drive rejects an
  // empty mimeType, so fall back to magic-byte sniffing, then the extension.
  const rawType = file instanceof File ? file.type : "";
  const buffer =
    file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const mimeType =
    rawType || sniffMimeType(buffer) || extMimeType(filename) || "application/octet-stream";

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
