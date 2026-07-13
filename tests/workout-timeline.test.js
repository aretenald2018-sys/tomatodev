import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkoutSetTimeline,
  closeWorkoutTimeline,
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

test('rests longer than 15 minutes are capped and later exercise resumes with 15 minutes included', () => {
  const exercises = [{
    sets: [
      { done: true, completedAt: 100_000 },
      { done: true, completedAt: 100_000 + 20 * 60 * 1000 },
      { done: true, completedAt: 100_000 + 22 * 60 * 1000 },
      { done: true, completedAt: 100_000 + 40 * 60 * 1000 },
    ],
  }];

  const timeline = buildWorkoutSetTimeline(exercises, 600);

  assert.equal(timeline.source, 'set-completion');
  assert.equal(timeline.invalidSpan, false);
  assert.equal(timeline.durationSec, (15 + 2 + 15) * 60);
  assert.equal(timeline.rawSpanSec, 40 * 60);
  assert.equal(timeline.excludedIdleSec, 8 * 60);
  assert.equal(timeline.cappedGapCount, 2);
  assert.equal(timeline.maxRestGapSec, 15 * 60);
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

test('closed timeline stays closed until a later set is completed', () => {
  const workout = {
    workoutDuration: 0,
    exercises: [{ sets: [
      { done: true, completedAt: 10_000 },
      { done: true, completedAt: 70_000 },
    ] }],
  };

  const closed = closeWorkoutTimeline(workout, { endedAt: 970_000, endedBy: 'idle-limit' });
  assert.equal(closed.endedAt, 970_000);
  assert.equal(closed.endedAfterSetCompletedAt, 70_000);
  assert.equal(closed.endedCheckedSetCount, 2);
  assert.equal(closed.endedBy, 'idle-limit');

  const stillClosed = syncWorkoutTimeline(workout);
  assert.equal(stillClosed.endedAfterSetCompletedAt, 70_000);

  workout.exercises[0].sets.push({ done: true, completedAt: 1_270_000 });
  const resumed = syncWorkoutTimeline(workout);
  assert.equal(resumed.endedAt, undefined);
  assert.equal(resumed.endedAfterSetCompletedAt, undefined);
  assert.equal(resumed.durationSec, 60 + (15 * 60));
});
