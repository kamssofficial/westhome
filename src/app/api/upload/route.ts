import { NextRequest, NextResponse } from "next/server";
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
        : "No storage backend configured. Set B2_* (recommended), R2_*, BLOB_READ_WRITE_TOKEN, or GOOGLE_CREDENTIALS_* in Vercel.",
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    const maxMB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return NextResponse.json(
      { error: `Image is too large. Maximum size is ${maxMB} MB.` },
      { status: 413 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "products";
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image format. Please upload JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const maxMB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
      return NextResponse.json({ error: `Image is too large. Maximum size is ${maxMB} MB.` }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = timestamp + "-" + random + "." + ext;

    const media = await uploadMedia(folder, file, filename);

    return NextResponse.json(
      {
        url: media.url,
        pathname: media.pathname,
        fileId: media.fileId ?? undefined,
        folder,
        provider: media.provider,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    const message = error?.message?.includes("Storage is not configured")
      ? error.message
      : "Upload failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
