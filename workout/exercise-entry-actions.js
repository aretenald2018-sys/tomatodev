// ================================================================
// workout/exercise-entry-actions.js — workout entry state transitions
// ================================================================

export function findWorkoutEntryIndexByExerciseId(entries, exerciseId) {
  if (!Array.isArray(entries)) return -1;
  const id = String(exerciseId || '');
  if (!id) return -1;
  return entries.findIndex(entry => entry?.exerciseId === id);
}

export function selectWorkoutExerciseEntry(entries, exercise, buildEntry) {
  if (!Array.isArray(entries)) {
    throw new TypeError('selectWorkoutExerciseEntry requires an entries array');
  }
  const exerciseId = String(exercise?.id || '');
  const existingIdx = findWorkoutEntryIndexByExerciseId(entries, exerciseId);
  if (existingIdx >= 0) {
    return {
      existing: true,
      created: false,
      entryIdx: existingIdx,
      exerciseId,
      exercise,
      entry: entries[existingIdx],
    };
  }
  if (typeof buildEntry !== 'function') {
    throw new TypeError('selectWorkoutExerciseEntry requires a buildEntry function');
  }
  const entry = buildEntry(exercise);
  const entryIdx = entries.push(entry) - 1;
  return {
    existing: false,
    created: true,
    entryIdx,
    exerciseId,
    exercise,
    entry,
  };
}

export function workoutExerciseSelectionDetail(selection) {
  return {
    entryIdx: selection?.entryIdx ?? -1,
    exerciseId: selection?.exerciseId || null,
    exercise: selection?.exercise || null,
    existing: !!selection?.existing,
  };
}
