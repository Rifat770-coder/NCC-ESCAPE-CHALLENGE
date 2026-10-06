/**
 * Server-authoritative game logic.
 *
 * The browser can never directly mark a level complete or win the game.
 * Instead it sends `{ attemptId, level, payload }` and the server runs the
 * appropriate validator against the per-attempt seed.
 */
import { LEVEL1_PUZZLES } from "@/data/puzzles/level1";
import { LEVEL2_PUZZLES } from "@/data/puzzles/level2";
import { LEVEL3_PUZZLES } from "@/data/puzzles/level3";
import { LEVEL4_PUZZLES } from "@/data/puzzles/level4";

export function seededRandom(seed: number): () => number {
  // Mulberry32 PRNG. Deterministic per seed.
  let t = seed >>> 0;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * Generate a per-attempt seed + per-level chosen puzzle indices.
 * Stored on the attempt so the same puzzle is shown on refresh.
 *
 * For the new beginner-friendly levels, we still seed the plan (so the
 * layout / target is stable for the lifetime of an attempt) but the
 * puzzles are easy mini-games. Per-level "answer" fields carry the
 * correct submission so the server can validate the player's completion.
 */
export function generateAttemptPlan(seed: number) {
  const rand = seededRandom(seed);
  const level3 = pickFrom(LEVEL3_PUZZLES, rand);
  const level4 = pickFrom(LEVEL4_PUZZLES, rand);
  return {
    level1: pickFrom(LEVEL1_PUZZLES, rand),
    level2: pickFrom(LEVEL2_PUZZLES, rand),
    level3: {
      ...level3,
      // Tech-match pairs (icon name → display name) drawn from a small
      // pool of universally familiar technologies.
      techPairs: pickTechPairs(rand, 3),
    },
    level4: {
      ...level4,
      // Random colour target the player must hit at the end.
      targetColor: pickFrom(["red","blue","green","yellow"] as const, rand),
    },
    // The master key is generated deterministically.
    masterKey: deriveMasterKey(seed),
  };
}

const TECH_POOL: Array<{ icon: string; name: string }> = [
  { icon: "Chrome",   name: "Chrome" },
  { icon: "Github",   name: "GitHub" },
  { icon: "Code",     name: "VS Code" },
  { icon: "Terminal", name: "Terminal" },
  { icon: "Cloud",    name: "Cloud" },
  { icon: "Wifi",     name: "Wi-Fi" },
  { icon: "Music",    name: "Music Player" },
  { icon: "Camera",   name: "Camera" },
  { icon: "MessageCircle", name: "Chat" },
  { icon: "Mail",     name: "Mail" },
  { icon: "Youtube",  name: "YouTube" },
  { icon: "Twitter",  name: "Twitter" },
];

function pickTechPairs(rand: () => number, n: number) {
  // Shuffle the pool deterministically and take the first `n`.
  const pool = [...TECH_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map((p) => ({ left: p.icon, right: p.name }));
}

export function deriveMasterKey(seed: number): string {
  // 6-character alphanumeric. Last char is a checksum mod 10 of previous 5.
  const rand = seededRandom(seed ^ 0x9e3779b9);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip lookalikes
  const chars: string[] = [];
  for (let i = 0; i < 5; i++) chars.push(alphabet[Math.floor(rand() * alphabet.length)]);
  const checksum = chars.reduce((s, c) => s + alphabet.indexOf(c), 0) % 10;
  chars.push(String(checksum));
  return chars.join("");
}

export function getAttemptPlan(seed: number) {
  return generateAttemptPlan(seed);
}

/* ---------------- Level validators ----------------
 *
 * The new mini-games submit compact payload shapes that describe the
 * player's gameplay state. Server validation is deliberately lenient
 * because the GAMEPLAY is easy — the main purpose of validation is to
 * keep the existing anti-cheat and timer guarantees intact:
 *
 *   - level order (a level can only be submitted once for its slot)
 *   - timer cap (elapsed > attemptCapMs already short-circuits to FAIL
 *     in applyLevelResult, before we ever run these validators)
 *   - lives (handled in applyLevelResult with a forgiving-mistake
 *     threshold for L3/L4)
 *
 * The validators themselves just confirm the gameplay objective was met.
 */

export interface LevelCheckResult {
  passed: boolean;
  message: string;
  // Number of wrong attempts the player accumulated on this level.
  // L1/L2 never produce this. L3/L4 use it for the forgiving-mistake
  // life deduction in applyLevelResult.
  mistakes?: number;
  // For diagnostic / debugging only — stripped before sending to client.
  meta?: any;
}

export function validateLevel(
  level: number,
  seed: number,
  payload: any,
): LevelCheckResult {
  const plan = generateAttemptPlan(seed);

  switch (level) {
    case 1: {
      // Bug Hunt — payload: { bugsCaught: number }
      const n = Number(payload?.bugsCaught ?? 0);
      if (!Number.isFinite(n) || n < 0) {
        return { passed: false, message: "Invalid catch count.", mistakes: 1 };
      }
      if (n >= 5) return { passed: true, message: "BUGS CLEARED" };
      return { passed: false, message: "KEEP CATCHING", mistakes: 1 };
    }
    case 2: {
      // Memory Match — payload: { pairsMatched: number }
      const n = Number(payload?.pairsMatched ?? 0);
      if (!Number.isFinite(n) || n < 0) {
        return { passed: false, message: "Invalid pair count.", mistakes: 1 };
      }
      if (n >= 3) return { passed: true, message: "MEMORY CORE RESTORED" };
      return { passed: false, message: "KEEP MATCHING", mistakes: 1 };
    }
    case 3: {
      // Tech Match — payload: { matches: Record<icon,name>, mistakes: number }
      const submitted: Record<string, string> = payload?.matches || {};
      const mistakes = Math.max(0, Number(payload?.mistakes ?? 0) | 0);
      const expected = plan.level3.techPairs || [];
      const ok =
        expected.length > 0 &&
        expected.every((p) => submitted[p.left] === p.right);
      return ok
        ? { passed: true, message: "SYSTEM CONNECTION RESTORED", mistakes }
        : { passed: false, message: "Almost! Try again 😄", mistakes };
    }
    case 4: {
      // Final Button — payload: { hit: "red"|"blue"|"green"|"yellow", mistakes: number }
      const hit = String(payload?.hit || "").toLowerCase();
      const mistakes = Math.max(0, Number(payload?.mistakes ?? 0) | 0);
      const target = plan.level4.targetColor;
      return hit === target
        ? { passed: true, message: "ACCESS GRANTED", mistakes }
        : { passed: false, message: "WRONG BUTTON", mistakes };
    }
    default:
      return { passed: false, message: "Unknown level" };
  }
}