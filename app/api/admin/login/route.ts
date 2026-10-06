import { NextRequest, NextResponse } from "next/server";
import { checkAdminCreds, setAdminCookie } from "@/lib/security/session";
import { rateLimitRequest } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limited = await rateLimitRequest(req, "login");
  if (limited) return limited;
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
