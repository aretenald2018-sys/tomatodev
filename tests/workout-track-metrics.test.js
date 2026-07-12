import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeWorkoutTrack,
  buildWorkoutTrackTrend,
  formatWorkoutTrackValue,
  workoutFallbackSparkValues,
  workoutTrackLabel,
} from '../workout/track-metrics.js';

test('workout track metrics classify tracks and format mass values', () => {
  assert.equal(activeWorkoutTrack({}, { reps: 10 }), 'M');
  assert.equal(activeWorkoutTrack({}, { reps: 5 }), 'H');
  assert.equal(activeWorkoutTrack({ maxTrackPreference: 'M' }, { reps: 5 }), 'M');
  assert.equal(workoutTrackLabel('M'), '볼륨');
  assert.equal(workoutTrackLabel('H'), '강도');
  assert.equal(formatWorkoutTrackValue('M', 200), '200kg');
  assert.equal(formatWorkoutTrackValue('M', 1000), '1t');
  assert.equal(formatWorkoutTrackValue('H', 85.7), '86kg');
});

test('workout track metrics fall back to recorded sets without DOM state', () => {
  const row = {
    volume: 200,
    setCount: 1,
    setDetails: [{ kg: 20, reps: 10 }],
  };
  assert.deepEqual(workoutFallbackSparkValues(row, 'M'), [200, 200, 200]);
  const trend = buildWorkoutTrackTrend(row, { kg: 20, reps: 10 }, { cache: {}, exList: [] }, 'M');
  assert.equal(trend.track, 'M');
  assert.equal(trend.valueLabel, '200kg');
  assert.equal(trend.bottomLabel, '20kg');
});
