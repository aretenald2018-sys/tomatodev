import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkoutSetTimeline,
  clearSetCompletedAt,
  collectSetCompletionTimes,
  stampSetCompletedAt,
  stripSetCompletedAt,
  syncWorkoutTimeline,
} from '../workout/timeline.js';

test('set-completion timeline counts first checked set through last checked set', () => {
  const exercises = [{
    sets: [
      { kg: 60, reps: 5, done: true, completedAt: 100_000 },
      { kg: 70, reps: 5, done: true, completedAt: 160_000 },
      { kg: 80, reps: 5, done: false, completedAt: 220_000 },
    ],
  }];

  const timeline = buildWorkoutSetTimeline(exercises, 999);

  assert.equal(timeline.source, 'set-completion');
  assert.equal(timeline.checkedSetCount, 2);
  assert.equal(timeline.firstSetCompletedAt, 100_000);
  assert.equal(timeline.lastSetCompletedAt, 160_000);
  assert.equal(timeline.durationSec, 60);
});

test('one checked set has a timestamp but zero span', () => {
  const timeline = buildWorkoutSetTimeline([{ sets: [{ done: true, completedAt: 100_000 }] }], 999);

  assert.equal(timeline.source, 'set-completion');
  assert.equal(timeline.checkedSetCount, 1);
  assert.equal(timeline.durationSec, 0);
});

test('records, clears, strips, and collects set completion timestamps', () => {
  const set = { kg: 100, reps: 5, done: true };
  stampSetCompletedAt(set, 200_000);
  assert.equal(set.completedAt, 200_000);
  assert.deepEqual(collectSetCompletionTimes([{ sets: [set] }]), [200_000]);

  const stripped = stripSetCompletedAt(set);
  assert.equal(stripped.completedAt, undefined);
  assert.equal(set.completedAt, 200_000);

  clearSetCompletedAt(set);
  assert.equal(set.completedAt, undefined);
});

test('invalid long spans fall back to legacy duration', () => {
  const exercises = [{
    sets: [
      { done: true, completedAt: 100_000 },
      { done: true, completedAt: 100_000 + 10 * 60 * 60 * 1000 },
    ],
  }];

  const timeline = buildWorkoutSetTimeline(exercises, 600);

  assert.equal(timeline.source, 'legacy-duration');
  assert.equal(timeline.invalidSpan, true);
  assert.equal(timeline.durationSec, 600);
});

test('syncWorkoutTimeline writes duration and timeline back to workout state', () => {
  const workout = {
    workoutDuration: 999,
    exercises: [{ sets: [
      { done: true, completedAt: 10_000 },
      { done: true, completedAt: 70_000 },
    ] }],
  };

  const timeline = syncWorkoutTimeline(workout);

  assert.equal(timeline.durationSec, 60);
  assert.equal(workout.workoutDuration, 60);
  assert.equal(workout.workoutTimeline.checkedSetCount, 2);
});
