import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import db from "@/lib/db";
import { put, del } from "@vercel/blob";

const HERO_KEY = "hero_image_url";

export async function GET() {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: HERO_KEY } });
    const url = setting ? (setting.value as any)?.url || null : null;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Hero image GET error:", error);
    return NextResponse.json({ url: null });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Image must be JPG, PNG, or WEBP" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
    }

    // Get current hero image to delete later
    const currentSetting = await db.siteSetting.findUnique({ where: { key: HERO_KEY } });
    const currentUrl = currentSetting ? (currentSetting.value as any)?.url : null;

    // Upload new image
    const ext = file.name.split(".").pop() || "png";
    const filename = `hero-${Date.now()}.${ext}`;
    
    let imageUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`banners/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      imageUrl = blob.url;
    } else {
      // Fallback for local dev
      const bytes = await file.arrayBuffer();
      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "images", "banners");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, Buffer.from(bytes));
      imageUrl = `/images/banners/${filename}`;
    }

    // Save to database
    await db.siteSetting.upsert({
      where: { key: HERO_KEY },
      update: { value: { url: imageUrl, updatedAt: new Date().toISOString() } },
      create: { key: HERO_KEY, value: { url: imageUrl, updatedAt: new Date().toISOString() }, group: "general" },
    });

    // Try to clean up old blob image (best effort)
    if (currentUrl && currentUrl.includes("blob.vercel-storage.com") && currentUrl !== imageUrl) {
      try { await del(currentUrl); } catch {}
    }

    return NextResponse.json({ url: imageUrl, success: true });
  } catch (error) {
    console.error("Hero image upload error:", error);
    return NextResponse.json({ error: "Failed to upload hero image" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const setting = await db.siteSetting.findUnique({ where: { key: HERO_KEY } });
    const url = setting ? (setting.value as any)?.url : null;

    // Delete from blob if applicable
    if (url && url.includes("blob.vercel-storage.com")) {
      try { await del(url); } catch {}
    }

    // Remove from database
    await db.siteSetting.delete({ where: { key: HERO_KEY } }).catch(() => {});

    return NextResponse.json({ success: true, url: null });
  } catch (error) {
    console.error("Hero image DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete hero image" }, { status: 500 });
  }
}
