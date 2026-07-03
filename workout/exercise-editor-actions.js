export const EXERCISE_EDITOR_RECORD_ERRORS = {
  MISSING_NAME: 'missing-name',
  MISSING_MUSCLE: 'missing-muscle',
  MISSING_RECORD: 'missing-record',
  SAVE_MISMATCH: 'save-mismatch',
};

export function exerciseEditorRecordId(now = Date.now()) {
  const n = Math.max(0, Math.floor(Number(now) || 0));
  return `custom_${n || Date.now()}`;
}

export function customExerciseMuscleId(now = Date.now()) {
  const n = Math.max(0, Math.floor(Number(now) || 0));
  return `muscle_${n || Date.now()}`;
}

export function buildExerciseEditorRecord(input = {}) {
  const existing = input.existing && typeof input.existing === 'object' ? input.existing : null;
  const name = String(input.name || '').trim();
  if (!name) return { ok: false, error: EXERCISE_EDITOR_RECORD_ERRORS.MISSING_NAME };
  const muscleId = String(input.muscleId || '').trim();
  if (!muscleId) return { ok: false, error: EXERCISE_EDITOR_RECORD_ERRORS.MISSING_MUSCLE };
  const gymId = String(input.gymId || '').trim();
  const editingId = String(input.editingId || '').trim();
  const id = editingId || existing?.id || input.id || exerciseEditorRecordId(input.now);
  return {
    ok: true,
    record: {
      ...(existing || {}),
      id,
      muscleId,
      name,
      order: existing?.order ?? 50,
      gymId: gymId || null,
      primaryGymId: gymId || null,
      gymTags: gymId ? [gymId] : ['*'],
    },
  };
}

export function verifyExerciseEditorSavedRecord(record, saved) {
  if (!record || !saved) {
    return { ok: false, error: EXERCISE_EDITOR_RECORD_ERRORS.MISSING_RECORD };
  }
  const gymId = record.gymId || null;
  const savedGymId = saved.gymId || null;
  const savedPrimaryGymId = saved.primaryGymId || null;
  const savedGymTags = Array.isArray(saved.gymTags) ? saved.gymTags : [];
  const gymTagsOk = gymId
    ? savedGymTags.includes(gymId)
    : savedGymTags.includes('*');
  if (
    saved.name !== record.name ||
    saved.muscleId !== record.muscleId ||
    savedGymId !== gymId ||
    savedPrimaryGymId !== gymId ||
    !gymTagsOk
  ) {
    return { ok: false, error: EXERCISE_EDITOR_RECORD_ERRORS.SAVE_MISMATCH };
  }
  return { ok: true, record: saved };
}
