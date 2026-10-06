import http from 'k6/http';
import { BASE_URL, MODE, commonOptions, summary } from './config.js';
import { playerJourney } from './journey.js';
export const options = { ...commonOptions, scenarios: { smoke: { executor: 'constant-vus', vus: 2, duration: '35s', gracefulStop: '60s' } } };
export function setup() {
  // The owner permits production admin credentials ONLY for cleanup.
  // Public players do not authenticate; never log in as admin during load.
  if (MODE !== 'local-fixture') return;
  // One operator login, not one admin login per player. Player registration
  // doesn't use authentication. Only explicitly supplied fixture/test password.
  if (!__ENV.TEST_PASSWORD) throw new Error('Smoke requires a dedicated TEST_PASSWORD');
  const r = http.post(BASE_URL + '/api/admin/login', JSON.stringify({ password: __ENV.TEST_PASSWORD }), { headers: { 'Content-Type': 'application/json' } });
  if (r.status !== 200 || !r.json().ok) throw new Error('Test admin login failed');
  const stats = http.get(BASE_URL + '/api/admin/stats');
  if (stats.status !== 200 || !stats.json().ok) throw new Error('Test admin stats failed');
  if (http.post(BASE_URL + '/api/admin/logout').status !== 200) throw new Error('Test logout failed');
}
export default playerJourney;
export const handleSummary = summary;
