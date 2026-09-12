import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { driveDownload } from "@/lib/gdrive";

const PROJECT_ROOT = process.cwd();
const PUBLIC_IMAGES_DIR = path.join(PROJECT_ROOT, "public", "images");

async function serveGitHub(filePath: string): Promise<NextResponse | null> {
  const token = process.env.GITHUB_STORAGE_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return null;
  const repository = process.env.GITHUB_STORAGE_REPO || "salmansahil2005/westhome";
  const branch = process.env.GITHUB_STORAGE_BRANCH || "main";
  const apiPath = filePath.replace(/^github\//, "");
  const response = await fetch(
    `https://api.github.com/repos/${repository}/contents/${apiPath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "westhome-image-proxy",
      },
      next: { revalidate: 3600 },
    },
  );
  if (!response.ok) return null;
  const data = Buffer.from(await response.arrayBuffer());
  const ext = path.extname(apiPath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
  return binaryResponse(data, mimeType);
}

// Bounded in-memory cache for Drive downloads so repeated image views don't
// hammer the Drive API quota. FIFO eviction when the byte budget is exceeded.
const BINARY_CACHE = new Map<
  string,
  { data: Buffer; mimeType: string; expires: number }
>();
const BINARY_CACHE_TTL_MS = 10 * 60 * 1000;
const BINARY_CACHE_MAX_BYTES = 64 * 1024 * 1024;
let binaryCacheBytes = 0;

function binaryCacheEvict(key: string) {
  const entry = BINARY_CACHE.get(key);
  if (entry) {
    binaryCacheBytes -= entry.data.byteLength;
    BINARY_CACHE.delete(key);
  }
}

function resolveFilePath(req: NextRequest): string | null {
  const raw = req.nextUrl.pathname.replace(/^\/api\/images\//, "");
  if (!raw || raw.includes("..") || raw.startsWith("/") || raw.includes("\0")) return null;
  // allow slashes so legacy local paths like "banners/hero-living-room.png" work
  return raw;
}

function serveLocal(fileId: string): NextResponse | null {
  const publicPath = path.join(PUBLIC_IMAGES_DIR, fileId);
  const resolved = path.resolve(publicPath);
  // Security: only serve files inside public/images/.
  if (
    !resolved.startsWith(PUBLIC_IMAGES_DIR + path.sep) &&
    resolved !== PUBLIC_IMAGES_DIR
  )
    return null;
  let buf: Buffer;
  try {
    buf = fs.readFileSync(resolved);
  } catch {
    return null;
  }
  const ext = path.extname(resolved).toLowerCase();
  const type =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".svg"
            ? "image/svg+xml"
            : "image/jpeg";
  return binaryResponse(buf, type);
}

function binaryResponse(data: Buffer, mimeType: string): NextResponse {
  const headers = new Headers();
  headers.set("Content-Type", mimeType || "image/png");
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  headers.set("Content-Length", String(data.byteLength));
  return new NextResponse(new Uint8Array(data), { headers });
}

export async function GET(req: NextRequest) {
  try {
    const fileId = resolveFilePath(req);
    if (!fileId) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    }

    if (fileId.startsWith("github/")) {
      const githubResp = await serveGitHub(fileId);
      if (githubResp) return githubResp;
    }

    // Drive files are served via the authenticated API (no slash in the id).
    if (!fileId.includes("/")) {
      const cached = BINARY_CACHE.get(fileId);
      if (cached && cached.expires > Date.now()) {
        return binaryResponse(cached.data, cached.mimeType);
      }
      try {
        const { data, mimeType } = await driveDownload(fileId);
        binaryCacheEvict(fileId);
        if (binaryCacheBytes + data.byteLength > BINARY_CACHE_MAX_BYTES) {
          const eldestKey = BINARY_CACHE.keys().next().value;
          if (eldestKey) binaryCacheEvict(eldestKey as string);
        }
        BINARY_CACHE.set(fileId, {
          data,
          mimeType: mimeType || "image/png",
          expires: Date.now() + BINARY_CACHE_TTL_MS,
        });
        binaryCacheBytes += data.byteLength;
        return binaryResponse(data, mimeType);
      } catch (err) {
        console.warn("driveDownload failed for", fileId, err);
      }
    }

    // Legacy local images: relative path under public/images/.
    const localResp = serveLocal(fileId);
    if (localResp) return localResp;

    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  } catch (err) {
    console.error("Image proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
