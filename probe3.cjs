// Probe the settings doc attributes + recent update history.
const fs = require("fs");
const { Client, Databases } = require("node-appwrite");
const env = {};
fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2];
});
const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const project = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6ac3e7c0001469e247da";
const db = env.APPWRITE_DATABASE_ID;
const settingsColl = env.APPWRITE_COLLECTION_SETTINGS;
const attemptsColl = env.APPWRITE_COLLECTION_ATTEMPTS;
const apiKey = env.APPWRITE_API_KEY;
const c = new Client();
c.setEndpoint(endpoint).setProject(project).setKey(apiKey);
const dbs = new Databases(c);

(async () => {
  const doc = await dbs.getDocument(db, settingsColl, "singleton");
  console.log("=== settings doc ===");
  console.log(JSON.stringify(doc, null, 2));

  console.log("\n=== Recent attempts ordered by $createdAt DESC ===");
  const attempts = await dbs.listDocuments(db, attemptsColl, [], 20);
  // Already ordered desc
  for (const a of attempts.documents) {
    console.log(`  ${a.$createdAt}  dur=${a.durationSeconds}s  durString=${typeof a.durationSeconds}  status=${a.status}  level=${a.currentLevel}/4`);
  }
})().catch(e => console.error("ERR", e.code, e.message));