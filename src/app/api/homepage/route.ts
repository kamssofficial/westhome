import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { HOMEPAGE_SECTIONS } from "@/lib/data";

export async function GET() {
  try {
    const sections = await db.homepageSection.findMany({ orderBy: { position: "asc" } });
    return NextResponse.json({ sections: sections.map((s) => ({ ...s, content: s.content as Record<string, any> || {} })) });
  } catch (error) {
    return NextResponse.json({ sections: HOMEPAGE_SECTIONS });
  }
}
