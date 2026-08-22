import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function GET() {
  try {
    const pages = await db.contentPage.findMany({ orderBy: { slug: "asc" } });
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const page = await db.contentPage.upsert({
      where: { slug: body.slug },
      update: { title: body.title, content: body.content, isPublished: body.isPublished },
      create: { slug: body.slug, title: body.title, content: body.content, isPublished: body.isPublished },
    });
    return NextResponse.json({ page });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
