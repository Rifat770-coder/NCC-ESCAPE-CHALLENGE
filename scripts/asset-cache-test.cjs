const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function main() {
  const port = 3119;
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', String(port)], { stdio: 'pipe' });
  let output = '';
  server.stdout.on('data', (data) => { output += data; });
  server.stderr.on('data', (data) => { output += data; });
  try {
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw Error(output);
      try { ready = (await fetch(base)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, output);
    const files = fs.readdirSync('.next/static/media');
    for (const original of ['NCC NEW Version Logo', 'ncc-result-template']) {
      const file = files.find((name) => name.startsWith(`${original}.`) && name.endsWith('.png'));
      assert.ok(file);
      const url = `${base}/_next/static/media/${encodeURIComponent(file)}`;
      const response = await fetch(url);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /max-age=31536000/);
      assert.match(response.headers.get('cache-control'), /immutable/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join('public', `${original}.png`)));
      const conditionalStatus = await new Promise((resolve, reject) => {
        require('node:http').get(url, { headers: { 'If-None-Match': response.headers.get('etag') } }, (result) => {
          result.resume(); resolve(result.statusCode);
        }).on('error', reject);
      });
      assert.equal(conditionalStatus, 304);
      console.log(`${file}: immutable one-year cache, unchanged bytes, conditional 304 verified`);
    }
  } finally {
    server.kill();
    await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
