import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/security/session";
import { buildLeaderboardStats, listAllAttempts, listParticipants } from "@/lib/game/attempt-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORISED" }, { status: 401 });
  const [attempts, participants] = await Promise.all([listAllAttempts(), listParticipants()]);
  const stats = buildLeaderboardStats(attempts, participants);
  return NextResponse.json({
    ok: true,
    stats,
    attempts: attempts.map((a) => ({
      $id: a.$id,
      participantId: a.participantId,
      participantName: a.participantName,
      participantBatch: a.participantBatch,
      status: a.status,
      currentLevel: a.currentLevel,
      livesRemaining: a.livesRemaining,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      completionTimeMs: a.completionTimeMs,
      prizeEligible: a.prizeEligible,
      prizeClaimed: a.prizeClaimed,
      createdAt: a.createdAt,
    })),
    participants: participants.map((p) => ({
      $id: p.$id,
      name: p.name,
      studentId: p.studentId,
      department: p.department,
      batch: p.batch,
      phone: p.phone,
      createdAt: p.createdAt,
    })),
  });
}
