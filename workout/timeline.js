// ================================================================
// workout/timeline.js — set-completion workout duration timeline
// ================================================================

export const WORKOUT_TIMELINE_MODE = 'set-completion';
export const MAX_WORKOUT_TIMELINE_SPAN_SEC = 8 * 60 * 60;

function _num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeSetCompletedAt(value) {
  const n = _num(value);
  if (n <= 0) return null;
  return Math.floor(n);
}

export function stampSetCompletedAt(set, now = Date.now()) {
  if (!set || typeof set !== 'object') return null;
  const ts = normalizeSetCompletedAt(now) || Date.now();
  set.completedAt = ts;
  return ts;
}

export function clearSetCompletedAt(set) {
  if (!set || typeof set !== 'object') return;
  delete set.completedAt;
}

export function stripSetCompletedAt(set = {}) {
  const next = { ...set };
  delete next.completedAt;
  return next;
}

export function clearWorkoutSetCompletedAt(exercises = []) {
  let count = 0;
  for (const entry of Array.isArray(exercises) ? exercises : []) {
    for (const set of Array.isArray(entry?.sets) ? entry.sets : []) {
      if (normalizeSetCompletedAt(set?.completedAt) != null) {
        clearSetCompletedAt(set);
        count += 1;
      }
    }
  }
  return count;
}

export function collectSetCompletionTimes(exercises = []) {
  const times = [];
  for (const entry of Array.isArray(exercises) ? exercises : []) {
    for (const set of Array.isArray(entry?.sets) ? entry.sets : []) {
      if (!set || set.done !== true) continue;
      const completedAt = normalizeSetCompletedAt(set.completedAt);
      if (completedAt == null) continue;
      times.push(completedAt);
    }
  }
  return times.sort((a, b) => a - b);
}

export function buildWorkoutSetTimeline(exercises = [], fallbackDurationSec = 0, options = {}) {
  const maxSpanSec = Math.max(60, Math.floor(_num(options.maxSpanSec) || MAX_WORKOUT_TIMELINE_SPAN_SEC));
  const times = collectSetCompletionTimes(exercises);
  const checkedSetCount = times.length;
  const firstSetCompletedAt = checkedSetCount ? times[0] : null;
  const lastSetCompletedAt = checkedSetCount ? times[checkedSetCount - 1] : null;
  const rawSpanSec = checkedSetCount >= 2
    ? Math.floor((lastSetCompletedAt - firstSetCompletedAt) / 1000)
    : 0;
  const invalidSpan = rawSpanSec < 0 || rawSpanSec > maxSpanSec;
  const hasTimeline = checkedSetCount > 0 && !invalidSpan;
  const durationSec = hasTimeline
    ? Math.max(0, rawSpanSec)
    : Math.max(0, Math.floor(_num(fallbackDurationSec)));
  const source = hasTimeline ? WORKOUT_TIMELINE_MODE : (durationSec > 0 ? 'legacy-duration' : 'none');
  return {
    mode: WORKOUT_TIMELINE_MODE,
    source,
    firstSetCompletedAt,
    lastSetCompletedAt,
    checkedSetCount,
    durationSec,
    invalidSpan,
    maxSpanSec,
  };
}

export function syncWorkoutTimeline(workout, options = {}) {
  if (!workout || typeof workout !== 'object') return null;
  const timeline = buildWorkoutSetTimeline(workout.exercises, workout.workoutDuration, options);
  workout.workoutTimeline = timeline;
  workout.workoutDuration = timeline.durationSec;
  return timeline;
}
