# Slow-network audit and safe fixes

Date: 2026-10-06. This report describes this audit, separately from the earlier
optimizations recorded in `performance-optimization.md`.

## 1. Project analysis and findings

Next.js 14.2.15 App Router, React 18.3.1, TypeScript 5.6.3, Tailwind 3.4.13.
All six application screens are client components with server-rendered initial
markup: home/registration, leaderboard, play, results, admin login and dashboard.
Root layout supplies toast/animation context and a development-only Appwrite
diagnostic. Node route handlers implement registration, attempt read/start/
submit/fail, public settings/leaderboard and admin authentication/settings/stats/
actions/deletion/Redis health. No middleware, Vercel override, service worker,
manifest or offline queue was found.

Appwrite holds participants, attempts and singleton settings. Server services
own progression, lives, score, expiry, ranks and prizes. Seeded puzzle data
remains server-side; existing filtered plans and API contracts are unchanged.
Redis already supplies public leaderboard caching, fill coordination, mutation
invalidation and rate limits. Admin authentication uses the existing HTTP-only
cookie/password gate. Existing demo memory storage is unchanged.

Four PNG/JPEG public assets total 1,531,283 bytes. Used logo is 79,052 bytes;
on-demand PDF template is 1,251,572 bytes. Next Image already sizes the logo.
The other public images are not referenced by current application components.
Robot JSON is 36,356 bytes, rendered as animated inline SVG. Other effects use
CSS, SVG and Framer Motion; Reveal additionally uses `motion/react`. Audio is
synthesized WebAudio, with no audio/video downloads. Google Fonts supplies the
existing Barlow Condensed, Inter and JetBrains Mono families via CSS import with
`display=swap`; all existing weights remain. `ncc-muted` is the only localStorage
preference; no IndexedDB exists. jsPDF and its template already load on demand.

## 2. Biggest bottlenecks

- Level 3 dynamically indexed a Lucide namespace, pulling the icon library into
  the game bundle despite the server generating only Wifi, Shield and Save.
- Font CSS adds an external origin and discovery waterfall.
- Admin stats polling every seven seconds could overlap a previous slow read.
- State-based disabled buttons alone did not guard same-render duplicate
  handler calls for registration/login/start/submission/settings/admin actions.
- PDF template loading waited for jsPDF download before beginning its own fetch.

Existing public GET single-flight sharing, hashed asset URLs, backend collection
scan reuse and Redis fill locks were already present and were retained.

## 3. Baseline and 19. Before/after measurements

Production builds were recorded before application changes and after final
changes. `slow-network-before.json` and `slow-network-after.json` contain raw
and independently gzip-compressed manifest file sizes. These are reproducible
build measurements, not complete browser HTTP transfer measurements. The
`requests` field counts initial manifest files, not API/font/image/prefetch calls.

| Route | Baseline gzip bytes | Final gzip bytes | Initial manifest files, before → after |
| --- | ---: | ---: | ---: |
| Home | 215,704 | 215,679 | 11 → 11 |
| Play | 358,969 | 197,191 | 12 → 10 |
| Leaderboard | 184,781 | 184,729 | 9 → 9 |
| Result | 187,047 | 187,019 | 10 → 10 |
| Admin login | 136,000 | 135,967 | 7 → 7 |
| Admin dashboard | 153,596 | 153,552 | 9 → 9 |

Play saves 161,778 gzip bytes (45.1%); raw files shrink from 1,427,891 to
648,954 bytes (54.6%). Next's own first-load report changes from 355 kB to
197 kB. Home first-load remains approximately 215 kB. This is a targeted game
loading improvement, not evidence of a large homepage improvement.

For the saved game bytes, the following are **bandwidth-only estimates**, not
throttled browser results, and exclude latency, CPU, protocol and parallelism:

| Illustrative profile | Download budget | Transfer time saved |
| --- | ---: | ---: |
| Normal | 1,250,000 bytes/s | 0.13 s |
| Slow 4G | 200,000 bytes/s | 0.81 s |
| Fast 3G | 180,000 bytes/s | 0.90 s |
| Slow 3G | 50,000 bytes/s | 3.24 s |

Headless Chromium could not establish a reliable automation session here.
Actual first-content/game-usable timing, FCP, LCP, INP, CLS, TTFB, request
waterfalls, image/font/CSS transfer totals, long tasks and real cached repeat
visits are **not measured**. No browser benchmark numbers are claimed.

## 4. Files modified and 5. Files created

Modified: `components/game/Level3TechMatch.tsx`,
`components/game/RegistrationForm.tsx`, `app/layout.tsx`, `app/admin/page.tsx`,
`app/admin/dashboard/page.tsx`, `app/play/[id]/page.tsx`,
`app/result/[id]/page.tsx`, `package.json`.

Created: `scripts/submission-network.test.cjs`, `scripts/slow-network-audit.cjs`,
`docs/slow-network-before.json`, `docs/slow-network-after.json`, this report.
No dependencies were installed, removed, upgraded or replaced.

## 6–9. Images, JavaScript, fonts and browser caching

Explicit imports preserve the same three Lucide components and existing Zap
fallback. A regression test checks plans for 1,024 seeds against the registry.
All game components remain immediately available; no later-level download delay
is introduced during the competition timer. No animation library was replaced.

Font-origin preconnect hints allow connection setup before imported font CSS is
discovered. Exact typography, files, weight selection and swap policy remain.
Benefit was not measured; unavailable browsers may ignore connection hints.

No image conversion or quality change. Existing content-hashed image/PDF URLs
and JS/CSS immutable caching are retained. Production HTTP checks verified
one-year immutable headers, identical source PNG bytes and conditional 304
responses for the logo and PDF template. No sensitive API caching was added.
PDF library and original template now fetch in parallel only on Download;
neither is prefetched on initial page load.

## 10–14. PWA, local data, APIs, Redis and database

No service worker, offline queue, IndexedDB or new localStorage data. Existing
`ncc-muted` remains. Existing route responses, methods, server validation,
Redis keys/TTLs/leases/rate limits/invalidation and database queries/schema are
unchanged. Admin polling retains seven-second cadence, but skips a poll while
a stats read is pending; mutation-triggered refresh still performs a new read.
No private results are shared globally or persisted in the browser.

## 15–16. Duplicate protection and network failures

Synchronous component refs guard registration, login, Begin, initial attempt
loading (including repeated effect setup), level submission, PDF download,
settings save and admin actions per attempt. Locks remain through response body
parsing and release in `finally`. Existing loading/disabled UI stays unchanged.
Admin action transport errors now use its existing Network error toast.

Eight new tests cover seven delayed/offline handlers and icon-plan coverage.
They verify that a duplicate before render sends one request, rejection unlocks,
and a subsequent user action can send a new request. Existing performance tests
also cover slow JSON parsing, GET deduplication, transient failures and recovery.
These are deterministic transport fixtures, not physical connectivity tests.

No automatic retries of mutations, success while offline, offline submission
queue, changed timer logic or server idempotency scheme. No new abort deadline
on writes: an aborted response can conceal a committed competition operation.
Server-authoritative expiry/scoring remain. UI locks do not protect against
multiple browser tabs or malicious requests and are not database transactions.

## 17–18. Versioning and security

Next's hashed filenames naturally change when content changes. Unchanged files
can be reused with existing immutable headers; HTML references the new build.
No worker cache can pin users to an old version. Existing Redis invalidation
version checks and ten-second public TTL remain. Nothing newly exposes puzzle
answers, seeds, hidden clues, private participant records, credentials or game
authority. API authentication and existing anti-cheat decisions are untouched.

## 20. Build and regression results

- `npm run lint`: passed; final build lint also passed.
- `npm run typecheck`: passed on the final build.
- `npm run test:performance`: 5 passed.
- `npm run test:redis`: 15 passed (including nested suite).
- `npm run test:network`: 8 passed.
- `npm run test:redis:http`: passed actual Next routes/Appwrite SDK against an
  isolated loopback fixture: registration, every current level, completion,
  leaderboard, admin login/settings/stats, health authorization and screen URLs.
- `npm run build`: passed on final code.
- `node scripts/asset-cache-test.cjs`: passed production asset/cache checks.
- `git diff --check`: passed.

No production records were changed. These checks do not prove live Appwrite/
Upstash connectivity, Vercel cold-start latency or event-scale capacity.
Desktop/mobile visual QA, animation/hydration checks, interactive registration,
refresh/direct-URL timing, logout/login and PDF visual equivalence still need
browser verification. Server fixtures validate all four levels and authoritative
duration/expiry; they do not substitute for a timed mobile gameplay session.

## 21. Deployment and deliberately unchanged risks

No manual Vercel config, new environment variables, database migrations or Redis
changes. Redeploy normally with existing credentials. Before the event, run
staging desktop/mobile tests with Normal, Slow 4G, Fast/Slow 3G and intermittent
offline networking. Measure the missing Web Vitals and cold/warm visits there;
verify live Redis health/cache headers and full gameplay including timeout and
PDF download. `npm run audit:network` records final build byte counts;
`npm run test:network` runs the new transport checks.

Deliberately unchanged: current gameplay/timer clock offset and expiry flow;
auto-submitting mini-game recovery after a lost response; existing database
fallback behavior; cross-tab/concurrent-server write semantics; settings reads
and save read-back; 500-document ranking/stats limits and 200-attempt rebasing;
authentication design; external font files; dual motion libraries; puzzle
payloads; polling intervals; animations and all layouts. Resolving these could
change authoritative behavior or user flow, so this audit does not silently
introduce retries, offline gameplay, stale state, schema changes or new rules.
