/* ------------------ Shared types ------------------ */
export type AttemptStatus =
  | "READY"
  | "ACTIVE"
  | "COMPLETED"
  | "FAILED"
  | "DISQUALIFIED";

export interface Participant {
  $id: string;
  name: string;
  studentId: string;
  department: string;
  batch: string;
  phone?: string;
  createdAt: string;
}

export interface GameAttempt {
  $id: string;
  participantId: string;
  participantName: string;
  participantBatch: string;
  startedAt: string | null;
  /** Server-computed absolute expiration time, in ISO 8601. */
  expiresAt: string | null;
  /**
   * Duration of the attempt in seconds, snapshotted at attempt creation
   * from the admin's game settings. Immutable for the lifetime of this
   * attempt so admin changes after start do not affect the in-flight run.
   */
  durationSeconds: number;
  completedAt: string | null;
  status: AttemptStatus;
  currentLevel: number;
  livesRemaining: number;
  completionTimeMs: number | null;
  prizeEligible: boolean;
  prizeClaimed: boolean;
  score: number;
  levelSeed: number;
  levelResults: string; // JSON encoded per-level details
  createdAt: string;
}

export interface GameSettings {
  $id: string;
  gameActive: boolean;
  durationSeconds: number;
  startingLives: number;
  retryAllowed: boolean;
  maximumAttempts: number;
  leaderboardEnabled: boolean;
  prizeMode: boolean;
}

export interface LeaderboardEntry {
  $id: string;
  participantName: string;
  participantBatch: string;
  completionTimeMs: number;
  completedAt: string;
  prizeEligible: boolean;
  rank: number;
  status: "COMPLETED" | "FAILED";
}

export interface LevelResult {
  level: number;
  attempts: number;
  passed: boolean;
}

export interface PublicAttemptView {
  id: string;
  participantName: string;
  participantBatch: string;
  status: AttemptStatus;
  currentLevel: number;
  livesRemaining: number;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  serverNow: string;
  remainingMs: number;
  completedAt: string | null;
  completionTimeMs: number | null;
  prizeEligible: boolean;
  prizeClaimed: boolean;
  levelResults: LevelResult[];
  levelSeed: number;
  rank: number | null;
}