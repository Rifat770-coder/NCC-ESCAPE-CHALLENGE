import http from 'k6/http';
import { sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, RUN_ID } from './config.js';

export const latency = new Trend('operation_latency', true);
export const apiLatency = new Trend('api_latency', true);
export const semanticFailed = new Rate('semantic_failed');
export const journeyFailed = new Rate('journey_failed');
export const started = new Counter('journeys_started');
export const completed = new Counter('journeys_completed');
export const statuses = new Counter('response_status');
export const cache = new Counter('leaderboard_cache');
export const timeouts = new Counter('request_timeouts');
export const networkErrors = new Counter('network_errors');
export const nullRanks = new Counter('missing_result_rank');

export function request(operation, path, body, validate) {
  const response = http.request(body === undefined ? 'GET' : 'POST', BASE_URL + path,
    body === undefined ? null : JSON.stringify(body), {
      redirects: 0, timeout: '15s', tags: { name: operation, operation },
      headers: { 'Content-Type': 'application/json', ...(__ENV.PREVIEW_BYPASS ? { 'x-vercel-protection-bypass': __ENV.PREVIEW_BYPASS } : {}) },
    });
  latency.add(response.timings.duration, { operation });
  if (path.startsWith('/api/')) apiLatency.add(response.timings.duration, { operation });
  statuses.add(1, { operation, code: String(response.status) });
  if (response.error_code === 1050) timeouts.add(1, { operation });
  else if (!response.status) networkErrors.add(1, { operation, code: String(response.error_code) });
  if (operation === 'leaderboard') cache.add(1, { state: response.headers['X-Ncc-Cache'] || response.headers['X-NCC-Cache'] || 'UNKNOWN' });
  let value;
  try { value = path.startsWith('/api/') ? response.json() : response.body; } catch {}
  const ok = response.status === 200 && (!validate || validate(value));
  semanticFailed.add(!ok, { operation });
  return { ok, value, response };
}
export function think(min, max) { sleep(min + Math.random() * (max - min)); }
export function registerPlayer() {
  const record = { run: RUN_ID, name: `LOAD_TEST_${RUN_ID}_${__VU}`, studentId: `LOAD_TEST_${RUN_ID}_${__VU}_${__ITER}`, plannedAt: new Date().toISOString() };
  if (record.studentId.length > 30) throw new Error('Generated Student ID exceeds existing contract');
  console.log('LOAD_RECORD ' + JSON.stringify(record));
  const registration = request('register', '/api/register', {
    name: record.name, studentId: record.studentId,
    department: 'CSE', batch: '12',
  }, (d) => d?.ok && d.attempt?.id && d.attempt.status === 'READY');
  console.log('LOAD_RECORD ' + JSON.stringify({ ...record, registrationStatus: registration.response.status,
    participantId: registration.value?.participant?.id, attemptId: registration.value?.attempt?.id }));
  return registration;
}
export function startPlayer(id) {
  return request('start', '/api/attempt/start', { attemptId: id }, (d) => d?.ok && d.attempt?.status === 'ACTIVE' && !!d.plan?.level3?.techPairs && !!d.plan?.level4?.targetColor);
}
export function answer(id, level, plan) {
  const payload = level === 1 ? { bugsCaught: 5 } : level === 2 ? { pairsMatched: 3 }
    : level === 3 ? { matches: Object.fromEntries(plan.level3.techPairs.map((p) => [p.left, p.right])), mistakes: 0 }
    : { hit: plan.level4.targetColor, mistakes: 0 };
  return request(`level${level}`, '/api/attempt/submit', { attemptId: id, level, payload },
    (d) => d?.ok && d.passed && d.attempt?.currentLevel === (level === 4 ? 4 : level + 1) && d.attempt.status === (level === 4 ? 'COMPLETED' : 'ACTIVE'));
}
export function result(id) {
  return request('result', `/api/attempt?id=${id}`, undefined, (d) => {
    if (d?.ok && d.attempt?.status === 'COMPLETED' && d.attempt.rank == null) nullRanks.add(1);
    return d?.ok && d.attempt?.status === 'COMPLETED' && d.attempt.rank > 0 && d.attempt.completionTimeMs >= 0;
  });
}
export function board() {
  return request('leaderboard', '/api/leaderboard', undefined, (d) => d?.ok && Array.isArray(d.entries)
    && new Set(d.entries.map((e) => e.$id)).size === d.entries.length);
}

// Four levels run locally between submissions. No fake level-loading, timer
// polling, player login, client-authoritative score or invented endpoint.
export function playerJourney() {
  // A real event player registers once. Later iterations model viewing the
  // leaderboard, avoiding an endless stream of permanent registrations.
  if (__ITER > 0) { board(); sleep(5); return; }
  started.add(1);
  let failed = false;
  const stop = () => { journeyFailed.add(true); };
  if (!request('homepage', '/', undefined, (s) => s?.includes('NCC')).ok) return stop();
  if (!request('settings', '/api/settings', undefined, (d) => d?.ok && d.settings.durationSeconds > 0).ok) return stop();
  if (!board().ok) return stop(); // Home fastest-time card.
  think(1, 3);
  const reg = registerPlayer(); if (!reg.ok) return stop();
  const id = reg.value.attempt.id;
  if (!request('play_page', `/play/${id}`, undefined).ok) return stop();
  const start = startPlayer(id); if (!start.ok) return stop();
  const plan = start.value.plan;
  for (const [level, min, max] of [[1, 5, 9], [2, 9, 15], [3, 6, 12], [4, 4, 7]]) {
    think(min, max);
    if (!answer(id, level, plan).ok) return stop();
  }
  if (!request('result_page', `/result/${id}`, undefined).ok) failed = true;
  if (!result(id).ok) failed = true;
  if (!request('leaderboard_page', '/leaderboard', undefined).ok) failed = true;
  // Existing leaderboard refreshes every five seconds while viewed.
  for (let i = 0; i < 3; i++) { if (!board().ok) failed = true; if (i < 2) sleep(5); }
  journeyFailed.add(failed); if (!failed) completed.add(1);
}
