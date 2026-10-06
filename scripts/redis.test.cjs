const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { NextRequest } = require("next/server");

// Execute the actual server modules with isolated dependencies. No .env load,
// external requests, production writes, or test switches in application code.
function fixture({ realRedis = false } = {}) {
  const root = path.resolve(__dirname, "..");
  const modules = new Map();
  const records = new Map();
  const documents = new Map();
  const state = { clock: Date.now(), fail: false, databaseFail: false, configured: true,
    admin: false, reads: 0, writes: 0, invalidations: 0, constructions: 0, config: null };
  const get = (key) => {
    const entry = records.get(key);
    if (!entry || entry.expires <= state.clock) { records.delete(key); return null; }
    return entry.value;
  };
  const set = (key, value, seconds) => records.set(key, { value, expires: state.clock + seconds * 1000 });
  class FakeRedis {
    constructor(config) { state.constructions++; state.config = config; }
    async mget(...keys) {
      if (state.fail) throw Error("SECRET_URL SECRET_TOKEN");
      return keys.map(get);
    }
    async ping() { if (state.fail) throw Error("SECRET_TOKEN"); return "PONG"; }
    async eval(script, keys, args) {
      if (state.fail) throw Error("SECRET_URL SECRET_TOKEN");
      if (script.includes("local version")) {
        if ((get(keys[0]) ?? "0") !== args[0]) return 0;
        set(keys[1], JSON.parse(args[1]), Number(args[2])); state.writes++; return 1;
      }
      if (script.includes("INCR")) {
        const count = (get(keys[0]) ?? 0) + 1;
        const expires = records.get(keys[0])?.expires ?? (state.clock + args[0] * 1000);
        records.set(keys[0], { value: count, expires });
        return [count, Math.ceil((expires - state.clock) / 1000)];
      }
      if (script.includes("DEL")) {
        set(keys[0], args[0], 86400); records.delete(keys[1]); state.invalidations++; return 1;
      }
      throw Error("Unexpected script");
    }
  }
  const collection = (id) => {
    if (!documents.has(id)) documents.set(id, new Map());
    return documents.get(id);
  };
  const db = {
    async getDocument(_db, id, docId) {
      if (state.databaseFail) throw Error("database unavailable");
      const value = collection(id).get(docId);
      if (!value) throw Error("not found");
      return structuredClone(value);
    },
    async listDocuments(_db, id, queries = []) {
      state.reads++;
      if (state.databaseFail) throw Error("database unavailable");
      let values = [...collection(id).values()].map((value) => structuredClone(value));
      for (const raw of queries) {
        const q = JSON.parse(raw);
        if (q.method === "equal") values = values.filter((value) => q.values.includes(value[q.attribute]));
      }
      return { documents: values };
    },
    async createDocument(_db, id, docId, value) {
      if (state.databaseFail) throw Error("database unavailable");
      const created = structuredClone({ ...value, $id: docId });
      collection(id).set(docId, created); return structuredClone(created);
    },
    async updateDocument(_db, id, docId, value) {
      if (state.databaseFail) throw Error("database unavailable");
      const updated = { ...collection(id).get(docId), ...structuredClone(value) };
      collection(id).set(docId, updated); return structuredClone(updated);
    },
    async deleteDocument(_db, id, docId) { collection(id).delete(docId); },
  };
  const nodeAppwrite = require("node-appwrite");
  const memoryParticipants = new Map();
  const memoryAttempts = new Map();
  let memorySettings;
  const appwrite = {
    ID: nodeAppwrite.ID, Query: nodeAppwrite.Query,
    isAppwriteConfigured: () => state.configured, getServerDatabases: () => db,
    memory: {
      upsertParticipant: (p) => memoryParticipants.set(p.$id, p),
      upsertAttempt: (a) => memoryAttempts.set(a.$id, a),
      listParticipants: () => [...memoryParticipants.values()],
      listAttempts: () => [...memoryAttempts.values()],
      getParticipant: (id) => memoryParticipants.get(id) ?? null,
      getAttempt: (id) => memoryAttempts.get(id) ?? null,
      findParticipantByStudentId: (id) => [...memoryParticipants.values()].find((p) => p.studentId === id) ?? null,
      getSettings: () => memorySettings ?? load("lib/game/settings.ts").DEFAULT_GAME_SETTINGS,
      setSettings: (s) => { memorySettings = s; },
    },
  };
  const session = {
    isAdmin: () => state.admin, checkAdminCreds: (p) => p === "test-password",
    setAdminCookie: () => { state.admin = true; }, clearAdminCookie: () => { state.admin = false; },
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (modules.has(file)) return modules.get(file).exports;
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = new Module(file);
    module.filename = file; module.paths = Module._nodeModulePaths(path.dirname(file));
    modules.set(file, module);
    module.require = (request) => {
      if (request === "server-only") return {};
      if (request === "@upstash/redis") return realRedis ? require(request) : { Redis: FakeRedis };
      if (request === "@/lib/appwrite/server") return appwrite;
      if (request === "@/lib/security/session") return session;
      if (request.startsWith("@/") || request.startsWith(".")) {
        const target = request.startsWith("@/") ? path.resolve(root, request.slice(2)) : path.resolve(path.dirname(file), request);
        if (fs.existsSync(target + ".ts")) return load(path.relative(root, target + ".ts"));
      }
      return require(request);
    };
    module._compile(compiled, file);
    return module.exports;
  }
  const config = load("lib/appwrite/config.ts").APPWRITE_CONFIG;
  collection(config.collections.settings).set("singleton", load("lib/game/settings.ts").DEFAULT_GAME_SETTINGS);
  return { load, state, records, documents, config };
}

test("Redis integration preserves database/game behavior", async (t) => {
  const names = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN", "VERCEL"];
  const saved = Object.fromEntries(names.map((key) => [key, process.env[key]]));
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fixture-token";
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  process.env.VERCEL = "1";
  t.after(() => { for (const key of names) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key]; });

  await t.test("singleton, per-request timeout, namespaces and optional configuration", () => {
    const h = fixture(); const redis = h.load("lib/redis.ts");
    assert.equal(redis.getRedis(), redis.getRedis()); assert.equal(h.state.constructions, 1);
    assert.notEqual(h.state.config.signal(), h.state.config.signal());
    assert.equal(h.state.config.retry.retries, 0);
    assert.match(redis.redisKey("test"), /:v1:test$/);
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    assert.equal(fixture().load("lib/redis.ts").getRedis(), null);
    process.env.UPSTASH_REDIS_REST_TOKEN = token;
  });

  await t.test("cache MISS, HIT, TTL expiration and invalidation", async () => {
    const h = fixture(); const cache = h.load("lib/cache.ts"); let queries = 0;
    const load = async () => ({ value: { count: ++queries }, cacheable: true });
    assert.equal((await cache.cachedLeaderboard(load, true)).status, "MISS");
    assert.deepEqual((await cache.cachedLeaderboard(load, true)).value, { count: 1 });
    assert.equal(queries, 1);
    h.state.clock += 10_001;
    assert.equal((await cache.cachedLeaderboard(load, true)).status, "MISS");
    await cache.invalidateLeaderboardCache();
    assert.equal((await cache.cachedLeaderboard(load, true)).status, "MISS");
    assert.equal(queries, 3);
  });

  await t.test("real SDK serializes Lua arguments and deserializes cache envelopes", async () => {
    const fetch = global.fetch;
    const commands = [];
    const envelope = { version: "generation-one", value: { ok: true, entries: [] } };
    global.fetch = async (_url, options) => {
      const command = JSON.parse(options.body); commands.push(command);
      assert.ok(options.signal instanceof AbortSignal);
      if (command[0] === "mget") return new Response(JSON.stringify({ result: ["generation-one", JSON.stringify(envelope)] }));
      return new Response(JSON.stringify({ result: 1 }));
    };
    try {
      const h = fixture({ realRedis: true }); const cache = h.load("lib/cache.ts");
      assert.deepEqual(await cache.cachedLeaderboard(async () => { throw Error("should hit"); }, true), { value: envelope.value, status: "HIT" });
      await cache.invalidateLeaderboardCache();
      const command = commands.find((entry) => entry[0] === "eval");
      assert.equal(command[2], 2); assert.match(command[5], /^[0-9a-f-]{36}$/);
    } finally { global.fetch = fetch; }
  });

  await t.test("a query spanning a mutation cannot refill stale cache", async () => {
    const h = fixture(); const cache = h.load("lib/cache.ts");
    let started; const ready = new Promise((resolve) => { started = resolve; });
    let finish; const oldQuery = new Promise((resolve) => { finish = resolve; });
    const pending = cache.cachedLeaderboard(async () => { started(); return oldQuery; }, true);
    await ready; await cache.invalidateLeaderboardCache();
    await cache.cachedLeaderboard(async () => ({ value: "new", cacheable: true }), true);
    finish({ value: "old", cacheable: true }); await pending;
    assert.deepEqual(await cache.cachedLeaderboard(async () => { throw Error("should hit"); }, true), { value: "new", status: "HIT" });
  });

  await t.test("demo/fallback responses bypass cache and database errors propagate", async () => {
    const h = fixture(); const cache = h.load("lib/cache.ts");
    const load = async () => ({ value: "demo", cacheable: false });
    assert.equal((await cache.cachedLeaderboard(load, true)).status, "BYPASS");
    assert.equal((await cache.cachedLeaderboard(load, false)).status, "BYPASS");
    assert.equal(h.state.writes, 0);
    await assert.rejects(cache.cachedLeaderboard(async () => { throw Error("db failed"); }, true), /db failed/);
  });

  await t.test("outage fallback, sanitized logs, circuit breaker and recovery", async () => {
    const h = fixture(); const cache = h.load("lib/cache.ts"); h.state.fail = true;
    const warnings = []; const warn = console.warn; const now = Date.now;
    console.warn = (message) => warnings.push(message);
    try {
      assert.equal((await cache.cachedLeaderboard(async () => ({ value: "database", cacheable: true }), true)).status, "BYPASS");
      await cache.invalidateLeaderboardCache();
      assert.equal(warnings.length, 1); assert.doesNotMatch(warnings.join(""), /SECRET|fixture-token|example.test/);
      h.state.fail = false;
      assert.equal((await cache.cachedLeaderboard(async () => ({ value: "db", cacheable: true }), true)).status, "BYPASS");
      Date.now = () => now() + 16_000;
      assert.equal((await cache.cachedLeaderboard(async () => ({ value: "db", cacheable: true }), true)).status, "MISS");
    } finally { console.warn = warn; Date.now = now; }
  });

  await t.test("distributed limits, separate IPs, expiry, fail-open and proxy trust", async () => {
    const h = fixture(); const { rateLimitRequest } = h.load("lib/security/rate-limit.ts");
    const req = (ip) => new NextRequest("http://localhost/api/admin/login", { headers: { "x-vercel-forwarded-for": ip } });
    await Promise.all(Array.from({ length: 30 }, () => rateLimitRequest(req("192.0.2.1"), "login")));
    const denied = await rateLimitRequest(req("192.0.2.1"), "login");
    assert.equal(denied.status, 429); assert.equal(denied.headers.get("Retry-After"), "60");
    assert.equal(await rateLimitRequest(req("192.0.2.2"), "login"), null);
    assert.equal(await rateLimitRequest(req("192.0.2.1"), "registration"), null);
    await Promise.all(Array.from({ length: 119 }, () => rateLimitRequest(req("192.0.2.1"), "registration")));
    assert.equal((await rateLimitRequest(req("192.0.2.1"), "registration")).status, 429);
    assert.ok([...h.records.keys()].every((key) => !key.includes("192.0.2")));
    h.state.clock += 60_001;
    assert.equal(await rateLimitRequest(req("192.0.2.1"), "login"), null);
    delete process.env.VERCEL;
    assert.equal(await rateLimitRequest(req("192.0.2.1"), "login"), null);
    process.env.VERCEL = "1";
    h.state.fail = true;
    const warn = console.warn; console.warn = () => {};
    try { assert.equal(await rateLimitRequest(req("192.0.2.1"), "login"), null); }
    finally { console.warn = warn; }
  });

  await t.test("current four-level mission and all leaderboard mutation hooks", async () => {
    const h = fixture(); const service = h.load("lib/game/attempt-service.ts");
    const leaderboard = h.load("app/api/leaderboard/route.ts");
    const register = h.load("app/api/register/route.ts");
    const request = (body) => new NextRequest("http://localhost/api/register", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    const first = await leaderboard.GET(); assert.equal(first.headers.get("X-NCC-Cache"), "MISS");
    const reads = h.state.reads; assert.equal((await leaderboard.GET()).headers.get("X-NCC-Cache"), "HIT"); assert.equal(h.state.reads, reads);
    const response = await register.POST(request({ name: "Redis Test", studentId: "REDIS-TEST-001", department: "CSE", batch: "24" }));
    assert.equal(response.status, 200); const registration = await response.json(); assert.equal(registration.ok, true);
    assert.equal((await register.POST(request({ name: "Redis Test", studentId: "REDIS-TEST-001", department: "CSE", batch: "24" }))).status, 409);
    assert.equal((await leaderboard.GET()).headers.get("X-NCC-Cache"), "MISS");
    const id = registration.attempt.id;
    const started = await service.startAttempt(id); assert.equal(started.status, "ACTIVE");
    const plan = service.getAttemptPlan(started.levelSeed);
    const payloads = [{ bugsCaught: 5 }, { pairsMatched: 3 }, { matches: Object.fromEntries(plan.level3.techPairs.map((p) => [p.left, p.right])) }, { hit: plan.level4.targetColor }];
    const submit = h.load("app/api/attempt/submit/route.ts");
    for (let index = 0; index < 4; index++) {
      const result = await submit.POST(request({ attemptId: id, level: index + 1, payload: payloads[index] }));
      assert.equal(result.status, 200); const body = await result.json(); assert.equal(body.passed, true);
      if (index === 3) assert.equal(body.attempt.status, "COMPLETED");
    }
    assert.equal((await (await leaderboard.GET()).json()).entries.length, 1);
    await service.markPrizeClaimed(id, true); assert.equal((await leaderboard.GET()).headers.get("X-NCC-Cache"), "MISS");
    await service.setSettings({ durationSeconds: 75 }); assert.equal((await service.getSettings()).durationSeconds, 75);
    const disqualified = await service.disqualifyAttempt(id); assert.equal(disqualified.status, "DISQUALIFIED");
    assert.equal((await (await leaderboard.GET()).json()).entries.length, 0);
    await service.deleteAttempt(id); assert.equal(await service.getAttempt(id), null);
    const deletion = h.load("app/api/admin/participant/delete/route.ts");
    assert.equal((await deletion.POST(request({ participantId: registration.participant.id }))).status, 401);
    h.state.admin = true;
    const before = h.state.invalidations;
    assert.equal((await deletion.POST(request({ participantId: registration.participant.id }))).status, 200);
    assert.equal(h.state.invalidations, before + 1);
    assert.equal((await service.listParticipants()).length, 0);
  });

  await t.test("protected health check and unchanged auth decisions", async () => {
    const h = fixture(); const health = h.load("app/api/admin/redis-health/route.ts");
    assert.equal((await health.GET()).status, 401);
    const login = h.load("app/api/admin/login/route.ts");
    const req = (password) => new NextRequest("http://localhost/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
    assert.equal((await login.POST(req("wrong"))).status, 401);
    assert.equal((await login.POST(req("test-password"))).status, 200);
    assert.deepEqual(await (await health.GET()).json(), { ok: true, redis: "connected" });
    const warn = console.warn; console.warn = () => {}; h.state.fail = true;
    try { assert.equal((await health.GET()).status, 503); }
    finally { console.warn = warn; }
  });

  await t.test("Appwrite read fallback never populates the shared public cache", async () => {
    const h = fixture(); h.state.databaseFail = true;
    const leaderboard = h.load("app/api/leaderboard/route.ts");
    const result = await leaderboard.GET();
    assert.equal(result.status, 200); assert.equal(result.headers.get("X-NCC-Cache"), "BYPASS");
    assert.equal(h.state.writes, 0);
    h.state.configured = false;
    assert.equal((await leaderboard.GET()).headers.get("X-NCC-Cache"), "BYPASS");
  });
});
