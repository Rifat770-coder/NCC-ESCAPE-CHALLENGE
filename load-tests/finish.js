import { sleep } from 'k6';
import { commonOptions, summary } from './config.js';
import { registerPlayer, startPlayer, answer, result, board, journeyFailed, completed } from './journey.js';
export const options = { ...commonOptions, scenarios: { finish_spike: {
  executor: 'per-vu-iterations', vus: 500, iterations: 1, maxDuration: '180s',
} } };
export default function () {
  const reg = registerPlayer(); if (!reg.ok) { journeyFailed.add(true); return; }
  const id = reg.value.attempt.id, start = startPlayer(id);
  if (!start.ok) { journeyFailed.add(true); return; }
  for (let level = 1; level < 4; level++) { sleep(5); if (!answer(id, level, start.value.plan).ok) { journeyFailed.add(true); return; } }
  // Absolute barrier after setup: synchronized final level, score and rank.
  const wait = Number(__ENV.FINISH_AT_MS) - Date.now();
  if (wait <= 0) throw new Error('Finish barrier missed; rerun with sufficient lead time');
  sleep(wait / 1000);
  const ok = answer(id, 4, start.value.plan).ok && result(id).ok && board().ok;
  journeyFailed.add(!ok); if (ok) completed.add(1);
}
export const handleSummary = summary;
