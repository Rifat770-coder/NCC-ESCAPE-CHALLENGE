const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function sharedReader(fetch) {
  const source = fs.readFileSync(path.resolve(__dirname, "../lib/client/shared-read.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, fetch, Map };
  vm.runInNewContext(compiled, context);
  return context.exports.fetchSharedJSON;
}

test("overlapping reads share a single fetch through slow JSON parsing", async () => {
  let requests = 0; let finish;
  const body = new Promise((resolve) => { finish = resolve; });
  const read = sharedReader(async (_url, options) => {
    requests++; assert.equal(options.cache, "no-store"); assert.equal(options.method, undefined);
    return { json: () => body };
  });
  const pending = Array.from({ length: 100 }, () => read("/api/leaderboard"));
  await Promise.resolve();
  pending.push(read("/api/leaderboard"));
  assert.equal(requests, 1);
  finish({ ok: true });
  assert.ok((await Promise.all(pending)).every((result) => result.ok));
  await read("/api/leaderboard"); assert.equal(requests, 2);
});

test("different resources and attempt IDs never share responses", async () => {
  let requests = 0;
  const read = sharedReader(async (url) => { requests++; return { json: async () => ({ url }) }; });
  const results = await Promise.all([read("/api/settings"), read("/api/leaderboard"), read("/api/attempt?id=one"), read("/api/attempt?id=two")]);
  assert.equal(requests, 4); assert.equal(results[2].url, "/api/attempt?id=one"); assert.equal(results[3].url, "/api/attempt?id=two");
});

test("network/JSON failures clear the pending entry without retries or stale results", async () => {
  let requests = 0;
  const read = sharedReader(async () => {
    requests++;
    if (requests === 1) throw Error("offline");
    if (requests === 2) return { json: async () => { throw Error("invalid JSON"); } };
    return { json: async () => ({ ok: true }) };
  });
  await assert.rejects(read("/api/settings"), /offline/);
  await assert.rejects(read("/api/settings"), /invalid JSON/);
  assert.equal((await read("/api/settings")).ok, true); assert.equal(requests, 3);
});

test("ordinary error JSON keeps its existing API behavior", async () => {
  const read = sharedReader(async () => ({ ok: false, status: 404, json: async () => ({ error: "NOT_FOUND" }) }));
  assert.equal((await read("/api/attempt?id=missing")).error, "NOT_FOUND");
});

test("no worker/offline persistence is installed for competition data", () => {
  const helper = fs.readFileSync(path.resolve(__dirname, "../lib/client/shared-read.ts"), "utf8");
  assert.doesNotMatch(helper, /localStorage|indexedDB|caches\.|serviceWorker|method:\s*["']POST/);
  const play = fs.readFileSync(path.resolve(__dirname, "../app/play/[id]/page.tsx"), "utf8");
  assert.doesNotMatch(play, /fetchSharedJSON|localStorage|indexedDB|caches\./);
});
