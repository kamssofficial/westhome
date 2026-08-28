import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["products", "categories", "banners", "avatars", "homepage", "staff"]);
const MAX_SIZE = 10 * 1024 * 1024;

function detectImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 6 && (String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a" || String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a")) return "image/gif";
  return null;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawFolder = formData.get("folder");
    const folder = typeof rawFolder === "string" && ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "products";

    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_SIZE) return NextResponse.json({ error: "Image must be between 1 byte and 10 MB" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectImageType(buffer);
    if (!detectedType || detectedType !== file.type) return NextResponse.json({ error: "Unsupported or invalid image file" }, { status: 400 });

    const extension = detectedType === "image/jpeg" ? "jpg" : detectedType.split("/")[1];
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const blobPath = `${folder}/${filename}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(blobPath, buffer, { access: "public", contentType: detectedType, addRandomSuffix: false });
        return NextResponse.json({ url: blob.url, pathname: blobPath }, { status: 201 });
      } catch (error) {
        console.error("Vercel Blob upload failed", error);
        return NextResponse.json({ error: "Image upload to cloud storage failed" }, { status: 502 });
      }
    }

    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Cloud storage is not configured" }, { status: 503 });
    }

    const publicDir = path.join(process.cwd(), "public", "images", folder);
    if (!existsSync(publicDir)) await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(publicDir, filename), buffer, { flag: "wx" });
    const url = `/images/${folder}/${filename}`;
    return NextResponse.json({ url, pathname: url }, { status: 201 });
  } catch (error) {
    console.error("Upload error", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
