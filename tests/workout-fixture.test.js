import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  calcSetVolume,
  calcTrackSessionMetric,
  estimateSet1RM,
  getTrackMetricHistory,
} from '../calc.js';
import {
  buildBenchmarkActuals,
  resolveBenchmarkExercise,
  resolveMovementExercises,
} from '../workout/expert/max-cycle-core.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/workout-test-mode-fixture.json', import.meta.url), 'utf8'));

test('workout fixture · ROM is reflected in volume and intensity track metrics', () => {
  const volumeSet = { kg: 100, reps: 10, romPct: 80, done: true };
  const intensitySet = { kg: 100, reps: 5, romPct: 80, done: true };
  assert.equal(calcSetVolume(volumeSet), fixture.expected.romVolume);
  assert.ok(Math.abs(estimateSet1RM(intensitySet) - fixture.expected.romIntensity) < 0.01);
  const entry = fixture.cache['2026-05-08'].exercises[0];
  assert.equal(calcTrackSessionMetric(entry, 'M'), fixture.expected.trackVolume);
});

test('workout fixture · test mode graph history separates volume and intensity tracks', () => {
  const history = getTrackMetricHistory(fixture.cache, fixture.exList, 'dev_bench_moon');
  assert.equal(history.M.at(-1).value, fixture.expected.trackVolume);
  assert.ok(history.H.at(-1).value > 120);
  assert.equal(history.total, 2);
});

test('workout fixture · benchmark actuals use exact exerciseId and gym scoped resolver', () => {
  const benchmark = fixture.cycle.benchmarks[0];
  const resolved = resolveBenchmarkExercise(benchmark, fixture.exList, { gymId: fixture.currentGymId });
  assert.equal(resolved.id, 'dev_bench_moon');

  const scoped = resolveMovementExercises('barbell_bench', fixture.exList, { gymId: fixture.currentGymId });
  assert.deepEqual(scoped.map(ex => ex.id), ['dev_bench_moon']);

  const actuals = buildBenchmarkActuals({
    cache: fixture.cache,
    exList: fixture.exList,
    benchmark,
    todayKey: fixture.todayKey,
    gymId: fixture.currentGymId,
  });
  assert.ok(actuals.length >= 2);
  assert.ok(actuals.every(point => point.exerciseId === 'dev_bench_moon'));
});
