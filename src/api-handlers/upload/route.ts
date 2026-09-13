import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuthRole } from "@/lib/apiAuth";
import { storageStatus, uploadMedia } from "@/lib/media";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
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
        : "Configure GOOGLE_OAUTH_* (or GOOGLE_CREDENTIALS_PATH / GOOGLE_CREDENTIALS_JSON) in Vercel Production.",
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 10 MB." }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = String(formData.get("folder") || "products");
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported image format. Please upload JPG, PNG, WebP, or GIF." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 10 MB." }, { status: 413 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const media = await uploadMedia(folder, file, filename);

    return NextResponse.json({ url: media.url, pathname: media.pathname, fileId: media.fileId ?? undefined, folder, provider: media.provider }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    const message = error?.message?.includes("Storage is not configured")
      ? "Image storage is not configured. Add GOOGLE_OAUTH_* (or GOOGLE_CREDENTIALS_PATH / GOOGLE_CREDENTIALS_JSON) to Vercel Production."
      : "Upload failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
