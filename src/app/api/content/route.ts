import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const pages = await db.contentPage.findMany({ orderBy: { slug: "asc" } });
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

export async function PUT(request: NextRequest) {
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
