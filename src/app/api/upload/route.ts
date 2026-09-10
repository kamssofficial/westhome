import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import { isR2Configured, r2Put } from "@/lib/r2";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Vercel Blob fallback. Mirrors the wire format of the official @vercel/blob
// SDK (https://vercel.com/api/blob/put with the same headers + token parsing)
// so this works without adding the dependency. Token format:
//   vercel_blob_rw_<jwt>_<storeId>_<key>  (storeId is the 4th underscore part)
const VERCELL_BLOB_API = "https://vercel.com/api/blob";

function blobStoreIdFromToken(token: string): string {
  return token.split("_")[3] || "";
}

async function vercelBlobPut(key: string, body: Buffer, contentType: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");
  const pathname = key.replace(/^\/+/, "");
  const params = new URLSearchParams({ pathname });
  const res = await fetch(`${VERCELL_BLOB_API}/put?${params.toString()}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "x-vercel-blob-store-id": blobStoreIdFromToken(token),
      "x-vercel-blob-access": "public",
      "x-content-type": contentType,
      "x-add-random-suffix": "0",
      "x-api-version": "12",
      "x-api-blob-request-id": `${blobStoreIdFromToken(token)}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      "x-api-blob-request-attempt": "0",
    },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vercel Blob upload failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Vercel Blob upload returned no URL");
  return data.url;
}

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Storage priority: R2 → Vercel Blob → Local filesystem
    // 1. R2 (if configured)
    if (isR2Configured()) {
      try {
        const uploaded = await r2Put(r2Key, buffer, file.type);
        return NextResponse.json({ url: uploaded.url, pathname: r2Key }, { status: 201 });
      } catch (r2Error: unknown) {
        console.error("R2 upload failed, trying Vercel Blob:", r2Error instanceof Error ? r2Error.message : r2Error);
        // Fall through to next option
      }
    }

    // 2. Vercel Blob (if BLOB_READ_WRITE_TOKEN is set)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blobUrl = await vercelBlobPut(r2Key, buffer, file.type);
        return NextResponse.json({ url: blobUrl, pathname: r2Key }, { status: 201 });
      } catch (blobError: unknown) {
        console.error("Vercel Blob upload failed, trying local filesystem:", blobError instanceof Error ? blobError.message : blobError);
        // Fall through to next option
      }
    }

    // 3. Local filesystem (development only — Vercel's filesystem is read-only)
    if (process.env.NODE_ENV === "production") {
      console.error("No cloud storage configured (R2 or Vercel Blob). Upload rejected.");
      return NextResponse.json(
        { error: "Storage not configured. Set R2_* or BLOB_READ_WRITE_TOKEN env vars." },
        { status: 503 }
      );
    }

    const publicDir = path.join(process.cwd(), "public", "images", folder);
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, filename);
    await writeFile(filePath, buffer);

    const url = "/images/" + folder + "/" + filename;
    return NextResponse.json({ url, pathname: url }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
