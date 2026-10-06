import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { redisKey, runRedis } from "@/lib/redis";

export const RATE_LIMIT_POLICIES = {
  login: { requests: 30, windowSeconds: 60 },
  registration: { requests: 120, windowSeconds: 60 },
} as const;

export const RATE_LIMIT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 or redis.call('TTL', KEYS[1]) < 0 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return {count, redis.call('TTL', KEYS[1])}
`;

export async function rateLimitRequest(
  req: NextRequest,
  policy: keyof typeof RATE_LIMIT_POLICIES,
): Promise<NextResponse | null> {
  // Trust Vercel's edge headers only on Vercel. Else use the runtime IP,
  // not arbitrary client-supplied forwarding headers.
  const address = process.env.VERCEL === "1"
    ? (req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for"))?.split(",")[0].trim()
    : req.ip;
  if (!address || !isIP(address)) return null;
  const identity = createHash("sha256").update(address).digest("hex");
  const { requests, windowSeconds } = RATE_LIMIT_POLICIES[policy];
  const result = await runRedis("rate limit", (redis) => redis.eval<[number], [number, number]>(
    RATE_LIMIT_SCRIPT, [redisKey(`rate:${policy}:${identity}`)], [windowSeconds],
  ));
  // Fail open: an optional Redis outage must not block players or admins.
  if (!result.ok || result.value[0] <= requests) return null;
  const retryAfter = Math.max(1, result.value[1]);
  return NextResponse.json({ error: "RATE_LIMITED", retryAfter }, {
    status: 429,
    headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
  });
}
