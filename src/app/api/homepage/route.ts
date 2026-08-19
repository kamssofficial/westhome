import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const sections = await db.homepageSection.findMany({
      orderBy: { position: "asc" },
    });

    return NextResponse.json({
      sections: sections.map((s) => ({
        ...s,
        content: s.content as Record<string, any> || {},
      })),
    });
  } catch (error) {
    return NextResponse.json({ sections: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const count = await db.homepageSection.count();

    const section = await db.homepageSection.create({
      data: {
        type: body.type,
        title: body.title,
        subtitle: body.subtitle,
        description: body.description,
        image: body.image,
        buttonText: body.buttonText,
        buttonLink: body.buttonLink,
        position: body.position || count,
        isActive: body.isActive ?? true,
        content: body.content || {},
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
