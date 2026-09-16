import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { driveDownload } from "@/lib/gdrive";
import { acceptsWebp as acceptsWebpHeader, toWebp as toWebpPure, WEBP_MIN_BYTES, IMMUTABLE_MEDIA_CACHE, LEGACY_MEDIA_CACHE } from "@/lib/imageProxy";

const PROJECT_ROOT = process.cwd();
const PUBLIC_IMAGES_DIR = path.join(PROJECT_ROOT, "public", "images");

async function serveGitHub(
  filePath: string,
  wantsWebp: boolean,
): Promise<NextResponse | null> {
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
  const body = wantsWebp
    ? await toWebp(`github:${apiPath}`, data, mimeType)
    : { data, mimeType };
  return binaryResponse(body.data, body.mimeType);
}

// Bounded in-memory cache for Drive downloads so repeated image views don't
// hammer the Drive API quota. FIFO eviction when the byte budget is exceeded.
type CachedBinary = { data: Buffer; mimeType: string; expires: number };
const BINARY_CACHE = new Map<string, CachedBinary>();
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

function binaryCacheGet(key: string): CachedBinary | null {
  const entry = BINARY_CACHE.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    binaryCacheEvict(key);
    return null;
  }
  return entry;
}

function binaryCacheSet(key: string, data: Buffer, mimeType: string) {
  binaryCacheEvict(key);
  while (
    binaryCacheBytes + data.byteLength > BINARY_CACHE_MAX_BYTES &&
    BINARY_CACHE.size > 0
  ) {
    const eldestKey = BINARY_CACHE.keys().next().value;
    if (!eldestKey) break;
    binaryCacheEvict(eldestKey as string);
  }
  BINARY_CACHE.set(key, {
    data,
    mimeType,
    expires: Date.now() + BINARY_CACHE_TTL_MS,
  });
  binaryCacheBytes += data.byteLength;
}

function acceptsWebp(req: NextRequest): boolean {
  return acceptsWebpHeader(req.headers.get("accept"));
}

// Wraps the pure toWebp with the in-memory cache so repeated views of the same
// image don't re-run sharp.
async function toWebp(
  cacheKey: string,
  data: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; mimeType: string }> {
  const cached = binaryCacheGet(`${cacheKey}#webp`);
  if (cached) return { data: cached.data, mimeType: cached.mimeType };
  const result = await toWebpPure(data, mimeType);
  if (result.mimeType === "image/webp" && result.data !== data) {
    binaryCacheSet(`${cacheKey}#webp`, result.data, result.mimeType);
  }
  return result;
}

function resolveFilePath(req: NextRequest): string | null {
  const raw = req.nextUrl.pathname.replace(/^\/api\/images\//, "");
  if (!raw || raw.includes("..") || raw.startsWith("/") || raw.includes("\0")) return null;
  // allow slashes so legacy local paths like "banners/hero-living-room.png" work
  return raw;
}

async function serveLocal(
  fileId: string,
  wantsWebp: boolean,
): Promise<NextResponse | null> {
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
  const body = wantsWebp
    ? await toWebp(`local:${fileId}`, buf, type)
    : { data: buf, mimeType: type };
  return binaryResponse(body.data, body.mimeType, LEGACY_MEDIA_CACHE);
}



function binaryResponse(
  data: Buffer,
  mimeType: string,
  cacheControl: string = IMMUTABLE_MEDIA_CACHE,
): NextResponse {
  const headers = new Headers();
  headers.set("Content-Type", mimeType || "image/png");
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Length", String(data.byteLength));
  // The body depends on the client's Accept header (WebP vs the original), so
  // every cache in front of this — including Vercel's edge — must key on it.
  headers.append("Vary", "Accept");
  return new NextResponse(new Uint8Array(data), { headers });
}

export async function GET(req: NextRequest) {
  try {
    const fileId = resolveFilePath(req);
    if (!fileId) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    }

    const wantsWebp = acceptsWebp(req);

    if (fileId.startsWith("github/")) {
      const githubResp = await serveGitHub(fileId, wantsWebp);
      if (githubResp) return githubResp;
    }

    // Drive files are served via the authenticated API (no slash in the id).
    if (!fileId.includes("/")) {
      let source = binaryCacheGet(fileId);
      if (!source) {
        try {
          const { data, mimeType } = await driveDownload(fileId);
          binaryCacheSet(fileId, data, mimeType || "image/png");
          source = binaryCacheGet(fileId);
        } catch (err) {
          console.warn("driveDownload failed for", fileId, err);
        }
      }
      if (source) {
        const body = wantsWebp
          ? await toWebp(fileId, source.data, source.mimeType)
          : { data: source.data, mimeType: source.mimeType };
        return binaryResponse(body.data, body.mimeType);
      }
    }

    // Legacy local images: relative path under public/images/.
    const localResp = await serveLocal(fileId, wantsWebp);
    if (localResp) return localResp;

    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  } catch (err) {
    console.error("Image proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
