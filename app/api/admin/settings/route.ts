import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/security/session";
import { getSettings, setSettings } from "@/lib/game/attempt-service";
import { settingsUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORISED" }, { status: 401 });
  const settings = await getSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORISED" }, { status: 401 });
  const body = await req.json();
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const next = await setSettings(parsed.data);
    return NextResponse.json({ ok: true, settings: next });
  } catch (e: any) {
    // setSettings will throw if the Appwrite update fails. We must
    // surface that loudly so the admin does not think the new duration
    // was saved when it actually wasn't — otherwise new attempts would
    // continue to be created with the previous (or stale) duration.
    console.error("admin setSettings failed", e);
    return NextResponse.json(
      { error: "PERSIST_FAILED", message: e?.message ?? "Could not persist settings." },
      { status: 500 },
    );
  }
}