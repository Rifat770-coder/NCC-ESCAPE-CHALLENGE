import { NextRequest, NextResponse } from "next/server";
import { failAttempt, getPublicAttemptView } from "@/lib/game/attempt-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { attemptId } = await req.json();
    if (!attemptId) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    const a = await failAttempt(attemptId, "TIME_UP");
    const view = await getPublicAttemptView(attemptId);
    return NextResponse.json({ ok: true, attempt: a, view });
  } catch (e) {
    console.error("fail error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}