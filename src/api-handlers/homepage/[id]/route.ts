import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    // SECURITY: Allowlist fields — do not mass-assign raw body
    const ALLOWED_FIELDS = ["type", "title", "subtitle", "description", "image", "videoUrl", "buttonText", "buttonLink", "buttonStyle", "isActive", "position", "backgroundColor", "textColor", "content"] as const;
    const data: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    const section = await db.homepageSection.update({
      where: { id },
      data,
    });

    return NextResponse.json({ section });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    await db.homepageSection.delete({ where: { id } });
    return NextResponse.json({ message: "Section deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
