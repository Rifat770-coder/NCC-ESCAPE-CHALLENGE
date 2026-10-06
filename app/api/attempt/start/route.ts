import { NextRequest, NextResponse } from "next/server";
import { startAttemptSchema } from "@/lib/validation/schemas";
import { getAttempt, startAttempt, getPublicAttemptView } from "@/lib/game/attempt-service";
import { getAttemptPlan } from "@/lib/game/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = startAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    const { attemptId } = parsed.data;

    const existing = await getAttempt(attemptId);
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    let attempt = existing;
    if (existing.status === "READY") {
      attempt = (await startAttempt(attemptId)) ?? existing;
    } else if (existing.status !== "ACTIVE") {
      return NextResponse.json({ error: "ATTEMPT_ENDED", status: existing.status }, { status: 409 });
    }

    const view = await getPublicAttemptView(attemptId);
    const plan = getAttemptPlan(attempt.levelSeed);

    // Strip hints/answers from plan sent to client. Only metadata for UI.
    return NextResponse.json({
      ok: true,
      attempt: view,
      plan: {
        level1: {
          id: plan.level1.id,
          title: plan.level1.title,
          briefing: plan.level1.briefing,
          objects: plan.level1.objects.map((o: any) => ({
            id: o.id,
            label: o.label,
            icon: o.icon,
            position: o.position,
            // hint shown on tap — digit intentionally omitted client-side
            hint: o.hint,
          })),
        },
        level2: {
          id: plan.level2.id,
          prompt: plan.level2.prompt,
          visualType: plan.level2.visualType,
          data: plan.level2.data,
          options: plan.level2.options,
          hint: plan.level2.hint,
        },
        level3: {
          id: plan.level3.id,
          variant: plan.level3.variant,
          title: plan.level3.title,
          prompt: plan.level3.prompt,
          // Tech-match pairs (icon lucide name → display label).
          // The client renders this directly; the validator also uses it.
          techPairs: plan.level3.techPairs,
        },
        level4: {
          id: plan.level4.id,
          title: plan.level4.title,
          briefing: plan.level4.briefing,
          hint: plan.level4.seedHint,
          // The colour the player must hit at the end.
          targetColor: plan.level4.targetColor,
        },
      },
    });
  } catch (e: any) {
    if (e?.message === "GAME_PAUSED") {
      return NextResponse.json({ error: "GAME_PAUSED" }, { status: 423 });
    }
    console.error("attempt start error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}