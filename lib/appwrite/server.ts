import { Client, Databases, ID, Query } from "node-appwrite";
import { APPWRITE_CONFIG, appwriteReady } from "./config";
import { DEFAULT_GAME_SETTINGS } from "@/lib/game/settings";

let _client: Client | null = null;
let _databases: Databases | null = null;

function getServerClient(): Client {
  if (!_client) {
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "APPWRITE_API_KEY is missing. Configure server-side Appwrite credentials.",
      );
    }
    _client = new Client();
    _client
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId)
      .setKey(apiKey);
  }
  return _client;
}

export function getServerDatabases(): Databases {
  if (!_databases) {
    _databases = new Databases(getServerClient());
  }
  return _databases;
}

export { ID, Query };

/**
 * Stub mode — when env vars are not yet configured we fall back to an
 * in-memory store so the rest of the game remains demoable.
 */
const memoryStore: {
  participants: Map<string, any>;
  attempts: Map<string, any>;
  settings: any;
} = {
  participants: new Map(),
  attempts: new Map(),
  settings: null as any,
};

export const isAppwriteConfigured = appwriteReady;

/* ---------- In-memory helpers (used only when Appwrite is not configured) ---------- */
export const memory = {
  upsertParticipant(p: any) {
    memoryStore.participants.set(p.$id, p);
    return p;
  },
  getParticipant(id: string) {
    return memoryStore.participants.get(id) ?? null;
  },
  findParticipantByStudentId(studentId: string) {
    for (const p of memoryStore.participants.values()) {
      if (p.studentId === studentId) return p;
    }
    return null;
  },
  upsertAttempt(a: any) {
    memoryStore.attempts.set(a.$id, a);
    return a;
  },
  getAttempt(id: string) {
    return memoryStore.attempts.get(id) ?? null;
  },
  listAttempts() {
    return Array.from(memoryStore.attempts.values());
  },
  listParticipants() {
    return Array.from(memoryStore.participants.values());
  },
  getSettings() {
    return memoryStore.settings || { ...DEFAULT_GAME_SETTINGS };
  },
  setSettings(s: any) {
    memoryStore.settings = s;
    return s;
  },
  nextId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  },
};