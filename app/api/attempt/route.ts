import { NextRequest, NextResponse } from "next/server";
import { getAttempt, getAttemptPlan, getPublicAttemptView } from "@/lib/game/attempt-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/attempt?id=...  → returns the current attempt view + plan */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  const view = await getPublicAttemptView(id);
  if (!view) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const a = await getAttempt(id);
  const plan = a ? getAttemptPlan(a.levelSeed) : null;
  return NextResponse.json({
    ok: true,
    attempt: view,
    plan: plan ? {
      level4: { id: plan.level4.id, title: plan.level4.title, briefing: plan.level4.briefing, hint: plan.level4.seedHint },
    } : null,
  });
}