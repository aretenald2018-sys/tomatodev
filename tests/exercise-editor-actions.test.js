import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExerciseEditorRecord,
  customExerciseMuscleId,
  exerciseEditorRecordId,
  verifyExerciseEditorSavedRecord,
} from '../workout/exercise-editor-actions.js';

test('buildExerciseEditorRecord creates a new global custom exercise record', () => {
  const result = buildExerciseEditorRecord({
    name: '  Cable Row  ',
    muscleId: 'back',
    gymId: '',
    now: 1234,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.record, {
    id: 'custom_1234',
    muscleId: 'back',
    name: 'Cable Row',
    order: 50,
    gymId: null,
    primaryGymId: null,
    gymTags: ['*'],
  });
});

test('buildExerciseEditorRecord preserves existing metadata while replacing editor-owned fields', () => {
  const result = buildExerciseEditorRecord({
    existing: {
      id: 'custom_old',
      name: 'Old',
      muscleId: 'chest',
      movementId: 'bench_press',
      category: 'barbell',
      order: 7,
      gymTags: ['legacy'],
    },
    editingId: 'custom_old',
    name: 'Bench Press',
    muscleId: 'chest_upper',
    gymId: 'gym_a',
    now: 9999,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.record, {
    id: 'custom_old',
    name: 'Bench Press',
    muscleId: 'chest_upper',
    movementId: 'bench_press',
    category: 'barbell',
    order: 7,
    gymId: 'gym_a',
    primaryGymId: 'gym_a',
    gymTags: ['gym_a'],
  });
});

test('buildExerciseEditorRecord rejects missing required editor fields before save', () => {
  assert.deepEqual(
    buildExerciseEditorRecord({ name: '', muscleId: 'back', now: 1 }),
    { ok: false, error: 'missing-name' }
  );
  assert.deepEqual(
    buildExerciseEditorRecord({ name: 'Row', muscleId: '', now: 1 }),
    { ok: false, error: 'missing-muscle' }
  );
});

test('verifyExerciseEditorSavedRecord checks saved record identity and gym scope', () => {
  const record = buildExerciseEditorRecord({
    name: 'Lat Pulldown',
    muscleId: 'back',
    gymId: 'gym_a',
    now: 55,
  }).record;

  assert.equal(verifyExerciseEditorSavedRecord(record, { ...record }).ok, true);
  assert.deepEqual(
    verifyExerciseEditorSavedRecord(record, { ...record, gymTags: ['*'] }),
    { ok: false, error: 'save-mismatch' }
  );
  assert.deepEqual(
    verifyExerciseEditorSavedRecord(record, null),
    { ok: false, error: 'missing-record' }
  );
});

test('editor id helpers keep custom exercise and muscle namespaces separate', () => {
  assert.equal(exerciseEditorRecordId(42), 'custom_42');
  assert.equal(customExerciseMuscleId(42), 'muscle_42');
});
