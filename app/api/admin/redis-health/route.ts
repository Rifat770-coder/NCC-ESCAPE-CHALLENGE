import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/security/session";
import { getRedis, runRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORISED" }, { status: 401 });
  const headers = { "Cache-Control": "no-store" };
  if (!getRedis()) return NextResponse.json({ ok: false, redis: "disabled" }, { headers });
  const ping = await runRedis("health check", (redis) => redis.ping());
  const ok = ping.ok && ping.value === "PONG";
  return NextResponse.json({ ok, redis: ok ? "connected" : "unavailable" }, {
    status: ok ? 200 : 503, headers,
  });
}
