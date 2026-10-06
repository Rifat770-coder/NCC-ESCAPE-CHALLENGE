/**
 * Attempt service — all read/write logic for participants, attempts,
 * settings, and leaderboard. Tries Appwrite first, falls back to
 * in-memory store when env vars are missing so the game stays demoable.
 */
import {
  getServerDatabases,
  isAppwriteConfigured,
  memory,
  ID,
  Query,
} from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { generateAttemptPlan, seededRandom } from "./engine";
import type {
  AttemptStatus,
  GameAttempt,
  GameSettings,
  LeaderboardEntry,
  Participant,
  PublicAttemptView,
} from "@/types";
import { safeJSON } from "@/lib/utils";

const DB = APPWRITE_CONFIG.databaseId;
const C = APPWRITE_CONFIG.collections;

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

/* ---------------- Participants ---------------- */

export async function findParticipantByStudentId(
  studentId: string,
): Promise<Participant | null> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().listDocuments(
        DB,
        C.participants,
        [Query.equal("studentId", studentId), Query.limit(1)],
      );
      return (r.documents[0] as unknown as Participant) ?? null;
    } catch (e) {
      console.warn("Appwrite listDocuments failed, falling back:", e);
    }
  }
  return memory.findParticipantByStudentId(studentId);
}

export async function createParticipant(input: {
  name: string;
  studentId: string;
  department: string;
  batch: string;
  phone?: string;
}): Promise<Participant> {
  const id = ID.unique();
  const doc: Participant = {
    $id: id,
    name: input.name.trim(),
    studentId: input.studentId.trim(),
    department: input.department.trim(),
    batch: input.batch.trim(),
    phone: input.phone?.trim() || undefined,
    createdAt: nowIso(),
  };
  if (isAppwriteConfigured()) {
    try {
      const created = await getServerDatabases().createDocument(
        DB,
        C.participants,
        id,
        doc as any,
      );
      return created as unknown as Participant;
    } catch (e) {
      console.warn("Appwrite createDocument failed, falling back:", e);
    }
  }
  memory.upsertParticipant(doc);
  return doc;
}

export async function getParticipant(id: string): Promise<Participant | null> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().getDocument(DB, C.participants, id);
      return r as unknown as Participant;
    } catch (e) {
      // fall through
    }
  }
  return memory.getParticipant(id);
}

export async function listParticipants(): Promise<Participant[]> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().listDocuments(
        DB,
        C.participants,
        [Query.orderDesc("createdAt"), Query.limit(500)],
      );
      return r.documents as unknown as Participant[];
    } catch (e) {
      // fall through
    }
  }
  return memory.listParticipants().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/* ---------------- Settings ---------------- */

/**
 * Read the singleton settings document from Appwrite.
 *
 * IMPORTANT: when Appwrite IS configured, we MUST return the persisted
 * Appwrite value (or throw). Silently falling back to the in-process
 * memory store here is what caused the "admin sets 75s but the game
 * runs at 120s" bug — different serverless cold-starts hold different
 * in-memory maps, so the fallback would routinely disagree with the
 * value the admin actually persisted.
 *
 * The in-memory store is reserved for the unprovisioned demo path
 * (no Appwrite env vars at all).
 */
export async function getSettings(): Promise<GameSettings> {
  if (isAppwriteConfigured()) {
    const r = await getServerDatabases().getDocument(
      DB,
      C.settings,
      "singleton",
    );
    return r as unknown as GameSettings;
  }
  return memory.getSettings();
}

export async function setSettings(patch: Partial<GameSettings>): Promise<GameSettings> {
  const current = await getSettings();
  const next: GameSettings = { ...current, ...patch };
  if (isAppwriteConfigured()) {
    // Update the persisted Appwrite doc. Surface any failure to the
    // caller — never silently fall back to the per-process memory
    // store, because that value would not survive the next cold start.
    const r = await getServerDatabases().updateDocument(
      DB,
      C.settings,
      "singleton",
      next as any,
    );
    const saved = r as unknown as GameSettings;
    // Rebase any in-flight ACTIVE attempts so their timer picks up the
    // newly-configured duration. Without this, players mid-game would
    // keep counting down against their old snapshot — they would see
    // e.g. 1:08 of a 75s attempt while admin has just changed the
    // global duration to 70s.
    if (
      typeof patch.durationSeconds === "number" &&
      patch.durationSeconds !== current.durationSeconds
    ) {
      await rebaseActiveAttemptsToDuration(saved.durationSeconds);
    }
    return saved;
  }
  memory.setSettings({ ...next, $id: "settings" });
  if (
    typeof patch.durationSeconds === "number" &&
    patch.durationSeconds !== current.durationSeconds
  ) {
    await rebaseActiveAttemptsToDuration(next.durationSeconds);
  }
  return next;
}

/**
 * Walk every ACTIVE attempt and update its `durationSeconds` plus
 * `expiresAt` to match the admin's new global duration. We preserve
 * the absolute elapsed time: the player's new expiration is
 * `startedAt + newDuration`. This means a player who has been playing
 * for 20s with a 75s cap will, on a rebase to 70s, jump to a 50s
 * countdown — matching what they would have experienced if admin had
 * set 70s from the start.
 */
async function rebaseActiveAttemptsToDuration(newDurationSeconds: number): Promise<void> {
  if (!isAppwriteConfigured()) {
    // Best-effort in the demo / unprovisioned path: iterate the
    // in-memory store.
    for (const a of memory.listAttempts()) {
      if (a.status !== "ACTIVE" || !a.startedAt) continue;
      a.durationSeconds = newDurationSeconds;
      const startedMs = new Date(a.startedAt).getTime();
      a.expiresAt = new Date(startedMs + newDurationSeconds * 1000).toISOString();
      memory.upsertAttempt(a);
    }
    return;
  }
  try {
    const r = await getServerDatabases().listDocuments(DB, C.attempts, [
      Query.equal("status", "ACTIVE"),
      Query.limit(200),
    ]);
    for (const doc of r.documents as unknown as GameAttempt[]) {
      if (!doc.startedAt) continue;
      const startedMs = new Date(doc.startedAt).getTime();
      const newExpiresAt = new Date(startedMs + newDurationSeconds * 1000).toISOString();
      try {
        await getServerDatabases().updateDocument(DB, C.attempts, doc.$id, {
          durationSeconds: newDurationSeconds,
          expiresAt: newExpiresAt,
        } as any);
      } catch (e) {
        console.warn(`rebase: failed to update attempt ${doc.$id}`, e);
      }
    }
  } catch (e) {
    console.warn("rebase: listDocuments ACTIVE attempts failed", e);
  }
}

/* ---------------- Attempts ---------------- */

function newAttemptDoc(input: {
  participantId: string;
  participantName: string;
  participantBatch: string;
  startingLives: number;
  /** Snapshotted at attempt creation from gameSettings.durationSeconds. */
  durationSeconds: number;
}): GameAttempt {
  const seed = Math.floor(Math.random() * 0x7fffffff);
  return {
    $id: ID.unique(),
    participantId: input.participantId,
    participantName: input.participantName,
    participantBatch: input.participantBatch,
    startedAt: null,
    expiresAt: null,
    durationSeconds: input.durationSeconds,
    completedAt: null,
    status: "READY" as AttemptStatus,
    currentLevel: 1,
    livesRemaining: input.startingLives,
    completionTimeMs: null,
    prizeEligible: false,
    prizeClaimed: false,
    score: 0,
    levelSeed: seed,
    levelResults: JSON.stringify([]),
    createdAt: nowIso(),
  };
}

export async function listAttemptsForParticipant(
  participantId: string,
): Promise<GameAttempt[]> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().listDocuments(
        DB,
        C.attempts,
        [
          Query.equal("participantId", participantId),
          Query.orderDesc("createdAt"),
          Query.limit(20),
        ],
      );
      return r.documents as unknown as GameAttempt[];
    } catch (e) {
      // fall through
    }
  }
  return memory
    .listAttempts()
    .filter((a) => a.participantId === participantId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function countAttemptsForParticipant(
  participantId: string,
): Promise<number> {
  const list = await listAttemptsForParticipant(participantId);
  return list.length;
}

export async function createAttempt(
  participant: Participant,
): Promise<GameAttempt> {
  const settings = await getSettings();
  const doc = newAttemptDoc({
    participantId: participant.$id,
    participantName: participant.name,
    participantBatch: participant.batch,
    startingLives: settings.startingLives,
    durationSeconds: settings.durationSeconds,
  });
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().createDocument(
        DB,
        C.attempts,
        doc.$id,
        doc as any,
      );
      return r as unknown as GameAttempt;
    } catch (e) {
      // fall through
    }
  }
  memory.upsertAttempt(doc);
  return doc;
}

export async function getAttempt(id: string): Promise<GameAttempt | null> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().getDocument(DB, C.attempts, id);
      return r as unknown as GameAttempt;
    } catch (e) {
      // fall through
    }
  }
  return memory.getAttempt(id);
}

async function persistAttempt(attempt: GameAttempt): Promise<GameAttempt> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().updateDocument(
        DB,
        C.attempts,
        attempt.$id,
        attempt as any,
      );
      return r as unknown as GameAttempt;
    } catch (e) {
      // fall through
    }
  }
  memory.upsertAttempt(attempt);
  return attempt;
}

export async function listAllAttempts(): Promise<GameAttempt[]> {
  if (isAppwriteConfigured()) {
    try {
      const r = await getServerDatabases().listDocuments(
        DB,
        C.attempts,
        [Query.orderDesc("createdAt"), Query.limit(500)],
      );
      return r.documents as unknown as GameAttempt[];
    } catch (e) {
      // fall through
    }
  }
  return memory
    .listAttempts()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteAttempt(id: string): Promise<void> {
  if (isAppwriteConfigured()) {
    try {
      await getServerDatabases().deleteDocument(DB, C.attempts, id);
      return;
    } catch (e) {
      // fall through
    }
  }
  memory.upsertAttempt({ $id: id, _deleted: true });
}

export async function disqualifyAttempt(id: string): Promise<GameAttempt | null> {
  const a = await getAttempt(id);
  if (!a) return null;
  a.status = "DISQUALIFIED";
  a.prizeEligible = false;
  return persistAttempt(a);
}

export async function markPrizeClaimed(
  id: string,
  claimed: boolean,
): Promise<GameAttempt | null> {
  const a = await getAttempt(id);
  if (!a) return null;
  // Only allow claim if attempt is COMPLETED and prize is eligible.
  if (claimed && a.status !== "COMPLETED") return null;
  if (claimed && !a.prizeEligible) return null;
  a.prizeClaimed = claimed;
  return persistAttempt(a);
}

/* ---------------- Attempt mutations ---------------- */

export async function startAttempt(attemptId: string): Promise<GameAttempt | null> {
  const settings = await getSettings();
  if (!settings.gameActive) {
    throw new Error("GAME_PAUSED");
  }
  const a = await getAttempt(attemptId);
  if (!a) return null;
  if (a.status !== "READY") return a;
  a.status = "ACTIVE";
  a.startedAt = nowIso();
  // Freeze the configured duration for the lifetime of THIS attempt
  // by deriving expiresAt from a.durationSeconds (snapshotted at creation).
  a.expiresAt = new Date(nowMs() + a.durationSeconds * 1000).toISOString();
  a.currentLevel = 1;
  a.livesRemaining = settings.startingLives;
  return persistAttempt(a);
}

export async function applyLevelResult(
  attemptId: string,
  level: number,
  passed: boolean,
  // Optional forgiving-mistake counter from the new mini-games.
  // L1/L2 always pass at submission time, so this is informational
  // only. For L3/L4 we only deduct a life on the second+ wrong tap so
  // a single accidental mistake does not end the mission.
  mistakes: number = 0,
): Promise<GameAttempt | null> {
  const a = await getAttempt(attemptId);
  if (!a) return null;
  if (a.status !== "ACTIVE") return a;
  if (a.startedAt == null) return a;
  const elapsed = nowMs() - new Date(a.startedAt).getTime();
  const settings = await getSettings();
  // Use the snapshotted duration for THIS attempt — admin changes after
  // start must not affect the in-flight run.
  const attemptCapMs = a.durationSeconds * 1000;

  // Always expire timer check
  if (elapsed > attemptCapMs) {
    a.status = "FAILED";
    a.completedAt = nowIso();
    a.completionTimeMs = attemptCapMs;
    return persistAttempt(a);
  }

  // Validate sequential level progression
  if (level !== a.currentLevel) return a;

  const results = safeJSON<any[]>(a.levelResults, []);
  const existing = results.find((r) => r.level === level);
  if (existing) {
    existing.attempts += 1;
    existing.passed = existing.passed || passed;
  } else {
    results.push({ level, attempts: 1, passed });
  }
  a.levelResults = JSON.stringify(results);

  if (passed) {
    if (level === 4) {
      // Win!
      a.status = "COMPLETED";
      a.completedAt = nowIso();
      a.completionTimeMs = elapsed;
      a.prizeEligible = true;
      a.score = 1000 - Math.floor(elapsed / 100) - (settings.startingLives - a.livesRemaining) * 50;
      return persistAttempt(a);
    }
    a.currentLevel = level + 1;
  } else {
    // Forgiving-mistake lives:
    //   L1/L2: no life penalty (these games only fail on timeout)
    //   L3/L4: only deduct a life after the FIRST mistake, so a single
    //           accidental tap does not end the mission.
    const forgiveFirstMistake = level === 3 || level === 4;
    const deduct = !forgiveFirstMistake || mistakes > 1;
    if (deduct) {
      a.livesRemaining = Math.max(0, a.livesRemaining - 1);
    }
    if (a.livesRemaining <= 0) {
      a.status = "FAILED";
      a.completedAt = nowIso();
      a.completionTimeMs = elapsed;
    }
  }
  return persistAttempt(a);
}

export async function failAttempt(
  attemptId: string,
  reason: "TIME_UP" | "ABANDONED" = "TIME_UP",
): Promise<GameAttempt | null> {
  const a = await getAttempt(attemptId);
  if (!a) return null;
  if (a.status !== "ACTIVE") return a;
  a.status = "FAILED";
  a.completedAt = nowIso();
  if (a.startedAt) {
    a.completionTimeMs = nowMs() - new Date(a.startedAt).getTime();
  }
  return persistAttempt(a);
}

/* ---------------- Public views ---------------- */

export async function getPublicAttemptView(
  attemptId: string,
): Promise<PublicAttemptView | null> {
  const a = await getAttempt(attemptId);
  if (!a) return null;
  // Always read durationSeconds and expiresAt from the ATTEMPT, never from
  // the current global settings — these are immutable for the run.
  const attemptCapMs = a.durationSeconds * 1000;
  const startedMs = a.startedAt ? new Date(a.startedAt).getTime() : null;
  const serverNow = nowMs();
  const elapsed = startedMs ? serverNow - startedMs : 0;
  const remainingMs = startedMs
    ? Math.max(0, attemptCapMs - elapsed)
    : attemptCapMs;

  let rank: number | null = null;
  if (a.status === "COMPLETED" && a.completionTimeMs != null) {
    const all = await listAllAttempts();
    const sorted = all
      .filter((x) => x.status === "COMPLETED" && x.completionTimeMs != null)
      .sort((x, y) => {
        const dx = (x.completionTimeMs! - y.completionTimeMs!) || 0;
        if (dx !== 0) return dx;
        return (x.completedAt || "").localeCompare(y.completedAt || "");
      });
    const idx = sorted.findIndex((x) => x.$id === a.$id);
    rank = idx >= 0 ? idx + 1 : null;
  }

  return {
    id: a.$id,
    participantName: a.participantName,
    participantBatch: a.participantBatch,
    status: a.status,
    currentLevel: a.currentLevel,
    livesRemaining: a.livesRemaining,
    durationSeconds: a.durationSeconds,
    expiresAt: a.expiresAt,
    startedAt: a.startedAt,
    serverNow: new Date(serverNow).toISOString(),
    remainingMs,
    completedAt: a.completedAt,
    completionTimeMs: a.completionTimeMs,
    prizeEligible: a.prizeEligible,
    prizeClaimed: a.prizeClaimed,
    levelResults: safeJSON<any[]>(a.levelResults, []),
    levelSeed: a.levelSeed,
    rank,
  };
}

/* ---------------- Leaderboard ---------------- */

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const all = await listAllAttempts();
  const completed = all
    .filter((a) => a.status === "COMPLETED" && a.completionTimeMs != null)
    .sort((a, b) => {
      const dt = (a.completionTimeMs! - b.completionTimeMs!) || 0;
      if (dt !== 0) return dt;
      return (a.completedAt || "").localeCompare(b.completedAt || "");
    });
  return completed.slice(0, limit).map((a, i) => ({
    $id: a.$id,
    participantName: a.participantName,
    participantBatch: a.participantBatch,
    completionTimeMs: a.completionTimeMs!,
    completedAt: a.completedAt!,
    prizeEligible: a.prizeEligible,
    rank: i + 1,
    status: "COMPLETED",
  }));
}

export async function getLeaderboardStats() {
  const attempts = await listAllAttempts();
  const total = attempts.length;
  const completed = attempts.filter((a) => a.status === "COMPLETED").length;
  const failed = attempts.filter(
    (a) => a.status === "FAILED" || a.status === "DISQUALIFIED",
  ).length;
  const eligible = attempts.filter((a) => a.prizeEligible).length;
  const claimed = attempts.filter((a) => a.prizeClaimed).length;
  const fastest = attempts
    .filter((a) => a.status === "COMPLETED" && a.completionTimeMs != null)
    .reduce(
      (min, a) =>
        a.completionTimeMs! < min ? a.completionTimeMs! : min,
      Number.POSITIVE_INFINITY,
    );
  const participants = await listParticipants();
  return {
    totalAttempts: total,
    totalParticipants: participants.length,
    successfulMissions: completed,
    failedMissions: failed,
    prizesEligible: eligible,
    prizesClaimed: claimed,
    prizesRemaining: Math.max(0, eligible - claimed),
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    fastestTimeMs: Number.isFinite(fastest) ? fastest : null,
  };
}

/* ---------------- Plan (puzzle data) per attempt ---------------- */

export function getAttemptPlan(seed: number) {
  return generateAttemptPlan(seed);
}