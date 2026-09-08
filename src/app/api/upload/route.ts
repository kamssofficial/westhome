import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import { isR2Configured, r2Put } from "@/lib/r2";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  // Reject oversized bodies before multipart parsing: parsing a body over the
  // limit fails with a generic 500, so check Content-Length up front.
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large. Maximum size is 10 MB." }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "products";

    const ALLOWED_FOLDERS = ["products", "categories", "banners", "avatars", "homepage", "staff"];
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image format. Please upload JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 10 MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = timestamp + "-" + random + "." + ext;
    const r2Key = folder + "/" + filename;

    // Storage: R2 in production. Local filesystem fallback for local dev only —
    // never on R2 failure (Vercel's filesystem is read-only, so a fallback
    // there would 500 with a misleading log).
    if (isR2Configured()) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await r2Put(r2Key, buffer, file.type);
        return NextResponse.json({ url: uploaded.url, pathname: r2Key }, { status: 201 });
      } catch (r2Error: any) {
        console.error("R2 upload failed:", r2Error.message);
        return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 503 });
      }
    }

    // Local filesystem fallback for local development only. In production this
    // would hit Vercel's read-only filesystem, so refuse rather than 500.
    if (process.env.NODE_ENV === "production") {
      console.error("R2 is not configured in production; rejecting upload");
      return NextResponse.json({ error: "Storage is not configured. Please try again later." }, { status: 503 });
    }

    const publicDir = path.join(process.cwd(), "public", "images", folder);
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(publicDir, filename);
    await writeFile(filePath, buffer);

    const url = "/images/" + folder + "/" + filename;
    return NextResponse.json({ url, pathname: url }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
