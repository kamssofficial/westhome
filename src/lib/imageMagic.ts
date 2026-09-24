/**
 * Content-based image type detection.
 *
 * A browser-supplied Content-Type is a hint, not evidence: it is whatever the
 * user's OS happened to report, and a crafted upload can claim anything. Media
 * that lands in the catalog bucket is served back to every storefront visitor,
 * so the bytes themselves decide what the file is and what it is stored as.
 *
 * Kept dependency-free (no `@/` imports) so it can be unit-tested directly.
 */

export interface Signature {
  mime: string;
  bytes: number[];
  offset: number;
}

export const SIGNATURES: Signature[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
];

/** Extension actually written to storage, derived from the bytes. */
export const EXT_FOR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXT_FOR_TYPE);

/** Returns the detected MIME type, or null when the buffer is not an image. */
export function sniffImageType(buffer: Uint8Array | Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[sig.offset + i] === b)) return sig.mime;
  }
  // WebP is a RIFF container: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    Buffer.from(buffer.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(buffer.subarray(8, 12)).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Convenience: the stored file extension for these bytes, or null. */
export function imageExtensionFor(buffer: Uint8Array | Buffer): string | null {
  const mime = sniffImageType(buffer);
  return mime ? EXT_FOR_TYPE[mime] : null;
}
