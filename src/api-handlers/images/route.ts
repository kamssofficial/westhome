import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { driveDownload } from "@/lib/gdrive";

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

// Product photos are stored as multi-megabyte PNGs — a 1086x1448 photo lands at
// ~2.4 MB, roughly ten times what the same pixels cost as WebP. Serving those
// originals on every product view is what drained the deployment's bandwidth
// allowance, so any image the browser will accept as WebP is transcoded once
// and cached, then served at a fraction of the bytes.
const WEBP_QUALITY = 80;
const WEBP_MIN_BYTES = 32 * 1024;

function acceptsWebp(req: NextRequest): boolean {
  return (req.headers.get("accept") || "").toLowerCase().includes("image/webp");
}

async function toWebp(
  cacheKey: string,
  data: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; mimeType: string }> {
  // Only raster formats can be transcoded, and tiny files aren't worth it.
  if (!/^image\/(png|jpe?g)$/i.test(mimeType)) return { data, mimeType };
  if (data.byteLength < WEBP_MIN_BYTES) return { data, mimeType };

  const cached = binaryCacheGet(`${cacheKey}#webp`);
  if (cached) return { data: cached.data, mimeType: cached.mimeType };

  try {
    // `rotate()` applies EXIF orientation so the visitor sees the same framing
    // as the original file.
    const converted = await sharp(data)
      .rotate()
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    // Never send something bigger than what we started with.
    if (converted.byteLength >= data.byteLength) return { data, mimeType };
    binaryCacheSet(`${cacheKey}#webp`, converted, "image/webp");
    return { data: converted, mimeType: "image/webp" };
  } catch (err) {
    // A transcode failure must never break an image — fall back to the original.
    console.warn("webp transcode failed, serving original", cacheKey, err);
    return { data, mimeType };
  }
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

// Uploaded media is immutable per URL: upload filenames carry a timestamp +
// uuid, and a Drive id never changes once created. These used to be served with
// max-age=300 and no edge caching, so every visitor re-ran this function and
// re-downloaded multi-megabyte originals from Drive every five minutes — the
// single biggest drain on the deployment's bandwidth and function usage. Cache
// them hard in the browser and at the Vercel edge instead.
const IMMUTABLE_MEDIA_CACHE =
  "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=604800";
// Legacy committed files (relative paths under public/images/) can be replaced
// by a deploy at the same path, so the browser only revalidates cheaply (304)
// while the edge still holds the bytes.
const LEGACY_MEDIA_CACHE =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800";

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
