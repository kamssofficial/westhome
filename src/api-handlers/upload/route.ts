import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuthRole } from "@/lib/apiAuth";
import { storageStatus, uploadMedia } from "@/lib/media";

export const runtime = "nodejs";

// Keep uploads moderate: the client-side uploader downscales photos well below
// this limit, and every reverse proxy in front of the app (nginx client_max_body_size
// etc.) is sized to match. See scripts/godaddy-deploy-check.mjs.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_FOLDERS = ["products", "categories", "banners", "avatars", "homepage", "staff"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// The declared Content-Type is a hint, not evidence. A mislabelled or
// hand-crafted upload must not be able to push a non-image into the media
// bucket, so the first bytes have to agree with the extension.
const MAGIC: { mime: string; bytes: number[]; offset: number }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
];

function sniff(buffer: Buffer): string | null {
  for (const sig of MAGIC) {
    if (sig.bytes.every((b, i) => buffer[sig.offset + i] === b)) return sig.mime;
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const EXT_FOR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function GET() {
  return NextResponse.json({ storage: storageStatus() });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const status = storageStatus();
  // Fail fast, and say exactly what to set. Previously this surfaced as a
  // 503 with a Drive-specific hint after the bytes had already been uploaded.
  if (!status.anyConfigured) {
    return NextResponse.json(
      { error: `Image storage is not configured. ${status.missing}`, storage: status },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = String(formData.get("folder") || "products");
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "The selected file is empty" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 4 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = sniff(buffer);
    if (!detected || !ALLOWED_TYPES.includes(detected)) {
      return NextResponse.json(
        { error: "That file is not a valid image. Please upload a JPG, PNG, WebP or GIF." },
        { status: 415 }
      );
    }
    // The extension is derived from the bytes, not the filename, so a .png
    // that is really a JPEG is still stored with a correct extension.
    const ext = EXT_FOR_TYPE[detected] || "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const media = await uploadMedia(folder, file, filename);

    return NextResponse.json(
      { url: media.url, pathname: media.pathname, fileId: media.fileId ?? undefined, folder, provider: media.provider },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    // Only pass through messages we wrote ourselves. Everything else could
    // carry internal paths or driver detail, so it gets a generic reply and
    // the full error stays in the server log.
    const raw = typeof error?.message === "string" ? error.message : "";
    const isKnownConfigError =
      /not configured/i.test(raw) || /R2_PUBLIC_URL/i.test(raw) || /bucket/i.test(raw);
    return NextResponse.json(
      { error: isKnownConfigError ? raw : "Upload failed. Please try again.", storage: storageStatus() },
      { status: 503 }
    );
  }
}
