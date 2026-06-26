import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateWorkoutSessions,
  deleteWorkoutSession,
  getWorkoutSessions,
  hasWorkoutSessionData,
  upsertWorkoutSession,
} from '../workout/sessions.js';

test('legacy top-level workout reads as first session', () => {
  const sessions = getWorkoutSessions({
    exercises: [{ name: '벤치', sets: [{ kg: 80, reps: 8, done: true }] }],
    workoutDuration: 1200,
  }, { minCount: 3 });

  assert.equal(sessions.length, 3);
  assert.equal(sessions[0].label, '1회차');
  assert.equal(sessions[0].exercises[0].name, '벤치');
  assert.equal(hasWorkoutSessionData(sessions[0]), true);
  assert.equal(hasWorkoutSessionData(sessions[1]), false);
});

test('upsertWorkoutSession stores selected session and aggregates top-level fields', () => {
  const day = {
    exercises: [{ name: '벤치', sets: [{ kg: 80, reps: 8, done: true }] }],
    workoutDuration: 1200,
  };
  const out = upsertWorkoutSession(day, {
    exercises: [{ name: '스쿼트', sets: [{ kg: 100, reps: 5, done: true }] }],
    workoutDuration: 900,
    workoutTimeline: { mode: 'set-completion', source: 'set-completion', checkedSetCount: 3, durationSec: 900, firstSetCompletedAt: 2000, lastSetCompletedAt: 902000 },
    memo: '저녁 운동',
  }, 1, { now: 1 });

  assert.equal(out.workoutSessions.length, 2);
  assert.equal(out.workoutSessions[1].label, '2회차');
  assert.equal(out.workoutSessions[1].workoutTimeline.durationSec, 900);
  assert.equal(out.aggregate.exercises.length, 2);
  assert.equal(out.aggregate.workoutDuration, 2100);
  assert.equal(out.aggregate.workoutTimeline.durationSec, 2100);
  assert.equal(out.aggregate.workoutTimeline.checkedSetCount, 3);
  assert.match(out.aggregate.memo, /2회차: 저녁 운동/);
});

test('deleteWorkoutSession removes selected session and rebuilds aggregate', () => {
  const day = {
    workoutSessions: [
      { label: '1회차', exercises: [{ name: '벤치', sets: [{ kg: 80, reps: 8, done: true }] }], workoutDuration: 1200 },
      { label: '2회차', exercises: [{ name: '스쿼트', sets: [{ kg: 100, reps: 5, done: true }] }], workoutDuration: 900 },
    ],
  };
  const out = deleteWorkoutSession(day, 0);

  assert.equal(out.workoutSessions.length, 1);
  assert.equal(out.workoutSessions[0].label, '1회차');
  assert.equal(out.aggregate.exercises.length, 1);
  assert.equal(out.aggregate.exercises[0].name, '스쿼트');
  assert.equal(out.aggregate.workoutDuration, 900);
});

test('aggregateWorkoutSessions returns empty top-level fields when all sessions empty', () => {
  const out = aggregateWorkoutSessions([{ label: '1회차', exercises: [], workoutDuration: 0 }]);

  assert.deepEqual(out.exercises, []);
  assert.equal(out.cf, false);
  assert.equal(out.workoutDuration, 0);
  assert.equal(out.memo, '');
});
