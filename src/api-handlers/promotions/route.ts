import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const promotions = await db.promotion.findMany({ orderBy: { position: "asc" } });
    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("Promotions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
  }
}
