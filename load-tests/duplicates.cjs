// One owned test participant only; concurrent requests expose server write
// semantics without double-tapping or modifying any real player's attempt.
const fs = require('node:fs');
const crypto = require('node:crypto');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const target = 'https://ncc-escape-challenge.vercel.app';
  if (process.env.TEST_MODE !== 'authorized-production' || process.env.ALLOW_TEST_WRITES !== 'yes') throw Error('Explicit production test authorization required');
  const run = crypto.randomBytes(4).toString('hex');
  const record = { run, name: 'LOAD_TEST_' + run + '_duplicate', studentId: 'LOAD_TEST_' + run + '_dup', plannedAt: new Date().toISOString() };
  const ledger = 'load-tests/results/production-duplicates-records.jsonl';
  fs.writeFileSync(ledger, JSON.stringify(record) + '\n');
  const outcomes = [];
  async function api(operation, path, body) {
    const before = performance.now();
    const r = await fetch(target + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    const value = await r.json();
    outcomes.push({ operation, status: r.status, durationMs: performance.now() - before, ok: value.ok,
      passed: value.passed, error: value.error, attemptStatus: value.attempt?.status,
      completionTimeMs: value.attempt?.completionTimeMs, completedAt: value.attempt?.completedAt,
      startedAt: value.attempt?.startedAt, rank: value.attempt?.rank });
    return { status: r.status, value };
  }
  const reg = await api('register', '/api/register', { name: record.name, studentId: record.studentId, department: 'CSE', batch: '12' });
  fs.appendFileSync(ledger, JSON.stringify({ ...record, registrationStatus: reg.status, participantId: reg.value.participant?.id, attemptId: reg.value.attempt?.id }) + '\n');
  if (!reg.value.ok) throw Error('Duplicate test registration failed');
  const id = reg.value.attempt.id;
  const starts = await Promise.allSettled([api('concurrent_start_1', '/api/attempt/start', { attemptId: id }), api('concurrent_start_2', '/api/attempt/start', { attemptId: id })]);
  if (starts.some((r) => r.status !== 'fulfilled' || !r.value.value.ok)) throw Error('Concurrent starts failed');
  const plan = starts[0].value.value.plan;
  for (let level = 1; level <= 3; level++) {
    await delay(1500);
    const payload = level === 1 ? { bugsCaught: 5 } : level === 2 ? { pairsMatched: 3 }
      : { matches: Object.fromEntries(plan.level3.techPairs.map((p) => [p.left, p.right])), mistakes: 0 };
    const r = await api('level' + level, '/api/attempt/submit', { attemptId: id, level, payload });
    if (!r.value.passed || r.value.attempt?.status !== 'ACTIVE') throw Error('Duplicate test setup failed');
  }
  await delay(1500);
  const body = { attemptId: id, level: 4, payload: { hit: plan.level4.targetColor, mistakes: 0 } };
  const finals = await Promise.allSettled([api('concurrent_final_1', '/api/attempt/submit', body), api('concurrent_final_2', '/api/attempt/submit', body)]);
  if (finals.some((r) => r.status !== 'fulfilled')) throw Error('Concurrent final transport failed');
  await api('sequential_final_replay', '/api/attempt/submit', body);
  await api('result', '/api/attempt?id=' + encodeURIComponent(id));
  const report = { target, run, outcomes, simultaneousFinalsAccepted: finals.filter((r) => r.value.status === 200).length };
  fs.writeFileSync('load-tests/results/production-duplicates-analysis.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
