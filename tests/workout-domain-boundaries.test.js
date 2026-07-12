import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  S,
  emptyWorkout,
  patchWorkoutState,
  replaceDietState,
  replaceWorkoutState,
  setWorkoutDateState,
} from '../workout/state.js';
import { dietStateFromDay, workoutStateFromSession } from '../workout/session-hydration.js';
import { applyWorkoutSetCommand, WORKOUT_SET_COMMANDS } from '../workout/set-editor.js';
import { runningInputFromPhoneSummary, runningInputFromWearPayload } from '../workout/running-input.js';

test('workout state mutations preserve namespace object identity', () => {
  const workoutRef = S.workout;
  const dietRef = S.diet;
  const sharedRef = S.shared;

  replaceWorkoutState(emptyWorkout());
  patchWorkoutState({ sessionIndex: 2, sessionId: 'running-track' });
  replaceDietState({ breakfast: '달걀', bFoods: [{ name: '달걀' }] });
  setWorkoutDateState({ y: 2026, m: 6, d: 12 });

  assert.equal(S.workout, workoutRef);
  assert.equal(S.diet, dietRef);
  assert.equal(S.shared, sharedRef);
  assert.equal(S.workout.sessionIndex, 2);
  assert.equal(S.diet.breakfast, '달걀');
  assert.deepEqual(S.shared.date, { y: 2026, m: 6, d: 12 });
});

test('session hydration is DOM-free and leaves volatile timers out of the patch', () => {
  const patch = workoutStateFromSession({
    id: 'session-2',
    exercises: [{ ignored: true }],
    runRoute: [{ lat: 37.5, lng: 127 }],
    runDistance: 4.2,
    workoutDuration: 900,
  }, {
    sessionIndex: 1,
    exercises: [{ exerciseId: 'squat', sets: [] }],
    currentGymId: 'gym-a',
  });

  assert.equal(patch.sessionId, 'session-2');
  assert.deepEqual(patch.exercises, [{ exerciseId: 'squat', sets: [] }]);
  assert.deepEqual(patch.runData.route, [{ lat: 37.5, lng: 127 }]);
  assert.equal(patch.currentGymId, 'gym-a');
  assert.equal('workoutTimerInterval' in patch, false);
  assert.equal('restTimer' in patch, false);
});

test('diet hydration normalizes arrays and legacy skip fields', () => {
  const diet = dietStateFromDay({
    breakfast: '요거트',
    breakfast_skipped: true,
    bFoods: null,
    lFoods: [{ name: '샐러드' }],
  });
  assert.equal(diet.breakfastSkipped, true);
  assert.deepEqual(diet.bFoods, []);
  assert.deepEqual(diet.lFoods, [{ name: '샐러드' }]);
});

test('set editor applies explicit commands without DOM or persistence dependencies', () => {
  const workout = { exercises: [{ exerciseId: 'squat', sets: [] }] };
  const added = applyWorkoutSetCommand(workout, {
    type: WORKOUT_SET_COMMANDS.ADD_SET,
    entryIndex: 0,
  });
  assert.equal(added.changed, true);
  assert.equal(workout.exercises[0].sets.length, 1);

  applyWorkoutSetCommand(workout, {
    type: WORKOUT_SET_COMMANDS.UPDATE_SET,
    entryIndex: 0,
    setIndex: 0,
    field: 'kg',
    value: 100,
  });
  const done = applyWorkoutSetCommand(workout, {
    type: WORKOUT_SET_COMMANDS.SET_DONE,
    entryIndex: 0,
    setIndex: 0,
    value: true,
  }, 123456);
  assert.equal(done.changed, true);
  assert.equal(workout.exercises[0].sets[0].done, true);
  assert.equal(workout.exercises[0].sets[0].completedAt, 123456);

  const moved = applyWorkoutSetCommand(workout, {
    type: WORKOUT_SET_COMMANDS.MOVE_SET,
    entryIndex: 0,
    setIndex: 0,
    direction: 1,
  });
  assert.equal(moved.changed, false);
  assert.equal(moved.reason, 'out-of-range');
});

test('workout load and exercise controller depend on domain services', async () => {
  const [loadSource, exerciseSource] = await Promise.all([
    readFile(new URL('../workout/load.js', import.meta.url), 'utf8'),
    readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8'),
  ]);
  assert.match(loadSource, /workoutStateFromSession/);
  assert.match(loadSource, /dietStateFromDay/);
  assert.match(loadSource, /patchWorkoutState/);
  assert.match(exerciseSource, /applyWorkoutSetCommand/);
});

test('phone and Wear inputs normalize to the same running session contract', () => {
  const route = [{ lat: 37.5, lng: 127, ts: 1000 }];
  const phone = runningInputFromPhoneSummary({
    distanceKm: 5,
    durationSec: 1850,
    startedAt: 1000,
    endedAt: 1851000,
    avgPaceSecPerKm: 370,
  }, { route });
  const wear = runningInputFromWearPayload({
    distanceKm: 5,
    durationSec: 1850,
    startedAt: 1000,
    endedAt: 1851000,
    avgPaceSecPerKm: 370,
    route,
    samples10s: [],
  });

  for (const key of ['distance', 'durationMin', 'durationSec', 'startedAt', 'endedAt', 'avgPaceSecPerKm']) {
    assert.equal(wear[key], phone[key]);
  }
  assert.deepEqual(wear.route, phone.route);
  assert.equal(phone.source, 'gps');
  assert.equal(wear.source, 'wear');
});
