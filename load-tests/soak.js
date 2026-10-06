import { VUS, commonOptions, summary } from './config.js';
import { playerJourney } from './journey.js';
export const options = { ...commonOptions, scenarios: { soak: {
  executor: 'constant-vus', vus: VUS, duration: __ENV.DURATION || '10m', gracefulStop: '60s',
} } };
export default playerJourney;
export const handleSummary = summary;
