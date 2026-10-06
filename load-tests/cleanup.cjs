// Credentials stay in memory and are used only to remove this run's records.
// No broad prefix deletion, reset, settings changes, prize actions or Redis flush.
const fs = require('node:fs');
const { loadEnvConfig } = require('@next/env');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const ledgerPath = process.argv[2];
  if (!ledgerPath || !fs.existsSync(ledgerPath)) throw Error('Provide the exact stage ledger');
  const entries = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const planned = new Map(entries.map((r) => [r.studentId, r]));
  if (!planned.size) { console.log('No test registrations to clean'); return; }
  const target = process.env.BASE_URL;
  if (!target || (process.env.TEST_MODE === 'authorized-production' && target !== 'https://ncc-escape-challenge.vercel.app')) throw Error('Explicit authorized target required');
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(target);
  if (!local && process.env.TEST_MODE !== 'authorized-production') throw Error('Cleanup mode does not match target');
  let password;
  if (local) password = 'local-load-test';
  else {
    loadEnvConfig(process.cwd());
    password = process.env.ADMIN_PASSWORDS?.split(',').map((v) => v.trim()).find(Boolean);
  }
  if (!password) throw Error('Cleanup admin credential unavailable');
  const login = await fetch(target + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(15000) });
  password = undefined;
  if (!login.ok || !(await login.json()).ok) throw Error('Cleanup login failed (credential not logged)');
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw Error('Cleanup session unavailable');
  async function api(route, body) {
    const res = await fetch(target + route, { method: body ? 'POST' : 'GET',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    let value; try { value = await res.json(); } catch {}
    return { status: res.status, value };
  }
  const report = { target, ledgerPath, planned: planned.size, deletedAttempts: [], deletedParticipants: [], skipped: [], unresolved: [], finishedAt: null };
  try {
    // Catch a participant created before an interrupted/failed registration.
    // Read-only stats are filtered in memory; no existing user data is saved.
    const stats = await api('/api/admin/stats');
    if (stats.status !== 200 || !stats.value?.ok) throw Error('Cleanup ownership verification unavailable');
    const snapshots = new Map(stats.value.participants.map((p) => [p.$id, p]));
    const queue = [...planned.values()];
    async function worker() {
    while (queue.length) {
      const record = queue.shift();
      try {
      if (!record.name?.startsWith(`LOAD_TEST_${record.run}_`) || !record.studentId?.startsWith(`LOAD_TEST_${record.run}_`)) throw Error('Non-test ledger entry refused');
      // A rejected registration (4xx) did not create a participant. Do not
      // adopt an existing record merely because it matches a planned ID.
      if (!record.participantId && record.registrationStatus >= 400 && record.registrationStatus < 500) continue;
      const discovered = stats.value.participants.find((p) => p.studentId === record.studentId && p.name === record.name
        && new Date(p.createdAt).getTime() >= new Date(record.plannedAt).getTime() - 15000);
      const participantId = record.participantId || discovered?.$id;
      if (!participantId) {
        // No registration means no known created records. 5xx/timeouts remain
        // explicitly unresolved because stats are limited to 500 documents.
        if (record.registrationStatus === 0 || record.registrationStatus >= 500 || record.registrationStatus == null) report.unresolved.push({ studentId: record.studentId, reason: 'Cannot exclude partial registration outside stats window' });
        continue;
      }
      const participant = snapshots.get(participantId);
      if (participant && (participant.name !== record.name || participant.studentId !== record.studentId)) throw Error('Participant ownership mismatch; deletion refused');
      const attemptIds = new Set([record.attemptId, ...stats.value.attempts.filter((a) => a.participantId === participantId && a.participantName === record.name).map((a) => a.$id)].filter(Boolean));
      let safe = true;
      for (const id of attemptIds) {
        const view = await api('/api/attempt?id=' + encodeURIComponent(id));
        if (view.status === 404) continue;
        if (view.status !== 200 || !view.value?.ok || view.value.attempt?.participantName !== record.name) { safe = false; report.skipped.push({ attemptId: id, reason: 'Ownership could not be verified' }); continue; }
        const removed = await api('/api/admin/action', { attemptId: id, action: 'delete' });
        const verify = await api('/api/attempt?id=' + encodeURIComponent(id));
        if (removed.status !== 200 || !removed.value?.ok || verify.status !== 404) { safe = false; report.unresolved.push({ attemptId: id, reason: 'Attempt deletion not confirmed' }); }
        else report.deletedAttempts.push(id);
        await delay(50);
      }
      if (!safe) continue;
      // Known IDs were returned to this exact registration. Discovered IDs also
      // require the exact generated student ID/name match above.
      const removed = await api('/api/admin/participant/delete', { participantId });
      if (removed.status !== 200 || !removed.value?.ok || removed.value.demo) report.unresolved.push({ participantId, reason: 'Participant deletion not confirmed' });
      else report.deletedParticipants.push(participantId);
      if (report.deletedParticipants.length && report.deletedParticipants.length % 10 === 0) console.log(JSON.stringify({ cleanupProgress: report.deletedParticipants.length, planned: report.planned }));
      await delay(50);
      } catch {
        report.unresolved.push({ studentId: record.studentId, reason: 'Cleanup verification/request failed; credentials and response data not logged' });
      }
    }
    }
    // Three independent records at most; each record's deletes remain ordered.
    const workers = await Promise.allSettled([worker(), worker(), worker()]);
    if (workers.some((r) => r.status === 'rejected')) report.unresolved.push({ reason: 'Unexpected cleanup worker failure' });
    const after = await api('/api/admin/stats');
    if (after.status !== 200 || !after.value?.ok) throw Error('Cleanup final verification unavailable');
    for (const p of after.value.participants) if (planned.has(p.studentId)) report.unresolved.push({ participantId: p.$id, reason: 'Test participant remains in stats' });
  } finally {
    await api('/api/admin/logout').catch(() => {});
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(ledgerPath.replace('-records.jsonl', '-cleanup.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ planned: report.planned, deletedAttempts: report.deletedAttempts.length, deletedParticipants: report.deletedParticipants.length, skipped: report.skipped.length, unresolved: report.unresolved.length }));
  }
  if (report.skipped.length || report.unresolved.length) process.exitCode = 1;
}
main().catch(() => { console.error('Cleanup failed; details/credentials/real records not logged. Inspect the test-only ledger and cleanup report.'); process.exitCode = 1; });
