/**
 * Local E2E test that drives the live dev server through the full
 * mission. Used by `scripts/e2e.ps1`.
 *
 * Strategy: register, start, then brute-force Level 1 (max 10000 codes
 * per attempt — fast enough). Then for Levels 2/3 we cheat by inspecting
 * the plan via the in-memory store. This is a TEST helper — the actual
 * mission in the browser is what players experience.
 */
import { generateAttemptPlan } from "../lib/game/engine";

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== Full mission E2E ===\n");

  // Use a unique student ID per run
  const sid = "E2E-" + Date.now();

  console.log("1) Register", sid);
  let r = await api("POST", "/api/register", {
    name: "Test Bot",
    studentId: sid,
    department: "Computer Science & Engineering",
    batch: "24",
  });
  if (!r.json?.ok) throw new Error("register failed: " + JSON.stringify(r));
  const attemptId = r.json.attempt.id;
  const plan = generateAttemptPlan(r.json.attempt.levelSeed);
  console.log("   attemptId:", attemptId);
  console.log("   seed:", r.json.attempt.levelSeed);
  console.log("   l1 code (server-side):", plan.level1.accessCode);
  console.log("   l4 master key (server-side):", plan.masterKey);

  console.log("2) Start attempt");
  r = await api("POST", "/api/attempt/start", { attemptId });
  if (!r.json?.ok) throw new Error("start failed");
  console.log("   status:", r.json.attempt.status);

  // Brute-force level 1 (just to demonstrate)
  console.log("3) Submit Level 1 (correct code)");
  r = await api("POST", "/api/attempt/submit", {
    attemptId,
    level: 1,
    payload: { code: plan.level1.accessCode },
  });
  console.log("   passed:", r.json.passed, "msg:", r.json.message, "level:", r.json.attempt.currentLevel);

  console.log("4) Submit Level 2 (correct index)");
  r = await api("POST", "/api/attempt/submit", {
    attemptId,
    level: 2,
    payload: { answer: plan.level2.answer },
  });
  console.log("   passed:", r.json.passed, "msg:", r.json.message, "level:", r.json.attempt.currentLevel);

  console.log("5) Submit Level 3 (correct)");
  const p3 = plan.level3;
  let payload: any = {};
  if (p3.variant === "order") payload = { order: p3.correctOrder };
  if (p3.variant === "match") {
    const m: Record<string, string> = {};
    (p3.pairs || []).forEach((pair) => (m[pair.left] = pair.right));
    payload = { matches: m };
  }
  if (p3.variant === "pick") payload = { answer: p3.answer };
  r = await api("POST", "/api/attempt/submit", { attemptId, level: 3, payload });
  console.log("   passed:", r.json.passed, "msg:", r.json.message, "level:", r.json.attempt.currentLevel);

  console.log("6) Submit Level 4 (correct key)");
  r = await api("POST", "/api/attempt/submit", {
    attemptId,
    level: 4,
    payload: { key: plan.masterKey },
  });
  console.log("   passed:", r.json.passed, "msg:", r.json.message);
  console.log("   status:", r.json.attempt.status, "completionTimeMs:", r.json.attempt.completionTimeMs);
  console.log("   prizeEligible:", r.json.attempt.prizeEligible, "rank:", r.json.attempt.rank);

  console.log("\n7) Probe leaderboard");
  r = await api("GET", "/api/leaderboard");
  console.log("   entries:", r.json?.entries?.length, "fastest:", r.json?.stats?.fastestTimeMs);

  console.log("\n=== DONE ===");
}

main().catch((e) => {
  console.error("E2E failed:", e);
  process.exit(1);
});