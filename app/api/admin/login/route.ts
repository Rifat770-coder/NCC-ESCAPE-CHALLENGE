import { NextRequest, NextResponse } from "next/server";
import { checkAdminCreds, setAdminCookie } from "@/lib/security/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (typeof password !== "string") {
    return NextResponse.json({ error: "MISSING" }, { status: 400 });
  }
  if (!checkAdminCreds(password)) {
    return NextResponse.json({ error: "INVALID" }, { status: 401 });
  }
  setAdminCookie();
  return NextResponse.json({ ok: true });
}