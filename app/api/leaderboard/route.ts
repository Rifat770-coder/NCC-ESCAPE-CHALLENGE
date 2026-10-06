import { NextResponse } from "next/server";
import { getLeaderboard, getLeaderboardStats } from "@/lib/game/attempt-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [entries, stats] = await Promise.all([
    getLeaderboard(50),
    getLeaderboardStats(),
  ]);
  return NextResponse.json({ ok: true, entries, stats });
}