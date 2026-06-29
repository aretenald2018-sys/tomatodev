// ================================================================
// workout/sessions.js — 날짜별 운동 회차 호환 레이어
// ================================================================

export const WORKOUT_SESSION_KEYS = Object.freeze([
  'exercises', 'cf', 'stretching', 'swimming', 'running',
  'runDistance', 'runDurationMin', 'runDurationSec', 'runMemo',
  'runSource', 'runStartedAt', 'runEndedAt', 'runRoute', 'runRouteSummary',
  'runPlaceSummary', 'runAvgPaceSecPerKm', 'runGpsAccuracySummary',
  'cfWod', 'cfDurationMin', 'cfDurationSec', 'cfMemo',
  'stretchDuration', 'stretchMemo',
  'swimDistance', 'swimDurationMin', 'swimDurationSec', 'swimStroke', 'swimMemo',
  'workoutDuration', 'workoutTimeline', 'wine_free', 'memo', 'workoutPhoto',
  'gymId', 'pickerGymFilter', 'routineMeta', 'maxMeta',
]);

function _clone(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); }
  catch { return value; }
}

function _num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function _str(value) {
  return String(value || '').trim();
}

function _isActualWorkoutSet(set) {
  if (!set || set.setType === 'warmup') return false;
  if (set.done === true) return true;
  if (set.done === false) return false;
  return _num(set.kg) > 0 && _num(set.reps) > 0;
}

function _hasActualWorkoutEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (_str(entry.note)) return true;
  return (Array.isArray(entry.sets) ? entry.sets : []).some(_isActualWorkoutSet);
}

export function emptyWorkoutSession(index = 0) {
  return {
    id: `session-${index + 1}`,
    label: `${index + 1}회차`,
    exercises: [],
    cf: false,
    stretching: false,
    swimming: false,
    running: false,
    runDistance: 0,
    runDurationMin: 0,
    runDurationSec: 0,
    runMemo: '',
    runSource: 'manual',
    runStartedAt: null,
    runEndedAt: null,
    runRoute: [],
    runRouteSummary: null,
    runPlaceSummary: null,
    runAvgPaceSecPerKm: 0,
    runGpsAccuracySummary: null,
    cfWod: '',
    cfDurationMin: 0,
    cfDurationSec: 0,
    cfMemo: '',
    stretchDuration: 0,
    stretchMemo: '',
    swimDistance: 0,
    swimDurationMin: 0,
    swimDurationSec: 0,
    swimStroke: '',
    swimMemo: '',
    workoutDuration: 0,
    workoutTimeline: null,
    wine_free: false,
    memo: '',
    workoutPhoto: null,
    gymId: null,
    pickerGymFilter: null,
    routineMeta: null,
    maxMeta: null,
  };
}

export function normalizeWorkoutSession(source = {}, index = 0) {
  const base = emptyWorkoutSession(index);
  const out = {
    ...base,
    id: _str(source.id) || base.id,
    label: _str(source.label) || base.label,
  };
  for (const key of WORKOUT_SESSION_KEYS) {
    if (source[key] !== undefined) out[key] = _clone(source[key]);
  }
  out.exercises = Array.isArray(out.exercises) ? out.exercises : [];
  out.cf = !!out.cf;
  out.stretching = !!out.stretching;
  out.swimming = !!out.swimming;
  out.running = !!out.running;
  out.wine_free = !!out.wine_free;
  return out;
}

export function buildLegacyWorkoutSession(day = {}, index = 0) {
  return normalizeWorkoutSession(day, index);
}

export function hasWorkoutSessionData(session = {}) {
  const s = normalizeWorkoutSession(session, 0);
  if (s.exercises.some(_hasActualWorkoutEntry)) return true;
  if (s.cf || s.stretching || s.swimming || s.running) return true;
  if (_num(s.runDistance) > 0 || _num(s.runDurationMin) > 0 || _num(s.runDurationSec) > 0) return true;
  if (Array.isArray(s.runRoute) && s.runRoute.length > 0) return true;
  if (_num(s.cfDurationMin) > 0 || _num(s.cfDurationSec) > 0 || _str(s.cfWod)) return true;
  if (_num(s.stretchDuration) > 0 || _str(s.stretchMemo)) return true;
  if (_num(s.swimDistance) > 0 || _num(s.swimDurationMin) > 0 || _num(s.swimDurationSec) > 0) return true;
  if (_num(s.workoutDuration) > 0) return true;
  if (_num(s.workoutTimeline?.durationSec) > 0 || _num(s.workoutTimeline?.checkedSetCount) > 0) return true;
  if (_str(s.memo) || _str(s.runMemo) || _str(s.cfMemo) || _str(s.swimMemo)) return true;
  if (s.workoutPhoto) return true;
  return false;
}

export function getWorkoutSessions(day = {}, options = {}) {
  const minCount = Math.max(0, Number(options.minCount) || 0);
  const raw = Array.isArray(day?.workoutSessions) && day.workoutSessions.length
    ? day.workoutSessions
    : [buildLegacyWorkoutSession(day, 0)];
  const sessions = raw.map((session, index) => normalizeWorkoutSession(session, index));
  while (sessions.length < minCount) sessions.push(emptyWorkoutSession(sessions.length));
  return sessions;
}

export function workoutSessionToDayFields(session = {}) {
  const s = normalizeWorkoutSession(session, 0);
  const out = {};
  for (const key of WORKOUT_SESSION_KEYS) out[key] = _clone(s[key]);
  return out;
}

function _sumDurationMinSec(sessions, minKey, secKey) {
  const totalSec = sessions.reduce((sum, session) => {
    return sum + (_num(session[minKey]) * 60) + _num(session[secKey]);
  }, 0);
  return {
    min: Math.floor(totalSec / 60),
    sec: totalSec % 60,
  };
}

function _joinMemos(sessions, key) {
  return sessions
    .map((session, index) => {
      const memo = _str(session[key]);
      return memo ? `${index + 1}회차: ${memo}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function _aggregateWorkoutTimeline(sessions) {
  const timelines = sessions
    .map(session => session?.workoutTimeline)
    .filter(timeline => timeline && typeof timeline === 'object');
  const durationSec = sessions.reduce((sum, session) => sum + _num(session.workoutDuration), 0);
  const checkedSetCount = timelines.reduce((sum, timeline) => sum + _num(timeline.checkedSetCount), 0);
  const firsts = timelines.map(t => _num(t.firstSetCompletedAt)).filter(n => n > 0);
  const lasts = timelines.map(t => _num(t.lastSetCompletedAt)).filter(n => n > 0);
  if (durationSec <= 0 && checkedSetCount <= 0 && !firsts.length && !lasts.length) return null;
  return {
    mode: 'set-completion',
    source: 'session-aggregate',
    firstSetCompletedAt: firsts.length ? Math.min(...firsts) : null,
    lastSetCompletedAt: lasts.length ? Math.max(...lasts) : null,
    checkedSetCount,
    durationSec,
  };
}

export function aggregateWorkoutSessions(sessions = []) {
  const active = (Array.isArray(sessions) ? sessions : [])
    .map((session, index) => normalizeWorkoutSession(session, index))
    .filter(hasWorkoutSessionData);
  const runDur = _sumDurationMinSec(active, 'runDurationMin', 'runDurationSec');
  const cfDur = _sumDurationMinSec(active, 'cfDurationMin', 'cfDurationSec');
  const swimDur = _sumDurationMinSec(active, 'swimDurationMin', 'swimDurationSec');
  const firstWith = (key) => active.find(session => session[key])?.[key] ?? null;
  const firstRunRoute = active.find(session => Array.isArray(session.runRoute) && session.runRoute.length > 0)?.runRoute || [];
  const firstRunSource = active.find(session => session.runSource && session.runSource !== 'manual')?.runSource || firstWith('runSource') || 'manual';
  return {
    exercises: active.flatMap(session => _clone(session.exercises || [])),
    cf: active.some(session => !!session.cf),
    stretching: active.some(session => !!session.stretching),
    swimming: active.some(session => !!session.swimming),
    running: active.some(session => !!session.running),
    runDistance: active.reduce((sum, session) => sum + _num(session.runDistance), 0),
    runDurationMin: runDur.min,
    runDurationSec: runDur.sec,
    runMemo: _joinMemos(active, 'runMemo'),
    runSource: firstRunSource,
    runStartedAt: firstWith('runStartedAt'),
    runEndedAt: firstWith('runEndedAt'),
    runRoute: firstRunRoute,
    runRouteSummary: firstWith('runRouteSummary'),
    runPlaceSummary: firstWith('runPlaceSummary'),
    runAvgPaceSecPerKm: firstWith('runAvgPaceSecPerKm') || 0,
    runGpsAccuracySummary: firstWith('runGpsAccuracySummary'),
    cfWod: active.map(session => _str(session.cfWod)).filter(Boolean).join('\n'),
    cfDurationMin: cfDur.min,
    cfDurationSec: cfDur.sec,
    cfMemo: _joinMemos(active, 'cfMemo'),
    stretchDuration: active.reduce((sum, session) => sum + _num(session.stretchDuration), 0),
    stretchMemo: _joinMemos(active, 'stretchMemo'),
    swimDistance: active.reduce((sum, session) => sum + _num(session.swimDistance), 0),
    swimDurationMin: swimDur.min,
    swimDurationSec: swimDur.sec,
    swimStroke: active.map(session => _str(session.swimStroke)).filter(Boolean)[0] || '',
    swimMemo: _joinMemos(active, 'swimMemo'),
    workoutDuration: active.reduce((sum, session) => sum + _num(session.workoutDuration), 0),
    workoutTimeline: _aggregateWorkoutTimeline(active),
    wine_free: active.some(session => !!session.wine_free),
    memo: _joinMemos(active, 'memo'),
    workoutPhoto: firstWith('workoutPhoto'),
    gymId: firstWith('gymId'),
    pickerGymFilter: firstWith('pickerGymFilter'),
    routineMeta: firstWith('routineMeta'),
    maxMeta: firstWith('maxMeta'),
  };
}

export function upsertWorkoutSession(day = {}, payload = {}, sessionIndex = 0, options = {}) {
  const index = Math.max(0, Math.floor(Number(sessionIndex) || 0));
  const minCount = Math.max(index + 1, Array.isArray(day?.workoutSessions) ? day.workoutSessions.length : 1);
  const sessions = getWorkoutSessions(day, { minCount });
  const prev = sessions[index] || emptyWorkoutSession(index);
  sessions[index] = normalizeWorkoutSession({
    ...prev,
    ...workoutSessionToDayFields(payload),
    id: prev.id || `session-${index + 1}`,
    label: prev.label || `${index + 1}회차`,
    updatedAt: options.now || Date.now(),
  }, index);
  return {
    workoutSessions: sessions,
    aggregate: aggregateWorkoutSessions(sessions),
  };
}

export function deleteWorkoutSession(day = {}, sessionIndex = 0) {
  const index = Math.max(0, Math.floor(Number(sessionIndex) || 0));
  const sessions = getWorkoutSessions(day, { minCount: Math.max(index + 1, 1) });
  const next = sessions.filter((_, i) => i !== index)
    .map((session, i) => normalizeWorkoutSession({ ...session, label: `${i + 1}회차` }, i));
  const normalized = next.length ? next : [emptyWorkoutSession(0)];
  return {
    workoutSessions: normalized,
    aggregate: aggregateWorkoutSessions(normalized),
  };
}
