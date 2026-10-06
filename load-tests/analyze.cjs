const fs = require('node:fs');
const readline = require('node:readline');
const percentile = (a, p) => { if (!a.length) return null; const i = (a.length - 1) * p, lo = Math.floor(i); return a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo); };
function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, avg: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null,
    min: sorted[0] ?? null, median: percentile(sorted, .5), p90: percentile(sorted, .9), p95: percentile(sorted, .95), p99: percentile(sorted, .99), max: sorted.at(-1) ?? null };
}
async function main() {
  const label = process.argv[2]; if (!/^[a-z0-9-]+$/i.test(label || '')) throw Error('Provide a stage label');
  const root = 'load-tests/results/' + label;
  const summary = JSON.parse(fs.readFileSync(root + '-summary.json', 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(root + '-metadata.json', 'utf8'));
  const durations = [], endpoints = {}, statuses = {}, caches = {}, buckets = {}, timeline = {};
  let errors = 0, timeouts = 0, networkErrors = 0, missingRanks = 0;
  let firstTime = Infinity, lastTime = -Infinity, peakVUs = 0;
  const lines = readline.createInterface({ input: fs.createReadStream(root + '.jsonl'), crlfDelay: Infinity });
  for await (const line of lines) {
    const point = JSON.parse(line); if (point.type !== 'Point') continue;
    const { value, tags, time } = point.data;
    const t = new Date(time).getTime(); firstTime = Math.min(firstTime, t); lastTime = Math.max(lastTime, t);
    const operation = tags?.operation || tags?.name;
    const endpoint = operation ? (endpoints[operation] ||= { durations: [], semanticFailures: 0, httpFailures: 0, statuses: {} }) : null;
    if (point.metric === 'http_req_duration') {
      durations.push(value); if (endpoint) { endpoint.durations.push(value); const status = String(tags.status); endpoint.statuses[status] = (endpoint.statuses[status] || 0) + 1; if (Number(status) === 0 || Number(status) >= 400) endpoint.httpFailures++; }
      const second = Math.floor(t / 1000); buckets[second] = (buckets[second] || 0) + 1;
      const minute = Math.floor(t / 60000); (timeline[minute] ||= []).push(value);
    }
    if (point.metric === 'semantic_failed' && value) { errors++; if (endpoint) endpoint.semanticFailures++; }
    if (point.metric === 'response_status') statuses[tags.code] = (statuses[tags.code] || 0) + value;
    if (point.metric === 'leaderboard_cache') caches[tags.state] = (caches[tags.state] || 0) + value;
    if (point.metric === 'request_timeouts') timeouts += value;
    if (point.metric === 'network_errors') networkErrors += value;
    if (point.metric === 'missing_result_rank') missingRanks += value;
    if (point.metric === 'vus') peakVUs = Math.max(peakVUs, value);
  }
  const metrics = summary.metrics;
  const thresholds = Object.entries(metrics).flatMap(([metric, data]) => Object.entries(data.thresholds || {}).map(([expression, state]) => ({ metric, expression, passed: state.ok })));
  const httpFailureRate = metrics.http_req_failed?.values.rate || 0;
  const semanticFailureRate = metrics.semantic_failed?.values.rate || 0;
  const journeyFailureRate = metrics.journey_failed?.values.rate || 0;
  const result = httpFailureRate >= .01 || semanticFailureRate >= .01 || journeyFailureRate >= .01 ? 'FAIL' : thresholds.some((t) => !t.passed) ? 'WARNING' : 'PASS';
  const out = { ...metadata, result, thresholds, durationSeconds: summary.state.testRunDurationMs / 1000,
    peakVUs, requests: metrics.http_reqs?.values.count || 0, requestsPerSecond: metrics.http_reqs?.values.rate || 0,
    peakRequestsPerSecond: Math.max(0, ...Object.values(buckets)), latency: distribution(durations), apiLatency: metrics.api_latency?.values,
    httpFailureRate, semanticFailureRate, journeyFailureRate, semanticFailures: errors,
    successfulRequests: (metrics.http_reqs?.values.count || 0) - Object.entries(statuses).filter(([s]) => +s >= 400 || +s === 0).reduce((a, [, n]) => a + n, 0),
    statuses, timeouts, networkErrors, missingRanks, redisCache: caches,
    journeysStarted: metrics.journeys_started?.values.count || 0, journeysCompleted: metrics.journeys_completed?.values.count || 0,
    dataReceived: metrics.data_received?.values.count || 0, dataSent: metrics.data_sent?.values.count || 0,
    endpoints: Object.fromEntries(Object.entries(endpoints).filter(([, e]) => e.durations.length).map(([name, e]) => [name, { ...distribution(e.durations), semanticFailures: e.semanticFailures, semanticFailureRate: e.semanticFailures / e.durations.length, httpFailures: e.httpFailures, statuses: e.statuses }])),
    latencyByMinute: Object.entries(timeline).map(([minute, values]) => ({ utcMinute: new Date(Number(minute) * 60000).toISOString(), ...distribution(values) })),
  };
  fs.writeFileSync(root + '-analysis.json', JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ label, result, peakVUs, requests: out.requests, requestsPerSecond: out.requestsPerSecond, latency: out.latency, httpFailureRate, semanticFailureRate, journeyFailureRate, missingRanks, statuses, redisCache: caches }));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
