# Real game load tests

Tests use the existing endpoints and preserve runtime/UI/game code. k6 2.3.0
was downloaded from the official Grafana release and archive digest verified.
The portable executable is in the OS temporary directory, not this repository.

## Safety and records

An explicit `BASE_URL` and `TEST_MODE` are required. Remote runs also require
`ALLOW_TEST_WRITES=yes`. `authorized-production` accepts only the exact origin
the owner authorized in this session: `https://ncc-escape-challenge.vercel.app`.
`staging` is for an independently authorized deployment with dedicated data.
Changing these flags is not a substitute for ownership/authorization.

Each virtual user registers once per stage, with `LOAD_TEST_` name and Student
ID prefixes. Later iterations represent five-second leaderboard refreshes,
not additional registrations. No email/SMS/OTP/payment endpoints exist in this
journey. Actual plan data supplies Level 3 pairs/Level 4 target. Scoring and
expiry remain server controlled; four submissions must advance correctly.
Ranked completed results and duplicate-free leaderboard IDs are checked.

`run-stage.cjs` writes planned/created test IDs to an append-only stage ledger,
raw k6 metric points, aggregate summaries and stage metadata. Raw bodies,
passwords, cookies and real leaderboard identities are not recorded. The owner
authorized production admin credentials ONLY for cleanup. Production smoke
does not authenticate as an admin; players have no login step.

`cleanup.cjs` reads the local admin credential in memory, logs in for cleanup,
verifies exact generated names/IDs and uses existing delete APIs. Only recorded
IDs or exact matching planned Student IDs are considered. Attempt deletion is
checked with a 404 read-back; participant API failures/demo fallbacks or remaining
test records are reported. It logs out afterward. No Redis flush/reset, settings,
prizes, real scores or other records are modified. Cleanup also invalidates the
public cache through the existing application's normal deletion hooks.

An interrupted registration may create a participant without returning its ID;
cleanup checks admin stats for exact planned matches. Those stats expose only
500 documents, so an unconfirmed partial write outside that window is reported
as unresolved, never silently treated as cleaned. Failed cleanup blocks further
stages until investigated.

## Run one stage at a time (PowerShell)

```powershell
$env:BASE_URL = 'https://ncc-escape-challenge.vercel.app'
$env:TEST_MODE = 'authorized-production'
$env:ALLOW_TEST_WRITES = 'yes'
# Optional K6_PATH overrides the temporary portable executable.
node load-tests/preflight.cjs
node load-tests/run-stage.cjs smoke production-smoke
node load-tests/analyze.cjs production-smoke
node load-tests/cleanup.cjs load-tests/results/production-smoke-records.jsonl

$env:VUS = '10'
node load-tests/run-stage.cjs load production-10
node load-tests/analyze.cjs production-10
node load-tests/cleanup.cjs load-tests/results/production-10-records.jsonl
# Inspect results and cleanup; then separately run 50, 100, 250 and 500.
```

Never invoke every stage blindly. `PASS` means HTTP, semantic and completed
journey error rates <1%, API P95 <1000 ms/P99 <2000 ms, and endpoint P99 <2000 ms.
`WARNING` means correctness targets pass but a latency target is crossed.
`FAIL` means >=1% HTTP, response-validation or journey failures. Significant
failures stop escalation. All latency warnings remain in reports and raw data.
These initial targets follow the request; they do not alter production rules.
From the 100-player stage onward, correctness/error thresholds also abort the
run after a 20-second observation window if crossed. Latency warnings do not
automatically abort. Earlier smoke/10/50 runs used the same targets without
early abort; none are excluded or reclassified as faster runs.

## Scenarios

- `smoke.js`: 2 VUs, 35 s scheduling plus up to 60 s for active journeys to finish.
- `load.js`: 10 s ramp, 60 s hold, 5 s ramp-down, up to 60 s graceful completion.
  `VUS`, `RAMP`, `HOLD` customize the stage; use the prescribed 10→50→100→250→500.
- `event.js`: one 500-player cohort spread over the first minute.
- `spike.js`: 10→50→500 rapidly, hold, return to 10 for recovery monitoring.
  Run only after the progressive 500 stage succeeds.
- `finish.js`: one 500-player cohort, three level submissions then a shared final
  submission barrier. Set `FINISH_AT_MS` about 60 s ahead before launching; abort
  if setup misses the barrier. Verify the configured game timer permits it.
- `soak.js`: `VUS` constant users for `DURATION` (default 10 m); one game per user
  then sustained leaderboard polling. This minimizes permanent test records and
  is a leaderboard-focused soak, not continuously new game mutations for 10 m.
- `static.js`: 10 VUs, 30 s cold same-origin asset requests from `assets.json`.
  `preflight.cjs` discovers deployed asset paths. No third-party font traffic.
- `local-server.cjs`: optional production-build fixture used only to validate
  scripts/cleanup before production writes. The fixture has no provider latency,
  Redis or Vercel capacity realism. It overwrites `.next`; rebuild normally after
  stopping it to restore ordinary environment build artifacts.

Normal think time is 1–3 s before registration, then 5–9, 9–15, 6–12 and 4–7 s
for levels, with 5 s result-board refreshes. There is no invented level-loading,
player authentication, server timer-polling or separate score endpoint. Level
4's existing submission computes the score and completion time.

## Settings and outputs

`RUN_ID`: optional 1–8 alphanumeric stage identifier (random default).
`TEST_USER`: not needed: generated names must use the mandatory prefix.
`TEST_PASSWORD`: only local fixture smoke; production admin credentials are
loaded by cleanup from local environment files and never passed on CLI/logged.
`PREVIEW_BYPASS`: optional staging protection token in memory; never commit it.
`SUMMARY_PATH`: runner-managed output; `K6_PATH`: executable override.

`analyze.cjs` calculates endpoint request counts, average/min/median/P90/P95/P99/
max, HTTP/semantic failure rates, status distribution, timeouts/network failures,
peak one-second request completions, Redis HIT/MISS/BYPASS headers and minute
latency bins. Summaries retain k6 data sent/received and actual run duration.
Backend/provider database/Redis timings, connection counts and Vercel function
duration are unavailable without provider monitoring access; HTTP latency cannot
be relabeled as database or Redis latency.

A 500-VU test from one generator uses one public IP. The existing per-IP
registration limit is 120 per 60 s. Do not spoof forwarding headers, disable the
limiter or exclude 429 responses from results. A shared-IP failure does not prove
the same failure for 500 players spread over independent IPs.

Reference: [Grafana k6 custom summaries](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/)
and [ramping virtual users](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/).
The runner explicitly retains legacy machine-readable summary format so the
saved metric analysis stays consistent with k6 2.3.0.

## Actual production outcome

Smoke, 10, 50 and 100 completed with zero gameplay/HTTP failures but latency warnings. The 250 stage aborted with 1,172/1,270 HTTP 403 responses. A single k6 probe confirmed Vercel Security Checkpoint and `x-vercel-mitigated: challenge`; no 429 was observed. This is an edge automation challenge, not proof of backend or real-browser capacity failure. The owner chose to finish with 500 unverified. No 500/spike/event/soak/static load scenario ran, and no protection was changed or bypassed.

The separate one-player diagnostic confirmed two accepted simultaneous final submissions overwrote the stored completion time by 78 ms; sequential replay returned 409. All 163 created production participants and 163 attempts were cleaned up, with zero unresolved records and original public aggregates restored. See `docs/production-load-test-report.md` for measurements and limitations.
