import { commonOptions, summary } from './config.js';
import { playerJourney } from './journey.js';
import { sleep } from 'k6';
export const options = { ...commonOptions, scenarios: { event_arrivals: {
  executor: 'per-vu-iterations', vus: 500, iterations: 1, maxDuration: '180s',
} } };
export default function () { // Spread one cohort over the first minute.
  sleep(Math.random() * 60); playerJourney();
}
export const handleSummary = summary;
