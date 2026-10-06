const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

// Use the actual Next dev server and Appwrite SDK with a loopback-only
// Appwrite REST fixture. This never loads or writes to the user's database.
const db = new Map();
function collection(id) {
  if (!db.has(id)) db.set(id, new Map());
  return db.get(id);
}
collection("gameSettings").set("singleton", {
  $id: "singleton", gameActive: true, durationSeconds: 120, startingLives: 3,
  retryAllowed: false, maximumAttempts: 1, leaderboardEnabled: true, prizeMode: true,
});
const backend = http.createServer(async (req, res) => {
  try {
    assert.equal(req.headers["x-appwrite-key"], "local-fixture-key");
    const url = new URL(req.url, "http://localhost");
    const match = url.pathname.match(/\/collections\/([^/]+)\/documents(?:\/([^/]+))?$/);
    if (!match) { res.writeHead(404).end(); return; }
    const store = collection(match[1]); const id = match[2];
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    let result;
    if (req.method === "POST") {
      result = { ...body.data, $id: body.documentId }; store.set(result.$id, result);
    } else if (req.method === "PATCH") {
      result = { ...store.get(id), ...body.data, $id: id }; store.set(id, result);
    } else if (req.method === "DELETE") {
      store.delete(id); res.writeHead(204).end(); return;
    } else if (id) {
      result = store.get(id);
      if (!result) { res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "Not found", code: 404 })); return; }
    } else {
      let documents = [...store.values()];
      for (const [name, value] of url.searchParams) {
        if (!name.startsWith("queries")) continue;
        const query = JSON.parse(value);
        if (query.method === "equal") documents = documents.filter((doc) => query.values.includes(doc[query.attribute]));
      }
      result = { total: documents.length, documents };
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "Local fixture error", code: 500 }));
  }
});

async function main() {
  backend.listen(0, "127.0.0.1"); await once(backend, "listening");
  const port = Number(process.env.REDIS_TEST_PORT || 3107);
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    NEXT_PUBLIC_APPWRITE_ENDPOINT: `http://127.0.0.1:${backend.address().port}/v1`,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "redis-local-fixture",
    APPWRITE_DATABASE_ID: "redis-local-fixture",
    APPWRITE_API_KEY: "local-fixture-key",
    APPWRITE_COLLECTION_PARTICIPANTS: "participants",
    APPWRITE_COLLECTION_ATTEMPTS: "gameAttempts",
    APPWRITE_COLLECTION_SETTINGS: "gameSettings",
    ADMIN_PASSWORDS: "local-redis-test",
    UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "",
    KV_REST_API_URL: "", KV_REST_API_TOKEN: "",
  };
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", String(port)], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error("Next dev startup timed out")), 30_000);
      const check = setInterval(() => {
        if (output.includes("Ready in")) { clearTimeout(timeout); clearInterval(check); resolve(); }
        else if (child.exitCode !== null) { clearTimeout(timeout); clearInterval(check); reject(Error("Next dev startup failed")); }
      }, 100);
      timeout.unref();
    });
    async function api(route, body, cookie) {
      const res = await fetch(base + route, { method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined });
      return { res, json: await res.json() };
    }
    for (const route of ["/", "/leaderboard", "/admin"]) assert.equal((await fetch(base + route)).status, 200);
    assert.equal((await api("/api/admin/redis-health")).res.status, 401);
    const reg = await api("/api/register", { name: "Local Redis QA", studentId: "LOCAL-REDIS-001", department: "CSE", batch: "24" });
    assert.equal(reg.res.status, 200); assert.equal(reg.json.ok, true);
    const id = reg.json.attempt.id;
    const started = await api("/api/attempt/start", { attemptId: id });
    assert.equal(started.res.status, 200); assert.equal(started.json.attempt.status, "ACTIVE");
    const plan = started.json.plan;
    const payloads = [{ bugsCaught: 5 }, { pairsMatched: 3 },
      { matches: Object.fromEntries(plan.level3.techPairs.map((p) => [p.left, p.right])) },
      { hit: plan.level4.targetColor }];
    for (let i = 0; i < 4; i++) {
      const result = await api("/api/attempt/submit", { attemptId: id, level: i + 1, payload: payloads[i] });
      assert.equal(result.res.status, 200); assert.equal(result.json.passed, true);
      if (i === 3) assert.equal(result.json.attempt.status, "COMPLETED");
    }
    const board = await api("/api/leaderboard");
    assert.equal(board.res.headers.get("X-NCC-Cache"), "BYPASS"); assert.equal(board.json.entries.length, 1);
    const login = await api("/api/admin/login", { password: "local-redis-test" }); assert.equal(login.res.status, 200);
    const cookie = login.res.headers.get("set-cookie").split(";")[0];
    assert.deepEqual((await api("/api/admin/redis-health", undefined, cookie)).json, { ok: false, redis: "disabled" });
    assert.equal((await api("/api/admin/settings", { durationSeconds: 75 }, cookie)).json.settings.durationSeconds, 75);
    assert.equal((await api("/api/settings")).json.settings.durationSeconds, 75);
    assert.equal((await api("/api/admin/stats", undefined, cookie)).json.participants.length, 1);
    for (const route of [`/play/${id}`, `/result/${id}`, "/admin/dashboard"]) assert.equal((await fetch(base + route)).status, 200);
    assert.equal(collection("participants").size, 1);
    assert.equal(collection("gameAttempts").get(id).status, "COMPLETED");
    console.log("Local HTTP checks passed: all screens, registration, four-level mission, Appwrite SDK CRUD, leaderboard fallback, admin auth/stats/settings, and protected health check.");
    console.log("All data stayed in the loopback Appwrite fixture; no live database was touched.");
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, "exit");
    backend.closeAllConnections(); await new Promise((resolve) => backend.close(resolve));
  }
}
main().catch((error) => {
  console.error(error.message);
  backend.closeAllConnections(); backend.close();
  process.exitCode = 1;
});
