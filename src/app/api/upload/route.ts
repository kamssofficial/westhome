import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json({ error: "Image is too large. Maximum size is " + maxMB + " MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = timestamp + "-" + random + "." + ext;

    // Save to public/images/{folder}/
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
