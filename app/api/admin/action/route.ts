import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/security/session";
import {
  deleteAttempt,
  disqualifyAttempt,
  getAttempt,
  markPrizeClaimed,
} from "@/lib/game/attempt-service";
import { adminActionSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORISED" }, { status: 401 });
  const body = await req.json();
  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  const { attemptId, action } = parsed.data;
  const a = await getAttempt(attemptId);
  if (!a) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (action === "mark_claimed") {
    const r = await markPrizeClaimed(attemptId, true);
    return NextResponse.json({ ok: true, attempt: r });
  }
  if (action === "mark_unclaimed") {
    const r = await markPrizeClaimed(attemptId, false);
    return NextResponse.json({ ok: true, attempt: r });
  }
  if (action === "disqualify") {
    const r = await disqualifyAttempt(attemptId);
    return NextResponse.json({ ok: true, attempt: r });
  }
  if (action === "delete") {
    await deleteAttempt(attemptId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}