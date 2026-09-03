import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import db from "@/lib/db";
import { put, del } from "@vercel/blob";

const HERO_ACTIVE_KEY = "hero_active";
const HERO_HISTORY_KEY = "hero_history";

interface HeroImage {
  url: string;
  filename: string;
  position: string; // center, center-left, center-right, top, bottom
  uploadedBy: string;
  uploadedByName: string;
  width?: number;
  height?: number;
  size?: number;
  createdAt: string;
}

// GET — get active hero + history (requires auth)
export async function GET() {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });

    const active: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;
    const history: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];

    return NextResponse.json({ active, history });
  } catch (error) {
    console.error("Hero GET error:", error);
    return NextResponse.json({ error: "Failed to fetch hero images" }, { status: 500 });
  }
}

// POST — upload and publish new hero image
export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const userId = (authResult.session?.user as any)?.id || "unknown";
    const userName = (authResult.session?.user as any)?.name || "Staff";

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const position = (formData.get("position") as string) || "center";

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

    // Get image dimensions
    let width = 0;
    let height = 0;
    try {
      const bytes = await file.arrayBuffer();
      // Simple PNG/JPEG header dimension reading
      const arr = new Uint8Array(bytes);
      if (arr[0] === 0x89 && arr[1] === 0x50) {
        // PNG
        width = (arr[16] << 24) | (arr[17] << 16) | (arr[18] << 8) | arr[19];
        height = (arr[20] << 24) | (arr[21] << 16) | (arr[22] << 8) | arr[23];
      } else if (arr[0] === 0xff && arr[1] === 0xd8) {
        // JPEG — scan for SOF marker
        let i = 2;
        while (i < arr.length - 9) {
          if (arr[i] === 0xff && (arr[i + 1] === 0xc0 || arr[i + 1] === 0xc2)) {
            height = (arr[i + 5] << 8) | arr[i + 6];
            width = (arr[i + 7] << 8) | arr[i + 8];
            break;
          }
          i += ((arr[i + 2] << 8) | arr[i + 3]) + 2;
        }
      }
    } catch {}

    // Upload to storage
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
      const bytes = await file.arrayBuffer();
      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "images", "banners");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(bytes));
      imageUrl = `/images/banners/${filename}`;
    }

    // Build new hero image record
    const newHero: HeroImage = {
      url: imageUrl,
      filename,
      position,
      uploadedBy: userId,
      uploadedByName: userName,
      width,
      height,
      size: file.size,
      createdAt: new Date().toISOString(),
    };

    // Get current active and history
    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });
    const currentActive: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;
    const existingHistory: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];

    // Add current active to history (if exists)
    const updatedHistory = currentActive
      ? [currentActive, ...existingHistory].slice(0, 20) // Keep last 20
      : existingHistory;

    // Save new active
    await db.siteSetting.upsert({
      where: { key: HERO_ACTIVE_KEY },
      update: { value: newHero as any },
      create: { key: HERO_ACTIVE_KEY, value: newHero as any, group: "hero" },
    });

    // Save history
    await db.siteSetting.upsert({
      where: { key: HERO_HISTORY_KEY },
      update: { value: { images: updatedHistory as any } },
      create: { key: HERO_HISTORY_KEY, value: { images: updatedHistory as any }, group: "hero" },
    });

    // Clean up old blob (best effort, keep history copies)
    if (currentActive?.url?.includes("blob.vercel-storage.com") && currentActive.url !== imageUrl) {
      // Don't delete — keep in history for restore
    }

    return NextResponse.json({ active: newHero, success: true });
  } catch (error) {
    console.error("Hero upload error:", error);
    return NextResponse.json({ error: "Failed to upload hero image" }, { status: 500 });
  }
}

// PATCH — update position or restore from history
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { position, restoreUrl } = body;

    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const active: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;

    if (!active) {
      return NextResponse.json({ error: "No hero image to update" }, { status: 400 });
    }

    // Update position
    if (position) {
      active.position = position;
      await db.siteSetting.upsert({
        where: { key: HERO_ACTIVE_KEY },
        update: { value: active as any },
        create: { key: HERO_ACTIVE_KEY, value: active as any, group: "hero" },
      });
      return NextResponse.json({ active, success: true });
    }

    // Restore from history
    if (restoreUrl) {
      const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });
      const history: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];
      const restore = history.find((h) => h.url === restoreUrl);
      if (!restore) {
        return NextResponse.json({ error: "Image not found in history" }, { status: 404 });
      }

      // Move current to history, restore selected
      const updatedHistory = [active, ...history.filter((h) => h.url !== restoreUrl)].slice(0, 20);
      await db.siteSetting.upsert({
        where: { key: HERO_ACTIVE_KEY },
        update: { value: restore as any },
        create: { key: HERO_ACTIVE_KEY, value: restore as any, group: "hero" },
      });
      await db.siteSetting.upsert({
        where: { key: HERO_HISTORY_KEY },
        update: { value: { images: updatedHistory as any } },
        create: { key: HERO_HISTORY_KEY, value: { images: updatedHistory as any }, group: "hero" },
      });

      return NextResponse.json({ active: restore, success: true });
    }

    return NextResponse.json({ error: "No valid action provided" }, { status: 400 });
  } catch (error) {
    console.error("Hero PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE — remove active hero image
export async function DELETE() {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const active: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;

    if (active) {
      const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });
      const history: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];
      const updatedHistory = [active, ...history].slice(0, 20);
      await db.siteSetting.upsert({
        where: { key: HERO_HISTORY_KEY },
        update: { value: { images: updatedHistory as any } },
        create: { key: HERO_HISTORY_KEY, value: { images: updatedHistory as any }, group: "hero" },
      });
    }

    await db.siteSetting.delete({ where: { key: HERO_ACTIVE_KEY } }).catch(() => {});
    return NextResponse.json({ success: true, active: null });
  } catch (error) {
    console.error("Hero DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove hero image" }, { status: 500 });
  }
}
