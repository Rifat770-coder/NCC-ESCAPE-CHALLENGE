// One stage per invocation. Always inspect output before starting another.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
async function main() {
  const [script = 'smoke', label = script] = process.argv.slice(2);
  if (!/^[a-z0-9-]+$/i.test(label) || !['smoke', 'load', 'event', 'spike', 'finish', 'soak', 'static', 'probe'].includes(script)) throw Error('Invalid stage');
  if (!process.env.BASE_URL || !process.env.TEST_MODE) throw Error('Explicit BASE_URL and TEST_MODE are required');
  fs.mkdirSync('load-tests/results', { recursive: true });
  const run = process.env.RUN_ID || crypto.randomBytes(4).toString('hex');
  const destination = path.resolve('load-tests/results', label);
  const ledger = fs.createWriteStream(destination + '-records.jsonl', { flags: 'a' });
  const logs = fs.createWriteStream(destination + '.log');
  const env = { ...process.env, RUN_ID: run, SUMMARY_PATH: destination + '-summary.json', K6_NO_USAGE_REPORT: 'true' };
  const executable = process.env.K6_PATH || path.join(process.env.TEMP, 'ncc-k6-portable/k6-v2.3.0-windows-amd64/k6.exe');
  fs.writeFileSync(destination + '-metadata.json', JSON.stringify({ label, script, run, target: process.env.BASE_URL, mode: process.env.TEST_MODE,
    vus: process.env.VUS, hold: process.env.HOLD, ramp: process.env.RAMP, startedAt: new Date().toISOString(), generator: { node: process.version, platform: process.platform } }, null, 2));
  const child = spawn(executable, ['run', '--quiet', '--no-color', '--new-machine-readable-summary=false', '--out', 'json=' + destination + '.jsonl', 'load-tests/' + script + '.js'], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let buffer = '';
  function output(chunk) {
    const text = chunk.toString(); logs.write(text); buffer += text;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      const marker = line.indexOf('LOAD_RECORD ');
      if (marker !== -1) {
        // k6 structured logs escape embedded JSON quotes; text logs don't.
        const raw = line.slice(marker + 12);
        const end = raw.lastIndexOf('}');
        try { ledger.write(JSON.stringify(JSON.parse(raw.slice(0, end + 1).replace(/\\"/g, '"'))) + '\n'); } catch { console.error('Could not parse test ledger record; retained raw log for cleanup'); }
      } else if (/error|threshold|WARN/i.test(line)) process.stdout.write(line + '\n');
    }
  }
  child.stdout.on('data', output); child.stderr.on('data', output);
  child.on('error', (e) => console.error(e.message));
  const [code] = await once(child, 'exit');
  ledger.end(); logs.end();
  console.log(JSON.stringify({ label, run, exitCode: code, summary: destination + '-summary.json', ledger: destination + '-records.jsonl' }));
  process.exitCode = code;
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
