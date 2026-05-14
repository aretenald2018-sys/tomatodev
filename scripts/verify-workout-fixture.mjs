import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  calcSetVolume,
  calcTrackSessionMetric,
  estimateSet1RM,
  getTrackMetricHistory,
  buildMaxPrescription,
} from '../calc.js';
import {
  buildBenchmarkActuals,
  buildRenderedMaxCycleSnapshot,
  resolveBenchmarkExercise,
  resolveMovementExercises,
} from '../workout/expert/max-cycle-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(
  await readFile(path.join(root, 'tests/fixtures/workout-test-mode-fixture.json'), 'utf8'),
);

function workSets(sets = []) {
  return sets.filter(set => set?.setType !== 'warmup' && set?.done !== false);
}

function formatSet(set) {
  return `${Number(set.kg)}kg×${Number(set.reps)}`;
}

function summarizeLastSession(last) {
  const grouped = new Map();
  for (const set of workSets(last?.sets || [])) {
    if (!(Number(set.kg) > 0 && Number(set.reps) > 0)) continue;
    const label = formatSet(set);
    grouped.set(label, (grouped.get(label) || 0) + 1);
  }
  return [...grouped.entries()].map(([label, count]) => `${label} ${count}세트`).join(' / ');
}

const { cache, cycle, exList, todayKey, currentGymId, expected } = fixture;
const lastEntry = cache['2026-05-06'].exercises[0];
assert.equal(summarizeLastSession({ sets: lastEntry.sets }), expected.lastSummary);

const romSet = { kg: 100, reps: 10, romPct: 80, done: true };
assert.equal(calcSetVolume(romSet), expected.romVolume);
assert.ok(Math.abs(estimateSet1RM({ kg: 100, reps: 5, romPct: 80, done: true }) - expected.romIntensity) < 0.01);

const volumeEntry = cache['2026-05-08'].exercises[0];
assert.equal(calcTrackSessionMetric(volumeEntry, 'M'), expected.trackVolume);

const history = getTrackMetricHistory(cache, exList, 'dev_bench_moon');
assert.equal(history.M.at(-1).value, expected.trackVolume);
assert.ok(history.H.at(-1).value > 120);

const resolved = resolveBenchmarkExercise(cycle.benchmarks[0], exList, { gymId: currentGymId });
assert.equal(resolved.id, 'dev_bench_moon');
const scoped = resolveMovementExercises('barbell_bench', exList, { gymId: currentGymId });
assert.ok(scoped.some(ex => ex.id === 'dev_bench_moon'));
assert.ok(!scoped.some(ex => ex.id === 'dev_bench_other'));

const actuals = buildBenchmarkActuals({
  cache,
  exList,
  benchmark: cycle.benchmarks[0],
  todayKey,
  gymId: currentGymId,
});
assert.ok(actuals.some(point => point.exerciseId === 'dev_bench_moon'));
assert.ok(!actuals.some(point => point.exerciseId === 'dev_bench_other'));

const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache, exList, todayKey });
assert.equal(snapshot.benchmarks[0].exerciseId, 'dev_bench_moon');
assert.ok(snapshot.benchmarks[0].actuals.every(point => point.exerciseId === 'dev_bench_moon'));

const prescription = buildMaxPrescription({
  movement: { id: 'barbell_bench', nameKo: '바벨 벤치프레스', stepKg: 2.5, sizeClass: 'large' },
  exerciseId: 'dev_bench_moon',
  sessionType: 'heavy_volume',
  cache,
  exList,
  todayKey,
});
assert.ok(prescription.startKg > 0);
assert.equal(prescription.lastDateKey, '2026-05-08');

console.log('[workout-fixture] ok');
