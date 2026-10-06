import { NextResponse } from "next/server";
import { getSettings } from "@/lib/game/attempt-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public read of game settings — no auth required so the landing/rules
 * pages can render the configured duration server-side and on refresh.
 *
 * The duration returned here is the AUTHORITATIVE duration that any NEW
 * attempt will snapshot. Active attempts are NOT affected by this value
 * (their durationSeconds is fixed at attempt creation).
 */
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    ok: true,
    settings: {
      gameActive: settings.gameActive,
      durationSeconds: settings.durationSeconds,
      startingLives: settings.startingLives,
      retryAllowed: settings.retryAllowed,
      maximumAttempts: settings.maximumAttempts,
    },
  });
}