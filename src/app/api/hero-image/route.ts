import { NextResponse } from "next/server";
import db from "@/lib/db";

const HERO_KEY = "hero_image_url";

export async function GET() {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: HERO_KEY } });
    const url = setting ? (setting.value as any)?.url || null : null;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
