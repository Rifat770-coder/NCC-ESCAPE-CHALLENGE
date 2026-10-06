import { NextResponse } from "next/server";
import { getLeaderboardSnapshot } from "@/lib/game/attempt-service";
import { isAppwriteConfigured } from "@/lib/appwrite/server";
import { cachedLeaderboard } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { value, status } = await cachedLeaderboard(async () => {
    let cacheable = true;
    const onFallback = () => { cacheable = false; };
    const { entries, stats } = await getLeaderboardSnapshot(onFallback);
    return { value: { ok: true, entries, stats }, cacheable };
  }, isAppwriteConfigured());
  return NextResponse.json(value, {
    headers: { "Cache-Control": "no-store", "X-NCC-Cache": status },
  });
}
