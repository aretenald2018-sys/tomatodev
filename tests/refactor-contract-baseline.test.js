import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateWorkoutSessions,
  getWorkoutSessions,
  normalizeWorkoutSession,
  upsertWorkoutSession,
} from '../workout/sessions.js';
import { normalizeWearWorkoutPayload } from '../workout/wear-bridge.js';
import { normalizeFromLocalDB, serializeForStorage } from '../data/nutrition-normalize.js';
import {
  WORKOUT_DAY_CONTRACT_FIXTURE,
  WEAR_RUN_CONTRACT_FIXTURE,
  LEGACY_NUTRITION_CONTRACT_FIXTURE,
} from './fixtures/refactor-contract-fixtures.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('workout session aggregation preserves workout, running route, and diet ownership', () => {
  const day = clone(WORKOUT_DAY_CONTRACT_FIXTURE);
  const sessions = getWorkoutSessions(day);
  const aggregate = aggregateWorkoutSessions(sessions);
  const merged = { ...day, ...aggregate };

  assert.equal(aggregate.exercises[0].exerciseId, 'bench-press');
  assert.equal(aggregate.runDistance, 1.25);
  assert.deepEqual(aggregate.runRoute, day.workoutSessions[1].runRoute);
  assert.equal(merged.breakfast, day.breakfast);
  assert.deepEqual(merged.bFoods, day.bFoods);
  assert.equal(merged.bPhoto, day.bPhoto);
  assert.equal(merged.workoutPhoto, day.workoutPhoto);
});

test('workout session upsert changes only the selected session and rebuilds the aggregate', () => {
  const day = clone(WORKOUT_DAY_CONTRACT_FIXTURE);
  const beforeFirst = clone(day.workoutSessions[0]);
  const result = upsertWorkoutSession(day, {
    ...day.workoutSessions[1],
    runDistance: 1.5,
  }, 1, { now: 1_783_402_000_000 });

  assert.deepEqual(result.workoutSessions[0], normalizeWorkoutSession(beforeFirst, 0));
  assert.equal(result.workoutSessions[1].runDistance, 1.5);
  assert.equal(result.aggregate.runDistance, 1.5);
  assert.equal(day.breakfast, WORKOUT_DAY_CONTRACT_FIXTURE.breakfast);
});

test('Wear payload normalization is lossless for ordered route points and core metrics', () => {
  const input = clone(WEAR_RUN_CONTRACT_FIXTURE);
  const normalized = normalizeWearWorkoutPayload(input);

  assert.equal(normalized.dateKey, input.dateKey);
  assert.equal(normalized.durationSec, input.durationSec);
  assert.equal(normalized.distanceKm, input.distanceKm);
  assert.equal(normalized.calories, input.calories);
  assert.deepEqual(
    normalized.route.map(({ ts, lat, lng, segmentId }) => ({ timestampMs: ts, lat, lng, segmentId })),
    input.route.map(({ timestampMs, lat, lng, segmentId }) => ({ timestampMs, lat, lng, segmentId })),
  );
  assert.deepEqual(normalized.samples10s, input.samples10s);
});

test('legacy nutrition normalizes to canonical and serializes with legacy compatibility', () => {
  const legacy = clone(LEGACY_NUTRITION_CONTRACT_FIXTURE);
  const canonical = normalizeFromLocalDB(legacy);
  const stored = serializeForStorage(canonical, canonical._legacy);

  assert.equal(canonical.base.type, 'per_100g');
  assert.equal(canonical.nutrition.kcal, 165);
  assert.equal(stored.servingSize, legacy.servingSize);
  assert.equal(stored.servingUnit, 'g');
  assert.equal(stored.base.type, 'per_100g');
  assert.equal(stored.nutrition.kcal, 165);
  assert.deepEqual(stored.aliases, legacy.aliases);
  assert.equal(stored.source, legacy.source);
});
