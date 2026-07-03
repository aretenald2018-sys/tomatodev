import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findWorkoutEntryIndexByExerciseId,
  normalizeWorkoutExerciseSelectionDetail,
  selectWorkoutExerciseEntry,
  WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS,
  workoutExerciseSelectionDetail,
} from '../workout/exercise-entry-actions.js';

test('findWorkoutEntryIndexByExerciseId finds an existing workout entry', () => {
  const entries = [
    { exerciseId: 'bench', sets: [] },
    { exerciseId: 'row', sets: [] },
  ];

  assert.equal(findWorkoutEntryIndexByExerciseId(entries, 'row'), 1);
  assert.equal(findWorkoutEntryIndexByExerciseId(entries, 'missing'), -1);
  assert.equal(findWorkoutEntryIndexByExerciseId(null, 'row'), -1);
});

test('selectWorkoutExerciseEntry returns existing entry without creating another card', () => {
  const exercise = { id: 'bench', name: 'Bench' };
  const entries = [{ exerciseId: 'bench', sets: [{ kg: 80, reps: 5 }] }];
  let buildCalls = 0;

  const selection = selectWorkoutExerciseEntry(entries, exercise, () => {
    buildCalls += 1;
    return { exerciseId: 'bench' };
  });

  assert.equal(selection.existing, true);
  assert.equal(selection.created, false);
  assert.equal(selection.entryIdx, 0);
  assert.equal(entries.length, 1);
  assert.equal(buildCalls, 0);
  assert.deepEqual(workoutExerciseSelectionDetail(selection), {
    entryIdx: 0,
    exerciseId: 'bench',
    exercise,
    existing: true,
  });
});

test('selectWorkoutExerciseEntry creates one new entry with injected builder', () => {
  const entries = [{ exerciseId: 'bench', sets: [] }];
  const exercise = { id: 'lat', name: 'Lat Pulldown', muscleId: 'back' };

  const selection = selectWorkoutExerciseEntry(entries, exercise, ex => ({
    exerciseId: ex.id,
    name: ex.name,
    muscleId: ex.muscleId,
    sets: [{ kg: 0, reps: 0, done: false }],
  }));

  assert.equal(selection.existing, false);
  assert.equal(selection.created, true);
  assert.equal(selection.entryIdx, 1);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[1], {
    exerciseId: 'lat',
    name: 'Lat Pulldown',
    muscleId: 'back',
    sets: [{ kg: 0, reps: 0, done: false }],
  });
  assert.deepEqual(workoutExerciseSelectionDetail(selection), {
    entryIdx: 1,
    exerciseId: 'lat',
    exercise,
    existing: false,
  });
});

test('selectWorkoutExerciseEntry rejects invalid dependencies before mutating', () => {
  assert.throws(
    () => selectWorkoutExerciseEntry(null, { id: 'bench' }, () => ({})),
    /entries array/
  );

  const entries = [];
  assert.throws(
    () => selectWorkoutExerciseEntry(entries, { id: 'bench' }, null),
    /buildEntry function/
  );
  assert.equal(entries.length, 0);
});

test('workout exercise selection detail exposes a stable sheet contract', () => {
  assert.deepEqual(WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS, {
    ENTRY_INDEX: 'entryIdx',
    EXERCISE_ID: 'exerciseId',
    EXERCISE: 'exercise',
    EXISTING: 'existing',
  });

  const exercise = { id: 'row', name: 'Row' };
  const detail = workoutExerciseSelectionDetail({
    entryIdx: 2,
    exerciseId: 'row',
    exercise,
    existing: false,
  });

  assert.deepEqual(Object.keys(detail), ['entryIdx', 'exerciseId', 'exercise', 'existing']);
  assert.deepEqual(detail, {
    entryIdx: 2,
    exerciseId: 'row',
    exercise,
    existing: false,
  });
});

test('normalizeWorkoutExerciseSelectionDetail keeps sheet refresh independent from picker internals', () => {
  assert.deepEqual(normalizeWorkoutExerciseSelectionDetail({
    entryIdx: '2.8',
    exerciseId: 42,
    exercise: { id: 42 },
    existing: 1,
  }), {
    entryIdx: 2,
    exerciseId: '42',
    exercise: { id: 42 },
    existing: true,
  });

  assert.deepEqual(normalizeWorkoutExerciseSelectionDetail({
    entryIdx: 'not-a-number',
    exerciseId: '',
    existing: 0,
  }), {
    entryIdx: null,
    exerciseId: null,
    exercise: null,
    existing: false,
  });
});
