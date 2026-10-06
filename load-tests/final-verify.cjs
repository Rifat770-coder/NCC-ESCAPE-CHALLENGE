const fs = require('node:fs');
async function main() {
  const target = 'https://ncc-escape-challenge.vercel.app';
  const response = await fetch(target + '/api/leaderboard', { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('Final public verification failed');
  const body = await response.json();
  const root = 'load-tests/results/';
  const files = fs.readdirSync(root).filter((f) => f.startsWith('production-') && f.endsWith('-cleanup.json'));
  const remainingTestCounts = { skipped: 0, unresolved: 0 };
  for (const file of files) { const c = JSON.parse(fs.readFileSync(root + file)); remainingTestCounts.skipped += c.skipped.length; remainingTestCounts.unresolved += c.unresolved.length; }
  const out = { target, verifiedAt: new Date().toISOString(), status: response.status, stats: body.stats,
    cache: response.headers.get('x-ncc-cache'), loadNamesOnPublicBoard: body.entries.filter((e) => e.participantName.startsWith('LOAD_TEST_')).length, remainingTestCounts };
  fs.writeFileSync(root + 'production-final-verification.json', JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
