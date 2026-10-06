import { sleep } from 'k6';
import { commonOptions, summary } from './config.js';
import { request } from './journey.js';
const assets = JSON.parse(open('./assets.json'));
export const options = { ...commonOptions, scenarios: { static: { executor: 'constant-vus', vus: Number(__ENV.VUS || 10), duration: '30s', gracefulStop: '15s' } }, thresholds: { http_req_failed: ['rate<0.01'], semantic_failed: ['rate<0.01'] } };
export default function () {
  request('homepage', '/', undefined);
  // Explicit file requests. k6 has no browser cache: this is cold asset traffic,
  // not browser rendering or a Vercel CDN benchmark.
  for (const asset of assets) request('static_asset', asset, undefined);
  sleep(5);
}
export const handleSummary = summary;
