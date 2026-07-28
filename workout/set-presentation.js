// ================================================================
// workout/set-presentation.js — 운동 세트 표시/유형 순수 모델
// ================================================================

const VALID_WORKOUT_SET_TYPES = new Set(['main', 'warmup', 'drop', 'failure']);

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 1) {
  const number = numberValue(value);
  if (Number.isInteger(number)) return String(number);
  return String(Math.round(number * (10 ** digits)) / (10 ** digits));
}

export function formatWorkoutKg(value) {
  const number = numberValue(value);
  if (number <= 0) return '-';
  return formatNumber(number, 1);
}

export function formatWorkoutReps(value) {
  const number = numberValue(value);
  if (number <= 0) return '-';
  return formatNumber(number, 0);
}

export function formatWorkoutRir(set) {
  if (set?.rir != null && Number.isFinite(Number(set.rir))) return formatNumber(set.rir, 1);
  const rpe = numberValue(set?.rpe);
  if (rpe > 0) return formatNumber(Math.max(0, 10 - rpe), 1);
  return '-';
}

function intensityValue(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(10, number));
}

// RIR과 RPE는 같은 강도를 반대로 센 값이다(RPE = 10 - RIR). 기록 화면마다 저장하는
// 쪽이 달라서 — 운동 화면은 rpe를, 달력 상세 시트는 rir을 남긴다 — 한쪽만 읽으면
// 같은 기록인데도 어떤 세트에는 강도가 붙고 어떤 세트에는 빠진다. 저장된 쪽에서
// 나머지를 환산해 항상 둘 다 돌려준다.
export function workoutSetIntensity(set) {
  const rir = intensityValue(set?.rir);
  if (rir !== null) {
    const storedRpe = intensityValue(set?.rpe);
    return { rir, rpe: storedRpe && storedRpe > 0 ? storedRpe : Math.max(0, 10 - rir) };
  }
  const rpe = intensityValue(set?.rpe);
  if (rpe !== null && rpe > 0) return { rir: Math.max(0, 10 - rpe), rpe };
  return null;
}

export function formatWorkoutIntensityText(set) {
  const intensity = workoutSetIntensity(set);
  if (!intensity) return '';
  return `RIR ${formatNumber(intensity.rir, 1)} · RPE ${formatNumber(intensity.rpe, 1)}`;
}

export function formatWorkoutVolumeTon(value) {
  const tons = numberValue(value) / 1000;
  if (tons <= 0) return '0t';
  return `${formatNumber(tons, 1)}t`;
}

export function workoutSetTypeLabel(setOrType = {}) {
  const set = setOrType && typeof setOrType === 'object' ? setOrType : {};
  const type = typeof setOrType === 'string' ? setOrType : set.setType;
  if (set.wendlerRole === 'warmup') return '웜업';
  if (set.wendlerRole === 'main') return '메인';
  if (set.wendlerRole === 'heavy_single') return '싱글';
  if (set.wendlerRole === 'pr_attempt') return 'PR';
  if (set.wendlerRole === 'backoff') return '백오프';
  if (set.wendlerRole === 'deload') return '회복';
  if (set.wendlerRole === 'supplemental') {
    if (set.supplementalKind === 'bbb') return 'BBB';
    if (set.supplementalKind === 'fsl') return 'FSL';
    return '보조';
  }
  if (type === 'warmup') return '웜업';
  if (type === 'drop') return '드랍';
  if (type === 'failure') return '실패';
  if (type === 'deload') return '디로드';
  return '메인';
}

export function workoutSetTypeClass(setOrType = {}) {
  const set = setOrType && typeof setOrType === 'object' ? setOrType : {};
  const type = typeof setOrType === 'string' ? setOrType : set.setType;
  if (set.wendlerRole === 'warmup' || type === 'warmup') return 'is-warmup';
  if (set.wendlerRole === 'pr_attempt') return 'is-failure';
  if (set.wendlerRole === 'backoff' || set.wendlerRole === 'deload') return 'is-drop';
  if (set.wendlerRole === 'supplemental' || type === 'drop' || type === 'deload') return 'is-drop';
  if (type === 'failure') return 'is-failure';
  return '';
}

export function normalizeWorkoutSetType(type) {
  const value = String(type || '').trim();
  return VALID_WORKOUT_SET_TYPES.has(value) ? value : 'main';
}

export function bestWorkoutSet(row) {
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  return [...sets].sort((a, b) => (
    numberValue(b?.kg) * numberValue(b?.reps)
  ) - (
    numberValue(a?.kg) * numberValue(a?.reps)
  ))[0] || null;
}

export function workoutSetSummary(row) {
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  if (!sets.length) return row?.topSetText || '세트 기록 없음';
  const grouped = new Map();
  sets.forEach((set) => {
    const kg = formatWorkoutKg(set?.kg);
    const reps = formatWorkoutReps(set?.reps);
    const key = `${kg}kg×${reps}`;
    const current = grouped.get(key) || { kg, reps, count: 0 };
    current.count += 1;
    grouped.set(key, current);
  });
  return [...grouped.values()]
    .map(item => `${item.kg}kg×${item.reps} ${item.count}세트`)
    .join(' / ');
}
