// ================================================================
// workout/exercise-entry-actions.js — workout entry state transitions
// ================================================================

export const WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS = Object.freeze({
  ENTRY_INDEX: 'entryIdx',
  EXERCISE_ID: 'exerciseId',
  EXERCISE: 'exercise',
  EXISTING: 'existing',
});

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
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.ENTRY_INDEX]: selection?.entryIdx ?? -1,
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXERCISE_ID]: selection?.exerciseId || null,
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXERCISE]: selection?.exercise || null,
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXISTING]: !!selection?.existing,
  };
}

export function normalizeWorkoutExerciseSelectionDetail(detail = {}) {
  const entryValue = Number(detail?.[WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.ENTRY_INDEX]);
  const exerciseId = detail?.[WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXERCISE_ID];
  return {
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.ENTRY_INDEX]: Number.isFinite(entryValue)
      ? Math.max(0, Math.floor(entryValue))
      : null,
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXERCISE_ID]: exerciseId ? String(exerciseId) : null,
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXERCISE]: detail?.[WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXERCISE] || null,
    [WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXISTING]: !!detail?.[WORKOUT_EXERCISE_SELECTION_DETAIL_FIELDS.EXISTING],
  };
}
