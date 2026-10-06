import type { GameSettings } from "@/types";

/**
 * Centralized default settings — used only when no persisted settings
 * document exists (e.g. Appwrite not yet provisioned). Once a real
 * settings document is present, that document is the single source of
 * truth and these defaults are never used.
 *
 * IMPORTANT: there is intentionally NO `|| 120` / `?? 120` fallback
 * anywhere else. Any new code that needs a duration must read it from
 * the server-side settings (via getSettings()), never from a literal.
 */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  $id: "settings",
  gameActive: true,
  durationSeconds: 120,
  startingLives: 3,
  retryAllowed: false,
  maximumAttempts: 1,
  leaderboardEnabled: true,
  prizeMode: true,
};

/** Admin-validated bounds. Mirrored in scripts/setup-collections.ts. */
export const DURATION_BOUNDS = { min: 30, max: 600 } as const;
export const LIVES_BOUNDS = { min: 1, max: 9 } as const;
export const ATTEMPTS_BOUNDS = { min: 1, max: 10 } as const;
