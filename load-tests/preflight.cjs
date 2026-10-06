const fs = require('node:fs');
async function main() {
  const base = 'https://ncc-escape-challenge.vercel.app';
  fs.mkdirSync('load-tests/results', { recursive: true });
  const out = { target: base, measuredAt: new Date().toISOString(), endpoints: [] };
  for (const path of ['/', '/api/settings', '/api/leaderboard']) {
    const start = performance.now();
    const response = await fetch(base + path, { signal: AbortSignal.timeout(15000), redirect: 'manual' });
    const text = await response.text();
    const item = { path, status: response.status, durationMs: performance.now() - start, bytes: Buffer.byteLength(text),
      cacheControl: response.headers.get('cache-control'), vercelCache: response.headers.get('x-vercel-cache'), redisCache: response.headers.get('x-ncc-cache'), vercelId: response.headers.get('x-vercel-id') };
    if (response.status !== 200) throw Error('Target preflight failed: ' + path);
    if (path === '/') {
      if (!text.includes('NCC')) throw Error('Unexpected target product');
      const assets = [...new Set([...text.matchAll(/(?:src|href)="([^"<>]*\/_next\/[^"<>]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&')))];
      if (assets.some((a) => /^https?:/.test(a) && !a.startsWith(base))) throw Error('Cross-origin asset target refused');
      fs.writeFileSync('load-tests/assets.json', JSON.stringify(assets, null, 2));
      item.assets = assets;
    } else {
      const value = JSON.parse(text); if (!value.ok) throw Error('Unexpected API response');
      if (path.endsWith('settings')) { out.settings = value.settings; if (!value.settings.gameActive) throw Error('Game is paused; do not change settings for test'); }
      else out.baselineStats = value.stats; // Aggregate only; no real names/IDs saved.
    }
    out.endpoints.push(item);
  }
  fs.writeFileSync('load-tests/results/production-preflight.json', JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
