import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function GET() {
  try {
    const sections = await db.homepageSection.findMany({ orderBy: { position: "asc" } });
    return NextResponse.json({ sections: sections.map((s) => ({ ...s, content: s.content as Record<string, any> || {} })) });
  } catch (error) {
    console.error("Homepage GET error:", error);
    return NextResponse.json({ sections: [] });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { type, title, subtitle, description, image, buttonText, buttonLink, content, isActive } = body;

    if (!type) {
      return NextResponse.json({ error: "Section type is required" }, { status: 400 });
    }

    const maxPos = await db.homepageSection.aggregate({ _max: { position: true } });
    const position = (maxPos._max.position || 0) + 1;

    const section = await db.homepageSection.create({
      data: {
        type,
        title: title || null,
        subtitle: subtitle || null,
        description: description || null,
        image: image || null,
        buttonText: buttonText || null,
        buttonLink: buttonLink || null,
        content: content || {},
        isActive: isActive !== undefined ? isActive : true,
        position,
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error: any) {
    console.error("Homepage POST error:", error);
    return NextResponse.json({ error: "Failed to create section: " + (error.message || "") }, { status: 500 });
  }
}
