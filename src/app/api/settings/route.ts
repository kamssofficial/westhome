import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/apiAuth";

// SECURITY: Only expose these keys publicly (allowlist, not denylist)
const PUBLIC_KEYS = [
  "storeName", "storePhone", "storeEmail", "whatsappNumber",
  "freeDeliveryThreshold", "defaultDeliveryCharge",
  "currency", "currencySymbol",
  "storeAddress", "storeCity", "storeState",
  "footerText", "footerLinks",
  "metaTitle", "metaDescription",
];

export async function GET() {
  try {
    const settings = await db.siteSetting.findMany();
    const settingsObj: Record<string, any> = {};
    settings.forEach((s) => {
      // SECURITY: Only expose public keys (allowlist)
      if (PUBLIC_KEYS.includes(s.key)) {
        settingsObj[s.key] = s.value;
      }
    });
    return NextResponse.json({ settings: settingsObj }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();

    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
      const jsonValue = value as Prisma.InputJsonValue;
      await db.siteSetting.upsert({
        where: { key },
        update: { value: jsonValue },
        create: { key, value: jsonValue, group: "general" },
      });
    }

    return NextResponse.json({ message: "Settings updated" });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
