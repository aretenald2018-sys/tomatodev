import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RUNNING_SESSION_ID,
  WORKOUT_GYM_SESSION_COUNT,
  WORKOUT_RUNNING_SESSION_INDEX,
  isRunningWorkoutSessionIndex,
  runningWorkoutSessionId,
} from '../workout/session-policy.js';
import {
  applyRunningDataToWorkout,
  findRunningSessionIndex,
  hasRunningSessionRecord,
} from '../workout/running-model.js';
import { RunningLiveAccumulator } from '../workout/running-live-accumulator.js';
import {
  clearRunningDraftRecord,
  readRunningDraftRecord,
  writeRunningDraftRecord,
} from '../workout/running-draft-store.js';
import { summarizeRunningRoute } from '../workout/running-session.js';
import { aggregateWorkoutSessions } from '../workout/sessions.js';

function storageHarness() {
  const values = new Map();
  const writes = [];
  return {
    values,
    writes,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { writes.push(key); values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function route(count = 700) {
  return Array.from({ length: count }, (_, index) => ({
    lat: 37.5 + index * 0.0002,
    lng: 127 + index * 0.0001,
    ts: 1_000 + index * 10_000,
    accuracy: 5,
    altitude: 20 + (index % 4),
    heartRateBpm: 140 + (index % 10),
    cadenceSpm: 160 + (index % 6),
    segmentId: index < 350 ? 0 : 1,
    ...(index === 350 ? { gapBefore: true, gapReason: 'resume' } : {}),
  }));
}

test('session policy owns gym and running slot semantics', () => {
  assert.equal(WORKOUT_GYM_SESSION_COUNT, 2);
  assert.equal(WORKOUT_RUNNING_SESSION_INDEX, 2);
  assert.equal(RUNNING_SESSION_ID, 'running-track');
  assert.equal(isRunningWorkoutSessionIndex(1), false);
  assert.equal(isRunningWorkoutSessionIndex(2), true);
  assert.equal(runningWorkoutSessionId(2), 'running-track');
  assert.equal(runningWorkoutSessionId(3), 'running-track-2');
});
test('running model resets cross-activity state and allocates stacked running slots', () => {
  const workout = {
    exercises: [{ exerciseId: 'bench' }],
    cf: true,
    cfData: { wod: 'old' },
    wineFree: true,
  };
  applyRunningDataToWorkout(workout, {
    distance: 5,
    durationMin: 30,
    source: 'gps',
    route: [{ lat: 37.5, lng: 127, ts: 1_000 }],
    routeSummary: { pointCount: 1 },
  }, { sessionIndex: 2 });
  assert.equal(workout.sessionId, 'running-track');
  assert.deepEqual(workout.exercises, []);
  assert.equal(workout.cf, false);
  assert.equal(workout.running, true);
  assert.equal(hasRunningSessionRecord(workout.runData), false, 'runData is not a persisted session shape');

  const sessions = [{}, {}, { running: true, runStartedAt: 10, runEndedAt: 20 }];
  assert.equal(findRunningSessionIndex(sessions, session => session.runStartedAt === 10), 2);
  assert.equal(findRunningSessionIndex(sessions, session => session.runStartedAt === 30), 3);
});

test('incremental live summary stays equivalent to canonical full-route summary', () => {
  const points = route(620);
  const accumulator = new RunningLiveAccumulator();
  points.forEach(point => accumulator.append(point));
  const options = {
    startedAt: points[0].ts,
    endedAt: points.at(-1).ts + 1_000,
    pausedMs: 60_000,
  };
  assert.deepEqual(accumulator.summary(options), summarizeRunningRoute(points, options));
});

test('chunked running draft checkpoints rewrite only the mutable tail chunk', () => {
  const storage = storageHarness();
  const draftKey = 'tomatofarm_running_session_draft_runner';
  const activeKey = 'tomatofarm_running_session_draft_active';
  const marker = { ownerId: 'runner', draftKey, phase: 'active', updatedAt: 1 };
  const first = { ownerId: 'runner', phase: 'active', startedAt: 1, updatedAt: 2, route: route(620) };
  writeRunningDraftRecord(storage, draftKey, activeKey, first, marker);
  storage.writes.length = 0;
  const second = { ...first, updatedAt: 3, route: route(700) };
  writeRunningDraftRecord(storage, draftKey, activeKey, second, { ...marker, updatedAt: 3 });

  assert.deepEqual(storage.writes, [`${draftKey}:route:0001`, draftKey, activeKey]);
  assert.deepEqual(readRunningDraftRecord(storage, draftKey).route, second.route);
  clearRunningDraftRecord(storage, draftKey);
  assert.equal(readRunningDraftRecord(storage, draftKey), null);
});

test('multi-run day aggregate never combines total distance with one run route', () => {
  const aggregate = aggregateWorkoutSessions([
    {
      running: true,
      runDistance: 5,
      runDurationMin: 30,
      runStartedAt: 1_000,
      runEndedAt: 1_801_000,
      runRoute: [{ lat: 37.5, lng: 127, ts: 1_000 }],
      runRouteRef: { routeId: 'first' },
      runRouteSummary: { pointCount: 100 },
    },
    {
      running: true,
      runDistance: 3,
      runDurationMin: 15,
      runStartedAt: 2_000_000,
      runEndedAt: 2_900_000,
      runRoute: [{ lat: 37.6, lng: 127.1, ts: 2_000_000 }],
      runRouteRef: { routeId: 'second' },
      runRouteSummary: { pointCount: 80 },
    },
  ]);
  assert.equal(aggregate.runDistance, 8);
  assert.equal(aggregate.runDurationMin, 45);
  assert.deepEqual(aggregate.runRoute, []);
  assert.equal(aggregate.runRouteRef, null);
  assert.equal(aggregate.runRouteSummary.multiSession, true);
  assert.equal(aggregate.runRouteSummary.activityCount, 2);
  assert.equal(aggregate.runRouteSummary.pointCount, 180);
});
