# Performance optimization report

1. **Analyzed:** App Router pages/components, game engine/attempt service, Appwrite access, API/admin routes, Redis cache/rate limits, assets, configuration and tests before editing. Next 14 already caches hashed JS/CSS. Robot data, SVG icons, CSS backgrounds and synthesized sounds need no separate asset cache; font loading remains unchanged.

2. **Problems:** Unversioned logo/PDF-template URLs, duplicate overlapping GETs, duplicate collection scans, concurrent leaderboard refills and a production Appwrite health request used only for console diagnostics.

3. **Modified files:** `app/page.tsx`, `app/leaderboard/page.tsx`, `app/result/[id]/page.tsx`, `components/game/FastestTimeCard.tsx`, `components/AppwriteBoot.tsx`, `app/api/leaderboard/route.ts`, `app/api/admin/stats/route.ts`, `lib/game/attempt-service.ts`, `lib/cache.ts`, `package.json`, `scripts/redis.test.cjs`, `README.md`, `docs/redis-integration.md`.

4. **Created files:** `lib/client/shared-read.ts`, `scripts/performance.test.cjs`, `scripts/asset-cache-test.cjs`, this report. No new dependency.

5. **Browser caching:** Static imports produce content-hashed logo/PDF-template URLs with Next's `public, max-age=31536000, immutable` headers. Bytes remain identical. Existing hashed JS/CSS caching remains. PDF template/jsPDF stay on demand; unused assets are not prefetched. Browser eviction/settings can remove cached resources.

6. **Service Worker/PWA:** None added. HTTP caching already covers reusable resources. Interception, offline gameplay and queued submissions would introduce timed-competition behavior and update risks.

7. **Cache Storage:** No application-managed entries; ordinary HTTP cache handles static files.

8. **IndexedDB:** Nothing added. No safe reusable structured dataset needs another persistent copy.

9. **localStorage:** No new entries. Existing `ncc-muted` stays unchanged. No persisted attempt, answer, score, timer, settings or authentication data is introduced.

10. **Server-side:** Registration, start/read, answer validation, progression, lives, duration/expiry, completion time, prize eligibility, writes and admin decisions remain server-controlled. Appwrite remains permanent storage. No global authoritative memory cache added; existing demo fallback is unchanged.

11. **Redis:** Existing public leaderboard cache, mutation invalidation and rate limits remain. A UUID fill lease now coordinates misses across instances, expires after five seconds and checks ownership on release. Nonowners wait once for 200 ms, then use a valid entry or fetch fresh data. Slow fills can still produce duplicate reads; latency is bounded instead of indefinitely blocking players.

12. **Calls reduced:** Identical overlapping GETs for settings/leaderboard/result attempts share one pending promise through JSON parsing; success/failure removes it. Later reads fetch again with `cache: no-store`. POSTs and existing 5-second/15-second polling cadences are unchanged. Production diagnostic health calls are removed. Leaderboard misses scan two collections instead of three; admin stats scan twice instead of four times.

13. **TTL/versioning:** Static content changes yield new hashed filenames; immutable TTL is one year. APIs are not persistently browser-cached. Redis public TTL stays ten seconds; version metadata stays 24 hours. Environment/database namespaces remain. Pending reads retain no completed results.

14. **Invalidation:** Existing participant/attempt/settings mutation hooks remain. Atomic version comparison rejects fills spanning mutations. Failed loaders release the lease in `finally`; abandoned leases expire. Lease data is coordination only.

15. **Security/anti-cheat:** No answer bank, seed, private participant data or authoritative progress added to browser storage/public Redis payload. Scoring, expiry, authorization and rate limits are preserved. Existing admin-cookie authentication is unchanged; this work does not strengthen that pre-existing design.

16. **Expected reduction:** Database scans per leaderboard miss fall by one third; admin stats scans fall by one half. An isolated 200-request fast-fill test produced one loader call and 199 hits. This is not a production throughput benchmark. API/Redis polling still occurs. Warm browsers can reuse the roughly 1.25 MB PDF template plus logo, subject to eviction. Existing 500-document collection limits remain: thousands of stored competitors need separate pagination/ranking work. No thousands-user capacity guarantee is made.

17. **Failure behavior:** No offline submission queue or automatic submission retry. Failed shared reads clear pending entries. Leaderboard polling retains the last confirmed display during transient failure. Existing result/settings failure behavior remains. Missing/unhealthy Redis bypasses to the database with existing timeout/circuit-breaker behavior; database errors are not hidden.

18. **Deployment/update:** New deployment HTML/JS references new content-hashed assets. Old bytes cannot replace changed content at the new URL. Old static entries are left to normal browser eviction. No worker/cache cleanup loop exists; open sessions are not forcibly reloaded. HTML/deployment freshness remains Next/Vercel's responsibility.

19. **Verification:** Lint, typecheck and production build passed. `test:redis` passed 15 tests; `test:performance` passed five. `test:redis:http` passed actual Next routes and Appwrite SDK operations against an isolated fixture: registration, all current levels/completion, admin auth/settings/stats and Redis-disabled health. Fixtures cover TTL, invalidation races, outages, limits, concurrency, abandoned leases, loader failures and authoritative duration/expiry. No production records touched. `node scripts/asset-cache-test.cjs` passed on the production build: immutable one-year headers, unchanged image bytes and conditional 304 responses. It requests only homepage/static files. Browser automation failed to initialize, so desktop/mobile visual rendering, hydration/console checks and real-browser first/repeat/hard-refresh behavior remain unverified. Live Upstash connectivity/capacity also remains unverified. No worker was added and submission/timer UI code was untouched. Build succeeds with the optional `sharp` recommendation.

20. **Vercel steps:** No new environment variables/cache headers/cron/PWA settings. Push and redeploy. Keep the existing complete `KV_REST_API_URL`/`KV_REST_API_TOKEN` pair (or supported Upstash pair) available to the new deployment. Adding variables does not update an old deployment. Check authenticated `/api/admin/redis-health` and leaderboard `X-NCC-Cache` per the Redis guide. Before the event, verify desktop/mobile registration, every level, expiry, results/PDF and admin changes; run a staging load test to size Appwrite, Redis and Vercel.
