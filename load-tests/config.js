// Explicit target acknowledgement is mandatory; never default to a remote URL.
export const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '');
export const MODE = __ENV.TEST_MODE;
if (!BASE_URL || !['local-fixture', 'staging', 'authorized-production'].includes(MODE)) throw new Error('Set BASE_URL and explicit TEST_MODE');
if (MODE === 'local-fixture' && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(BASE_URL)) throw new Error('Fixture tests are loopback-only');
if (MODE !== 'local-fixture' && __ENV.ALLOW_TEST_WRITES !== 'yes') throw new Error('Remote testing requires ALLOW_TEST_WRITES=yes');
if (MODE === 'authorized-production' && BASE_URL !== 'https://ncc-escape-challenge.vercel.app') throw new Error('Only the explicitly authorized production origin is allowed');
export const RUN_ID = __ENV.RUN_ID || Date.now().toString(36);
if (!/^[A-Za-z0-9]{1,8}$/.test(RUN_ID)) throw new Error('RUN_ID must be 1–8 letters/digits to fit the existing Student ID limit');
export const VUS = Number(__ENV.VUS || 10);
export const ENDPOINTS = ['homepage', 'settings', 'register', 'play_page', 'start', 'level1', 'level2', 'level3', 'level4', 'result_page', 'result', 'leaderboard_page', 'leaderboard', 'static_asset'];
export const commonOptions = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  // Stable operation names avoid one time series per attempt ID.
  systemTags: ['status', 'method', 'name', 'scenario', 'error_code', 'expected_response'],
  thresholds: {
    // Stop error-producing traffic promptly; keep latency warnings visible
    // without silently changing targets or disabling security.
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '20s' }],
    semantic_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '20s' }],
    journey_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '20s' }],
    api_latency: ['p(95)<1000', 'p(99)<2000'],
    ...Object.fromEntries(ENDPOINTS.map((name) => [`operation_latency{operation:${name}}`, ['p(99)<2000']])),
  },
};
export function summary(data) {
  return { [__ENV.SUMMARY_PATH || 'load-tests/results/summary.json']: JSON.stringify(data, null, 2) + '\n' };
}
