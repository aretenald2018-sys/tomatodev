import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearWorkoutExerciseCompletionMarker,
  isCompletableWorkoutExerciseSet,
  isWorkoutExerciseComplete,
  markWorkoutExerciseEntryComplete,
  workoutExerciseCompletionStampAt,
} from '../workout/exercise-completion.js';

test('exercise completion uses an explicit positive marker and every meaningful set', () => {
  const entry = {
    exerciseCompletedAt: 1_783_400_600_000,
    rawSetDetails: [
      { kg: 20, reps: 10, done: true },
      { kg: 0, reps: 0, done: false },
    ],
  };

  assert.equal(workoutExerciseCompletionStampAt(entry), 1_783_400_600_000);
  assert.equal(isWorkoutExerciseComplete(entry), true);

  entry.rawSetDetails.push({ kg: 25, reps: 8, done: false });
  assert.equal(isWorkoutExerciseComplete(entry), false);
  assert.equal(isWorkoutExerciseComplete({ rawSetDetails: [{ kg: 20, reps: 10, done: true }] }), false);
});

test('meaningful workout sets include completed sets or positive input only', () => {
  assert.equal(isCompletableWorkoutExerciseSet({ done: true }), true);
  assert.equal(isCompletableWorkoutExerciseSet({ kg: '20', reps: '' }), true);
  assert.equal(isCompletableWorkoutExerciseSet({ kg: '', reps: '8' }), true);
  assert.equal(isCompletableWorkoutExerciseSet({ kg: -20, reps: -8 }), false);
  assert.equal(isCompletableWorkoutExerciseSet({ kg: 0, reps: 0 }), false);
  assert.equal(isCompletableWorkoutExerciseSet(null), false);
});

test('completion marker mutation is explicit and reversible', () => {
  const entry = {};
  markWorkoutExerciseEntryComplete(entry, 1_783_400_600_000);
  assert.equal(entry.exerciseCompletedAt, 1_783_400_600_000);

  clearWorkoutExerciseCompletionMarker(entry);
  assert.equal('exerciseCompletedAt' in entry, false);
});
