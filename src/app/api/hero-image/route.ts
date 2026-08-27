import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: "hero_active" } });
    const active = setting ? (setting.value as any) : null;
    return NextResponse.json({
      url: active?.url || null,
      position: active?.position || "center",
    });
  } catch {
    return NextResponse.json({ url: null, position: "center" });
  }
}
