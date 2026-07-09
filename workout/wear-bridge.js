const WEAR_QUEUE_KEY = 'tomatofarm_wear_workout_queue_v1';
const RUNNING_WORKOUT_SESSION_INDEX = 2;
const RUNNING_SESSION_ID = 'running-track';
const WEAR_ROUTE_GAP_MS = 45_000;

let deps = {
  state: null,
  loadWorkoutDate: null,
  saveWorkoutDay: null,
  focusEntry: null,
  getDay: null,
};
let _volatileWearQueue = [];

function _num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _round(value, digits = 2) {
  const n = _num(value, 0);
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function _count(value, fallback = 0) {
  const n = Math.floor(_num(value, fallback));
  return Number.isFinite(n) ? Math.max(0, n) : Math.max(0, fallback);
}

function _bool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function _segmentId(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Math.floor(_num(value, NaN));
  return Number.isFinite(n) ? Math.max(0, Math.min(2160, n)) : fallback;
}

function _gapReason(value, fallback = 'time-gap') {
  const raw = String(value || '').trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(raw) ? raw : fallback;
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
  const points = (Array.isArray(route) ? route : [])
    .slice(0, 2161)
    .map(point => {
      const normalized = {
        timestampMs: _boundedInt(point?.timestampMs, { min: startedAt, max: endedAt }),
        lat: _round(_num(point?.lat, NaN), 6),
        lng: _round(_num(point?.lng, NaN), 6),
        altitude: point?.altitude == null ? null : _round(_num(point.altitude, NaN), 1),
        bearing: point?.bearing == null ? null : _round(_num(point.bearing, NaN), 1),
        _rawSegmentId: _segmentId(point?.segmentId, null),
        _rawGapBefore: _bool(point?.gapBefore),
        _rawGapReason: point?.gapReason,
      };
      return normalized;
    })
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

  return points.map((point, index) => {
    const previous = index > 0 ? points[index - 1] : null;
    const previousSegmentId = previous?._segmentId ?? 0;
    const explicitSegmentId = point._rawSegmentId;
    const segmentChanged = previous != null && explicitSegmentId != null && explicitSegmentId !== previousSegmentId;
    const timeGap = previous != null && point.timestampMs - previous.timestampMs > WEAR_ROUTE_GAP_MS;
    const gapBefore = previous != null && (point._rawGapBefore || segmentChanged || timeGap);
    const segmentId = explicitSegmentId != null
      ? (gapBefore ? Math.max(explicitSegmentId, segmentChanged ? explicitSegmentId : previousSegmentId + 1) : explicitSegmentId)
      : (gapBefore ? previousSegmentId + 1 : previousSegmentId);
    point._segmentId = segmentId;

    const normalized = {
      timestampMs: point.timestampMs,
      lat: point.lat,
      lng: point.lng,
      altitude: point.altitude,
      bearing: point.bearing,
      segmentId,
    };
    if (gapBefore) {
      normalized.gapBefore = true;
      normalized.gapReason = _gapReason(point._rawGapReason, timeGap ? 'time-gap' : 'watch-gap');
    }
    return normalized;
  });
}

function _routeGapSummary(route, summary = {}) {
  if (!route.length) {
    const gapCount = _count(summary.gapCount, 0);
    const segmentCount = _count(summary.segmentCount, gapCount > 0 ? gapCount + 1 : 0);
    return {
      segmentCount,
      gapCount,
      interrupted: _bool(summary.interrupted) || gapCount > 0,
    };
  }

  let gapCount = 0;
  const segments = new Set();
  route.forEach((point, index) => {
    const segmentId = _segmentId(point.segmentId, 0);
    segments.add(segmentId);
    if (index > 0) {
      const previous = route[index - 1];
      const previousSegmentId = _segmentId(previous.segmentId, 0);
      if (point.gapBefore === true || segmentId !== previousSegmentId) gapCount += 1;
    }
  });
  const segmentCount = Math.max(1, segments.size, gapCount + 1);
  return {
    segmentCount,
    gapCount,
    interrupted: gapCount > 0,
  };
}

function _normalizeRouteSummary(payload, route, durationSec, distanceKm, startedAt, endedAt) {
  const summary = payload.routeSummary && typeof payload.routeSummary === 'object'
    ? payload.routeSummary
    : {};
  const routeGaps = _routeGapSummary(route, summary);
  return {
    source: route.length ? 'wear-gps' : String(summary.source || 'unavailable'),
    pointCount: route.length,
    distanceKm,
    durationSec,
    startedAt,
    endedAt,
    segmentCount: routeGaps.segmentCount,
    gapCount: routeGaps.gapCount,
    interrupted: routeGaps.interrupted,
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

function _hasRunningSessionRecord(session = {}) {
  const s = session || {};
  const summary = s.runRouteSummary && typeof s.runRouteSummary === 'object' ? s.runRouteSummary : {};
  return !!(
    s.running ||
    _num(s.runDistance) > 0 ||
    _num(s.runDurationMin) > 0 ||
    _num(s.runDurationSec) > 0 ||
    (Array.isArray(s.runRoute) && s.runRoute.length > 0) ||
    _num(summary.pointCount) > 0
  );
}

function _sameRunningSession(session = {}, payload) {
  return Number(session?.runStartedAt) === payload.startedAt &&
    Number(session?.runEndedAt) === payload.endedAt;
}

function _targetRunningSessionIndex(payload) {
  const existingDay = typeof deps.getDay === 'function'
    ? deps.getDay(payload.date.y, payload.date.m, payload.date.d)
    : null;
  const sessions = Array.isArray(existingDay?.workoutSessions) ? existingDay.workoutSessions : [];
  const exactIndex = sessions.findIndex((session, index) => (
    index >= RUNNING_WORKOUT_SESSION_INDEX && _sameRunningSession(session, payload)
  ));
  if (exactIndex >= RUNNING_WORKOUT_SESSION_INDEX) return exactIndex;

  let lastRunningIndex = RUNNING_WORKOUT_SESSION_INDEX - 1;
  sessions.forEach((session, index) => {
    if (index >= RUNNING_WORKOUT_SESSION_INDEX && _hasRunningSessionRecord(session)) {
      lastRunningIndex = Math.max(lastRunningIndex, index);
    }
  });
  return Math.max(RUNNING_WORKOUT_SESSION_INDEX, lastRunningIndex + 1);
}

function _syncRunData(workout, payload, sessionIndex) {
  const durationMin = Math.floor(payload.durationSec / 60);
  const durationSec = payload.durationSec % 60;
  workout.sessionIndex = sessionIndex;
  workout.sessionId = RUNNING_SESSION_ID;
  workout.exercises = [];
  workout.cf = false;
  workout.stretching = false;
  workout.swimming = false;
  workout.cfData = { wod: '', durationMin: 0, durationSec: 0, memo: '' };
  workout.stretchData = { duration: 0, memo: '' };
  workout.swimData = { distance: 0, durationMin: 0, durationSec: 0, stroke: '', memo: '' };
  workout.workoutDuration = 0;
  workout.workoutTimeline = null;
  workout.wineFree = false;
  workout.currentGymId = null;
  workout.pickerGymFilter = null;
  workout.routineMeta = null;
  workout.maxMeta = null;
  workout.running = payload.distanceKm > 0 || payload.durationSec > 0;
  workout.runData = {
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
      segmentCount: payload.routeSummary.segmentCount,
      gapCount: payload.routeSummary.gapCount,
      interrupted: payload.routeSummary.interrupted,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
    },
    placeSummary: { status: 'unavailable', label: '워치 기록', provider: 'wear' },
    avgPaceSecPerKm: payload.avgPaceSecPerKm || 0,
    gpsAccuracySummary: null,
  };
}

function _queueId(payload) {
  const startedAt = Number(payload?.startedAt);
  const endedAt = Number(payload?.endedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return '';
  return `${payload.startedAt}-${payload.endedAt}`;
}

function _redactedRouteSummary(payload) {
  const summary = payload?.routeSummary && typeof payload.routeSummary === 'object'
    ? payload.routeSummary
    : {};
  return {
    source: summary.source || (Array.isArray(payload?.route) && payload.route.length ? 'wear-gps-redacted' : 'unavailable'),
    pointCount: Math.max(0, Math.floor(_num(summary.pointCount, Array.isArray(payload?.route) ? payload.route.length : 0))),
    segmentCount: _count(summary.segmentCount, 0),
    gapCount: _count(summary.gapCount, 0),
    interrupted: _bool(summary.interrupted) || _count(summary.gapCount, 0) > 0,
    distanceKm: _round(_num(payload?.distanceKm ?? summary.distanceKm, 0), 2),
    durationSec: Math.max(0, Math.floor(_num(payload?.durationSec ?? summary.durationSec, 0))),
    startedAt: _boundedInt(payload?.startedAt ?? summary.startedAt, { min: 0 }),
    endedAt: _boundedInt(payload?.endedAt ?? summary.endedAt, { min: 0 }),
    redacted: true,
  };
}

function _sanitizeQueuedPayload(payload = {}) {
  const startedAt = _boundedInt(payload?.startedAt, { min: 0 });
  const endedAt = _boundedInt(payload?.endedAt, { min: startedAt + 1 });
  const safe = {
    type: 'running',
    source: 'wear',
    dateKey: String(payload?.dateKey || ''),
    startedAt,
    endedAt,
    durationSec: Math.max(0, Math.floor(_num(payload?.durationSec, Math.round((endedAt - startedAt) / 1000)))),
    distanceKm: _round(Math.max(0, _num(payload?.distanceKm, 0)), 2),
    route: [],
    samples10s: [],
    routeSummary: _redactedRouteSummary(payload),
  };
  const avgPaceSecPerKm = _boundedInt(payload?.avgPaceSecPerKm, { min: 1, max: 99 * 60, nullable: true });
  const avgHeartRateBpm = _boundedInt(payload?.avgHeartRateBpm, { min: 30, max: 240, nullable: true });
  const maxHeartRateBpm = _boundedInt(payload?.maxHeartRateBpm, { min: 30, max: 240, nullable: true });
  if (avgPaceSecPerKm != null) safe.avgPaceSecPerKm = avgPaceSecPerKm;
  if (avgHeartRateBpm != null) safe.avgHeartRateBpm = avgHeartRateBpm;
  if (maxHeartRateBpm != null) safe.maxHeartRateBpm = maxHeartRateBpm;
  return {
    ...safe,
  };
}

function _queueEntry(payload, queuedAt = Date.now(), { persistent = false } = {}) {
  return {
    id: _queueId(payload),
    payload: persistent ? _sanitizeQueuedPayload(payload) : payload,
    queuedAt,
  };
}

function _enqueueVolatile(payload) {
  const id = _queueId(payload);
  _volatileWearQueue = _volatileWearQueue.filter(item => item?.id !== id);
  _volatileWearQueue.push(_queueEntry(payload));
  _volatileWearQueue = _volatileWearQueue.slice(-20);
}

function _readQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem(WEAR_QUEUE_KEY) || '[]');
    return (Array.isArray(queue) ? queue : [])
      .map(item => ({
        id: item?.id || (item?.payload ? _queueId(item.payload) : ''),
        payload: _sanitizeQueuedPayload(item?.payload || {}),
        queuedAt: Number(item?.queuedAt) || Date.now(),
      }))
      .filter(item => item.id);
  } catch {
    return [];
  }
}

function _writeQueue(queue) {
  try {
    const safeQueue = (Array.isArray(queue) ? queue : [])
      .map(item => _queueEntry(item?.payload || {}, Number(item?.queuedAt) || Date.now(), { persistent: true }))
      .filter(item => item.id)
      .slice(-20);
    localStorage.setItem(WEAR_QUEUE_KEY, JSON.stringify(safeQueue));
  } catch {}
}

export async function saveWearWorkoutPayload(raw) {
  if (!deps.state || !deps.loadWorkoutDate || !deps.saveWorkoutDay) {
    throw new Error('wear workout bridge dependencies are not configured');
  }
  const payload = normalizeWearWorkoutPayload(raw);
  await deps.loadWorkoutDate(payload.date.y, payload.date.m, payload.date.d);
  const workout = deps.state.workout || (deps.state.workout = {});
  const sessionIndex = _targetRunningSessionIndex(payload);
  _syncRunData(workout, payload, sessionIndex);
  const saved = await deps.saveWorkoutDay({ silent: true });
  if (!saved) throw new Error('wear workout save returned false');
  if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
    document.dispatchEvent(new CustomEvent('sheet:saved', { detail: { source: 'wear-running', dateKey: payload.dateKey } }));
  }
  if (typeof window !== 'undefined') window.showToast?.('워치 런닝 기록을 저장했어요', 2200, 'success');
  return { ok: true, sessionIndex };
}

export function enqueueWearWorkoutPayload(raw) {
  const payload = normalizeWearWorkoutPayload(raw);
  const id = _queueId(payload);
  _enqueueVolatile(payload);
  const queue = _readQueue().filter(item => item?.id !== id);
  queue.push(_queueEntry(payload, Date.now(), { persistent: true }));
  _writeQueue(queue);
  void drainWearWorkoutQueue();
  return { ok: true, queued: true };
}

export async function drainWearWorkoutQueue() {
  const storedQueue = _readQueue();
  if (!_volatileWearQueue.length && !storedQueue.length) return { ok: true, drained: 0 };
  const savedIds = new Set();
  const remainingVolatile = [];
  let drained = 0;
  for (const item of _volatileWearQueue) {
    try {
      await saveWearWorkoutPayload(item.payload);
      drained += 1;
      savedIds.add(item.id);
    } catch (error) {
      remainingVolatile.push(item);
      console.warn('[wear-bridge] queued payload save failed:', error);
    }
  }
  _volatileWearQueue = remainingVolatile.slice(-20);

  const remainingStored = [];
  const volatileIds = new Set(_volatileWearQueue.map(item => item.id));
  for (const item of storedQueue) {
    if (savedIds.has(item.id)) continue;
    if (volatileIds.has(item.id)) {
      remainingStored.push(item);
      continue;
    }
    try {
      await saveWearWorkoutPayload(item.payload);
      drained += 1;
      savedIds.add(item.id);
    } catch (error) {
      remainingStored.push(item);
      console.warn('[wear-bridge] queued payload save failed:', error);
    }
  }
  _writeQueue(remainingStored);
  const remaining = _volatileWearQueue.length + remainingStored.length;
  return { ok: remaining === 0, drained, remaining };
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
