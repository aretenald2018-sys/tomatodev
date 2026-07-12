function _positiveFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function workoutExerciseCompletionStampAt(entry) {
  return _positiveFiniteNumber(entry?.exerciseCompletedAt);
}

export function isCompletableWorkoutExerciseSet(set) {
  if (!set || typeof set !== 'object') return false;
  return set.done === true || _positiveFiniteNumber(set.kg) != null || _positiveFiniteNumber(set.reps) != null;
}

export function isWorkoutExerciseComplete(entry) {
  if (workoutExerciseCompletionStampAt(entry) == null) return false;
  const sets = Array.isArray(entry?.rawSetDetails) ? entry.rawSetDetails : [];
  const completableSets = sets.filter(isCompletableWorkoutExerciseSet);
  return completableSets.length > 0 && completableSets.every(set => set.done === true);
}

export function markWorkoutExerciseEntryComplete(entry, now = Date.now()) {
  if (!entry || typeof entry !== 'object') return;
  entry.exerciseCompletedAt = now;
}

export function clearWorkoutExerciseCompletionMarker(entry) {
  if (!entry || typeof entry !== 'object') return;
  delete entry.exerciseCompletedAt;
}
