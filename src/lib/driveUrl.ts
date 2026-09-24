/**
 * Locate a Google Drive file id inside a stored media URL.
 *
 * Drive-backed media is referenced in two shapes, and both are live right now:
 *
 *   /api/images/<fileId>                          — this app's own proxy route
 *   https://lh3.googleusercontent.com/d/<fileId>  — Google's CDN, straight to the browser
 *
 * The CDN shape is preferred wherever we control the value, because bytes Google
 * serves never count against Vercel's Fast Origin Transfer fair-use limit — the
 * overage type that paused this project's production traffic. Existing rows
 * still carry the proxy shape, so anything that needs the underlying file id has
 * to understand both rather than assuming one.
 *
 * Deliberately returns null for legacy local paths that also live under
 * /api/images/ (for example /api/images/banners/hero-living-room.png). Those are
 * served off disk by the proxy, not from Drive, so there is no file id to find.
 */

const PROXIED_PATTERN = /^\/api\/images\/([^/?#]+)$/;
const CDN_PATTERN = /^https:\/\/lh3\.googleusercontent\.com\/d\/([^/?#]+)$/;

export function driveFileIdFromUrl(url?: string | null): string | null {
  if (typeof url !== "string") return null;
  // Cached or rewritten values can pick up a query or fragment; the file id is
  // always the last path segment, so drop anything after it before matching.
  const [bare] = url.trim().split(/[?#]/);
  if (!bare) return null;
  const match = PROXIED_PATTERN.exec(bare) ?? CDN_PATTERN.exec(bare);
  return match ? match[1] : null;
}
