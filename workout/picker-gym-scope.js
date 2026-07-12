export function pickerExerciseGymIds(exercise = {}) {
  return [...new Set([
    exercise?.gymId,
    exercise?.primaryGymId,
    ...(Array.isArray(exercise?.gymTags) ? exercise.gymTags.filter(tag => tag && tag !== '*') : []),
  ].filter(Boolean))];
}

export function isPickerExerciseGlobalScope(exercise = {}) {
  const tags = Array.isArray(exercise?.gymTags) ? exercise.gymTags : [];
  return tags.includes('*') || pickerExerciseGymIds(exercise).length === 0;
}

export function pickerExerciseGymKey(exercise = {}) {
  return pickerExerciseGymIds(exercise)[0] || '';
}

export function isConcretePickerGymFilter(gymId) {
  return !!gymId && !['all', 'usable', 'global'].includes(String(gymId));
}

export function normalizePickerGymFilter(gymId) {
  const value = String(gymId || '').trim();
  return value || 'all';
}

export function isPickerExerciseUsableAtGym(exercise, gymId, currentGymId = null) {
  const scope = normalizePickerGymFilter(gymId);
  if (scope === 'global') return isPickerExerciseGlobalScope(exercise);
  if (scope === 'usable') {
    return isPickerExerciseGlobalScope(exercise)
      || !currentGymId
      || pickerExerciseGymIds(exercise).includes(currentGymId);
  }
  if (scope === 'all' || isPickerExerciseGlobalScope(exercise)) return true;
  return pickerExerciseGymIds(exercise).includes(scope);
}

export function filterPickerExercisesByGym(pool, gymId, currentGymId = null) {
  const exercises = Array.isArray(pool) ? pool : [];
  const scope = normalizePickerGymFilter(gymId);
  if (scope === 'all') return exercises;
  return exercises.filter(exercise => isPickerExerciseUsableAtGym(exercise, scope, currentGymId));
}

export function pickerExerciseSourceMeta(exercise, { gyms = [], currentGymId = null } = {}) {
  const gymIds = pickerExerciseGymIds(exercise);
  const gymId = gymIds[0] || null;
  const gym = gymId ? gyms.find(item => item.id === gymId) : null;
  const currentGym = currentGymId ? gyms.find(item => item.id === currentGymId) : null;
  if (isPickerExerciseGlobalScope(exercise)) {
    return { label: '공통', detail: '모든 헬스장', cls: 'global', filterId: 'global', actionLabel: '공통 기구만 보기' };
  }
  if (currentGymId && gymIds.includes(currentGymId)) {
    const label = currentGym?.name || gym?.name || '현재 헬스장';
    return { label, detail: '전용 기구', cls: 'current', filterId: currentGymId, actionLabel: `${label} 기구만 보기` };
  }
  const label = gym?.name || '다른 헬스장';
  return { label, detail: '전용 기구', cls: 'other', filterId: gymId, actionLabel: `${label} 기구만 보기` };
}

export function isPickerExerciseEditable(exercise = {}) {
  if (!exercise?.id) return false;
  return /^custom_/.test(String(exercise.id))
    || pickerExerciseGymIds(exercise).length > 0
    || !exercise.movementId;
}
