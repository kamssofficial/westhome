import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { driveDownload } from "@/lib/gdrive";
import sharp from "sharp";
import {
  acceptsWebp as acceptsWebpHeader,
  toWebp as toWebpPure,
  WEBP_QUALITY,
  WEBP_MIN_BYTES,
  IMMUTABLE_MEDIA_CACHE,
  LEGACY_MEDIA_CACHE,
  NOT_FOUND_MEDIA_CACHE,
} from "@/lib/imageProxy";

const PROJECT_ROOT = process.cwd();
const PUBLIC_IMAGES_DIR = path.join(PROJECT_ROOT, "public", "images");

async function downloadPublicDriveImage(
  fileId: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  const response = await fetch(`https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*" },
    // Keep large origin binaries out of Next's Data Cache; BINARY_CACHE below
    // is the purpose-built cache for this proxy.
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  // Rate limits / server errors are TRANSIENT — signal them by throwing so the
  // caller does not negative-cache the id. Only a clean 404 (or a 2xx response
  // that is not an image) counts as a definitive miss.
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`public Drive endpoint unavailable (HTTP ${response.status}) for ${fileId}`);
  }
  if (!response.ok) return null;
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0] || "";
  if (!mimeType.startsWith("image/")) return null;
  const data = Buffer.from(await response.arrayBuffer());
  return data.byteLength > 0 ? { data, mimeType } : null;
}

// Bounded in-memory cache for Drive downloads so repeated image views don't
// hammer the Drive API quota. FIFO eviction when the byte budget is exceeded.
type CachedBinary = { data: Buffer; mimeType: string; expires: number };
const BINARY_CACHE = new Map<string, CachedBinary>();
// Uploaded product photos are immutable; a longer source TTL keeps the
// multi-second Drive download + sharp encode off the hot path for hours
// instead of minutes. (Admin image replacement generates a new file id, so
// staleness is bounded by the URL change, not by this TTL.)
const BINARY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BINARY_CACHE_MAX_BYTES = 128 * 1024 * 1024;

// Negative cache: Drive 404s/gone files previously re-attempted the full
// authenticated download on EVERY request (~9s per bad id), which stalls the
// single origin thread. Remember misses briefly instead.
const NEGATIVE_CACHE = new Map<string, number>();
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;

function negativeCacheHas(key: string): boolean {
  const until = NEGATIVE_CACHE.get(key);
  if (until === undefined) return false;
  if (until <= Date.now()) {
    NEGATIVE_CACHE.delete(key);
    return false;
  }
  return true;
}

function negativeCacheSet(key: string): void {
  NEGATIVE_CACHE.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS);
}
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

// Bound the encode cost: product photos render at card/gallery sizes, so
// re-encoding a 4000px-wide Drive upload at full resolution burns seconds of
// CPU per miss on the small origin for pixels nobody displays. Downscale to
// MAX_ENCODE_WIDTH during the WebP encode — visual quality is unaffected at
// typical display sizes, and encode time drops by an order of magnitude.
const MAX_ENCODE_WIDTH = 2000;

async function toWebpBounded(
  cacheKey: string,
  data: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; mimeType: string }> {
  if (!/^image\/(png|jpe?g)$/i.test(mimeType) || data.byteLength < WEBP_MIN_BYTES) {
    return toWebp(cacheKey, data, mimeType);
  }
  const cached = binaryCacheGet(`${cacheKey}#webp`);
  if (cached) return { data: cached.data, mimeType: cached.mimeType };
  try {
    const converted = await sharp(data)
      .rotate()
      .resize({ width: MAX_ENCODE_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    if (converted.byteLength >= data.byteLength) {
      // Original is smaller/equal — serve and cache it as-is.
      binaryCacheSet(`${cacheKey}#webp`, data, mimeType);
      return { data, mimeType };
    }
    binaryCacheSet(`${cacheKey}#webp`, converted, "image/webp");
    return { data: converted, mimeType: "image/webp" };
  } catch {
    // A transcode failure must never break an image — fall back to the original.
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
  // every cache in front of this — CDN, proxy, or browser — must key on it.
  headers.append("Vary", "Accept");
  return new NextResponse(new Uint8Array(data), { headers });
}

export async function GET(req: NextRequest) {
  try {
    const fileId = resolveFilePath(req);
    if (!fileId) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    }

    const notFound = (message = "Image not found") =>
      NextResponse.json({ error: message }, { status: 404, headers: { "Cache-Control": NOT_FOUND_MEDIA_CACHE } });

    // Deterministic ".webp" URLs (emitted by normalizeImageUrl) always serve
    // WebP and key every cache on the bare id, so both URL shapes share the
    // in-memory cache and downstream CDN entries.
    const forceWebp = fileId.toLowerCase().endsWith(".webp");
    const key = forceWebp ? fileId.slice(0, -".webp".length) : fileId;
    const wantsWebp = forceWebp || acceptsWebp(req);

    if (key.startsWith("github/")) {
      return notFound();
    }

    // Drive files are served through the public image endpoint first. This is
    // deliberately the fast path for storefront reads: product image URLs are
    // already persisted as Drive file ids and public Drive delivery does not
    // require OAuth/ADC credentials on the web service. The authenticated API
    // remains the fallback for private/service-account-owned files and uploads.
    if (!key.includes("/")) {
      if (negativeCacheHas(key)) {
        return notFound();
      }

      let source = binaryCacheGet(key);

      // Fast path: public Drive delivery. This keeps storefront image serving
      // independent from GOOGLE_* credentials when a Drive file is link-readable.
      let publicFetchThrew = false;
      if (!source) {
        try {
          const publicImage = await downloadPublicDriveImage(key);
          if (publicImage) {
            binaryCacheSet(key, publicImage.data, publicImage.mimeType);
            source = binaryCacheGet(key);
          }
        } catch (err) {
          // Thrown = transient (429/5xx/timeout). Remember it so a blip is NOT
          // negative-cached below — the next request should retry immediately.
          publicFetchThrew = true;
          console.warn("public Drive image fetch failed (transient) for", key, err);
        }
      }

      // Authenticated fallback: needed for private files, but only when
      // explicit Google credentials are configured. Never invoke Google ADC
      // implicitly from a public storefront request.
      const hasExplicitDriveAuth =
        Boolean(
          process.env.GOOGLE_OAUTH_CLIENT_ID &&
          process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
          process.env.GOOGLE_OAUTH_REFRESH_TOKEN
        ) ||
        Boolean(process.env.GOOGLE_CREDENTIALS_JSON) ||
        Boolean(process.env.GOOGLE_CREDENTIALS_PATH);

      if (!source && hasExplicitDriveAuth) {
        try {
          const { data, mimeType } = await driveDownload(key);
          binaryCacheSet(key, data, mimeType || "image/png");
          source = binaryCacheGet(key);
        } catch (err) {
          console.warn("driveDownload failed for", key, err);
        }
      }

      // Negative-cache only definitive misses. A transient public-endpoint
      // failure (rate limit, blip) must not poison the URL for 5 minutes for
      // every visitor — let the next request retry instead.
      if (!source && (hasExplicitDriveAuth || !publicFetchThrew)) {
        negativeCacheSet(key);
      }

      if (source) {
        const body = wantsWebp
          ? await toWebpBounded(key, source.data, source.mimeType)
          : { data: source.data, mimeType: source.mimeType };
        return binaryResponse(body.data, body.mimeType);
      }
    }

    // Legacy local images: relative path under public/images/.
    const localResp = await serveLocal(key, wantsWebp);
    if (localResp) return localResp;

    return notFound();
  } catch (err) {
    console.error("Image proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
