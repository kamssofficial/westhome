import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import db from "@/lib/db";
import { uploadMedia, deleteMedia, storageStatus } from "@/lib/media";

const HERO_ACTIVE_KEY = "hero_active";
const HERO_HISTORY_KEY = "hero_history";

interface HeroImage {
  url: string;
  filename?: string;
  position: string; // center, center-left, center-right, top, bottom
  uploadedBy: string;
  uploadedByName: string;
  width?: number;
  height?: number;
  size?: number;
  createdAt: string;
  fileId?: string; // Drive file id for clean deletes
  storageKey?: string; // legacy storage key from previous backends; unused by Drive
}

// GET — get active hero + history (requires auth)
export async function GET() {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });
    const currentActive: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;
    const existingHistory: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];

    return NextResponse.json({
      active: currentActive,
      history: existingHistory,
      storage: storageStatus(),
    });
  } catch (error) {
    console.error("Admin hero-image GET error:", error);
    return NextResponse.json({ error: "Failed to load hero images" }, { status: 500 });
  }
}

// POST — upload a hero image, replacing the current one
export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { position, fileName, file, width, height, size, uploadedBy, uploadedByName } = body;

    if (!position || !file) {
      return NextResponse.json({ error: "Missing required fields (position, file)" }, { status: 400 });
    }

    // Upload to storage — Google Drive, or local filesystem in dev only.
    const ext = file.name.split(".").pop() || "png";
    const filename = `hero-${Date.now()}.${ext}`;
    let imageUrl: string;
    let fileId: string | undefined;

    try {
      const media = await uploadMedia("banners", file, filename);
      imageUrl = media.url;
      fileId = media.fileId;
    } catch (uploadErr: any) {
      console.error("Hero upload failed:", uploadErr?.message || uploadErr);
      return NextResponse.json(
        { error: uploadErr.message, storage: storageStatus() },
        { status: 503 }
      );
    }

    // Build new hero image record
    const newHero: HeroImage = {
      url: imageUrl,
      filename,
      position,
      uploadedBy: uploadedBy || "admin",
      uploadedByName: uploadedByName || "Admin",
      width,
      height,
      size,
      createdAt: new Date().toISOString(),
      fileId,
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

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (error) {
    console.error("Hero PATCH error:", error);
    return NextResponse.json({ error: "Failed to update hero image" }, { status: 500 });
  }
}

// DELETE — remove a hero image and its storage file
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const url = searchParams.get("url");

    if (!fileId && !url) {
      return NextResponse.json({ error: "Missing fileId or url" }, { status: 400 });
    }

    // Delete the underlying storage file; the DB row is removed by the caller.
    await deleteMedia({ fileId, url });

    // Remove from active hero
    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const active: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;

    if (active && ((fileId && active.fileId === fileId) || (url && active.url === url))) {
      const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });
      const history: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];
      await db.siteSetting.upsert({
        where: { key: HERO_ACTIVE_KEY },
        update: { value: null as any },
        create: { key: HERO_ACTIVE_KEY, value: null as any, group: "hero" },
      });

      if (history.length > 0) {
        await db.siteSetting.upsert({
          where: { key: HERO_HISTORY_KEY },
          update: { value: { images: history as any } },
          create: { key: HERO_HISTORY_KEY, value: { images: history as any }, group: "hero" },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Hero image not found" }, { status: 404 });
  } catch (error) {
    console.error("Hero DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete hero image" }, { status: 500 });
  }
}
