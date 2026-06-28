// ================================================================
// workout/running-session.js — full-screen running session flow
// ================================================================

import { S } from './state.js';
import { destroyRunningMaps, renderRunningMap } from './running-map.js';

const MAX_ROUTE_POINTS = 240;
const MIN_ROUTE_STEP_M = 3;
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
};

const _session = {
  open: false,
  phase: 'start',
  watchId: null,
  tickId: null,
  startedAt: null,
  endedAt: null,
  pausedAt: null,
  pausedMs: 0,
  route: [],
  previewPoint: null,
  previewRequested: false,
  mapRenderSeq: 0,
  lastError: '',
  saving: false,
};

function _root() {
  return document.getElementById('wt-running-session-root');
}

function _now() {
  return Date.now();
}

async function _showToast(message, duration = 1800, type = 'info') {
  try {
    const mod = await import('../home/utils.js');
    mod.showToast?.(message, duration, type);
  } catch {}
}

function _num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _round(value, digits = 2) {
  const n = _num(value, 0);
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function _escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function _safePoint(point) {
  const lat = _num(point?.lat, NaN);
  const lng = _num(point?.lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    ts: _num(point?.ts, _now()),
    accuracy: Number.isFinite(Number(point?.accuracy)) ? Number(point.accuracy) : null,
    altitude: Number.isFinite(Number(point?.altitude)) ? Number(point.altitude) : null,
    speed: Number.isFinite(Number(point?.speed)) ? Number(point.speed) : null,
  };
}

export function runningDistanceMeters(a, b) {
  const pa = _safePoint(a);
  const pb = _safePoint(b);
  if (!pa || !pb) return 0;
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(pb.lat - pa.lat);
  const dLng = toRad(pb.lng - pa.lng);
  const lat1 = toRad(pa.lat);
  const lat2 = toRad(pb.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function runningRouteDistanceMeters(points = []) {
  const route = (Array.isArray(points) ? points : []).map(_safePoint).filter(Boolean);
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    total += runningDistanceMeters(route[i - 1], route[i]);
  }
  return total;
}

export function downsampleRunningRoute(points = [], max = MAX_ROUTE_POINTS) {
  const route = (Array.isArray(points) ? points : []).map(_safePoint).filter(Boolean);
  if (route.length <= max) return route;
  const out = [];
  const step = (route.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) {
    out.push(route[Math.round(i * step)]);
  }
  return out;
}

function _routeBounds(route) {
  if (!route.length) return null;
  let minLat = route[0].lat;
  let maxLat = route[0].lat;
  let minLng = route[0].lng;
  let maxLng = route[0].lng;
  for (const p of route) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return {
    minLat: _round(minLat, 6),
    minLng: _round(minLng, 6),
    maxLat: _round(maxLat, 6),
    maxLng: _round(maxLng, 6),
  };
}

function _routeCentroid(route) {
  if (!route.length) return null;
  const sum = route.reduce((acc, p) => {
    acc.lat += p.lat;
    acc.lng += p.lng;
    return acc;
  }, { lat: 0, lng: 0 });
  return {
    lat: _round(sum.lat / route.length, 6),
    lng: _round(sum.lng / route.length, 6),
  };
}

function _accuracySummary(route) {
  const values = route.map(p => Number(p.accuracy)).filter(Number.isFinite);
  if (!values.length) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    avgAccuracyM: Math.round(avg),
    bestAccuracyM: Math.round(Math.min(...values)),
    worstAccuracyM: Math.round(Math.max(...values)),
  };
}

function _elevationGain(route) {
  let gain = 0;
  for (let i = 1; i < route.length; i += 1) {
    const prev = route[i - 1].altitude;
    const next = route[i].altitude;
    if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
    const diff = next - prev;
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}

export function estimateRunningCalories(distanceKm, weightKg = 70) {
  const km = Math.max(0, _num(distanceKm, 0));
  const weight = Math.max(1, _num(weightKg, 70));
  return Math.round(km * weight);
}

export function summarizeRunningRoute(points = [], options = {}) {
  const route = downsampleRunningRoute(points);
  const startedAt = _num(options.startedAt, route[0]?.ts || _now());
  const endedAt = _num(options.endedAt, route[route.length - 1]?.ts || startedAt);
  const pausedMs = Math.max(0, _num(options.pausedMs, 0));
  const durationSec = Math.max(0, Math.floor((endedAt - startedAt - pausedMs) / 1000));
  const distanceM = Math.max(0, _num(options.distanceM, runningRouteDistanceMeters(route)));
  const distanceKm = _round(distanceM / 1000, 2);
  const avgPaceSecPerKm = distanceKm > 0 && durationSec > 0 ? Math.round(durationSec / distanceKm) : 0;
  const bbox = _routeBounds(route);
  const centroid = _routeCentroid(route);
  const elevationGainM = _elevationGain(route);
  return {
    source: 'gps',
    startedAt,
    endedAt,
    pausedMs,
    pointCount: route.length,
    durationSec,
    distanceKm,
    avgPaceSecPerKm,
    bbox,
    centroid,
    elevationGainM,
    calories: estimateRunningCalories(distanceKm),
    avgHeartRateBpm: 0,
    cadenceSpm: 0,
    gpsAccuracySummary: _accuracySummary(route),
  };
}

export function formatRunningDuration(sec) {
  const total = Math.max(0, Math.floor(_num(sec, 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatRunningPace(secPerKm) {
  const sec = Math.round(_num(secPerKm, 0));
  if (sec <= 0) return "--'--''";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}'${String(s).padStart(2, '0')}''`;
}

function _elapsedSec() {
  if (!_session.startedAt) return 0;
  const end = _session.phase === 'paused' && _session.pausedAt ? _session.pausedAt : (_session.endedAt || _now());
  return Math.max(0, Math.floor((end - _session.startedAt - _session.pausedMs) / 1000));
}

function _currentSummary() {
  const endedAt = _session.endedAt || _now();
  return summarizeRunningRoute(_session.route, {
    startedAt: _session.startedAt || endedAt,
    endedAt,
    pausedMs: _session.pausedMs,
  });
}

function _syncWorkoutRunData(summary) {
  const durationMin = Math.floor(summary.durationSec / 60);
  const durationSec = summary.durationSec % 60;
  S.workout.running = !!(summary.distanceKm > 0 || summary.durationSec > 0 || summary.pointCount > 0);
  S.workout.runData = {
    ...(S.workout.runData || {}),
    distance: summary.distanceKm,
    durationMin,
    durationSec,
    memo: S.workout.runData?.memo || '러닝 세션',
    source: 'gps',
    startedAt: summary.startedAt || null,
    endedAt: summary.endedAt || null,
    route: downsampleRunningRoute(_session.route),
    routeSummary: summary,
    placeSummary: {
      status: summary.centroid ? 'gps_only' : 'unavailable',
      label: summary.centroid ? '대한민국 위치 기록' : '위치 기록',
      provider: null,
    },
    avgPaceSecPerKm: summary.avgPaceSecPerKm || 0,
    gpsAccuracySummary: summary.gpsAccuracySummary || null,
  };
}

function _resetLiveSession() {
  _stopWatch();
  _stopTicker();
  Object.assign(_session, {
    phase: 'start',
    watchId: null,
    tickId: null,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    route: [],
    previewPoint: null,
    previewRequested: false,
    mapRenderSeq: _session.mapRenderSeq + 1,
    lastError: '',
    saving: false,
  });
}

function _stopWatch() {
  if (_session.watchId != null && typeof navigator !== 'undefined' && navigator.geolocation?.clearWatch) {
    navigator.geolocation.clearWatch(_session.watchId);
  }
  _session.watchId = null;
}

function _stopTicker() {
  if (_session.tickId) clearInterval(_session.tickId);
  _session.tickId = null;
}

function _startTicker() {
  _stopTicker();
  _session.tickId = setInterval(() => {
    if (_session.open && (_session.phase === 'active' || _session.phase === 'paused')) _render();
  }, 1000);
}

function _positionToPoint(position) {
  const coords = position?.coords || {};
  return _safePoint({
    lat: coords.latitude,
    lng: coords.longitude,
    ts: position?.timestamp || _now(),
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    speed: coords.speed,
  });
}

function _requestPreviewPosition() {
  if (_session.previewRequested || typeof navigator === 'undefined' || !navigator.geolocation?.getCurrentPosition) return;
  _session.previewRequested = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      const point = _positionToPoint(position);
      if (!point) return;
      _session.previewPoint = point;
      _session.lastError = '';
      if (_session.open && _session.phase === 'start') _render();
    },
    error => {
      _session.lastError = error?.message || 'GPS 권한을 확인해주세요';
      if (_session.open && _session.phase === 'start') _mountRunningMaps();
    },
    GEO_OPTIONS
  );
}

function _pushPosition(position) {
  const point = _positionToPoint(position);
  if (!point) return;
  const last = _session.route[_session.route.length - 1];
  if (last && runningDistanceMeters(last, point) < MIN_ROUTE_STEP_M) return;
  _session.route.push(point);
  if (_session.route.length > MAX_ROUTE_POINTS * 2) {
    _session.route = downsampleRunningRoute(_session.route, MAX_ROUTE_POINTS);
  }
}

function _startWatch() {
  if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
    _session.lastError = '이 브라우저는 위치 기록을 지원하지 않아요';
    return;
  }
  _session.watchId = navigator.geolocation.watchPosition(
    position => {
      _session.lastError = '';
      if (_session.phase === 'active') _pushPosition(position);
    },
    error => {
      _session.lastError = error?.message || 'GPS 권한을 확인해주세요';
      _render();
    },
    GEO_OPTIONS
  );
}

function _startRun() {
  _resetLiveSession();
  _session.open = true;
  _session.phase = 'active';
  _session.startedAt = _now();
  _session.pausedMs = 0;
  _startWatch();
  _startTicker();
  _render();
}

function _pauseRun() {
  if (_session.phase !== 'active') return;
  _session.phase = 'paused';
  _session.pausedAt = _now();
  _stopWatch();
  _render();
}

function _resumeRun() {
  if (_session.phase !== 'paused') return;
  if (_session.pausedAt) _session.pausedMs += Math.max(0, _now() - _session.pausedAt);
  _session.phase = 'active';
  _session.pausedAt = null;
  _startWatch();
  _render();
}

function _finishRun() {
  if (_session.phase !== 'active' && _session.phase !== 'paused') return;
  if (_session.phase === 'paused' && _session.pausedAt) {
    _session.pausedMs += Math.max(0, _now() - _session.pausedAt);
  }
  _session.phase = 'summary';
  _session.endedAt = _now();
  _session.pausedAt = null;
  _stopWatch();
  _stopTicker();
  _syncWorkoutRunData(_currentSummary());
  _render();
}

async function _saveSummary() {
  if (_session.saving) return;
  _session.saving = true;
  _syncWorkoutRunData(_currentSummary());
  _render();
  try {
    const { saveWorkoutDay } = await import('./save.js');
    await saveWorkoutDay({ silent: true });
    await _showToast('러닝 기록 저장 완료', 2200, 'success');
    wtCloseRunningSession();
  } catch (e) {
    console.error('[running-session] save failed:', e);
    _session.saving = false;
    _render();
  }
}

async function _shareSummary() {
  const summary = _currentSummary();
  const text = `러닝 ${summary.distanceKm.toFixed(2)}km · ${formatRunningDuration(summary.durationSec)} · ${formatRunningPace(summary.avgPaceSecPerKm)}/km`;
  try {
    if (typeof navigator !== 'undefined' && navigator.share) await navigator.share({ title: '러닝 기록', text });
    else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      await _showToast('공유 문구를 복사했어요', 1800, 'success');
    }
  } catch (e) {
    console.warn('[running-session] share skipped:', e);
  }
}

function _mapPointsFor(kind) {
  if (kind === 'progress-bubble') {
    if (_session.route.length) return _session.route;
    return _session.previewPoint ? [_session.previewPoint] : [];
  }
  if (kind === 'summary') {
    if (_session.route.length) return _session.route;
    return _session.previewPoint ? [_session.previewPoint] : [];
  }
  if (kind === 'start') return _session.previewPoint ? [_session.previewPoint] : [];
  return [];
}

function _renderRealMapShell(kind, label) {
  const safeKind = _escapeHtml(kind);
  const safeLabel = _escapeHtml(label || '실제 지도');
  return `
    <div class="wt-run-real-map wt-run-real-map--${safeKind}" data-running-real-map="${safeKind}">
      <div class="wt-run-map-canvas" data-running-map-canvas aria-label="${safeLabel}"></div>
      <div class="wt-run-map-status" data-running-map-status>실제 지도 준비 중</div>
    </div>
  `;
}

function _mountRunningMaps() {
  const root = _root();
  if (!root || !_session.open) return;
  const seq = ++_session.mapRenderSeq;
  root.querySelectorAll('[data-running-real-map]').forEach(shell => {
    const kind = shell.getAttribute('data-running-real-map') || 'start';
    const points = _mapPointsFor(kind);
    renderRunningMap(shell, { points, phase: kind }).then(() => {
      if (seq !== _session.mapRenderSeq) destroyRunningMaps(shell);
    });
  });
}

function _renderStart() {
  return `
    <section class="wt-running-screen wt-running-screen--start" data-running-screen="start">
      <header class="wt-run-start-topbar">
        <button type="button" class="wt-run-icon-btn" data-running-action="close" aria-label="닫기">☰</button>
        <strong>러닝</strong>
        <button type="button" class="wt-run-icon-btn" data-running-action="goal" aria-label="추가">＋</button>
      </header>
      <div class="wt-run-start-tabs" role="tablist" aria-label="러닝 모드">
        <button type="button" class="active" data-running-action="noop">바로 시작</button>
      </div>
      <div class="wt-run-start-map">
        ${_renderRealMapShell('start', '러닝 지도')}
        <button type="button" class="wt-run-start-btn" data-running-action="start">시작</button>
        <button type="button" class="wt-run-goal-btn" data-running-action="goal">목표 설정</button>
      </div>
    </section>
  `;
}

function _renderLiveTrackStage() {
  return `
    <section class="wt-run-home-track-stage" aria-label="홈 트랙 러닝">
      <div class="wt-run-home-track-map-bubble" aria-label="러닝 지도 캡쳐">
        ${_renderRealMapShell('progress-bubble', '달리는 중인 지도')}
      </div>
      <span class="wt-run-home-runner wt-run-home-runner--lead" aria-hidden="true">
        <span class="wt-run-home-runner-head"></span>
        <span class="wt-run-home-runner-body"></span>
        <span class="wt-run-home-runner-arm wt-run-home-runner-arm--front"></span>
        <span class="wt-run-home-runner-arm wt-run-home-runner-arm--back"></span>
        <span class="wt-run-home-runner-leg wt-run-home-runner-leg--front"></span>
        <span class="wt-run-home-runner-leg wt-run-home-runner-leg--back"></span>
      </span>
      <span class="wt-run-home-runner wt-run-home-runner--second" aria-hidden="true">
        <span class="wt-run-home-runner-head"></span>
        <span class="wt-run-home-runner-body"></span>
        <span class="wt-run-home-runner-arm wt-run-home-runner-arm--front"></span>
        <span class="wt-run-home-runner-arm wt-run-home-runner-arm--back"></span>
        <span class="wt-run-home-runner-leg wt-run-home-runner-leg--front"></span>
        <span class="wt-run-home-runner-leg wt-run-home-runner-leg--back"></span>
      </span>
      <span class="wt-run-home-runner wt-run-home-runner--third" aria-hidden="true">
        <span class="wt-run-home-runner-head"></span>
        <span class="wt-run-home-runner-body"></span>
        <span class="wt-run-home-runner-arm wt-run-home-runner-arm--front"></span>
        <span class="wt-run-home-runner-arm wt-run-home-runner-arm--back"></span>
        <span class="wt-run-home-runner-leg wt-run-home-runner-leg--front"></span>
        <span class="wt-run-home-runner-leg wt-run-home-runner-leg--back"></span>
      </span>
    </section>
  `;
}

function _renderProgress() {
  const summary = _currentSummary();
  const elapsed = _elapsedSec();
  const isPaused = _session.phase === 'paused';
  const pace = summary.distanceKm > 0 ? formatRunningPace(elapsed / summary.distanceKm) : "--'--''";
  const error = _session.lastError ? `<div class="wt-run-gps-note">${_escapeHtml(_session.lastError)}</div>` : '';
  return `
    <section class="wt-running-screen wt-running-screen--progress" data-running-screen="progress">
      <div class="wt-run-live-stats">
        <div><b>${pace}</b><span>페이스</span></div>
        <div><b>--</b><span>BPM</span></div>
        <div><b>${formatRunningDuration(elapsed)}</b><span>시간</span></div>
      </div>
      <main class="wt-run-live-main">
        ${_renderLiveTrackStage()}
        <div class="wt-run-live-heart">
          <strong>--</strong>
          <span>분당 심박수</span>
          ${error}
        </div>
      </main>
      <div class="wt-run-live-actions">
        <button type="button" class="wt-run-live-btn" data-running-action="${isPaused ? 'resume' : 'pause'}" aria-label="${isPaused ? '재개' : '일시정지'}">${isPaused ? '▶' : 'Ⅱ'}</button>
        ${isPaused ? '<button type="button" class="wt-run-finish-btn" data-running-action="finish">종료</button>' : ''}
      </div>
      <div class="wt-run-live-pages" aria-hidden="true"><span></span><span class="active"></span><span></span></div>
      <footer class="wt-run-music-bar">
        <span class="wt-run-muted-music">♩</span>
        <strong>선택된 음악 없음</strong>
        <span>♫</span>
      </footer>
    </section>
  `;
}

function _summaryTitle(summary) {
  const d = new Date(summary.endedAt || _now());
  const weekday = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][d.getDay()];
  return `${weekday} 러닝`;
}

function _renderSummary() {
  const summary = _currentSummary();
  const distance = summary.distanceKm.toFixed(2);
  const pace = formatRunningPace(summary.avgPaceSecPerKm);
  const time = formatRunningDuration(summary.durationSec);
  const location = summary.centroid ? '대한민국 위치 기록' : '위치 기록';
  return `
    <section class="wt-running-screen wt-running-screen--summary" data-running-screen="summary">
      <header class="wt-run-summary-topbar">
        <div><span>오늘</span><strong>${_summaryTitle(summary)}</strong></div>
        <button type="button" class="wt-run-icon-btn" data-running-action="close" aria-label="닫기">×</button>
      </header>
      <main class="wt-run-summary-body">
        <div class="wt-run-summary-distance">
          <b>${distance}</b>
          <span>킬로미터</span>
        </div>
        <div class="wt-run-summary-grid">
          <div><b>${pace}</b><span>평균 페이스</span></div>
          <div><b>${time}</b><span>시간</span></div>
          <div><b>${summary.calories}</b><span>칼로리</span></div>
          <div><b>${summary.elevationGainM} m</b><span>고도 상승</span></div>
          <div><b>${summary.avgHeartRateBpm || 0}♡</b><span>평균 심박수</span></div>
          <div><b>${summary.cadenceSpm || 0}</b><span>케이던스</span></div>
        </div>
        <div class="wt-run-summary-map">
          ${_renderRealMapShell('summary', location)}
        </div>
      </main>
      <footer class="wt-run-summary-actions">
        <button type="button" data-running-action="share">공유</button>
        <button type="button" data-running-action="save" ${_session.saving ? 'disabled' : ''}>${_session.saving ? '저장 중' : '저장'}</button>
      </footer>
    </section>
  `;
}

function _render() {
  const root = _root();
  if (!root || !_session.open) return;
  root.classList.add('is-open');
  root.hidden = false;
  document.body?.classList.add('wt-running-session-open');
  destroyRunningMaps(root);
  _session.mapRenderSeq += 1;
  if (_session.phase === 'active' || _session.phase === 'paused') root.innerHTML = _renderProgress();
  else if (_session.phase === 'summary') root.innerHTML = _renderSummary();
  else root.innerHTML = _renderStart();
  if (_session.phase === 'start') _requestPreviewPosition();
  _mountRunningMaps();
}

function _handleAction(action) {
  if (!action || action === 'noop') return;
  if (action === 'close') return wtCloseRunningSession();
  if (action === 'start') return _startRun();
  if (action === 'pause') return _pauseRun();
  if (action === 'resume') return _resumeRun();
  if (action === 'finish') return _finishRun();
  if (action === 'save') return _saveSummary();
  if (action === 'share') return _shareSummary();
  if (action === 'settings') return _showToast('러닝 설정은 준비 중이에요', 1800, 'info');
  if (action === 'music') return _showToast('음악 연동은 준비 중이에요', 1800, 'info');
  if (action === 'goal') return _showToast('목표 설정은 준비 중이에요', 1800, 'info');
}

export function initRunningSession() {
  const root = _root();
  if (!root || root.dataset.runningSessionBound === '1') return;
  root.dataset.runningSessionBound = '1';
  root.hidden = true;
  root.addEventListener('click', event => {
    const actionEl = event.target?.closest?.('[data-running-action]');
    if (!actionEl || !root.contains(actionEl)) return;
    event.preventDefault();
    _handleAction(actionEl.getAttribute('data-running-action'));
  });
}

export function wtOpenRunningSession() {
  initRunningSession();
  _resetLiveSession();
  _session.open = true;
  _session.phase = 'start';
  _render();
}

export function wtCloseRunningSession() {
  const root = _root();
  if (root) destroyRunningMaps(root);
  _resetLiveSession();
  _session.open = false;
  if (root) {
    root.classList.remove('is-open');
    root.hidden = true;
    root.innerHTML = '';
  }
  document.body?.classList.remove('wt-running-session-open');
  window._wtSetActiveType?.('gym');
}

export function wtHandleRunningSessionBack() {
  if (!_session.open) return false;
  if (_session.phase === 'active') {
    _pauseRun();
    return true;
  }
  wtCloseRunningSession();
  return true;
}
