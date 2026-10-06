// Isolated production-build smoke environment, never a provider capacity test.
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const collections = new Map();
const col = (name) => { if (!collections.has(name)) collections.set(name, new Map()); return collections.get(name); };
col('gameSettings').set('singleton', { $id: 'singleton', gameActive: true, durationSeconds: 120, startingLives: 3, retryAllowed: false, maximumAttempts: 1, leaderboardEnabled: true, prizeMode: true });
let requests = 0;
const backend = http.createServer(async (req, res) => {
  try {
    if (req.url === '/fixture-stats') { res.end(JSON.stringify({ requests, participants: col('participants').size, attempts: col('gameAttempts').size })); return; }
    if (req.headers['x-appwrite-key'] !== 'local-fixture-key') { res.writeHead(403).end(); return; }
    requests++;
    const url = new URL(req.url, 'http://127.0.0.1');
    const match = url.pathname.match(/\/collections\/([^/]+)\/documents(?:\/([^/]+))?$/);
    if (!match) { res.writeHead(404).end(); return; }
    const store = col(match[1]), id = match[2];
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {}; let value;
    if (req.method === 'POST') { value = { ...body.data, $id: body.documentId }; if (store.has(value.$id)) { res.writeHead(409).end(); return; } store.set(value.$id, value); }
    else if (req.method === 'PATCH') { value = { ...store.get(id), ...body.data, $id: id }; store.set(id, value); }
    else if (req.method === 'DELETE') { store.delete(id); res.writeHead(204).end(); return; }
    else if (id) { value = store.get(id); if (!value) { res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'Not found', code: 404 })); return; } }
    else {
      let documents = [...store.values()], limit = 25;
      for (const [name, encoded] of url.searchParams) {
        if (!name.startsWith('queries')) continue; const query = JSON.parse(encoded);
        if (query.method === 'equal') documents = documents.filter((d) => query.values.includes(d[query.attribute]));
        if (query.method === 'orderDesc') documents.sort((a, b) => String(b[query.attribute]).localeCompare(String(a[query.attribute])));
        if (query.method === 'limit') limit = query.values[0];
      }
      value = { total: documents.length, documents: documents.slice(0, limit) };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
  } catch { res.writeHead(500).end(JSON.stringify({ message: 'Fixture error', code: 500 })); }
});
async function main() {
  backend.listen(4141, '127.0.0.1'); await once(backend, 'listening');
  const env = { ...process.env, NEXT_PUBLIC_APPWRITE_ENDPOINT: 'http://127.0.0.1:4141/v1', NEXT_PUBLIC_APPWRITE_PROJECT_ID: 'load-fixture',
    APPWRITE_DATABASE_ID: 'load-fixture', APPWRITE_API_KEY: 'local-fixture-key', APPWRITE_COLLECTION_PARTICIPANTS: 'participants',
    APPWRITE_COLLECTION_ATTEMPTS: 'gameAttempts', APPWRITE_COLLECTION_SETTINGS: 'gameSettings', ADMIN_PASSWORDS: 'local-load-test',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', NEXT_PUBLIC_BASE_URL: 'http://127.0.0.1:3127',
  };
  const build = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { env, stdio: 'inherit', windowsHide: true });
  const [code] = await once(build, 'exit'); if (code) throw Error('Fixture build failed');
  const manifest = JSON.parse(fs.readFileSync('.next/app-build-manifest.json', 'utf8'));
  fs.writeFileSync('load-tests/assets.json', JSON.stringify(manifest.pages['/page'].map((f) => '/_next/' + f), null, 2));
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3127'], { env, stdio: 'inherit', windowsHide: true });
  process.on('SIGINT', () => { server.kill(); backend.closeAllConnections(); backend.close(); });
  process.on('SIGTERM', () => { server.kill(); backend.closeAllConnections(); backend.close(); });
  console.log('LOCAL_FIXTURE_URL=http://127.0.0.1:3127; fixture only, Redis disabled');
  await once(server, 'exit'); backend.closeAllConnections(); backend.close();
}
main().catch((e) => { console.error(e.message); backend.close(); process.exitCode = 1; });
