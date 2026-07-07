const WEAR_QUEUE_KEY = 'tomatofarm_wear_workout_queue_v1';
const WEAR_RUNNING_CARDIO = Object.freeze({
  id: 'treadmill-running',
  label: '트레드밀 러닝',
  detail: '워치 런닝/조깅',
});

let deps = {
  state: null,
  loadWorkoutDate: null,
  saveWorkoutDay: null,
  focusEntry: null,
};

function _num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _round(value, digits = 2) {
  const n = _num(value, 0);
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function _dateParts(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('dateKey must use yyyy-MM-dd');
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m || dt.getUTCDate() !== d) {
    throw new Error('dateKey is not a valid calendar date');
  }
  return { y, m, d };
}

function _boundedInt(value, { min = 0, max = Number.MAX_SAFE_INTEGER, nullable = false } = {}) {
  if (value == null && nullable) return null;
  const n = Math.floor(_num(value, NaN));
  if (!Number.isFinite(n)) {
    if (nullable) return null;
    throw new Error('numeric field is invalid');
  }
  return Math.max(min, Math.min(max, n));
}

function _normalizeSamples(samples) {
  return (Array.isArray(samples) ? samples : [])
    .slice(0, 2161)
    .map(sample => ({
      timestampMs: _boundedInt(sample?.timestampMs, { min: 0 }),
      bpm: _boundedInt(sample?.bpm, { min: 30, max: 240 }),
    }))
    .filter(sample => sample.timestampMs > 0 && sample.bpm >= 30 && sample.bpm <= 240)
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function _normalizeRoutePoints(route, startedAt, endedAt) {
  return (Array.isArray(route) ? route : [])
    .slice(0, 2161)
    .map(point => ({
      timestampMs: _boundedInt(point?.timestampMs, { min: startedAt, max: endedAt }),
      lat: _round(_num(point?.lat, NaN), 6),
      lng: _round(_num(point?.lng, NaN), 6),
      altitude: point?.altitude == null ? null : _round(_num(point.altitude, NaN), 1),
      bearing: point?.bearing == null ? null : _round(_num(point.bearing, NaN), 1),
    }))
    .filter(point => (
      point.timestampMs >= startedAt &&
      point.timestampMs <= endedAt &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lng >= -180 &&
      point.lng <= 180 &&
      (point.altitude == null || Number.isFinite(point.altitude)) &&
      (point.bearing == null || Number.isFinite(point.bearing))
    ))
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function _normalizeRouteSummary(payload, route, durationSec, distanceKm, startedAt, endedAt) {
  const summary = payload.routeSummary && typeof payload.routeSummary === 'object'
    ? payload.routeSummary
    : {};
  return {
    source: route.length ? 'wear-gps' : String(summary.source || 'unavailable'),
    pointCount: route.length,
    distanceKm,
    durationSec,
    startedAt,
    endedAt,
  };
}

export function normalizeWearWorkoutPayload(raw) {
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!payload || typeof payload !== 'object') throw new Error('wear payload must be an object');
  if (payload.type !== 'running') throw new Error('unsupported wear workout type');
  const date = _dateParts(payload.dateKey);
  const startedAt = _boundedInt(payload.startedAt, { min: 0 });
  const endedAt = _boundedInt(payload.endedAt, { min: startedAt + 1 });
  if (endedAt <= startedAt) throw new Error('endedAt must be after startedAt');
  const durationSec = _boundedInt(
    payload.durationSec ?? Math.round((endedAt - startedAt) / 1000),
    { min: 1, max: 6 * 60 * 60 },
  );
  const distanceKm = _round(Math.max(0, _num(payload.distanceKm, 0)), 2);
  const avgPaceSecPerKm = _boundedInt(payload.avgPaceSecPerKm, { min: 1, max: 99 * 60, nullable: true });
  const avgHeartRateBpm = _boundedInt(payload.avgHeartRateBpm, { min: 30, max: 240, nullable: true });
  const maxHeartRateBpm = _boundedInt(payload.maxHeartRateBpm, { min: 30, max: 240, nullable: true });
  const route = _normalizeRoutePoints(payload.route, startedAt, endedAt);
  const routeSummary = _normalizeRouteSummary(payload, route, durationSec, distanceKm, startedAt, endedAt);

  return {
    type: 'running',
    source: payload.source === 'wear' ? 'wear' : 'wear',
    dateKey: payload.dateKey,
    date,
    startedAt,
    endedAt,
    durationSec,
    distanceKm,
    avgPaceSecPerKm,
    avgHeartRateBpm,
    maxHeartRateBpm,
    samples10s: _normalizeSamples(payload.samples10s),
    route,
    routeSummary,
  };
}

function _speedKmh(payload) {
  if (!payload.durationSec || payload.distanceKm <= 0) return 0;
  return _round(payload.distanceKm / (payload.durationSec / 3600), 1);
}

function _buildWearCardioEntry(payload) {
  const speedKmh = _speedKmh(payload);
  return {
    muscleId: 'cardio',
    muscleIds: [],
    movementId: null,
    exerciseId: `cardio:${WEAR_RUNNING_CARDIO.id}`,
    name: WEAR_RUNNING_CARDIO.label,
    sets: [],
    cardio: {
      id: WEAR_RUNNING_CARDIO.id,
      label: WEAR_RUNNING_CARDIO.label,
      detail: WEAR_RUNNING_CARDIO.detail,
      kcal: 0,
      distanceKm: payload.distanceKm,
      speedKmh,
      laps: 0,
      kcalMode: 'auto',
      unit: 'metric',
      source: 'wear-running',
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      durationSec: payload.durationSec,
      avgPaceSecPerKm: payload.avgPaceSecPerKm,
      avgHeartRateBpm: payload.avgHeartRateBpm,
      maxHeartRateBpm: payload.maxHeartRateBpm,
      samples10s: payload.samples10s,
      routeSummary: payload.routeSummary,
      recordedAt: Date.now(),
    },
  };
}

function _upsertWearEntry(workout, entry) {
  if (!Array.isArray(workout.exercises)) workout.exercises = [];
  const idx = workout.exercises.findIndex(item => (
    item?.cardio?.source === 'wear-running' &&
    Number(item?.cardio?.startedAt) === Number(entry.cardio.startedAt) &&
    Number(item?.cardio?.endedAt) === Number(entry.cardio.endedAt)
  ));
  if (idx >= 0) {
    workout.exercises.splice(idx, 1, entry);
    return idx;
  }
  workout.exercises.push(entry);
  return workout.exercises.length - 1;
}

function _syncRunData(workout, payload) {
  const durationMin = Math.floor(payload.durationSec / 60);
  const durationSec = payload.durationSec % 60;
  workout.running = payload.distanceKm > 0 || payload.durationSec > 0;
  workout.sessionId = 'running-track';
  workout.runData = {
    ...(workout.runData || {}),
    distance: payload.distanceKm,
    durationMin,
    durationSec,
    memo: '',
    source: 'wear',
    startedAt: payload.startedAt,
    endedAt: payload.endedAt,
    route: payload.route,
    routeSummary: {
      source: payload.routeSummary.source,
      distanceKm: payload.distanceKm,
      durationSec: payload.durationSec,
      avgPaceSecPerKm: payload.avgPaceSecPerKm,
      avgHeartRateBpm: payload.avgHeartRateBpm,
      maxHeartRateBpm: payload.maxHeartRateBpm,
      pointCount: payload.routeSummary.pointCount,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
    },
    placeSummary: { status: 'unavailable', label: '워치 기록', provider: 'wear' },
    avgPaceSecPerKm: payload.avgPaceSecPerKm || 0,
    gpsAccuracySummary: null,
  };
}

function _readQueue() {
  try {
    return JSON.parse(localStorage.getItem(WEAR_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function _writeQueue(queue) {
  try {
    localStorage.setItem(WEAR_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  } catch {}
}

export async function saveWearWorkoutPayload(raw) {
  if (!deps.state || !deps.loadWorkoutDate || !deps.saveWorkoutDay) {
    throw new Error('wear workout bridge dependencies are not configured');
  }
  const payload = normalizeWearWorkoutPayload(raw);
  await deps.loadWorkoutDate(payload.date.y, payload.date.m, payload.date.d);
  const workout = deps.state.workout || (deps.state.workout = {});
  _syncRunData(workout, payload);
  const entryIdx = _upsertWearEntry(workout, _buildWearCardioEntry(payload));
  const saved = await deps.saveWorkoutDay({ silent: true });
  if (!saved) throw new Error('wear workout save returned false');
  deps.focusEntry?.(entryIdx);
  if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
    document.dispatchEvent(new CustomEvent('sheet:saved', { detail: { source: 'wear-running', dateKey: payload.dateKey } }));
  }
  if (typeof window !== 'undefined') window.showToast?.('워치 런닝 기록을 저장했어요', 2200, 'success');
  return { ok: true, entryIdx };
}

export function enqueueWearWorkoutPayload(raw) {
  const payload = normalizeWearWorkoutPayload(raw);
  const queue = _readQueue().filter(item => {
    const data = item?.payload;
    return !(data?.startedAt === payload.startedAt && data?.endedAt === payload.endedAt);
  });
  queue.push({ id: `${payload.startedAt}-${payload.endedAt}`, payload, queuedAt: Date.now() });
  _writeQueue(queue);
  void drainWearWorkoutQueue();
  return { ok: true, queued: true };
}

export async function drainWearWorkoutQueue() {
  const queue = _readQueue();
  if (!queue.length) return { ok: true, drained: 0 };
  const remaining = [];
  let drained = 0;
  for (const item of queue) {
    try {
      await saveWearWorkoutPayload(item.payload);
      drained += 1;
    } catch (error) {
      remaining.push(item);
      console.warn('[wear-bridge] queued payload save failed:', error);
    }
  }
  _writeQueue(remaining);
  return { ok: remaining.length === 0, drained, remaining: remaining.length };
}

function _installWindowBridge() {
  if (typeof window === 'undefined') return;
  window.__tomatoWearWorkoutBridge = {
    save: saveWearWorkoutPayload,
    saveFromNative(raw) {
      return enqueueWearWorkoutPayload(raw);
    },
    drain: drainWearWorkoutQueue,
  };
}

export function initWearWorkoutBridge() {
  _installWindowBridge();
  if (typeof window === 'undefined') return;
  window.addEventListener?.('tomato-app-ready', () => {
    void drainWearWorkoutQueue();
  });
  setTimeout(() => {
    void drainWearWorkoutQueue();
  }, 800);
}

export function configureWearWorkoutBridge(overrides = {}) {
  deps = { ...deps, ...overrides };
  _installWindowBridge();
}

export function configureWearWorkoutBridgeForTest(overrides = {}) {
  configureWearWorkoutBridge(overrides);
}
