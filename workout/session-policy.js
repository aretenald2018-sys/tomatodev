export const WORKOUT_GYM_SESSION_COUNT = 2;
export const WORKOUT_RUNNING_SESSION_INDEX = WORKOUT_GYM_SESSION_COUNT;
export const RUNNING_SESSION_ID = 'running-track';

export function normalizeWorkoutSessionIndex(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}
export function isRunningWorkoutSessionIndex(value) {
  return normalizeWorkoutSessionIndex(value) >= WORKOUT_RUNNING_SESSION_INDEX;
}

export function runningWorkoutSessionId(index = WORKOUT_RUNNING_SESSION_INDEX) {
  const normalized = normalizeWorkoutSessionIndex(index, WORKOUT_RUNNING_SESSION_INDEX);
  if (normalized === WORKOUT_RUNNING_SESSION_INDEX) return RUNNING_SESSION_ID;
  return `${RUNNING_SESSION_ID}-${normalized - WORKOUT_RUNNING_SESSION_INDEX + 1}`;
}
