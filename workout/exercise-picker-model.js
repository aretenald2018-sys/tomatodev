export function normalizeMajorMuscleId(id, subPatternToMajor = {}) {
  return id ? (subPatternToMajor[id] || id) : null;
}

export function exerciseMajorIds(exercise, options = {}) {
  const normalize = (id) => normalizeMajorMuscleId(id, options.subPatternToMajor);
  const ids = new Set();
  const major = normalize(exercise?.muscleId);
  if (major) ids.add(major);
  (Array.isArray(exercise?.muscleIds) ? exercise.muscleIds : []).forEach(id => {
    const normalized = normalize(id);
    if (normalized) ids.add(normalized);
  });
  const movement = (options.movements || []).find(item => item.id === exercise?.movementId);
  if (movement?.primary) ids.add(movement.primary);
  const subPattern = normalize(movement?.subPattern);
  if (subPattern) ids.add(subPattern);
  return [...ids];
}

export function hasManualCardioMetrics(cardio) {
  return !!cardio && typeof cardio === 'object'
    && ['kcal', 'distanceKm', 'speedKmh', 'laps'].some(key => Number(cardio[key]) > 0);
}

export function pickerEntryHasWork(entry, isManualCardioEntry) {
  if (!entry || typeof entry !== 'object') return false;
  if (isManualCardioEntry?.(entry)) return hasManualCardioMetrics(entry.cardio);
  if ((Array.isArray(entry.sets) ? entry.sets : []).some(set => {
    if (!set || set.setType === 'warmup') return false;
    if (set.done === true) return true;
    if (set.done === false) return false;
    return (Number(set.kg) || 0) > 0 && (Number(set.reps) || 0) > 0;
  })) return true;
  return !!String(entry.note || '').trim();
}

export function buildPickerUsageStats(cache = {}, options = {}) {
  const stats = new Map();
  Object.entries(cache).forEach(([key, day]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key === options.todayKey) return;
    (options.getSessions?.(day) || []).forEach(session => {
      const seen = new Set();
      (Array.isArray(session?.exercises) ? session.exercises : []).forEach(entry => {
        const id = options.entryId?.(entry);
        if (!id || seen.has(id) || !options.isEligible?.(entry)) return;
        seen.add(id);
        const previous = stats.get(id) || { count: 0, lastDate: null };
        previous.count += 1;
        if (!previous.lastDate || key > previous.lastDate) previous.lastDate = key;
        stats.set(id, previous);
      });
    });
  });
  return stats;
}

export function daysBetweenDateKeys(fromKey, toKey) {
  const parse = (key) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  };
  const fromMs = parse(fromKey);
  const toMs = parse(toKey);
  return fromMs == null || toMs == null ? null : Math.max(0, Math.round((toMs - fromMs) / 86400000));
}

export function pickerStatsMeta(stats, todayKey) {
  const count = Number(stats?.count) || 0;
  if (count <= 0 || !stats?.lastDate) return '-';
  const days = daysBetweenDateKeys(stats.lastDate, todayKey);
  const dayLabel = days == null ? '최근 기록' : (days === 0 ? '오늘' : `${days}일 전`);
  return `총 ${count}번, ${dayLabel}`;
}

export function sortPickerItems(list, statsById, options = {}) {
  const collator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });
  const id = options.id || (item => item?.id);
  const label = options.label || (item => item?.name || '');
  const stat = (item) => statsById.get(id(item)) || { count: 0, lastDate: '' };
  return [...list].sort((a, b) => {
    const as = stat(a);
    const bs = stat(b);
    if (options.mode === 'frequency') {
      return (bs.count - as.count) || String(bs.lastDate || '').localeCompare(String(as.lastDate || '')) || collator.compare(label(a), label(b));
    }
    if (options.mode === 'name') {
      return collator.compare(label(a), label(b)) || (bs.count - as.count) || String(bs.lastDate || '').localeCompare(String(as.lastDate || ''));
    }
    return String(bs.lastDate || '').localeCompare(String(as.lastDate || '')) || (bs.count - as.count) || collator.compare(label(a), label(b));
  });
}

export function isPickerCustomExercise(exercise) {
  return /^custom_/.test(String(exercise?.id || '')) || !exercise?.movementId;
}

export function safePickerColor(color) {
  const raw = String(color || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw) ? raw : '#64748b';
}
