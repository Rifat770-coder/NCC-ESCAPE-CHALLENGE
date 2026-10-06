# Redis integration and deployment

## Changed files

Installed `@upstash/redis` 1.39.0 and `server-only` 0.0.1.

Created:
- `lib/redis.ts`: reusable client, namespace, timeout and failure handling.
- `lib/cache.ts`: public cache and atomic invalidation/version checks.
- `lib/security/rate-limit.ts`: atomic IP limits.
- `app/api/admin/redis-health/route.ts`: protected connectivity check.
- `scripts/redis.test.cjs`: isolated Redis/database regression tests.
- `scripts/redis-http-test.cjs`: real Next.js/Appwrite SDK HTTP smoke test.
- `docs/redis-integration.md`: architecture, deployment and verification report.

Modified:
- `lib/game/attempt-service.ts`: mutation invalidation and fallback signals.
- `app/api/leaderboard/route.ts`: public response cache and diagnostic header.
- `app/api/register/route.ts`, `app/api/admin/login/route.ts`: rate-limit hooks.
- `app/api/admin/participant/delete/route.ts`: deletion invalidation.
- `.env.example`, `README.md`, `package.json`, `package-lock.json`:
  configuration, documentation, dependencies and test commands.

No Redis changes were made to UI components, animation, styles, puzzle datasets,
authentication helpers, the Appwrite schema or deployment framework config.

## Architecture reviewed

This is a Next.js 14.2.15 App Router application using React 18, TypeScript,
Tailwind and Framer Motion. The browser renders the home/registration, play,
result, leaderboard and admin screens. Node.js route handlers under `app/api`
serve registration, attempt reads/start/submission/failure, leaderboard,
public settings and admin login/logout/settings/stats/actions/deletion.

`lib/game/attempt-service.ts` owns database reads, writes and authoritative
attempt timing, sequential progression, lives, scoring and prizes.
`lib/game/engine.ts` selects and validates seeded puzzles from `data/puzzles`.
Appwrite stores participants, attempts and the singleton settings document.
The existing in-process demo store remains available without Appwrite
credentials. Configured settings reads intentionally throw on database failure
instead of substituting demo defaults. Redis does not change either behavior.
Demo data can be isolated between Next.js route bundles/serverless instances;
it is not reliable cross-route persistence. Production requires Appwrite.

Admin authentication is the existing HTTP-only `ncc_admin` cookie gate and
shared passwords from `ADMIN_PASSWORDS`. It is not an Appwrite user session.
The existing cookie value is a fixed `1`; this integration preserves that
authentication design and does not make it a stronger authentication system.

Next.js deployment already targets Vercel, with no separate backend or existing
Redis/cache/rate-limit configuration. Existing scripts include lint,
type checking, builds, Appwrite provisioning and older mission smoke scripts.
Those older mission scripts send payloads for previous puzzle versions, so
they are unsuitable as assertions of the current game validators.

## What uses Redis

- Public `/api/leaderboard`: caches only its existing response, including public
  names/batches, results and aggregate statistics, for **10 seconds**.
- Login: **30 requests per IP per 60 seconds**.
- Registration: **120 requests per IP per 60 seconds**, allowing shared stall
  Wi-Fi and kiosks. Normal game submissions are not rate limited.
- Authenticated `GET /api/admin/redis-health`: PING/PONG check. Returns only
  `disabled`, `connected` or `unavailable`; no credentials or management access.

Settings, active attempts/timers, result ranks, private participant records,
phone numbers, student IDs, puzzle answers and admin sessions are not cached.
Permanent data remains in Appwrite. No UI, game rules or response bodies are
changed, except a new 429 response when a configured limit is exceeded.

The leaderboard response adds `X-NCC-Cache: HIT|MISS|BYPASS` for verification
and `Cache-Control: no-store` so browsers/CDNs do not add another stale layer.
Demo responses and Appwrite fallback responses are not written into Redis.

## Credentials and Vercel setup

Install **Upstash for Redis** from Vercel Marketplace and connect its database
to this project. Choose an HTTPS REST-capable database and a region near the
application/database. Add one complete pair under **Vercel Dashboard → Project
→ Settings → Environment Variables**:

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | HTTPS REST endpoint from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Read/write REST token from Upstash |
| `REDIS_KEY_PREFIX` | Optional application namespace; default `ncc-escape` |

The client also accepts the complete `KV_REST_API_URL` + `KV_REST_API_TOKEN`
pair used by Vercel's Upstash integration. **Do not mix pairs**, use a read-only
token, or supply a `redis://`/`rediss://` TCP URL to this REST client.
The connected Marketplace integration injects credentials automatically;
check which pair appears in your project's settings. If your installation
only supplies `REDIS_URL`, add the REST pair from the Upstash console.
All these variables are server-only: never prefix them with `NEXT_PUBLIC_`.

Apply credentials to the intended Production/Preview/Development environments
and redeploy. Pull Development variables with `vercel env pull .env.local` for
local use. `.env.example` has blank placeholders. Existing Appwrite and admin
environment variables are still required for the original production features.
Redis is optional: leaving both pairs blank disables it.

Sources: [Vercel Redis](https://vercel.com/docs/redis),
[Marketplace storage](https://vercel.com/docs/marketplace-storage),
[Upstash integration](https://upstash.com/docs/redis/howto/vercelintegration),
[SDK timeouts](https://upstash.com/docs/redis/sdks/ts/advanced).

## Keys, expiry and invalidation

Key prefix: `<REDIS_KEY_PREFIX>:<environment>:<database-hash>:v1:`.
Environment uses `VERCEL_ENV`, then `NODE_ENV`. The hash isolates Appwrite
endpoints/projects/databases/collections. Use a separate database or prefix for
independent preview projects if they share an environment and Appwrite target.

- `{leaderboard}:public:50`: public response envelope, 10-second TTL.
- `{leaderboard}:version`: random invalidation token, 24-hour TTL.
- `rate:login:<sha256-ip>` / `rate:registration:<sha256-ip>`: 60-second TTL.
  Raw IP addresses and passwords are never stored.

Successful participant creation/deletion, attempt creation/persistence/deletion,
prize changes/disqualification and settings updates invalidate the public cache.
Invalidation atomically changes the token and deletes the response. Cache writes
atomically compare their starting token before filling the cache, preventing an
older query from repopulating it after a mutation. The shared Redis hash tag
keeps both leaderboard keys in one slot for Redis Cluster compatibility.

Direct edits in Appwrite outside this application cannot trigger these hooks;
their public data becomes fresh when the 10-second cache expires. In-flight
requests can still return the snapshot they already read. If invalidation fails
during an outage, any surviving cache expires within its normal TTL.

## Failure and rate-limit behavior

`lib/redis.ts` reuses one HTTPS client per warm server process, uses an 800ms
timeout per Redis operation with no SDK retries, disables telemetry, and opens
a 15-second local circuit breaker after errors. Missing or invalid credentials
do not prevent startup. Logs contain only generic operation names, never SDK
exceptions, Redis URLs, credentials or cached content.

Cache failures query the existing Appwrite/demo path directly. Redis write or
invalidation failures do not turn successful database writes into failures.
Database exceptions are not swallowed by the cache wrapper.
Rate limits use one atomic Lua INCR/EXPIRE operation and fail open on Redis
failure. A blocked request returns 429 with `Retry-After` and `retryAfter` seconds.
Counters use a fixed window starting with the first request, not a sliding window.

On Vercel, identity comes from its edge-provided forwarding header. Outside
Vercel, only the runtime request IP is trusted. If there is no trustworthy IP,
the limiter bypasses rather than grouping every visitor into one bucket.
Consequently local Next.js deployments without a runtime IP do not enforce
IP limits; tests explicitly supply trusted IPs. Header behavior is documented by
[Vercel](https://vercel.com/docs/headers/request-headers).

## Verification

Run `npm run test:redis`, `npm run test:redis:http`, `npm run lint`,
`npm run typecheck`, and `npm run build`.
Tests use isolated Redis/Appwrite fixtures, do not load `.env` or mutate live
participants, and exercise cache hit/miss/expiration, concurrent invalidation,
database fallback, rate limits, outage recovery and the current four-level game.
The HTTP test starts Next.js on port 3107 (override with `REDIS_TEST_PORT`) and
a loopback Appwrite REST fixture, exercising the actual Appwrite SDK and route
handlers. It temporarily regenerates `.next`; run the production build afterward.

Implementation verification: 11 automated fixture tests passed, including a
real SDK serialization/deserialization test with mocked HTTP. The development
HTTP check passed for all screens, registration, four-level mission completion,
Appwrite SDK operations, leaderboard bypass, admin login/stats/settings and
protected Redis health. Lint, type checking and production build passed.
No live Redis credentials were available; live Upstash PING/HIT/TTL/limit checks
remain a deployment verification step. No production Appwrite records were
created or changed by these tests.

After configuring actual credentials, log into the admin panel and request
`/api/admin/redis-health` in that browser; expect `connected`. Call the public
leaderboard twice within 10 seconds: expect MISS then HIT in `X-NCC-Cache`.
Wait more than 10 seconds and call again for MISS. Perform a normal test
registration or admin mutation and confirm the next leaderboard request misses.
An unconfigured or unhealthy Redis reports BYPASS and leaves game requests
working. Live provider connectivity and deployment checks require your database
credentials; isolated tests do not prove connectivity to a real Upstash account.
