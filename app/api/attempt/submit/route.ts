import { NextRequest, NextResponse } from "next/server";
import { levelPayloadSchema } from "@/lib/validation/schemas";
import { applyLevelResult, getAttempt, getPublicAttemptView } from "@/lib/game/attempt-service";
import { validateLevel } from "@/lib/game/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = levelPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    const { attemptId, level, payload } = parsed.data;

    const a = await getAttempt(attemptId);
    if (!a) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (a.status !== "ACTIVE") {
      return NextResponse.json({ error: "ATTEMPT_ENDED", status: a.status }, { status: 409 });
    }
    if (a.currentLevel !== level) {
      return NextResponse.json({ error: "WRONG_LEVEL" }, { status: 400 });
    }

    const result = validateLevel(level, a.levelSeed, payload);
    const updated = await applyLevelResult(attemptId, level, result.passed, result.mistakes ?? 0);
    const view = await getPublicAttemptView(attemptId);

    return NextResponse.json({
      ok: true,
      passed: result.passed,
      message: result.message,
      attempt: view,
      updatedAttempt: updated ? {
        status: updated.status,
        currentLevel: updated.currentLevel,
        livesRemaining: updated.livesRemaining,
      } : null,
    });
  } catch (e: any) {
    console.error("submit error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}