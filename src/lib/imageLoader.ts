import type { ImageLoaderProps } from "next/image";

const PROXY_PREFIX = "/api/images/";

/**
 * Routes Drive-backed uploads through the proxy's `?w=` resize instead of
 * letting the browser pull the full-resolution original.
 *
 * `next/image` derives the width from `sizes` (or the rendered box), so a 25vw
 * product card asks for a ~640px derivative while a full-width banner asks for
 * ~1600px. The proxy downstream honours that and clamps it.
 *
 * Next's built-in optimizer is deliberately not in play: it would fetch the
 * proxy's output and re-encode it, paying for the same image twice on an
 * origin that is already the bottleneck. The proxy does the transcoding, so it
 * only needs to be told which size to produce.
 *
 * Static and third-party sources get the width appended as a cache-busting
 * query (`/images/x.png?w=640`) without changing what is served: Next requires
 * a custom loader to consume `width` for every image it handles, and swallowing
 * the parameter triggers its "loader does not implement width" warning while
 * breaking srcset deduplication. Static files ignore `w` server-side, so the
 * browser just caches the same bytes under the wider key.
 */
export default function imageLoader({ src, width }: ImageLoaderProps): string {
  // data:/blob: URLs have nowhere to put a width, and there is nothing to
  // dedupe — leave them untouched.
  if (!src.startsWith("/") && !/^https?:/i.test(src)) return src;
  const queryIndex = src.indexOf("?");
  const path = queryIndex === -1 ? src : src.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? "" : src.slice(queryIndex + 1));
  params.set("w", String(width));
  return `${path}?${params.toString()}`;
}
