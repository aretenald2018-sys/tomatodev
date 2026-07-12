// ================================================================
// workout/completion-metrics.js — 완료 시각 기반 휴식 표시 모델
// ================================================================

function coerceWorkoutCompletionAt(value) {
  const stamp = Number(value);
  return Number.isFinite(stamp) && stamp > 0 ? stamp : null;
}

function latestWorkoutCompletionAtFromRows(exercises = []) {
  let latest = null;
  const addStamp = (value) => {
    const stamp = coerceWorkoutCompletionAt(value);
    if (stamp == null) return;
    if (latest == null || stamp > latest) latest = stamp;
  };

  (Array.isArray(exercises) ? exercises : []).forEach((row) => {
    addStamp(row?.exerciseCompletedAt);
    const rawSets = Array.isArray(row?.rawSetDetails) ? row.rawSetDetails : [];
    const fallbackSets = Array.isArray(row?.setDetails) ? row.setDetails : [];
    const sets = rawSets.length ? rawSets : fallbackSets;
    sets.forEach((set) => {
      if (set?.done === false) return;
      addStamp(set?.completedAt);
    });
  });

  return latest;
}

export function latestWorkoutCompletionAt(workout) {
  const source = workout || {};
  return coerceWorkoutCompletionAt(source.lastCompletedAt)
    ?? latestWorkoutCompletionAtFromRows(source.exercises);
}

export function formatWorkoutCompletionElapsed(completedAt, now = Date.now()) {
  const stamp = coerceWorkoutCompletionAt(completedAt);
  const current = Number(now);
  if (stamp == null || !Number.isFinite(current)) return '—';
  const elapsedSec = Math.max(0, Math.floor((current - stamp) / 1000));
  const seconds = elapsedSec % 60;
  const totalMinutes = Math.floor(elapsedSec / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
