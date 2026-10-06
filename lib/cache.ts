import "server-only";
import { randomUUID } from "node:crypto";
import { redisKey, runRedis } from "@/lib/redis";

export const LEADERBOARD_TTL_SECONDS = 10;
const FILL_LOCK_MILLISECONDS = 5_000;
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
export const RELEASE_FILL_LOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

function cacheHit<T>(read: [string | null, Envelope<T> | null]) {
  const [version, cached] = read;
  return cached && cached.version === (version ?? "0") && cached.value != null
    ? { value: cached.value, status: "HIT" as const } : null;
}

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
    const hit = cacheHit(read.value);
    if (hit) return hit;
  }
  if (!read.ok) return { value: (await load()).value, status: "BYPASS" };

  // Coordinate fills across Vercel instances, not just one warm process.
  const lockKey = redisKey("{leaderboard}:fill-lock");
  const token = randomUUID();
  const lock = await runRedis("cache fill lock", (redis) => redis.set(lockKey, token, {
    nx: true, px: FILL_LOCK_MILLISECONDS,
  }));
  const ownsLock = lock.ok && lock.value === "OK";
  if (lock.ok && !ownsLock) {
    // Bound the delay. If the fill is slow or failed, serve a fresh database
    // response rather than stale data or an indefinite wait.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const refreshed = await runRedis("cache fill read", (redis) =>
      redis.mget<[string | null, Envelope<T> | null]>(...keys()));
    const hit = refreshed.ok ? cacheHit(refreshed.value) : null;
    if (hit) return hit;
    return { value: (await load()).value, status: "BYPASS" };
  }
  try {
    // Database errors remain database errors; Redis must never hide them.
    const loaded = await load();
    if (!ownsLock || !loaded.cacheable) return { value: loaded.value, status: "BYPASS" };
    const version = read.value[0] ?? "0";
    const stored = await runRedis("cache write", (redis) => redis.eval(
      STORE_CACHE_SCRIPT, keys(), [version, JSON.stringify({ version, value: loaded.value }), LEADERBOARD_TTL_SECONDS],
    ));
    return { value: loaded.value, status: stored.ok ? "MISS" : "BYPASS" };
  } finally {
    if (ownsLock) await runRedis("cache fill unlock", (redis) => redis.eval(
      RELEASE_FILL_LOCK_SCRIPT, [lockKey], [token],
    ));
  }
}
