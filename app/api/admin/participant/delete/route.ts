import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/security/session";
import { getServerDatabases, isAppwriteConfigured } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { invalidateLeaderboardCache } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORISED" }, { status: 401 });
  const { participantId } = await req.json();
  if (!participantId) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  if (isAppwriteConfigured()) {
    try {
      await getServerDatabases().deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.participants,
        participantId,
      );
      await invalidateLeaderboardCache();
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.warn(e);
    }
  }
  return NextResponse.json({ ok: true, demo: true });
}
