# Production load-test report

## 1. Executive result

500-player verdict: **NOT ESTABLISHED**. Progressive escalation stopped at **250 VUs (FAIL)**. The largest completed progressive cohort with <1% HTTP/gameplay failures is **100 players**; latency warnings are retained. This is not a proven 500-player capacity or a deployment-wide limit.

## 2. Test environment and actual journey

Executed October 6, 2026 UTC (October 6-7 in Asia/Dhaka); final cleanup verified at 17:57:10 UTC.

- Target: https://ncc-escape-challenge.vercel.app; owner explicitly authorized production writes and cleanup.
- Hosting: real Vercel deployment, real configured Appwrite and Redis through unchanged APIs. Preflight response IDs showed the BOM edge and IAD function region.
- Generator: 12th Gen Intel(R) Core(TM) i5-12450HX, 12 logical CPUs, 15.71 GiB RAM, Windows x64, Node v25.8.2; portable checksum-verified k6 2.3.0. One generator/public IP.
- Existing timer: 60 seconds; settings were not modified. Initial public aggregates: 10 participants, 10 attempts.
- Public players have no login. Home → settings/fastest leaderboard → prefixed registration → play HTML → start → four paced submissions → result HTML/API → leaderboard HTML and five-second refreshes. The fourth submission calculates score; no invented score/level-loading/timer endpoints. Each VU registers once.
- Pacing: 1–3 seconds before registration, then 5–9/9–15/6–12/4–7 seconds for the levels. No automatic mutation retries.
- Request latency is k6 HTTP duration, excluding DNS/TCP/TLS setup; it includes request send/wait/receive. Results are from this Bangladesh generator path, not provider-internal timing.

## 3. Test summary

| Stage / peak VUs | Avg ms | P95 ms | P99 ms | Req/s | HTTP success | Semantic errors | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| production-smoke / 2 | 658.04 | 1214.59 | 1353.72 | 0.57 | 100.00% | 0.00% | WARNING |
| production-10 / 10 | 526.88 | 1101.49 | 1564.48 | 2.36 | 100.00% | 0.00% | WARNING |
| production-50 / 50 | 536.91 | 1178.71 | 1543.11 | 11.83 | 100.00% | 0.00% | WARNING |
| production-100 / 100 | 544.39 | 1109.67 | 1483.32 | 23.58 | 100.00% | 0.00% | WARNING |
| production-250 / 250 | 61.30 | 121.94 | 606.08 | 57.83 | 7.72% | 92.28% | FAIL |
| 500 | — | — | — | — | — | — | NOT RUN: progression gate |

Thresholds: HTTP, semantic-response and completed-journey failure rates <1%; API P95 <1000 ms/P99 <2000 ms; endpoint P99 <2000 ms. Correctness failures yield FAIL; latency-only crossings yield WARNING, never PASS. Smoke/10/50 used the same targets without early abort. From 100 onward error thresholds abort after a 20-second observation window. Actual k6 threshold exit codes and raw summaries are retained.

| Stage | Duration s | Requests | HTTP successful | HTTP failed | Semantic failed | Journeys completed/started | Peak req/s (1 s bin) | Data received bytes | Data sent bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| production-smoke | 55.74 | 32 | 32 | 0 | 0 | 2/2 | 4 | 191254 | 7671 |
| production-10 | 79.56 | 188 | 188 | 0 | 0 | 10/10 | 13 | 1113426 | 38888 |
| production-50 | 80.06 | 947 | 947 | 0 | 0 | 50/50 | 36 | 7634655 | 199765 |
| production-100 | 79.82 | 1882 | 1882 | 0 | 0 | 100/100 | 72 | 15387317 | 396555 |
| production-250 | 21.96 | 1270 | 98 | 1172 | 1172 | 0/250 | 110 | 43459146 | 683315 |

Peak req/s uses UTC-aligned one-second completion bins, not an instantaneous server-invocation maximum. HTTP 200 with invalid gameplay/result content is also counted as a semantic failure. Abort can interrupt successful in-flight journeys; interrupted players are not reported as completed.

## 4. Spike and event-start tests

500-user start spike, 500-user event cohort and 500-user finish/score spike: **NOT RUN** unless progressive 500 succeeds. The 250-VU failure gate prevented escalation. No peak/P95/P99/recovery values are invented.

## 5. Soak test

NOT RUN after the failure gate. No sustained-capacity or memory-leak claim is made.

## 6. Endpoint report

Operations use real routes: homepage `/`; settings `/api/settings`; registration `/api/register`; start `/api/attempt/start`; levels 1–4 `/api/attempt/submit`; result `/api/attempt?id=...`; leaderboard `/api/leaderboard`. Other rows are their existing HTML pages. No level endpoint or separate score endpoint exists.

### production-smoke

| Operation | Requests | Avg ms | Median ms | P90 ms | P95 ms | P99 ms | Min ms | Max ms | HTTP failed | Semantic failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage | 2 | 95.54 | 95.54 | 110.15 | 111.97 | 113.43 | 77.29 | 113.80 | 0 | 0.00% |
| settings | 2 | 396.36 | 396.36 | 405.25 | 406.36 | 407.25 | 385.25 | 407.47 | 0 | 0.00% |
| leaderboard | 8 | 359.39 | 340.50 | 471.64 | 504.90 | 531.52 | 257.43 | 538.17 | 0 | 0.00% |
| register | 2 | 1087.83 | 1087.83 | 1136.17 | 1142.22 | 1147.05 | 1027.40 | 1148.26 | 0 | 0.00% |
| play_page | 2 | 1181.58 | 1181.58 | 1229.18 | 1235.13 | 1239.89 | 1122.07 | 1241.09 | 0 | 0.00% |
| start | 2 | 974.16 | 974.16 | 1049.17 | 1058.55 | 1066.05 | 880.40 | 1067.92 | 0 | 0.00% |
| level1 | 2 | 1037.13 | 1037.13 | 1161.75 | 1177.33 | 1189.79 | 881.36 | 1192.90 | 0 | 0.00% |
| level2 | 2 | 924.30 | 924.30 | 930.20 | 930.94 | 931.53 | 916.91 | 931.68 | 0 | 0.00% |
| level3 | 2 | 906.17 | 906.17 | 933.78 | 937.23 | 939.99 | 871.67 | 940.68 | 0 | 0.00% |
| level4 | 2 | 1207.04 | 1207.04 | 1364.87 | 1384.60 | 1400.38 | 1009.76 | 1404.32 | 0 | 0.00% |
| result_page | 2 | 337.16 | 337.16 | 380.32 | 385.72 | 390.03 | 283.20 | 391.11 | 0 | 0.00% |
| result | 2 | 626.58 | 626.58 | 632.80 | 633.58 | 634.20 | 618.80 | 634.36 | 0 | 0.00% |
| leaderboard_page | 2 | 317.27 | 317.27 | 523.09 | 548.82 | 569.40 | 59.99 | 574.54 | 0 | 0.00% |

### production-10

| Operation | Requests | Avg ms | Median ms | P90 ms | P95 ms | P99 ms | Min ms | Max ms | HTTP failed | Semantic failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage | 10 | 65.55 | 64.24 | 84.41 | 90.58 | 95.52 | 47.80 | 96.76 | 0 | 0.00% |
| settings | 10 | 397.50 | 372.43 | 456.36 | 507.26 | 547.98 | 347.14 | 558.16 | 0 | 0.00% |
| leaderboard | 68 | 317.17 | 269.75 | 410.25 | 462.65 | 1010.17 | 244.82 | 1090.28 | 0 | 0.00% |
| register | 10 | 957.30 | 901.21 | 1098.49 | 1164.36 | 1217.06 | 837.84 | 1230.23 | 0 | 0.00% |
| play_page | 10 | 285.83 | 277.35 | 321.61 | 354.55 | 380.90 | 253.44 | 387.48 | 0 | 0.00% |
| start | 10 | 967.37 | 888.04 | 1149.99 | 1317.40 | 1451.32 | 847.51 | 1484.81 | 0 | 0.00% |
| level1 | 10 | 966.11 | 903.38 | 1195.62 | 1220.91 | 1241.14 | 833.92 | 1246.20 | 0 | 0.00% |
| level2 | 10 | 911.25 | 919.93 | 930.35 | 942.41 | 952.06 | 872.33 | 954.47 | 0 | 0.00% |
| level3 | 10 | 915.82 | 922.60 | 966.65 | 972.82 | 977.75 | 842.53 | 978.98 | 0 | 0.00% |
| level4 | 10 | 1283.67 | 1064.52 | 2107.68 | 2152.63 | 2188.58 | 942.91 | 2197.57 | 0 | 0.00% |
| result_page | 10 | 271.76 | 257.27 | 315.60 | 323.16 | 329.22 | 244.68 | 330.73 | 0 | 0.00% |
| result | 10 | 673.93 | 620.44 | 737.01 | 922.27 | 1070.47 | 589.78 | 1107.52 | 0 | 0.00% |
| leaderboard_page | 10 | 52.51 | 48.75 | 71.46 | 73.89 | 75.84 | 42.11 | 76.32 | 0 | 0.00% |

### production-50

| Operation | Requests | Avg ms | Median ms | P90 ms | P95 ms | P99 ms | Min ms | Max ms | HTTP failed | Semantic failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage | 50 | 66.03 | 56.25 | 81.45 | 97.99 | 232.78 | 43.60 | 355.39 | 0 | 0.00% |
| settings | 50 | 395.79 | 375.14 | 430.25 | 450.36 | 795.79 | 343.26 | 1122.97 | 0 | 0.00% |
| leaderboard | 347 | 345.45 | 269.08 | 507.01 | 631.45 | 864.97 | 234.54 | 1491.60 | 0 | 0.00% |
| register | 50 | 976.44 | 916.32 | 1229.58 | 1295.68 | 1374.96 | 842.83 | 1401.68 | 0 | 0.00% |
| play_page | 50 | 293.03 | 269.86 | 286.46 | 303.81 | 847.30 | 250.57 | 1361.56 | 0 | 0.00% |
| start | 50 | 984.50 | 923.96 | 1145.92 | 1191.37 | 1843.50 | 834.70 | 2409.77 | 0 | 0.00% |
| level1 | 50 | 972.52 | 893.95 | 1143.90 | 1613.39 | 1923.64 | 841.77 | 1975.48 | 0 | 0.00% |
| level2 | 50 | 993.64 | 900.73 | 1237.84 | 1548.94 | 1691.09 | 838.41 | 1785.97 | 0 | 0.00% |
| level3 | 50 | 991.87 | 917.38 | 1225.41 | 1295.77 | 1786.98 | 823.25 | 1904.61 | 0 | 0.00% |
| level4 | 50 | 1117.49 | 1074.83 | 1291.79 | 1313.79 | 1449.74 | 958.23 | 1571.09 | 0 | 0.00% |
| result_page | 50 | 272.15 | 268.44 | 286.69 | 314.06 | 324.89 | 252.24 | 329.78 | 0 | 0.00% |
| result | 50 | 659.97 | 639.51 | 728.16 | 798.56 | 935.03 | 594.64 | 954.77 | 0 | 0.00% |
| leaderboard_page | 50 | 48.28 | 46.82 | 53.69 | 60.04 | 63.11 | 39.70 | 64.61 | 0 | 0.00% |

### production-100

| Operation | Requests | Avg ms | Median ms | P90 ms | P95 ms | P99 ms | Min ms | Max ms | HTTP failed | Semantic failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage | 100 | 60.21 | 55.33 | 73.25 | 83.91 | 118.93 | 43.35 | 136.22 | 0 | 0.00% |
| settings | 100 | 379.18 | 364.79 | 403.38 | 468.36 | 625.04 | 339.33 | 677.36 | 0 | 0.00% |
| leaderboard | 682 | 372.39 | 272.78 | 619.32 | 639.32 | 871.22 | 231.67 | 1588.03 | 0 | 0.00% |
| register | 100 | 1020.30 | 928.61 | 1263.07 | 1488.35 | 2046.55 | 852.80 | 2057.90 | 0 | 0.00% |
| play_page | 100 | 273.09 | 268.91 | 289.13 | 303.21 | 338.28 | 248.34 | 393.40 | 0 | 0.00% |
| start | 100 | 1076.77 | 949.82 | 1386.02 | 1866.19 | 2007.59 | 840.91 | 2053.63 | 0 | 0.00% |
| level1 | 100 | 960.04 | 911.64 | 1121.40 | 1233.63 | 1674.33 | 836.80 | 1786.63 | 0 | 0.00% |
| level2 | 100 | 930.52 | 916.58 | 1014.34 | 1064.91 | 1137.75 | 823.00 | 1212.79 | 0 | 0.00% |
| level3 | 100 | 928.68 | 905.06 | 1021.25 | 1108.99 | 1257.34 | 825.46 | 1292.58 | 0 | 0.00% |
| level4 | 100 | 1074.43 | 1054.67 | 1150.77 | 1208.21 | 1366.63 | 989.56 | 1767.08 | 0 | 0.00% |
| result_page | 100 | 269.69 | 266.34 | 285.98 | 303.97 | 336.93 | 247.60 | 358.14 | 0 | 0.00% |
| result | 100 | 684.25 | 661.17 | 729.69 | 905.57 | 945.45 | 608.52 | 1092.94 | 0 | 0.00% |
| leaderboard_page | 100 | 48.56 | 45.93 | 57.67 | 68.23 | 82.09 | 39.66 | 85.67 | 0 | 0.00% |

### production-250

| Operation | Requests | Avg ms | Median ms | P90 ms | P95 ms | P99 ms | Min ms | Max ms | HTTP failed | Semantic failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage | 250 | 45.15 | 42.04 | 58.30 | 64.71 | 86.69 | 25.82 | 124.00 | 213 | 85.20% |
| settings | 37 | 513.06 | 426.79 | 730.88 | 883.26 | 975.72 | 40.19 | 1003.87 | 2 | 5.41% |
| leaderboard | 957 | 48.57 | 40.63 | 47.24 | 53.62 | 262.00 | 36.41 | 476.53 | 931 | 97.28% |
| register | 26 | 42.24 | 42.11 | 48.36 | 51.03 | 52.30 | 36.70 | 52.54 | 26 | 100.00% |

## 7. Errors and failure gate

| Stage | HTTP 2xx | HTTP 4xx | HTTP 429 | HTTP 5xx | Timeouts | Network errors | Missing completed rank |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| production-smoke | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| production-10 | 188 | 0 | 0 | 0 | 0 | 0 | 0 |
| production-50 | 947 | 0 | 0 | 0 | 0 | 0 | 0 |
| production-100 | 1882 | 0 | 0 | 0 | 0 | 0 | 0 |
| production-250 | 98 | 1172 | 0 | 0 | 0 | 0 | 0 |

All statuses, including 429, are retained; failure responses are not filtered out to manufacture a pass. The registration limiter is 120 requests per trusted IP per fixed 60-second window. A single-generator test deliberately does not spoof forwarding headers or disable that policy.

## 8. Redis report

| Stage | HIT | MISS | BYPASS | Header hit ratio |
| --- | ---: | ---: | ---: | ---: |
| production-smoke | 5 | 3 | 0 | 62.50% |
| production-10 | 54 | 13 | 1 | 79.41% |
| production-50 | 254 | 61 | 32 | 73.20% |
| production-100 | 476 | 78 | 128 | 69.79% |
| production-250 | 25 | 1 | 0 | 96.15% |

HIT headers demonstrate the actual shared cache serving leaderboard responses. MISS/BYPASS during mutations/fills remain visible. The cache expires in ten seconds and mutations invalidate it. Provider-internal Redis latency, key counters, memory, command throughput and connection limits: **Not measurable with the currently available monitoring.** No Redis flush or manual key deletion was performed. Normal APIs and cleanup invoke the existing application invalidation/rate-limit behavior.

## 9. Database and static traffic

Real Appwrite-backed APIs were exercised. Successful completions/ranks establish externally observed correctness only for the completed cohorts. Provider query latency, database connections/lock contention, internal errors and resource saturation: **Not measurable with the currently available monitoring.** Vercel function duration/concurrency/errors and external API internal latency: **Not measurable with the currently available monitoring.**

The source scans up to 500 attempts/participants for ranks/stats and does not provide server-side transaction/idempotency guards. These are code findings, not measured provider limits. No schema/query/runtime changes were made. Deployed same-origin asset paths were discovered in preflight; the separate static load scenario was NOT RUN after the failure gate. k6 does not implement browser cache or render the UI; no third-party font traffic is generated. HTML preflight returned a Vercel HIT. Existing hashed assets are immutable and browser-cacheable; audio is synthesized locally and PDF is generated client-side on demand. Browser rendering and paid external media APIs are outside this load test.

## 10. First bottleneck and duplicate submissions

First observed progressive failure: **production-250**, at peak 250 VUs. Its status/error table and endpoint rows above identify the failing operations. Of 1,270 requests, 1,172 returned HTTP 403 (92.28%); 98 returned 200. All 26 registration calls returned 403, so no 250-stage player reached start or submission. A subsequent one-request k6 probe returned the title **Vercel Security Checkpoint**, header **x-vercel-mitigated: challenge**, and HTTP 403 in 40.73 ms. This establishes edge challenge mitigation of this automated client, not database exhaustion or failure of 250 genuine browser players. No HTTP 429, 5xx, network error or timeout was observed in the progressive stages. Fast blocked responses explain the lower aggregate latency at 250. Earlier cohorts retained latency warnings in registration/start/submission even without request failures.

A separate one-participant diagnostic used concurrent starts and final submissions. Simultaneous final submissions accepted: **2/2**. See `production-duplicates-analysis.json` for exact statuses/timestamps and the sequential replay. Both simultaneous finals returned HTTP 200/COMPLETED with different completion times: **9,455 ms and 9,533 ms**. The result API persisted **9,533 ms**, confirming a **78 ms overwrite** of the official completion time. Sequential replay correctly returned HTTP 409 ATTEMPT_ENDED. This is a confirmed terminal-transition race; no duplicate documents or leaderboard entries were observed, and the score itself was not exposed by this API.

| Diagnostic operation | HTTP | Attempt status | Completion ms | Started at | Completed at |
| --- | ---: | --- | ---: | --- | --- |
| register | 200 | READY | — | — | — |
| concurrent_start_1 | 200 | ACTIVE | — | 2026-10-06T17:56:18.490+00:00 | — |
| concurrent_start_2 | 200 | ACTIVE | — | 2026-10-06T17:56:18.490+00:00 | — |
| level1 | 200 | ACTIVE | — | 2026-10-06T17:56:18.490+00:00 | — |
| level2 | 200 | ACTIVE | — | 2026-10-06T17:56:18.490+00:00 | — |
| level3 | 200 | ACTIVE | — | 2026-10-06T17:56:18.490+00:00 | — |
| concurrent_final_1 | 200 | COMPLETED | 9455 | 2026-10-06T17:56:18.490+00:00 | 2026-10-06T17:56:28.060+00:00 |
| concurrent_final_2 | 200 | COMPLETED | 9533 | 2026-10-06T17:56:18.490+00:00 | 2026-10-06T17:56:28.415+00:00 |
| sequential_final_replay | 409 | — | — | — | — |
| result | 200 | COMPLETED | 9533 | 2026-10-06T17:56:18.490+00:00 | 2026-10-06T17:56:28.415+00:00 |

## 11. Capacity and safety margin

The largest completed progressive cohort was **100 players**, with zero HTTP/gameplay failures but latency warnings. It is a short-cohort observation, not sustained event capacity. The 250-player automated path failed at Vercel edge mitigation; actual browser capacity at 250 or 500 remains **unverified**. No numerical safe event capacity or safety margin can be certified from these runs. The source registration limit of 120 per trusted IP per minute is an additional untested arrival constraint, not the cause of the observed 403 failures.

## 12. Recommendations

- **P0:** Make final submission an atomic, idempotent terminal transition in a separate reviewed change; the diagnostic confirmed completion-time overwrite. No gameplay code was changed during testing.
- **P0:** Before certifying 500 players, arrange an owner-controlled, narrowly scoped Vercel exception for authorized automation, then repeat 250 and 500 progressively and run the gated spikes. Preserve the current failed results. Vercel documents that challenge responses require a real browser and can block automated clients; this run does not measure browser capacity. [Vercel firewall concepts](https://vercel.com/docs/vercel-firewall/firewall-concepts), [Vercel load-testing guidance](https://vercel.com/kb/guide/how-to-effectively-load-test-your-vercel-application). The owner chose to finish this report with 500 unverified; no protection was bypassed or modified.
- **P1:** Investigate registration/start/submission latency with provider traces; HTTP timing alone cannot attribute it to Redis, Appwrite or Vercel.
- **P1:** Review shared event Wi-Fi/NAT behavior against the source 120-registration/minute limit, without spoofing IP headers or silently disabling security. No 429 was observed here.
- **P1:** Review the source 500-document rank/stat window before adding 500 players to an existing event. This is a code finding, not a measured provider capacity limit.
- **P2:** Monitor cache HIT/MISS/BYPASS during game mutations. The header hit ratio excludes responses without a cache header, including 931 blocked leaderboard responses in the 250-stage run.

No application runtime, UI, game rules, security limits, schema, score formula or production settings were changed by this task. Existing uncommitted changes from the earlier performance task remain.

### Cleanup evidence

| Run | Planned registrations | Attempts deleted | Participants deleted | Skipped | Unresolved |
| --- | ---: | ---: | ---: | ---: | ---: |
| production-10-cleanup.json | 10 | 10 | 10 | 0 | 0 |
| production-100-cleanup.json | 100 | 100 | 100 | 0 | 0 |
| production-250-cleanup.json | 26 | 0 | 0 | 0 | 0 |
| production-50-cleanup.json | 50 | 50 | 50 | 0 | 0 |
| production-duplicates-cleanup.json | 1 | 1 | 1 | 0 | 0 |
| production-smoke-cleanup.json | 2 | 2 | 2 | 0 | 0 |

Final public aggregate verification: 10 participants, 10 attempts; baseline 10/10. Remaining load-test ledger counts: {"skipped":0,"unresolved":0}. This aggregate equality plus exact test-ID cleanup is not a dump of real users' private data.

## 13. Final verdict

**500-player capacity is UNVERIFIED.** The measured cohorts and failure gate above determine the conclusion. The edge challenge prevented a valid 250/500-player backend-capacity test; real-browser and distributed-IP capacity are untested. Do not extrapolate local fixture tests or HTTP 200 averages into a 500-player production pass. Raw k6 summaries, point streams, ledgers and cleanup reports are saved in `load-tests/results`; the suite and operational instructions are in `load-tests/README.md`.

Method references: [Grafana k6 summaries](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/) and [ramping VUs](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/).
