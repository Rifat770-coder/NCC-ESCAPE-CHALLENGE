import { VUS, commonOptions, summary } from './config.js';
import { playerJourney } from './journey.js';
export const options = { ...commonOptions, scenarios: { players: {
  executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '60s', gracefulStop: '60s',
  stages: [{ duration: __ENV.RAMP || '10s', target: VUS }, { duration: __ENV.HOLD || '60s', target: VUS }, { duration: '5s', target: 0 }],
} } };
export default playerJourney;
export const handleSummary = summary;
