import { uploadToDrive, deleteFromDrive } from "@/lib/gdrive";
import { AwsClient } from "aws4fetch";
import { del as deleteBlob, put as putBlob } from "@vercel/blob";

export interface UploadedMedia {
  url: string;
  pathname: string;
  fileId?: string;
  provider: "github" | "b2" | "r2" | "blob" | "drive" | "local";
}

function githubConfig() {
  const token = process.env.GITHUB_STORAGE_TOKEN || process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_STORAGE_REPO || "salmansahil2005/westhome";
  const branch = process.env.GITHUB_STORAGE_BRANCH || "main";
  const root = (process.env.GITHUB_STORAGE_PATH || "public/images/uploads").replace(/^\/+|\/+$/g, "");
  return token ? { token, repository, branch, root } : null;
}

async function githubPut(config: { token: string; repository: string; branch: string; root: string }, key: string, body: Buffer, contentType: string) {
  const path = `${config.root}/${key}`;
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "westhome-image-storage",
    },
    body: JSON.stringify({ message: `Upload image ${key}`, content: body.toString("base64"), branch: config.branch }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GitHub image upload failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  return `/api/images/github/${path}`;
}

async function githubDelete(config: { token: string; repository: string; branch: string; root: string }, path: string) {
  const apiPath = path.replace(/^\/api\/images\/github\//, "");
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${apiPath}?ref=${encodeURIComponent(config.branch)}`, {
    headers: { Authorization: `Bearer ${config.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "westhome-image-storage" },
  });
  if (!response.ok) return;
  const data = (await response.json()) as { sha?: string };
  if (!data.sha) return;
  await fetch(`https://api.github.com/repos/${config.repository}/contents/${apiPath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${config.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", "User-Agent": "westhome-image-storage" },
    body: JSON.stringify({ message: `Delete image ${apiPath}`, sha: data.sha, branch: config.branch }),
  });
}

/* ------------------------------------------------------------------ */
/*  S3-compatible object storage (Backblaze B2 / Cloudflare R2)       */
/* ------------------------------------------------------------------ */

function b2Config() {
  const keyId = process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY || process.env.B2_APPLICATION_KEY_SECRET;
  const bucket = process.env.B2_BUCKET;
  const endpoint = process.env.B2_ENDPOINT || process.env.B2_S3_ENDPOINT;
  const publicBaseUrl = process.env.B2_PUBLIC_BASE_URL || process.env.B2_PUBLIC_URL;
  return keyId && applicationKey && bucket && endpoint && publicBaseUrl
    ? { keyId, applicationKey, bucket, endpoint: endpoint.replace(/\/+$/, ""), publicBaseUrl: publicBaseUrl.replace(/\/+$/, "") }
    : null;
}

function r2Config() {
  return process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_BASE_URL
    ? {
        keyId: process.env.R2_ACCESS_KEY_ID,
        applicationKey: process.env.R2_SECRET_ACCESS_KEY,
        bucket: process.env.R2_BUCKET,
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        publicBaseUrl: process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, ""),
      }
    : null;
}

async function s3Put(
  config: { keyId: string; applicationKey: string; bucket: string; endpoint: string; publicBaseUrl: string },
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: config.keyId,
    secretAccessKey: config.applicationKey,
  });
  const response = await client.fetch(`${config.endpoint}/${config.bucket}/${key}`, {
    method: "PUT",
    body: new Uint8Array(body),
    headers: { "Content-Type": contentType || "application/octet-stream" },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Object storage upload failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return `${config.publicBaseUrl}/${key}`;
}

async function s3Delete(
  config: { keyId: string; applicationKey: string; bucket: string; endpoint: string; publicBaseUrl: string },
  url: string,
): Promise<void> {
  if (!url.startsWith(config.publicBaseUrl)) return;
  const key = url.slice(config.publicBaseUrl.length + 1);
  const client = new AwsClient({ accessKeyId: config.keyId, secretAccessKey: config.applicationKey });
  const response = await client.fetch(`${config.endpoint}/${config.bucket}/${key}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Object storage delete failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Vercel Blob                                                        */
/* ------------------------------------------------------------------ */

async function vercelBlobPut(key: string, body: Buffer, contentType: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  const pathname = key.replace(/^\/+/, "");
  const result = await putBlob(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    contentType: contentType || "application/octet-stream",
    token,
  });
  return result.url;
}

async function vercelBlobDel(url: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  await deleteBlob(url, { token });
}

export function storageStatus() {
  const github = githubConfig();
  const b2 = b2Config();
  const r2 = r2Config();
  const drive = !!(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_CREDENTIALS_JSON);
  const blob = !!process.env.BLOB_READ_WRITE_TOKEN;
  return {
    b2: { configured: !!b2, bucket: b2?.bucket, endpoint: b2?.endpoint },
    github: { configured: !!github, repository: github?.repository, branch: github?.branch },
    r2: { configured: !!r2 },
    blob: { configured: blob },
    drive: { configured: drive },
    anyConfigured: !!github || !!b2 || !!r2 || blob || drive,
  };
}

export async function uploadMedia(folder: string, file: File, filename: string): Promise<UploadedMedia> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${folder.replace(/^\/+|\/+$/g, "")}/${filename.replace(/^\/+/, "")}`;
  const github = githubConfig();
  if (github) {
    try {
      return { url: await githubPut(github, key, buffer, file.type), pathname: key, provider: "github" };
    } catch (err) {
      console.error("GitHub upload failed, falling back:", err);
    }
  }
  const b2 = b2Config();
  if (b2) {
    try {
      return { url: await s3Put(b2, key, buffer, file.type), pathname: key, provider: "b2" };
    } catch (err) {
      console.error("B2 upload failed, falling back:", err);
    }
  }
  const r2 = r2Config();
  if (r2) {
    try {
      return { url: await s3Put(r2, key, buffer, file.type), pathname: key, provider: "r2" };
    } catch (err) {
      console.error("R2 upload failed, falling back:", err);
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return { url: await vercelBlobPut(key, buffer, file.type), pathname: key, provider: "blob" };
    } catch (err) {
      console.error("Vercel Blob upload failed, falling back:", err);
    }
  }
  const driveConfigured = !!(process.env.GOOGLE_CREDENTIALS_PATH || process.env.GOOGLE_CREDENTIALS_JSON);
  if (driveConfigured) {
    try {
      const result = await uploadToDrive(folder, file, filename);
      if (result?.fileId) return { url: `/api/images/${result.fileId}`, pathname: result.fileId, fileId: result.fileId, provider: "drive" };
    } catch (err) {
      console.error("Drive upload failed, falling back:", err);
    }
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Storage is not configured. Configure GITHUB_STORAGE_TOKEN, B2_*, R2_*, BLOB_READ_WRITE_TOKEN, or GOOGLE_CREDENTIALS_*.");
  }
  const fs = await import("fs");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "images", folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return { url: `/images/${folder}/${filename}`, pathname: `${folder}/${filename}`, provider: "local" };
}

export async function deleteMedia(media: { fileId?: string; url?: string } | null | undefined): Promise<void> {
  if (!media) return;
  if (media.fileId) {
    try { await deleteFromDrive(media.fileId); return; } catch (err) { console.error("Drive delete failed:", err); }
  }
  if (!media.url) return;
  const github = githubConfig();
  if (github && media.url.startsWith("/api/images/github/")) {
    try { await githubDelete(github, media.url); return; } catch (err) { console.error("GitHub delete failed:", err); }
  }
  const b2 = b2Config();
  if (b2 && media.url.startsWith(b2.publicBaseUrl)) {
    try { await s3Delete(b2, media.url); return; } catch (err) { console.error("B2 delete failed:", err); }
  }
  const r2 = r2Config();
  if (r2 && media.url.startsWith(r2.publicBaseUrl)) {
    try { await s3Delete(r2, media.url); return; } catch (err) { console.error("R2 delete failed:", err); }
  }
  if (media.url.includes("blob.vercel-storage.com")) {
    try { await vercelBlobDel(media.url); } catch (err) { console.error("Vercel Blob delete failed:", err); }
  }
}
