import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuthRole } from "@/lib/apiAuth";
import { storageStatus, uploadMedia } from "@/lib/media";
import { sniffImageType, imageExtensionFor } from "@/lib/imageMagic";

export const runtime = "nodejs";

// Keep uploads moderate: the client-side uploader downscales photos well below
// this limit, and every reverse proxy in front of the app (nginx client_max_body_size
// etc.) is sized to match. See scripts/godaddy-deploy-check.mjs.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_FOLDERS = ["products", "categories", "banners", "avatars", "homepage", "staff"];

export async function GET() {
  return NextResponse.json({ storage: storageStatus() });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  // Fail fast, and say exactly what to set. Previously this surfaced as a 503
  // with a Cloudflare-R2 hint after the bytes had already been uploaded.
  const status = storageStatus();
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
    // Validate the bytes, not the declared Content-Type.
    const detected = sniffImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "That file is not a valid image. Please upload a JPG, PNG, WebP or GIF." },
        { status: 415 }
      );
    }
    // The extension comes from the bytes, so a .png that is really a JPEG is
    // still stored (and later served) with the correct extension.
    const ext = imageExtensionFor(buffer) || "jpg";
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
    const isKnownConfigError = /not configured/i.test(raw) || /GOOGLE_OAUTH/i.test(raw);
    return NextResponse.json(
      { error: isKnownConfigError ? raw : "Upload failed. Please try again.", storage: storageStatus() },
      { status: 503 }
    );
  }
}
