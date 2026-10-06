import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/schemas";
import {
  createAttempt,
  createParticipant,
  findParticipantByStudentId,
  getSettings,
} from "@/lib/game/attempt-service";
import { getAttemptPlan } from "@/lib/game/engine";
import { rateLimitRequest } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimitRequest(req, "registration");
    if (limited) return limited;
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const settings = await getSettings();
    if (!settings.gameActive) {
      return NextResponse.json({ error: "GAME_PAUSED" }, { status: 423 });
    }

    // Check duplicate studentId
    const existing = await findParticipantByStudentId(data.studentId);
    if (existing) {
      return NextResponse.json(
        { error: "DUPLICATE_STUDENT_ID" },
        { status: 409 },
      );
    }

    const participant = await createParticipant(data);
    const attempt = await createAttempt(participant);
    const plan = getAttemptPlan(attempt.levelSeed);

    return NextResponse.json({
      ok: true,
      participant: {
        id: participant.$id,
        name: participant.name,
        batch: participant.batch,
        department: participant.department,
      },
      attempt: {
        id: attempt.$id,
        levelSeed: attempt.levelSeed,
        status: attempt.status,
        livesRemaining: attempt.livesRemaining,
      },
      plan: {
        level4: { briefing: plan.level4.briefing, hint: plan.level4.seedHint },
      },
      settings: {
        durationSeconds: settings.durationSeconds,
        startingLives: settings.startingLives,
      },
    });
  } catch (e: any) {
    console.error("register error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
