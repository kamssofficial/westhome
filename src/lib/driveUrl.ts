/**
 * The single place that knows how Drive-backed media is addressed.
 *
 * Two shapes are live in the database at once:
 *
 *   /api/images/<fileId>                          — this app's own proxy route
 *   https://lh3.googleusercontent.com/d/<fileId>  — Google's CDN, straight to the browser
 *
 * Storefront reads are normalized to the proxy shape: Google rate-limits
 * anonymous hotlinks to its CDN (during a real page load it sometimes answers
 * 429 with a text/html body, and the browser then discards that non-image
 * cross-origin response as opaque — ERR_BLOCKED_BY_ORB), while the proxy
 * downloads the same file server-side, where neither limit applies, and adds
 * content negotiation plus cache headers the CDN shape cannot offer. The CDN
 * shape stays understood (and remains the proxy's own fallback source), so
 * anything that needs the underlying file id has to handle both.
 *
 * Legacy local paths also live under /api/images/ (for example
 * /api/images/banners/hero-living-room.png). Those are served off disk by the
 * proxy, not from Drive, so there is no file id to find — `driveFileIdFromUrl`
 * deliberately returns null for them and `proxiedMediaUrl` leaves them alone.
 */

export const DRIVE_PROXY_PREFIX = "/api/images/";
export const DRIVE_CDN_PREFIX = "https://lh3.googleusercontent.com/d/";

const PROXIED_PATTERN = /^\/api\/images\/([^/?#]+)$/;
// Google can append a size suffix to the path (`<id>=s1600`), so the id ends at
// the `=` and the suffix is tolerated after it.
const CDN_PATTERN = /^https:\/\/lh3\.googleusercontent\.com\/d\/([^/?#=]+)(?:=[^/?#]*)?$/;

// A bare Drive id: no path separators, at least twenty id characters.
const ID_BODY = /^[A-Za-z0-9_-]{20,}$/;
// The catalog importer appended image extensions to some Drive ids
// ("…d0HB43dLQ.webp"). A real id never has one, and both the Drive API and the
// CDN 404 on the decorated string, so it must come off before use.
const DECORATIVE_EXT = /\.(webp|jpe?g|png|gif)$/i;

/**
 * Strip a decorative image extension from a captured id — but only when what
 * remains looks like a bare id, so legacy local filenames (which contain a
 * path, or are short names like "hero.webp") pass through untouched.
 */
export function normalizeDriveFileId(id: string): string {
  if (id.includes("/")) return id;
  const stripped = id.replace(DECORATIVE_EXT, "");
  return stripped !== id && ID_BODY.test(stripped) ? stripped : id;
}

export function driveFileIdFromUrl(url?: string | null): string | null {
  if (typeof url !== "string") return null;
  // Cached or rewritten values can pick up a query or fragment; the file id is
  // always first, so drop anything after it before matching.
  const [bare] = url.trim().split(/[?#]/);
  if (!bare) return null;
  const match = PROXIED_PATTERN.exec(bare) ?? CDN_PATTERN.exec(bare);
  return match ? normalizeDriveFileId(match[1]) : null;
}

/**
 * Route Drive-backed media through this app's own proxy, leaving everything
 * else (local assets, remote banners) untouched. Returns null only when the
 * input is absent, so callers can keep using `|| fallback` chains.
 */
export function proxiedMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const fileId = driveFileIdFromUrl(url);
  // Deterministic WebP URLs make browser/SW/CDN caches reusable across requests
  // without relying on Accept-header negotiation.
  return fileId && ID_BODY.test(fileId) ? `${DRIVE_PROXY_PREFIX}${fileId}.webp` : url;
}
