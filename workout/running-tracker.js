// ================================================================
// workout/running-tracker.js — foreground GPS running tracker
// ================================================================

import { S } from './state.js';

const MAX_STORED_ROUTE_POINTS = 240;
const MIN_ACCEPT_DISTANCE_M = 4;
const MAX_REASONABLE_ACCURACY_M = 120;

let _bound = false;
let _saveWorkoutDay = null;
let _renderRunningForm = null;
let _watchId = null;
let _tick = null;
let _tracker = _emptyTracker();

function _emptyTracker() {
  return {
    status: 'idle',
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    points: [],
    lastError: '',
  };
}

function _num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _round(value, digits = 5) {
  const factor = 10 ** digits;
  return Math.round(_num(value) * factor) / factor;
}

function _routePointFromPosition(pos) {
  const c = pos?.coords || {};
  const lat = _num(c.latitude, NaN);
  const lng = _num(c.longitude, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: _round(lat, 6),
    lng: _round(lng, 6),
    accuracy: Math.max(0, Math.round(_num(c.accuracy))),
    speed: Number.isFinite(Number(c.speed)) ? Math.max(0, Number(c.speed)) : null,
    heading: Number.isFinite(Number(c.heading)) ? Number(c.heading) : null,
    ts: Math.max(0, Math.floor(_num(pos.timestamp, Date.now()))),
  };
}

export function runningDistanceMeters(a, b) {
  if (!a || !b) return 0;
  const lat1 = _num(a.lat, NaN);
  const lat2 = _num(b.lat, NaN);
  const lng1 = _num(a.lng, NaN);
  const lng2 = _num(b.lng, NaN);
  if (![lat1, lat2, lng1, lng2].every(Number.isFinite)) return 0;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function runningRouteDistanceMeters(points = []) {
  let total = 0;
  const route = Array.isArray(points) ? points : [];
  for (let i = 1; i < route.length; i += 1) {
    total += runningDistanceMeters(route[i - 1], route[i]);
  }
  return total;
}

export function downsampleRunningRoute(points = [], maxPoints = MAX_STORED_ROUTE_POINTS) {
  const route = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)));
  const limit = Math.max(2, Math.floor(Number(maxPoints) || MAX_STORED_ROUTE_POINTS));
  if (route.length <= limit) return route.map(_serializeRoutePoint);
  const out = [];
  const step = (route.length - 1) / (limit - 1);
  for (let i = 0; i < limit; i += 1) {
    out.push(_serializeRoutePoint(route[Math.round(i * step)]));
  }
  return out;
}

function _serializeRoutePoint(p) {
  return {
    lat: _round(p.lat, 6),
    lng: _round(p.lng, 6),
    ts: Math.max(0, Math.floor(_num(p.ts))),
    accuracy: Math.max(0, Math.round(_num(p.accuracy))),
  };
}

function _routeBounds(points) {
  const route = Array.isArray(points) ? points : [];
  if (!route.length) return null;
  const lats = route.map(p => _num(p.lat)).filter(Number.isFinite);
  const lngs = route.map(p => _num(p.lng)).filter(Number.isFinite);
  if (!lats.length || !lngs.length) return null;
  return {
    minLat: _round(Math.min(...lats), 6),
    minLng: _round(Math.min(...lngs), 6),
    maxLat: _round(Math.max(...lats), 6),
    maxLng: _round(Math.max(...lngs), 6),
  };
}

function _routeCentroid(points) {
  const route = Array.isArray(points) ? points : [];
  if (!route.length) return null;
  const sum = route.reduce((acc, p) => {
    acc.lat += _num(p.lat);
    acc.lng += _num(p.lng);
    return acc;
  }, { lat: 0, lng: 0 });
  return {
    lat: _round(sum.lat / route.length, 6),
    lng: _round(sum.lng / route.length, 6),
  };
}

export function summarizeRunningRoute(points = [], options = {}) {
  const route = Array.isArray(points) ? points : [];
  const startedAt = Math.max(0, Math.floor(_num(options.startedAt, route[0]?.ts || Date.now())));
  const endedAt = Math.max(startedAt, Math.floor(_num(options.endedAt, route.at(-1)?.ts || Date.now())));
  const pausedMs = Math.max(0, Math.floor(_num(options.pausedMs)));
  const durationSec = Math.max(0, Math.round((endedAt - startedAt - pausedMs) / 1000));
  const distanceM = Math.max(0, Math.round(runningRouteDistanceMeters(route)));
  const distanceKm = Math.round((distanceM / 1000) * 100) / 100;
  const accuracyValues = route.map(p => _num(p.accuracy, NaN)).filter(n => Number.isFinite(n) && n > 0);
  const avgAccuracyM = accuracyValues.length
    ? Math.round(accuracyValues.reduce((sum, n) => sum + n, 0) / accuracyValues.length)
    : null;
  const avgPaceSecPerKm = distanceKm > 0 && durationSec > 0
    ? Math.round(durationSec / distanceKm)
    : 0;
  return {
    source: 'gps',
    pointCount: route.length,
    storedPointCount: Math.min(route.length, MAX_STORED_ROUTE_POINTS),
    distanceM,
    distanceKm,
    durationSec,
    avgPaceSecPerKm,
    bbox: _routeBounds(route),
    centroid: _routeCentroid(route),
    gpsAccuracySummary: {
      avgAccuracyM,
      weakSignal: avgAccuracyM != null && avgAccuracyM > 50,
      maxAcceptedAccuracyM: MAX_REASONABLE_ACCURACY_M,
    },
  };
}

export function buildRunningRouteSvg(points = [], width = 320, height = 92) {
  const route = downsampleRunningRoute(points, 80);
  if (route.length < 2) {
    return '<div class="wt-running-route-empty">경로 대기</div>';
  }
  const bounds = _routeBounds(route);
  const latSpan = Math.max(0.000001, bounds.maxLat - bounds.minLat);
  const lngSpan = Math.max(0.000001, bounds.maxLng - bounds.minLng);
  const pad = 12;
  const w = Math.max(120, Math.floor(_num(width, 320)));
  const h = Math.max(64, Math.floor(_num(height, 92)));
  const coords = route.map(p => {
    const x = pad + ((p.lng - bounds.minLng) / lngSpan) * (w - pad * 2);
    const y = h - pad - ((p.lat - bounds.minLat) / latSpan) * (h - pad * 2);
    return `${_round(x, 1)},${_round(y, 1)}`;
  }).join(' ');
  return `
    <svg class="wt-running-route-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="러닝 경로 미리보기">
      <rect x="0" y="0" width="${w}" height="${h}" rx="10"></rect>
      <polyline points="${coords}"></polyline>
      <circle cx="${coords.split(' ')[0].split(',')[0]}" cy="${coords.split(' ')[0].split(',')[1]}" r="3"></circle>
      <circle class="end" cx="${coords.split(' ').at(-1).split(',')[0]}" cy="${coords.split(' ').at(-1).split(',')[1]}" r="3"></circle>
    </svg>
  `;
}

function _activeDurationSec(now = Date.now()) {
  if (!_tracker.startedAt) return 0;
  const paused = _tracker.pausedMs + (_tracker.status === 'paused' && _tracker.pausedAt ? now - _tracker.pausedAt : 0);
  return Math.max(0, Math.round((now - _tracker.startedAt - paused) / 1000));
}

function _formatDuration(totalSec) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function _formatPace(secPerKm) {
  const sec = Math.max(0, Math.round(Number(secPerKm) || 0));
  if (!sec) return "--'--\"";
  return `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"`;
}

function _syncRunDataFromTracker(now = Date.now()) {
  if (_tracker.status === 'idle') return null;
  const summary = summarizeRunningRoute(_tracker.points, {
    startedAt: _tracker.startedAt,
    endedAt: now,
    pausedMs: _tracker.pausedMs,
  });
  const run = S.workout.runData || (S.workout.runData = {});
  run.source = 'gps';
  run.startedAt = _tracker.startedAt;
  run.endedAt = _tracker.status === 'idle' ? _tracker.endedAt : null;
  run.distance = summary.distanceKm;
  run.durationMin = Math.floor(summary.durationSec / 60);
  run.durationSec = summary.durationSec % 60;
  run.avgPaceSecPerKm = summary.avgPaceSecPerKm;
  run.gpsAccuracySummary = summary.gpsAccuracySummary;
  run.routeSummary = summary;
  run.route = downsampleRunningRoute(_tracker.points);
  if (!run.placeSummary) {
    run.placeSummary = { status: 'pending_provider', provider: null, label: '장소 확인 대기', updatedAt: Date.now() };
  }
  return summary;
}

function _syncInputsFromRunData() {
  if (typeof document === 'undefined') return;
  const run = S.workout.runData || {};
  const dist = document.getElementById('wt-run-distance');
  const durM = document.getElementById('wt-run-duration-min');
  const durS = document.getElementById('wt-run-duration-sec');
  const pace = document.getElementById('wt-run-pace');
  if (dist) dist.value = run.distance || '';
  if (durM) durM.value = run.durationMin || '';
  if (durS) durS.value = run.durationSec || '';
  if (pace) pace.textContent = run.avgPaceSecPerKm ? `${_formatPace(run.avgPaceSecPerKm)} /km` : "--'--\"";
}

function _renderStatus(summary = null) {
  if (typeof document === 'undefined') return;
  const status = document.getElementById('wt-run-gps-status');
  const primary = document.getElementById('wt-run-gps-primary');
  const pause = document.getElementById('wt-run-gps-pause');
  const place = document.getElementById('wt-run-place-label');
  const preview = document.getElementById('wt-run-route-preview');
  if (!status && !primary && !pause && !preview && !place) return;

  const run = S.workout.runData || {};
  const route = _tracker.status === 'idle' ? (run.route || []) : _tracker.points;
  const liveSummary = summary || (_tracker.status === 'idle'
    ? run.routeSummary
    : summarizeRunningRoute(route, { startedAt: _tracker.startedAt, endedAt: Date.now(), pausedMs: _tracker.pausedMs }));
  const distance = liveSummary?.distanceKm ?? run.distance ?? 0;
  const duration = liveSummary?.durationSec ?? ((run.durationMin || 0) * 60 + (run.durationSec || 0));
  const placeLabel = run.placeSummary?.label || '장소 확인 대기';

  if (status) {
    if (_tracker.status === 'running') status.textContent = `기록 중 · ${distance.toFixed(2)}km · ${_formatDuration(_activeDurationSec())}`;
    else if (_tracker.status === 'paused') status.textContent = `일시정지 · ${distance.toFixed(2)}km · ${_formatDuration(_activeDurationSec())}`;
    else if (run.source === 'gps' && (run.route || []).length) status.textContent = `GPS 완료 · ${distance.toFixed(2)}km · ${_formatPace(run.avgPaceSecPerKm)} /km`;
    else status.textContent = 'GPS 대기';
  }
  if (primary) {
    primary.textContent = _tracker.status === 'idle' ? 'GPS 시작' : '종료';
    primary.classList.toggle('is-running', _tracker.status !== 'idle');
  }
  if (pause) {
    pause.disabled = _tracker.status === 'idle';
    pause.textContent = _tracker.status === 'paused' ? '재개' : '일시정지';
  }
  if (place) {
    place.textContent = placeLabel;
    place.classList.toggle('is-pending', !run.placeSummary || run.placeSummary.status === 'pending_provider');
  }
  if (preview) {
    preview.innerHTML = buildRunningRouteSvg(route);
    const meta = document.createElement('div');
    meta.className = 'wt-running-route-meta';
    const pointCount = route.length || run.routeSummary?.pointCount || 0;
    meta.textContent = pointCount
      ? `${pointCount} points · ${distance.toFixed(2)}km · ${_formatDuration(duration)}`
      : 'GPS를 시작하면 경로가 표시됩니다';
    preview.appendChild(meta);
  }
}

export function renderRunningTracker() {
  _renderStatus();
}

function _acceptPoint(point) {
  if (!point) return false;
  if (point.accuracy > MAX_REASONABLE_ACCURACY_M && _tracker.points.length > 0) return false;
  const last = _tracker.points.at(-1);
  if (last && runningDistanceMeters(last, point) < MIN_ACCEPT_DISTANCE_M) return false;
  _tracker.points.push(point);
  _syncRunDataFromTracker();
  _syncInputsFromRunData();
  _renderStatus();
  return true;
}

function _onPosition(pos) {
  _tracker.lastError = '';
  _acceptPoint(_routePointFromPosition(pos));
}

function _onPositionError(err) {
  _tracker.lastError = err?.message || 'GPS 위치를 받을 수 없습니다';
  if (typeof window !== 'undefined') window.showToast?.(_tracker.lastError, 2600, 'error');
  _renderStatus();
}

function _clearWatch() {
  if (_watchId != null && typeof navigator !== 'undefined' && navigator.geolocation?.clearWatch) {
    navigator.geolocation.clearWatch(_watchId);
  }
  _watchId = null;
}

function _startWatch() {
  if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
    if (typeof window !== 'undefined') window.showToast?.('이 기기에서 GPS를 사용할 수 없습니다', 2600, 'error');
    return false;
  }
  _watchId = navigator.geolocation.watchPosition(_onPosition, _onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });
  return true;
}

function _startTick() {
  if (_tick) clearInterval(_tick);
  _tick = setInterval(() => {
    if (_tracker.status !== 'idle') {
      _syncRunDataFromTracker();
      _syncInputsFromRunData();
      _renderStatus();
    }
  }, 1000);
}

function _stopTick() {
  if (_tick) clearInterval(_tick);
  _tick = null;
}

export function wtStartRunningGps() {
  if (_tracker.status !== 'idle') return wtFinishRunningGps();
  _tracker = _emptyTracker();
  _tracker.status = 'running';
  _tracker.startedAt = Date.now();
  const run = S.workout.runData || (S.workout.runData = {});
  run.source = 'gps';
  run.startedAt = _tracker.startedAt;
  run.endedAt = null;
  run.route = [];
  run.routeSummary = null;
  run.gpsAccuracySummary = null;
  run.placeSummary = { status: 'pending_provider', provider: null, label: '장소 확인 대기', updatedAt: Date.now() };
  if (!_startWatch()) {
    _tracker = _emptyTracker();
    _renderStatus();
    return;
  }
  _startTick();
  _renderStatus();
}

export function wtToggleRunningGpsPause() {
  if (_tracker.status === 'idle') return;
  if (_tracker.status === 'running') {
    _tracker.status = 'paused';
    _tracker.pausedAt = Date.now();
    _clearWatch();
  } else if (_tracker.status === 'paused') {
    _tracker.pausedMs += Date.now() - (_tracker.pausedAt || Date.now());
    _tracker.pausedAt = null;
    _tracker.status = 'running';
    _startWatch();
  }
  _renderStatus();
}

export function wtFinishRunningGps() {
  if (_tracker.status === 'idle') return;
  const now = Date.now();
  if (_tracker.status === 'paused' && _tracker.pausedAt) {
    _tracker.pausedMs += now - _tracker.pausedAt;
  }
  _tracker.status = 'idle';
  _tracker.endedAt = now;
  _clearWatch();
  _stopTick();

  const summary = summarizeRunningRoute(_tracker.points, {
    startedAt: _tracker.startedAt,
    endedAt: _tracker.endedAt,
    pausedMs: _tracker.pausedMs,
  });
  const run = S.workout.runData || (S.workout.runData = {});
  run.source = 'gps';
  run.startedAt = _tracker.startedAt;
  run.endedAt = _tracker.endedAt;
  run.distance = summary.distanceKm;
  run.durationMin = Math.floor(summary.durationSec / 60);
  run.durationSec = summary.durationSec % 60;
  run.avgPaceSecPerKm = summary.avgPaceSecPerKm;
  run.gpsAccuracySummary = summary.gpsAccuracySummary;
  run.routeSummary = summary;
  run.route = downsampleRunningRoute(_tracker.points);
  if (!run.placeSummary) {
    run.placeSummary = { status: 'pending_provider', provider: null, label: '장소 확인 대기', updatedAt: Date.now() };
  }
  _syncInputsFromRunData();
  _renderStatus(summary);
  _saveWorkoutDay?.({ silent: true })?.catch?.(e => console.error('[running-tracker] save failed:', e));
  if (typeof window !== 'undefined') window.showToast?.('러닝 기록을 저장했어요', 1800, 'success');
}

export function initRunningTracker(options = {}) {
  _saveWorkoutDay = options.saveWorkoutDay || _saveWorkoutDay;
  _renderRunningForm = options.renderRunningForm || _renderRunningForm;
  if (_bound) {
    _renderStatus();
    return;
  }
  _bound = true;
  if (typeof document === 'undefined') return;
  document.getElementById('wt-run-gps-primary')?.addEventListener('click', wtStartRunningGps);
  document.getElementById('wt-run-gps-pause')?.addEventListener('click', wtToggleRunningGpsPause);
  _renderStatus();
}

if (typeof window !== 'undefined') {
  window.wtStartRunningGps = wtStartRunningGps;
  window.wtToggleRunningGpsPause = wtToggleRunningGpsPause;
  window.wtFinishRunningGps = wtFinishRunningGps;
}
