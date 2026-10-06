import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/security/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}