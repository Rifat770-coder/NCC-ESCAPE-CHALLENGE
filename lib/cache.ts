import "server-only";
import { randomUUID } from "node:crypto";
import { redisKey, runRedis } from "@/lib/redis";

export const LEADERBOARD_TTL_SECONDS = 10;
type Envelope<T> = { version: string; value: T };
type CacheStatus = "HIT" | "MISS" | "BYPASS";

function keys() {
  // Shared hash tag also permits atomic scripts on Redis Cluster.
  return [redisKey("{leaderboard}:version"), redisKey("{leaderboard}:public:50")];
}

export const STORE_CACHE_SCRIPT = `
  local version = redis.call('GET', KEYS[1]) or '0'
  if version ~= ARGV[1] then return 0 end
  redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
  return 1
`;
export const INVALIDATE_CACHE_SCRIPT = `
  redis.call('SET', KEYS[1], ARGV[1], 'EX', 86400)
  redis.call('DEL', KEYS[2])
  return 1
`;

export async function invalidateLeaderboardCache(): Promise<void> {
  await runRedis("cache invalidation", (redis) => redis.eval(
    INVALIDATE_CACHE_SCRIPT, keys(), [randomUUID()],
  ));
}

export async function cachedLeaderboard<T>(
  load: () => Promise<{ value: T; cacheable: boolean }>,
  enabled: boolean,
): Promise<{ value: T; status: CacheStatus }> {
  const read = enabled
    ? await runRedis("cache read", (redis) => redis.mget<[string | null, Envelope<T> | null]>(...keys()))
    : { ok: false as const };
  if (read.ok) {
    const [version, cached] = read.value;
    if (cached && cached.version === (version ?? "0") && cached.value != null) {
      return { value: cached.value, status: "HIT" };
    }
  }
  // Database errors remain database errors; Redis must never hide them.
  const loaded = await load();
  if (!read.ok || !loaded.cacheable) return { value: loaded.value, status: "BYPASS" };
  const version = read.value[0] ?? "0";
  const stored = await runRedis("cache write", (redis) => redis.eval(
    STORE_CACHE_SCRIPT, keys(), [version, JSON.stringify({ version, value: loaded.value }), LEADERBOARD_TTL_SECONDS],
  ));
  return { value: loaded.value, status: stored.ok ? "MISS" : "BYPASS" };
}
