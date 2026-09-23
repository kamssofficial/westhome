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

export async function GET() {
  const status = storageStatus();
  return NextResponse.json({
    storage: {
      ...status,
      mode: process.env.NODE_ENV,
      recommendation: status.anyConfigured
        ? null
        : "Configure GOOGLE_OAUTH_* (or GOOGLE_CREDENTIALS_JSON / GOOGLE_CREDENTIALS_PATH) in the production environment.",
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = String(formData.get("folder") || "products");
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image format. Please upload JPG, PNG, WebP, or GIF." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 4 MB." }, { status: 413 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const media = await uploadMedia(folder, file, filename);

    return NextResponse.json({ url: media.url, pathname: media.pathname, fileId: media.fileId ?? undefined, folder, provider: media.provider }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    const message = error?.message?.includes("Storage is not configured")
      ? "Image storage is not configured on the server. Add GOOGLE_OAUTH_* (or GOOGLE_CREDENTIALS_JSON / GOOGLE_CREDENTIALS_PATH) to the production environment, then redeploy."
      : "Upload failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
