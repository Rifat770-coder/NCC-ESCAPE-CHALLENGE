/**
 * Idempotent Appwrite setup for the NCC Escape Challenge.
 *
 * Creates (if missing):
 *   - the database configured via APPWRITE_DATABASE_ID
 *   - collection: participants
 *   - collection: gameAttempts
 *   - collection: gameSettings
 *
 * For each collection, creates attributes + indexes + permissions
 * exactly as documented in README.md. Safe to re-run: existing items
 * are left untouched, missing ones are added.
 *
 * Usage:
 *   APPWRITE_DATABASE_ID=... APPWRITE_API_KEY=... \
 *     npx tsx scripts/setup-collections.ts
 *
 * Defaults:
 *   endpoint  : https://fra.cloud.appwrite.io/v1
 *   projectId : 6ac3e7c0001469e247da
 */
import { Client, Databases, ID, Permission, Role, DatabasesIndexType } from "node-appwrite";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6ac3e7c0001469e247da";
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_PARTICIPANTS = process.env.APPWRITE_COLLECTION_PARTICIPANTS || "participants";
const COLLECTION_ATTEMPTS = process.env.APPWRITE_COLLECTION_ATTEMPTS || "gameAttempts";
const COLLECTION_SETTINGS = process.env.APPWRITE_COLLECTION_SETTINGS || "gameSettings";

if (!API_KEY) {
  console.error("ERROR: APPWRITE_API_KEY is required.");
  process.exit(1);
}
if (!DATABASE_ID) {
  console.error("ERROR: APPWRITE_DATABASE_ID is required.");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);

/* ---------------- helpers ---------------- */

async function ensureDatabase(): Promise<void> {
  try {
    await db.create(DATABASE_ID!, "NCC Escape Challenge");
    console.log(`  database ${DATABASE_ID} created`);
  } catch (e: any) {
    if (e?.code === 409) {
      console.log(`  database ${DATABASE_ID} exists`);
      return;
    }
    throw e;
  }
}

async function ensureCollection(id: string, displayName: string): Promise<void> {
  // Try to create first; if it already exists (409) skip silently.
  // This avoids the getCollection call which requires the legacy
  // "collections.read" scope that Appwrite Cloud 2.3 renamed.
  try {
    await db.createCollection(DATABASE_ID!, id, displayName, [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ]);
    console.log(`  collection ${id} created`);
  } catch (e: any) {
    if (e?.code === 409) {
      console.log(`  collection ${id} already exists`);
      return;
    }
    throw e;
  }
}

async function ensureString(
  collectionId: string,
  key: string,
  size: number,
  required: boolean,
  defaultValue?: string,
): Promise<void> {
  try {
    // Appwrite rejects combining required=true with a default value, so
    // only pass the default when the attribute is optional.
    const dv = required ? undefined : defaultValue;
    await db.createStringAttribute(DATABASE_ID!, collectionId, key, size, required, dv);
    console.log(`    + attr string ${key} (${size})`);
  } catch (e: any) {
    if (e?.code === 409) return; // already exists
    throw e;
  }
}

async function ensureInteger(
  collectionId: string,
  key: string,
  required: boolean,
  defaultValue?: number,
  min?: number,
  max?: number,
): Promise<void> {
  try {
    // Appwrite rejects combining required=true with a default value, so
    // only pass the default when the attribute is optional.
    const dv = required ? undefined : defaultValue;
    await db.createIntegerAttribute(DATABASE_ID!, collectionId, key, required, min, max, dv);
    console.log(`    + attr integer ${key}`);
  } catch (e: any) {
    if (e?.code === 409) return; // already exists
    throw e;
  }
}

async function ensureBoolean(
  collectionId: string,
  key: string,
  required: boolean,
  defaultValue?: boolean,
): Promise<void> {
  try {
    // Appwrite rejects combining required=true with a default value, so
    // only pass the default when the attribute is optional.
    const dv = required ? undefined : defaultValue;
    await db.createBooleanAttribute(DATABASE_ID!, collectionId, key, required, dv);
    console.log(`    + attr boolean ${key}`);
  } catch (e: any) {
    if (e?.code === 409) return; // already exists
    throw e;
  }
}

async function ensureDatetime(
  collectionId: string,
  key: string,
  required: boolean,
): Promise<void> {
  try {
    await db.createDatetimeAttribute(DATABASE_ID!, collectionId, key, required);
    console.log(`    + attr datetime ${key}`);
  } catch (e: any) {
    if (e?.code === 409) return; // already exists
    throw e;
  }
}

async function ensureIndex(
  collectionId: string,
  key: string,
  type: DatabasesIndexType,
  attributes: string[],
  orders: ("ASC" | "DESC")[] = [],
): Promise<void> {
  try {
    await db.createIndex(DATABASE_ID!, collectionId, key, type, attributes as any, orders as any);
    console.log(`    + index ${key} (${type} on [${attributes.join(",")}])`);
  } catch (e: any) {
    if (e?.code === 409) return; // already exists
    throw e;
  }
}

/* ---------------- collection definitions ---------------- */

async function setupParticipants(): Promise<void> {
  const id = COLLECTION_PARTICIPANTS;
  await ensureCollection(id, "Participants");
  await ensureString(id, "name", 60, true);
  await ensureString(id, "studentId", 30, true);
  await ensureString(id, "department", 60, true);
  await ensureString(id, "batch", 40, true);
  await ensureString(id, "phone", 20, false);
  await ensureDatetime(id, "createdAt", false);
  await ensureIndex(id, "idx_studentId", DatabasesIndexType.Unique, ["studentId"]);
  await ensureIndex(id, "idx_batch", DatabasesIndexType.Key, ["batch"]);
}

async function setupGameAttempts(): Promise<void> {
  const id = COLLECTION_ATTEMPTS;
  await ensureCollection(id, "Game Attempts");
  await ensureString(id, "participantId", 64, true);
  await ensureString(id, "participantName", 60, true);
  await ensureString(id, "participantBatch", 40, true);
  await ensureDatetime(id, "startedAt", false);
  // Server-computed absolute expiration time (startedAt + durationSeconds*1000).
  await ensureDatetime(id, "expiresAt", false);
  // Duration in seconds snapshotted from gameSettings.durationSeconds at
  // attempt creation. Immutable for the lifetime of this attempt.
  await ensureInteger(id, "durationSeconds", true, 120, 30, 3600);
  await ensureDatetime(id, "completedAt", false);
  await ensureString(id, "status", 16, true); // READY/ACTIVE/COMPLETED/FAILED/DISQUALIFIED
  await ensureInteger(id, "currentLevel", true, 1, 1, 4);
  await ensureInteger(id, "livesRemaining", true, 3, 0, 9);
  await ensureInteger(id, "completionTimeMs", false);
  await ensureBoolean(id, "prizeEligible", true, false);
  await ensureBoolean(id, "prizeClaimed", true, false);
  await ensureInteger(id, "score", true, 0);
  await ensureInteger(id, "levelSeed", true);
  await ensureString(id, "levelResults", 4000, true, "[]");
  await ensureDatetime(id, "createdAt", false);

  await ensureIndex(id, "idx_attempt_participant", DatabasesIndexType.Key, ["participantId"], ["ASC"]);
  await ensureIndex(id, "idx_attempt_status_completed", DatabasesIndexType.Key, ["status", "completedAt"], ["ASC", "DESC"]);
  await ensureIndex(id, "idx_attempt_prize", DatabasesIndexType.Key, ["prizeEligible", "prizeClaimed"]);
  await ensureIndex(id, "idx_attempt_expiresAt", DatabasesIndexType.Key, ["expiresAt"]);
}

async function setupGameSettings(): Promise<void> {
  const id = COLLECTION_SETTINGS;
  await ensureCollection(id, "Game Settings");
  await ensureBoolean(id, "gameActive", true, true);
  await ensureInteger(id, "durationSeconds", true, 120, 30, 3600);
  await ensureInteger(id, "startingLives", true, 3, 1, 9);
  await ensureBoolean(id, "retryAllowed", true, false);
  await ensureInteger(id, "maximumAttempts", true, 1, 1, 10);
  await ensureBoolean(id, "leaderboardEnabled", true, true);
  await ensureBoolean(id, "prizeMode", true, true);

  // The settings collection must contain exactly one document with id "singleton".
  try {
    await db.createDocument(DATABASE_ID!, id, "singleton", {
      gameActive: true,
      durationSeconds: 120,
      startingLives: 3,
      retryAllowed: false,
      maximumAttempts: 1,
      leaderboardEnabled: true,
      prizeMode: true,
    });
    console.log("  settings document 'singleton' created");
  } catch (e: any) {
    if (e?.code === 409) {
      console.log("  settings document 'singleton' already exists");
    } else {
      throw e;
    }
  }
}

/* ---------------- main ---------------- */

async function main(): Promise<void> {
  console.log(`Appwrite setup`);
  console.log(`  endpoint: ${ENDPOINT}`);
  console.log(`  project : ${PROJECT_ID}`);
  console.log(`  database: ${DATABASE_ID}`);
  console.log("");
  console.log("[1/4] database");
  await ensureDatabase();
  console.log("");
  console.log("[2/4] participants");
  await setupParticipants();
  console.log("");
  console.log("[3/4] gameAttempts");
  await setupGameAttempts();
  console.log("");
  console.log("[4/4] gameSettings");
  await setupGameSettings();
  console.log("");
  console.log("Done.");
}

main().catch((e) => {
  console.error("setup failed:", e);
  process.exit(1);
});