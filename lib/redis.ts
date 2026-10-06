import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";

let client: Redis | null = null;
let unavailableUntil = 0;
let lastWarning = 0;

export function redisKey(suffix: string): string {
  const database = createHash("sha256").update(JSON.stringify([
    APPWRITE_CONFIG.endpoint, APPWRITE_CONFIG.projectId,
    APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections,
  ])).digest("hex").slice(0, 16);
  const prefix = process.env.REDIS_KEY_PREFIX || "ncc-escape";
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  return `${prefix}:${environment}:${database}:v1:${suffix}`;
}

export function getRedis(): Redis | null {
  if (client) return client;
  // Accept either complete credential pair; never mix two integrations.
  const upstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const url = upstash ? process.env.UPSTASH_REDIS_REST_URL : process.env.KV_REST_API_URL;
  const token = upstash ? process.env.UPSTASH_REDIS_REST_TOKEN : process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    if (new URL(url).protocol !== "https:") throw new Error("HTTPS required");
    client = new Redis({
      url, token,
      retry: { retries: 0 },
      signal: () => AbortSignal.timeout(800),
      enableTelemetry: false,
      enableAutoPipelining: false,
    });
    return client;
  } catch {
    warnRedis("configuration");
    return null;
  }
}

function warnRedis(operation: string) {
  if (Date.now() - lastWarning < 30_000) return;
  lastWarning = Date.now();
  // Do not log SDK exceptions: they may contain URLs, tokens or payloads.
  console.warn(`[redis] ${operation} unavailable; continuing without Redis.`);
}

export type RedisResult<T> = { ok: true; value: T } | { ok: false };

export async function runRedis<T>(
  operation: string,
  action: (redis: Redis) => Promise<T>,
): Promise<RedisResult<T>> {
  if (Date.now() < unavailableUntil) return { ok: false };
  const redis = getRedis();
  if (!redis) return { ok: false };
  try {
    return { ok: true, value: await action(redis) };
  } catch {
    unavailableUntil = Date.now() + 15_000;
    warnRedis(operation);
    return { ok: false };
  }
}
