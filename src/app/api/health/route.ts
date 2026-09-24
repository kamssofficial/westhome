import { NextResponse } from "next/server";
import { redisHealth } from "@/lib/redis";

export async function GET() {
  // Redis status is advisory: the store serves fully without it (cache
  // helpers no-op, rate limiting fails open), so only `ok` above gates HTTP.
  const redis = await redisHealth();

  return NextResponse.json(
    {
      ok: true,
      service: "westhome",
      redis: redis.configured ? (redis.ok ? "ok" : `error: ${redis.error ?? "unreachable"}`) : "not_configured",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
