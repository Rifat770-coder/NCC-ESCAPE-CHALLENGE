import http from 'k6/http';
import { BASE_URL, summary } from './config.js';
export const options = { vus: 1, iterations: 1 };
export default function () {
  const response = http.get(BASE_URL + '/', { redirects: 0, timeout: '15s', tags: { name: 'read_only_probe' } });
  // Only safe diagnostic metadata; never dump challenge tokens or HTML.
  console.log('EDGE_PROBE ' + JSON.stringify({ status: response.status,
    title: response.body?.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1],
    mitigation: response.headers['X-Vercel-Mitigated'], server: response.headers.Server,
    cache: response.headers['X-Vercel-Cache'], contentType: response.headers['Content-Type'],
    securityCheckpoint: response.body?.includes('Vercel Security Checkpoint'), durationMs: response.timings.duration }));
}
export const handleSummary = summary;
