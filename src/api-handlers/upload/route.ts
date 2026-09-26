import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuthRole } from "@/lib/apiAuth";
import { storageStatus, uploadMedia } from "@/lib/media";
import { sniffImageType, imageExtensionFor } from "@/lib/imageMagic";
import { classifyDriveError, driveHealthCheck } from "@/lib/gdrive";
import { s3HealthCheck } from "@/lib/s3";

export const runtime = "nodejs";

// Keep uploads moderate: the client-side uploader downscales photos well below
// this limit, and every reverse proxy in front of the app (nginx client_max_body_size
// etc.) is sized to match. See scripts/godaddy-deploy-check.mjs.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_FOLDERS = ["products", "categories", "banners", "avatars", "homepage", "staff"];

/**
 * GET /api/upload          -> env-key presence (cheap, no Google calls; what
 *                             the storage-health workflow greps).
 * GET /api/upload?probe=1  -> actually refreshes a token so "configured"
 *                             means the credentials WORK, not merely exist.
 *                             A revoked/expired refresh token looks identical
 *                             to a healthy one under presence-only checks.
 */
export async function GET(request: NextRequest) {
  const status = storageStatus();
  const wantsProbe = request.nextUrl.searchParams.get("probe") === "1";
  const health = wantsProbe
    ? status.s3.configured
      ? await s3HealthCheck()
      : status.drive.configured
        ? await driveHealthCheck()
        : null
    : null;
  return NextResponse.json({
    storage: {
      ...status,
      health,
      recommendation: status.uploadAvailable
      ? health && !health.ok
        ? status.s3.configured
          ? `S3 storage is configured but unhealthy: ${health.error ?? "request failed"}`
          : `Drive credentials are present but broken: ${health.error ?? "request failed"}`
        : null
        : `Image storage is not configured. ${status.missing ?? "Configure managed S3 or Google Drive credentials."}`,
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  // Storage selection is handled by uploadMedia(). Production prefers managed S3,
  // then Google Drive for legacy deployments; local disk is development-only.
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = String(formData.get("folder") || "products");
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : "products";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "The selected file is empty" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 5 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Validate the bytes, not the declared Content-Type.
    const detected = sniffImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "That file is not a valid image. Please upload a JPG, PNG, WebP or GIF." },
        { status: 415 }
      );
    }
    // The extension comes from the bytes, so a .png that is really a JPEG is
    // still stored (and later served) with the correct extension.
    const ext = imageExtensionFor(buffer) || "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const media = await uploadMedia(folder, file, filename);

    return NextResponse.json(
      { url: media.url, pathname: media.pathname, fileId: media.fileId ?? undefined, folder, provider: media.provider },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    // Auth/config failures (expired refresh token, wrong client secret, missing
    // credentials, quota, disabled API...) get the actionable fix in the message;
    // everything else keeps the generic reply so we never leak internals.
    const classified = classifyDriveError(error);
    const errorBody =
      classified.kind === "unknown"
        ? { error: "Upload failed. Please try again.", storage: storageStatus() }
        : { error: `${classified.error} ${classified.action}`, kind: classified.kind, storage: storageStatus() };
    return NextResponse.json(errorBody, { status: 503 });
  }
}
