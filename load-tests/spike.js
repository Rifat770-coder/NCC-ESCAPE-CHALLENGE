import { commonOptions, summary } from './config.js';
import { playerJourney } from './journey.js';
export const options = { ...commonOptions, scenarios: { start_spike: {
  executor: 'ramping-vus', startVUs: 10, gracefulRampDown: '60s', gracefulStop: '60s',
  stages: [{ duration: '10s', target: 50 }, { duration: '3s', target: 500 }, { duration: '60s', target: 500 }, { duration: '10s', target: 10 }, { duration: '30s', target: 10 }],
} } };
export default playerJourney;
export const handleSummary = summary;
