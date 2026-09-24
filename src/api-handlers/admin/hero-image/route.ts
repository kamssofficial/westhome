import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import db from "@/lib/db";
import { uploadMedia, storageStatus } from "@/lib/media";
import { sniffImageType, imageExtensionFor } from "@/lib/imageMagic";

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

const MAX_HERO_BYTES = 10 * 1024 * 1024;

/**
 * Pixel size from the file header, for the "1024 x 768" caption in the panel.
 * PNG (IHDR) and JPEG (SOF0/SOF2) cover everything the uploader accepts; a
 * header we cannot read yields zeros, and the caption is display-only anyway.
 */
function imageDimensions(buffer: Buffer): { width: number; height: number } {
  try {
    if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buffer.length) {
        if (buffer[i] !== 0xff) { i += 1; continue; }
        const marker = buffer[i + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          return { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
        }
        const segmentLength = buffer.readUInt16BE(i + 2);
        i += segmentLength > 0 ? segmentLength + 2 : 2;
      }
    }
  } catch {}
  return { width: 0, height: 0 };
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
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    // The panel posts multipart form data (HeroManager.handlePublish), so the
    // image arrives as bytes. It can never arrive as a JSON field: JSON cannot
    // carry a File, and uploadMedia needs the real thing.
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_HERO_BYTES) {
      return NextResponse.json({ error: "Image must be under 10MB" }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const position = (formData.get("position") as string) || "center";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "The selected file is empty" }, { status: 400 });
    }
    if (file.size > MAX_HERO_BYTES) {
      return NextResponse.json({ error: "Image must be under 10MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Validate the bytes instead of the declared Content-Type, and take the
    // extension from them, so a mislabelled upload is still stored correctly.
    if (!sniffImageType(buffer)) {
      return NextResponse.json({ error: "Image must be JPG, PNG, WEBP or GIF" }, { status: 415 });
    }
    const { width, height } = imageDimensions(buffer);
    const ext = imageExtensionFor(buffer) || "jpg";
    const filename = `hero-${Date.now()}.${ext}`;
    const userId = (authResult.session?.user as any)?.id || "unknown";
    const userName = (authResult.session?.user as any)?.name || "Admin";
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
      uploadedBy: userId,
      uploadedByName: userName,
      width,
      height,
      size: file.size,
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

// DELETE — take the active hero down, keeping it in history so it can be restored
export async function DELETE() {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const activeSetting = await db.siteSetting.findUnique({ where: { key: HERO_ACTIVE_KEY } });
    const active: HeroImage | null = activeSetting ? (activeSetting.value as any) : null;

    // Nothing is live, so "removed" already holds — clicking remove twice is safe.
    if (!active) return NextResponse.json({ success: true, active: null });

    const historySetting = await db.siteSetting.findUnique({ where: { key: HERO_HISTORY_KEY } });
    const history: HeroImage[] = historySetting ? ((historySetting.value as any)?.images || []) : [];

    // The removed image — and its Drive file — stays at the top of history,
    // because that is what the panel's Restore button works from. Deleting the
    // file here would leave a dead thumbnail and a restore that cannot work.
    const updatedHistory = [active, ...history.filter((h) => h.url !== active.url)].slice(0, 20);

    await db.siteSetting.upsert({
      where: { key: HERO_HISTORY_KEY },
      update: { value: { images: updatedHistory as any } },
      create: { key: HERO_HISTORY_KEY, value: { images: updatedHistory as any }, group: "hero" },
    });
    await db.siteSetting.upsert({
      where: { key: HERO_ACTIVE_KEY },
      update: { value: null as any },
      create: { key: HERO_ACTIVE_KEY, value: null as any, group: "hero" },
    });

    return NextResponse.json({ success: true, active: null });
  } catch (error) {
    console.error("Hero DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove hero image" }, { status: 500 });
  }
}
