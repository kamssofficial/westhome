import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const promotions = await db.promotion.findMany({ orderBy: { position: "asc" } });
    return NextResponse.json({ promotions });
  } catch {
    return NextResponse.json({ promotions: [] });
  }
}
