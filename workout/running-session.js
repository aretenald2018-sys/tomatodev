// ================================================================
// workout/running-session.js — full-screen running session flow
// ================================================================

import { S } from './state.js';
import { destroyRunningMaps, renderRunningMap, readRunningMapConfig } from './running-map.js';

const MAX_ROUTE_POINTS = 240;
const MIN_ROUTE_STEP_M = 3;
const ROUTE_GAP_MS = 45_000;
const RUNNING_WORKOUT_SESSION_INDEX = 2;
const RUNNING_SESSION_DRAFT_VERSION = 1;
const RUNNING_SESSION_DRAFT_MAX_MS = 24 * 60 * 60 * 1000;
const RUNNING_SESSION_DRAFT_KEY_PREFIX = 'tomatofarm_running_session_draft_';
const RUNNING_SESSION_DRAFT_ACTIVE_KEY = 'tomatofarm_running_session_draft_active';
const RESTORABLE_RUNNING_PHASES = new Set(['active', 'paused', 'summary']);
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 15000,
};
const DEFAULT_RUNNING_GOAL = Object.freeze({ type: 'free', value: 0 });
const RUNNING_GOAL_DEFAULTS = Object.freeze({ distance: 5, time: 30 });
const RUNNING_AUDIO_MIN_MS = 3500;

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
  pendingGapReason: '',
  previewPoint: null,
  previewRequested: false,
  mapRenderSeq: 0,
  lastError: '',
  saving: false,
  placeSummary: null,
  placePromise: null,
  goal: { ...DEFAULT_RUNNING_GOAL },
  goalSheetOpen: false,
  audioGuide: true,
  announcedSplits: 0,
  announcedGoalHalf: false,
  announcedGoalDone: false,
  lastSpeechAt: 0,
};
let _runningDraftEventsBound = false;

function _root() {
  const root = document.getElementById('wt-running-session-root');
  if (root && document.body && root.parentElement !== document.body) {
    document.body.appendChild(root);
  }
  return root;
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

function _cloneRunningGoal(goal = DEFAULT_RUNNING_GOAL) {
  const type = goal?.type === 'distance' || goal?.type === 'time' ? goal.type : 'free';
  return { type, value: type === 'free' ? 0 : _num(goal?.value, RUNNING_GOAL_DEFAULTS[type]) };
}

function _cloneJson(value, fallback = null) {
  if (value == null) return fallback;
  try { return JSON.parse(JSON.stringify(value)); }
  catch { return fallback; }
}

function _sanitizeRunningGoal(type, rawValue) {
  const safeType = type === 'distance' || type === 'time' ? type : 'free';
  if (safeType === 'free') return { ...DEFAULT_RUNNING_GOAL };
  const fallback = RUNNING_GOAL_DEFAULTS[safeType];
  const min = safeType === 'distance' ? 0.1 : 1;
  const max = safeType === 'distance' ? 99.99 : 999;
  const value = Math.min(max, Math.max(min, _num(rawValue, fallback)));
  return {
    type: safeType,
    value: safeType === 'distance' ? _round(value, 2) : Math.round(value),
  };
}

function _runningGoalLabel(goal = _session.goal) {
  const safe = _cloneRunningGoal(goal);
  if (safe.type === 'distance') return `${_round(safe.value, 2)} km`;
  if (safe.type === 'time') return `${Math.round(safe.value)}분`;
  return '자유 러닝';
}

function _runningGoalShortType(goal = _session.goal) {
  const safe = _cloneRunningGoal(goal);
  if (safe.type === 'distance') return '거리 목표';
  if (safe.type === 'time') return '시간 목표';
  return '목표 없음';
}

function _runningGoalProgress(summary = _currentSummary()) {
  const goal = _cloneRunningGoal(_session.goal);
  if (goal.type === 'distance') {
    const target = Math.max(0.1, _num(goal.value, RUNNING_GOAL_DEFAULTS.distance));
    const current = Math.max(0, _num(summary?.distanceKm, 0));
    return {
      active: true,
      type: 'distance',
      current,
      target,
      ratio: target > 0 ? Math.min(1, current / target) : 0,
    };
  }
  if (goal.type === 'time') {
    const target = Math.max(60, _num(goal.value, RUNNING_GOAL_DEFAULTS.time) * 60);
    const current = Math.max(0, _num(summary?.durationSec, 0));
    return {
      active: true,
      type: 'time',
      current,
      target,
      ratio: target > 0 ? Math.min(1, current / target) : 0,
    };
  }
  return { active: false, type: 'free', current: 0, target: 0, ratio: 0 };
}

function _runningGoalRemainingLabel(progress) {
  if (!progress?.active) return '';
  if (progress.ratio >= 1) return '목표 완료';
  const remaining = Math.max(0, progress.target - progress.current);
  if (progress.type === 'distance') return `${_round(remaining, 2)} km 남음`;
  return `${Math.ceil(remaining / 60)}분 남음`;
}

function _runningSpeechDuration(sec) {
  const total = Math.max(0, Math.floor(_num(sec, 0)));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes > 0 && seconds > 0) return `${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분`;
  return `${seconds}초`;
}

function _runningSpeechPace(summary) {
  if (summary?.avgPaceSecPerKm > 0) return `평균 페이스 ${formatRunningPace(summary.avgPaceSecPerKm)}입니다`;
  return `시간 ${_runningSpeechDuration(summary?.durationSec || 0)}입니다`;
}

function _speakRunning(message, options = {}) {
  if (!_session.audioGuide || !message || typeof window === 'undefined') return false;
  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance;
  if (!synth || typeof synth.speak !== 'function' || typeof Utterance !== 'function') return false;
  const now = _now();
  if (!options.force && now - _session.lastSpeechAt < RUNNING_AUDIO_MIN_MS) return false;
  _session.lastSpeechAt = now;
  try {
    const utterance = new Utterance(message);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.02;
    utterance.pitch = 1;
    if (options.force && typeof synth.cancel === 'function') synth.cancel();
    synth.speak(utterance);
    return true;
  } catch (e) {
    console.warn('[running-session] speech skipped:', e);
    return false;
  }
}

function _checkRunningAudioCues() {
  if (_session.phase !== 'active' || !_session.audioGuide) return;
  const summary = _currentSummary();
  let changed = false;
  const splitKm = Math.floor(_num(summary.distanceKm, 0));
  if (splitKm > 0 && splitKm > _session.announcedSplits) {
    _session.announcedSplits = splitKm;
    changed = true;
    _speakRunning(`${splitKm}킬로미터 통과. ${_runningSpeechPace(summary)}`);
  }
  const progress = _runningGoalProgress(summary);
  if (!progress.active) {
    if (changed) _persistRunningDraft('audio cues');
    return;
  }
  if (!_session.announcedGoalHalf && progress.ratio >= 0.5 && progress.ratio < 1) {
    _session.announcedGoalHalf = true;
    changed = true;
    _speakRunning(`목표의 절반을 지났습니다. ${_runningGoalRemainingLabel(progress)}`);
  }
  if (!_session.announcedGoalDone && progress.ratio >= 1) {
    _session.announcedGoalDone = true;
    changed = true;
    _speakRunning(`${_runningGoalLabel()} 목표를 완료했습니다. 계속 달려도 기록은 이어집니다.`, { force: true });
  }
  if (changed) _persistRunningDraft('audio cues');
}

function _safePoint(point) {
  const lat = _num(point?.lat, NaN);
  const lng = _num(point?.lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const normalized = {
    lat,
    lng,
    ts: _num(point?.ts, _now()),
    accuracy: Number.isFinite(Number(point?.accuracy)) ? Number(point.accuracy) : null,
    altitude: Number.isFinite(Number(point?.altitude)) ? Number(point.altitude) : null,
    speed: Number.isFinite(Number(point?.speed)) ? Number(point.speed) : null,
  };
  const heartRateBpm = _optionalNumber(point?.heartRateBpm ?? point?.heartRate ?? point?.bpm);
  const cadenceSpm = _optionalNumber(point?.cadenceSpm ?? point?.cadence ?? point?.stepsPerMinute);
  if (heartRateBpm != null) normalized.heartRateBpm = heartRateBpm;
  if (cadenceSpm != null) normalized.cadenceSpm = cadenceSpm;
  const segmentId = Number(point?.segmentId);
  if (Number.isFinite(segmentId) && segmentId >= 0) normalized.segmentId = Math.floor(segmentId);
  if (point?.gapBefore === true) normalized.gapBefore = true;
  const gapReason = _routeGapReason(point?.gapReason);
  if (gapReason) normalized.gapReason = gapReason;
  return normalized;
}

function _optionalNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function _optionalFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function _routeGapReason(value) {
  const raw = String(value || '').trim();
  return raw ? raw.slice(0, 48) : '';
}

function _routeSegmentId(point, fallback = 0) {
  const n = Number(point?.segmentId);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function _normalizeRunningRoute(points = []) {
  const raw = (Array.isArray(points) ? points : []).map(_safePoint).filter(Boolean);
  let currentSegment = 0;
  return raw.map((point, index) => {
    const requestedSegment = _routeSegmentId(point, currentSegment);
    const segmentChanged = index > 0 && requestedSegment !== currentSegment;
    const gapBefore = index > 0 && (point.gapBefore === true || segmentChanged);
    currentSegment = gapBefore && !segmentChanged ? currentSegment + 1 : requestedSegment;

    const normalized = { ...point, segmentId: currentSegment };
    if (gapBefore) {
      normalized.gapBefore = true;
      normalized.gapReason = _routeGapReason(point.gapReason) || 'interruption';
    } else {
      delete normalized.gapBefore;
      delete normalized.gapReason;
    }
    return normalized;
  });
}

function _isRouteGapEdge(prev, next) {
  if (!prev || !next) return false;
  return next.gapBefore === true || _routeSegmentId(prev, 0) !== _routeSegmentId(next, 0);
}

function _routeGapCount(route = []) {
  return route.filter(point => point?.gapBefore === true).length;
}

function _routeSegmentCount(route = []) {
  if (!route.length) return 0;
  let count = 1;
  for (let i = 1; i < route.length; i += 1) {
    if (_isRouteGapEdge(route[i - 1], route[i])) count += 1;
  }
  return count;
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
  const route = _normalizeRunningRoute(points);
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    if (_isRouteGapEdge(route[i - 1], route[i])) continue;
    total += runningDistanceMeters(route[i - 1], route[i]);
  }
  return total;
}

export function downsampleRunningRoute(points = [], max = MAX_ROUTE_POINTS) {
  const route = _normalizeRunningRoute(points);
  const limit = Math.max(2, Math.floor(_num(max, MAX_ROUTE_POINTS)));
  if (route.length <= limit) return route;
  const selected = new Set([0, route.length - 1]);
  route.forEach((point, index) => {
    if (point.gapBefore === true) {
      selected.add(index);
      if (index > 0) selected.add(index - 1);
    }
  });
  const step = (route.length - 1) / (limit - 1);
  for (let i = 0; selected.size < limit && i < limit; i += 1) {
    selected.add(Math.round(i * step));
  }
  return _normalizeRunningRoute(Array.from(selected).sort((a, b) => a - b).slice(0, limit).map(index => route[index]));
}

function _safeRunningPhase(phase) {
  const raw = String(phase || '');
  return RESTORABLE_RUNNING_PHASES.has(raw) ? raw : null;
}

export function normalizeRunningSessionDraft(raw, options = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const now = _num(options.now, _now());
  const phase = _safeRunningPhase(raw.phase);
  if (!phase) return null;
  const ownerId = String(raw.ownerId || raw.userId || raw.uid || '').trim();

  const route = downsampleRunningRoute(raw.route || [], MAX_ROUTE_POINTS);
  const startedAt = _num(raw.startedAt, route[0]?.ts || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
  if ((now - startedAt) > RUNNING_SESSION_DRAFT_MAX_MS) return null;

  const updatedAt = _num(raw.updatedAt, raw.endedAt || raw.pausedAt || startedAt);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return null;
  if ((now - updatedAt) > RUNNING_SESSION_DRAFT_MAX_MS) return null;

  const endedAt = phase === 'summary'
    ? _num(raw.endedAt, updatedAt)
    : null;
  const pausedAt = phase === 'paused'
    ? _num(raw.pausedAt, updatedAt)
    : null;

  return {
    version: RUNNING_SESSION_DRAFT_VERSION,
    phase,
    dateKey: String(raw.dateKey || ''),
    ownerId,
    startedAt,
    endedAt: endedAt && Number.isFinite(endedAt) ? endedAt : null,
    pausedAt: pausedAt && Number.isFinite(pausedAt) ? pausedAt : null,
    pausedMs: Math.max(0, _num(raw.pausedMs, 0)),
    route,
    pendingGapReason: _routeGapReason(raw.pendingGapReason),
    placeSummary: raw.placeSummary && typeof raw.placeSummary === 'object' ? _cloneJson(raw.placeSummary, null) : null,
    goal: _cloneRunningGoal(raw.goal),
    audioGuide: raw.audioGuide !== false,
    announcedSplits: Math.max(0, Math.floor(_num(raw.announcedSplits, 0))),
    announcedGoalHalf: !!raw.announcedGoalHalf,
    announcedGoalDone: !!raw.announcedGoalDone,
    lastSpeechAt: Math.max(0, _num(raw.lastSpeechAt, 0)),
    updatedAt,
  };
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
  let pairs = 0;
  for (let i = 1; i < route.length; i += 1) {
    if (_isRouteGapEdge(route[i - 1], route[i])) continue;
    const prev = route[i - 1].altitude;
    const next = route[i].altitude;
    if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
    pairs += 1;
    const diff = next - prev;
    if (diff > 0) gain += diff;
  }
  if (!pairs) return null;
  return Math.round(gain);
}

function _avgRouteMetric(route, key) {
  const values = route.map(point => Number(point?.[key])).filter(value => Number.isFinite(value) && value > 0);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
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
  const gapCount = _routeGapCount(route);
  const segmentCount = _routeSegmentCount(route);
  return {
    source: 'gps',
    startedAt,
    endedAt,
    pausedMs,
    pointCount: route.length,
    segmentCount,
    gapCount,
    interrupted: gapCount > 0,
    durationSec,
    distanceKm,
    avgPaceSecPerKm,
    bbox,
    centroid,
    elevationGainM,
    calories: estimateRunningCalories(distanceKm),
    avgHeartRateBpm: _avgRouteMetric(route, 'heartRateBpm'),
    cadenceSpm: _avgRouteMetric(route, 'cadenceSpm'),
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

function _workoutDateKeyFromState() {
  const d = S.shared?.date;
  if (!d || !Number.isFinite(Number(d.y)) || !Number.isFinite(Number(d.m)) || !Number.isFinite(Number(d.d))) return null;
  return `${Number(d.y)}-${String(Number(d.m) + 1).padStart(2, '0')}-${String(Number(d.d)).padStart(2, '0')}`;
}

function _datePartsFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  const y = Number(match[1]);
  const month = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isInteger(y) || !Number.isInteger(month) || !Number.isInteger(d)) return null;
  if (month < 1 || month > 12 || d < 1 || d > 31) return null;
  const parsed = new Date(y, month - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== month - 1 || parsed.getDate() !== d) return null;
  return { y, m: month - 1, d };
}

function _applyRunningDraftDate(dateKey) {
  const date = _datePartsFromKey(dateKey);
  if (!date) return false;
  S.shared.date = date;
  return true;
}

function _ensureRunningWorkoutDate(dateKey, options = {}) {
  const current = _workoutDateKeyFromState();
  if (dateKey && current !== dateKey && _applyRunningDraftDate(dateKey)) return _workoutDateKeyFromState();
  if (current && options.allowCurrent !== false) return current;
  if (!_applyRunningDraftDate(dateKey)) return null;
  return _workoutDateKeyFromState();
}

function _workoutSessionIndexFromState() {
  return RUNNING_WORKOUT_SESSION_INDEX;
}

function _currentRunningDraftOwnerId() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : '';
    const u = raw ? JSON.parse(raw) : null;
    const uid = (u && (u.uid || u.id || u.username || u.name)) || '_anon';
    return String(uid || '_anon');
  } catch {
    return '_anon';
  }
}

function _runningDraftKey(ownerId = _currentRunningDraftOwnerId()) {
  return RUNNING_SESSION_DRAFT_KEY_PREFIX + encodeURIComponent(String(ownerId || '_anon'));
}

function _runningDraftBelongsToCurrentUser(draft, ownerId = _currentRunningDraftOwnerId()) {
  return !!draft?.ownerId && String(draft.ownerId) === String(ownerId || '_anon');
}

function _buildRunningDraft(context = 'manual') {
  const phase = _safeRunningPhase(_session.phase);
  if (!phase || !_session.startedAt) return null;
  return {
    version: RUNNING_SESSION_DRAFT_VERSION,
    context,
    ownerId: _currentRunningDraftOwnerId(),
    dateKey: _workoutDateKeyFromState() || '',
    phase,
    startedAt: _session.startedAt,
    endedAt: _session.endedAt || null,
    pausedAt: _session.pausedAt || null,
    pausedMs: Math.max(0, _num(_session.pausedMs, 0)),
    route: downsampleRunningRoute(_session.route, MAX_ROUTE_POINTS),
    pendingGapReason: _routeGapReason(_session.pendingGapReason),
    placeSummary: _cloneJson(_session.placeSummary, null),
    goal: _cloneRunningGoal(_session.goal),
    audioGuide: !!_session.audioGuide,
    announcedSplits: Math.max(0, Math.floor(_num(_session.announcedSplits, 0))),
    announcedGoalHalf: !!_session.announcedGoalHalf,
    announcedGoalDone: !!_session.announcedGoalDone,
    lastSpeechAt: Math.max(0, _num(_session.lastSpeechAt, 0)),
    updatedAt: _now(),
  };
}

function _persistRunningDraft(context = 'manual') {
  if (typeof localStorage === 'undefined') return null;
  const draft = _buildRunningDraft(context);
  if (!draft) return null;
  try {
    const payload = JSON.stringify(draft);
    localStorage.setItem(_runningDraftKey(draft.ownerId), payload);
    localStorage.setItem(RUNNING_SESSION_DRAFT_ACTIVE_KEY, payload);
    return draft;
  } catch {
    return null;
  }
}

function _readRunningDraftFromKey(key) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = normalizeRunningSessionDraft(JSON.parse(raw));
    if (!draft) localStorage.removeItem(key);
    return draft;
  } catch {
    try { localStorage.removeItem(key); } catch {}
    return null;
  }
}

function _readRunningDraft() {
  if (typeof localStorage === 'undefined') return null;
  const ownerId = _currentRunningDraftOwnerId();
  const ownerKey = _runningDraftKey(ownerId);
  const keyedDraft = _readRunningDraftFromKey(ownerKey);
  if (keyedDraft) {
    if (!keyedDraft.ownerId || _runningDraftBelongsToCurrentUser(keyedDraft, ownerId)) return keyedDraft;
    try { localStorage.removeItem(ownerKey); } catch {}
  }
  const activeDraft = _readRunningDraftFromKey(RUNNING_SESSION_DRAFT_ACTIVE_KEY);
  return _runningDraftBelongsToCurrentUser(activeDraft, ownerId) ? activeDraft : null;
}

function _clearRunningDraft() {
  if (typeof localStorage === 'undefined') return;
  const ownerId = _currentRunningDraftOwnerId();
  try { localStorage.removeItem(_runningDraftKey(ownerId)); } catch {}
  const activeDraft = _readRunningDraftFromKey(RUNNING_SESSION_DRAFT_ACTIVE_KEY);
  if (_runningDraftBelongsToCurrentUser(activeDraft, ownerId)) {
    try { localStorage.removeItem(RUNNING_SESSION_DRAFT_ACTIVE_KEY); } catch {}
  }
}

function _applyRunningDraft(draft) {
  const normalized = normalizeRunningSessionDraft(draft);
  if (!normalized) return false;
  _resetLiveSession();
  _applyRunningDraftDate(normalized.dateKey);
  Object.assign(_session, {
    open: true,
    phase: normalized.phase,
    startedAt: normalized.startedAt,
    endedAt: normalized.endedAt,
    pausedAt: normalized.pausedAt,
    pausedMs: normalized.pausedMs,
    route: normalized.route,
    pendingGapReason: normalized.pendingGapReason,
    previewPoint: normalized.route[normalized.route.length - 1] || null,
    placeSummary: normalized.placeSummary,
    goal: normalized.goal,
    audioGuide: normalized.audioGuide,
    announcedSplits: normalized.announcedSplits,
    announcedGoalHalf: normalized.announcedGoalHalf,
    announcedGoalDone: normalized.announcedGoalDone,
    lastSpeechAt: normalized.lastSpeechAt,
  });
  const summary = _currentSummary();
  _syncWorkoutRunData(summary, _session.placeSummary || _runningPlaceFallback(summary));
  return true;
}

function _restoreRunningDraftIfAvailable() {
  const draft = _readRunningDraft();
  if (!draft || !_applyRunningDraft(draft)) return false;
  S.workout.sessionIndex = RUNNING_WORKOUT_SESSION_INDEX;
  S.workout.sessionId = 'running-track';
  if (_session.phase === 'active') {
    _markRouteGap('restore');
    _startWatch();
  }
  if (_session.phase === 'active' || _session.phase === 'paused') _startTicker();
  _publishRunningLiveState(_session.phase === 'active' || _session.phase === 'paused');
  _render();
  _showToast('이전 러닝 기록을 복구했어요', 1800, 'success');
  return true;
}

function _bindRunningDraftEvents() {
  if (_runningDraftEventsBound || typeof window === 'undefined') return;
  _runningDraftEventsBound = true;
  window.addEventListener('pagehide', () => {
    _markRouteGap('pagehide');
    _persistRunningDraft('pagehide');
  });
  window.addEventListener('beforeunload', () => {
    _markRouteGap('beforeunload');
    _persistRunningDraft('beforeunload');
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        _markRouteGap('visibility-hidden');
        _persistRunningDraft('visibility hidden');
      }
    });
  }
}

function _runningPlaceFallback(summary, status = 'resolving') {
  if (!summary?.centroid) return { status: 'unavailable', label: '위치 정보 없음', provider: null };
  return { status, label: status === 'resolved' ? '위치 기록' : '위치 확인 중', provider: 'vworld' };
}

function _formatVworldPlace(result = null) {
  const structure = result?.structure || {};
  const city = structure.level1 || '';
  const district = structure.level2 || '';
  const legalDong = structure.level4L || structure.level3 || '';
  const adminDong = structure.level4A || '';
  const dong = adminDong || legalDong;
  const label = [dong, district, city].filter(Boolean).join(', ');
  if (!label) return null;
  return {
    label,
    adminArea: { city, district, dong, legalDong, adminDong },
  };
}

export async function resolveRunningPlaceSummary(summary) {
  const center = summary?.centroid;
  if (!Number.isFinite(Number(center?.lat)) || !Number.isFinite(Number(center?.lng))) return _runningPlaceFallback(summary, 'unavailable');
  const config = readRunningMapConfig();
  const key = config?.key;
  if (!key) return _runningPlaceFallback(summary, 'unavailable');
  const point = `${encodeURIComponent(center.lng)},${encodeURIComponent(center.lat)}`;
  const url = `https://api.vworld.kr/req/address?service=address&request=getAddress&version=2.0&crs=epsg:4326&point=${point}&format=json&type=BOTH&zipcode=false&simple=false&key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`vworld status ${res.status}`);
    const json = await res.json();
    const results = Array.isArray(json?.response?.result) ? json.response.result : [];
    const parsed = _formatVworldPlace(results.find(item => item?.type === 'parcel') || results[0]);
    if (!parsed) return _runningPlaceFallback(summary, 'unavailable');
    return {
      status: 'resolved',
      label: parsed.label,
      provider: 'vworld',
      point: center,
      adminArea: parsed.adminArea,
    };
  } catch (e) {
    console.warn('[running-session] place lookup failed:', e);
    return _runningPlaceFallback(summary, 'unavailable');
  }
}

async function _ensureRunningPlaceSummary(summary) {
  if (_session.placeSummary?.status === 'resolved') return _session.placeSummary;
  if (!_session.placePromise) {
    _session.placePromise = resolveRunningPlaceSummary(summary).then((place) => {
      _session.placeSummary = place;
      _session.placePromise = null;
      _persistRunningDraft('place resolved');
      return place;
    });
  }
  return _session.placePromise;
}

function _syncWorkoutRunData(summary, placeSummary = _session.placeSummary) {
  const durationMin = Math.floor(summary.durationSec / 60);
  const durationSec = summary.durationSec % 60;
  S.workout.running = !!(summary.distanceKm > 0 || summary.durationSec > 0 || summary.pointCount > 0);
  S.workout.sessionIndex = RUNNING_WORKOUT_SESSION_INDEX;
  S.workout.sessionId = 'running-track';
  S.workout.runData = {
    ...(S.workout.runData || {}),
    distance: summary.distanceKm,
    durationMin,
    durationSec,
    memo: '',
    source: 'gps',
    startedAt: summary.startedAt || null,
    endedAt: summary.endedAt || null,
    route: downsampleRunningRoute(_session.route),
    routeSummary: summary,
    placeSummary: placeSummary || _runningPlaceFallback(summary),
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
    pendingGapReason: '',
    previewPoint: null,
    previewRequested: false,
    mapRenderSeq: _session.mapRenderSeq + 1,
    lastError: '',
    saving: false,
    placeSummary: null,
    placePromise: null,
    goal: { ...DEFAULT_RUNNING_GOAL },
    goalSheetOpen: false,
    audioGuide: true,
    announcedSplits: 0,
    announcedGoalHalf: false,
    announcedGoalDone: false,
    lastSpeechAt: 0,
  });
}

function _publishRunningLiveState(active = false) {
  const route = downsampleRunningRoute(_session.route, MAX_ROUTE_POINTS);
  const routeSummary = route.length
    ? summarizeRunningRoute(_session.route, {
      startedAt: _session.startedAt || route[0]?.ts || _now(),
      endedAt: _session.endedAt || _now(),
      pausedMs: _session.pausedMs,
    })
    : null;
  const detail = {
    active: !!active,
    phase: _session.phase,
    startedAt: _session.startedAt || null,
    updatedAt: _now(),
    pointCount: route.length,
    route,
    routeSummary,
    placeSummary: _session.placeSummary || (routeSummary ? _runningPlaceFallback(routeSummary) : null),
    previewPoint: _session.previewPoint || route[route.length - 1] || null
  };
  if (typeof window !== 'undefined') window.__tomatoRunningLive = detail;
  if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('life-zone:running-live', { detail }));
  }
  const shouldResolvePlace = active
    && routeSummary?.centroid
    && !_session.placePromise
    && _session.placeSummary?.status !== 'resolved'
    && _session.placeSummary?.status !== 'unavailable';
  if (shouldResolvePlace) {
    _ensureRunningPlaceSummary(routeSummary).then(() => {
      if (_session.open && (_session.phase === 'active' || _session.phase === 'paused')) {
        _publishRunningLiveState(true);
      }
    });
  }
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
    if (_session.open && (_session.phase === 'active' || _session.phase === 'paused')) {
      _checkRunningAudioCues();
      _render();
    }
  }, 1000);
}

function _positionToPoint(position) {
  const coords = position?.coords || {};
  const sensor = _readRunningSensorSnapshot(position);
  return _safePoint({
    lat: coords.latitude,
    lng: coords.longitude,
    ts: position?.timestamp || _now(),
    accuracy: coords.accuracy,
    altitude: coords.altitude ?? sensor.altitude,
    speed: coords.speed,
    heartRateBpm: sensor.heartRateBpm,
    cadenceSpm: sensor.cadenceSpm,
  });
}

function _markRouteGap(reason = 'interruption') {
  if (!_session.open || !_session.route.length) return false;
  if (_session.phase !== 'active' && _session.phase !== 'paused') return false;
  _session.pendingGapReason = _routeGapReason(reason) || 'interruption';
  return true;
}

function _pushRoutePoint(point, options = {}) {
  const safe = _safePoint(point);
  if (!safe) return false;

  const last = _session.route[_session.route.length - 1];
  const pendingReason = _routeGapReason(options.gapReason) || _routeGapReason(_session.pendingGapReason);
  const elapsedGap = last ? safe.ts - _num(last.ts, safe.ts) : 0;
  const gapReason = last && (options.gapBefore || pendingReason || elapsedGap > ROUTE_GAP_MS)
    ? pendingReason || (elapsedGap > ROUTE_GAP_MS ? 'time-gap' : 'resume')
    : '';

  if (last && !gapReason && !options.force && runningDistanceMeters(last, safe) < MIN_ROUTE_STEP_M) return false;

  const segmentId = last ? _routeSegmentId(last, 0) + (gapReason ? 1 : 0) : 0;
  const stored = { ...safe, segmentId };
  if (gapReason) {
    stored.gapBefore = true;
    stored.gapReason = gapReason;
  }
  _session.route.push(stored);
  _session.pendingGapReason = '';
  if (_session.route.length > MAX_ROUTE_POINTS * 2) {
    _session.route = downsampleRunningRoute(_session.route, MAX_ROUTE_POINTS);
  }
  return true;
}

function _requestActiveSeedPosition() {
  if (typeof navigator === 'undefined' || !navigator.geolocation?.getCurrentPosition) return;
  navigator.geolocation.getCurrentPosition(
    position => {
      if (!_session.open || _session.phase !== 'active' || _session.route.length) return;
      _pushPosition(position, { force: true });
      _render();
    },
    () => {},
    GEO_OPTIONS
  );
}

function _seedRunningStartPoint() {
  if (_session.previewPoint && _pushRoutePoint(_session.previewPoint, { force: true })) return;
  _requestActiveSeedPosition();
}

function _readRunningSensorSnapshot(position = null) {
  if (typeof window === 'undefined') return {};
  const providers = [
    window.__tomatoRunningSensorSnapshot,
    window.__tomatoRunningSensors?.snapshot,
    window.__tomatoRunningSensors?.getSnapshot,
    window.TomatoRunningSensors?.getSnapshot,
  ].filter(Boolean);
  for (const provider of providers) {
    try {
      const raw = typeof provider === 'function'
        ? provider({ position, phase: _session.phase, startedAt: _session.startedAt })
        : provider;
      if (!raw || typeof raw !== 'object') continue;
      return {
        altitude: _optionalFiniteNumber(raw.altitudeM ?? raw.altitude),
        heartRateBpm: _optionalNumber(raw.heartRateBpm ?? raw.heartRate ?? raw.bpm),
        cadenceSpm: _optionalNumber(raw.cadenceSpm ?? raw.cadence ?? raw.stepsPerMinute),
      };
    } catch (e) {
      console.warn('[running-session] sensor snapshot skipped:', e);
    }
  }
  return {};
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

function _pushPosition(position, options = {}) {
  const point = _positionToPoint(position);
  if (!_pushRoutePoint(point, options)) return;
  _publishRunningLiveState(true);
  _persistRunningDraft('route point');
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
      if (_session.phase === 'active') _markRouteGap('gps-error');
      _render();
    },
    GEO_OPTIONS
  );
}

function _startRun() {
  const goal = _cloneRunningGoal(_session.goal);
  const audioGuide = !!_session.audioGuide;
  const previewPoint = _session.previewPoint;
  _resetLiveSession();
  _session.goal = goal;
  _session.audioGuide = audioGuide;
  _session.previewPoint = previewPoint;
  _session.open = true;
  _session.phase = 'active';
  _session.startedAt = _now();
  _session.pausedMs = 0;
  _seedRunningStartPoint();
  _startWatch();
  _startTicker();
  _publishRunningLiveState(true);
  _render();
  const goalText = _session.goal.type === 'free' ? '' : `${_runningGoalLabel(_session.goal)} 목표 `;
  _speakRunning(`${goalText}러닝을 시작합니다.`, { force: true });
  _persistRunningDraft('start');
}

function _pauseRun() {
  if (_session.phase !== 'active') return;
  _session.phase = 'paused';
  _session.pausedAt = _now();
  _markRouteGap('pause');
  _stopWatch();
  _publishRunningLiveState(true);
  _render();
  _speakRunning('러닝을 일시정지했습니다.', { force: true });
  _persistRunningDraft('pause');
}

function _resumeRun() {
  if (_session.phase !== 'paused') return;
  if (_session.pausedAt) _session.pausedMs += Math.max(0, _now() - _session.pausedAt);
  _session.phase = 'active';
  _session.pausedAt = null;
  _startWatch();
  _publishRunningLiveState(true);
  _render();
  _speakRunning('러닝을 다시 시작합니다.', { force: true });
  _persistRunningDraft('resume');
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
  const summary = _currentSummary();
  _session.placeSummary = _runningPlaceFallback(summary);
  _syncWorkoutRunData(summary);
  _publishRunningLiveState(false);
  _render();
  _speakRunning(`러닝 완료. ${summary.distanceKm.toFixed(2)}킬로미터, 시간 ${_runningSpeechDuration(summary.durationSec)}, ${_runningSpeechPace(summary)}`, { force: true });
  _persistRunningDraft('finish');
  _ensureRunningPlaceSummary(summary).then((place) => {
    _syncWorkoutRunData(_currentSummary(), place);
    _persistRunningDraft('finish place resolved');
    if (_session.open && _session.phase === 'summary') _render();
  });
}

async function _saveSummary() {
  if (_session.saving) return;
  _session.saving = true;
  const summary = _currentSummary();
  const draft = _readRunningDraft();
  const targetDateKey = draft
    ? _ensureRunningWorkoutDate(draft.dateKey, { allowCurrent: false })
    : _workoutDateKeyFromState();
  const targetSessionIndex = _workoutSessionIndexFromState();
  const placeSummary = await _ensureRunningPlaceSummary(summary);
  _syncWorkoutRunData(summary, placeSummary);
  _render();
  try {
    if (!targetDateKey) throw new Error('running save skipped: restored workout date is unavailable');
    const { saveWorkoutDay } = await import('./save.js');
    const saved = await saveWorkoutDay({ silent: true });
    if (!saved) throw new Error('running save skipped: workout date is unavailable or invalid');
    await _showToast('러닝 기록 저장 완료', 2200, 'success');
  } catch (e) {
    console.error('[running-session] save failed:', e);
    _session.saving = false;
    _render();
    return;
  }
  wtCloseRunningSession();
  if (targetDateKey && typeof window.wtOpenWorkoutDaySheet === 'function') {
    try {
      await window.wtOpenWorkoutDaySheet(targetDateKey, targetSessionIndex, {
        history: 'replace',
        action: 'running:save-detail',
      });
    } catch (e) {
      console.warn('[running-session] saved but detail sheet open failed:', e);
    }
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

function _renderStartOptions() {
  const audioLabel = _session.audioGuide ? '켜짐' : '꺼짐';
  return `
    <div class="wt-run-start-options">
      <button type="button" data-running-action="goal">
        <span>${_runningGoalShortType()}</span>
        <strong>${_escapeHtml(_runningGoalLabel())}</strong>
      </button>
      <button type="button" class="${_session.audioGuide ? 'active' : ''}" data-running-action="audio-toggle" aria-pressed="${_session.audioGuide ? 'true' : 'false'}">
        <span>음성 안내</span>
        <strong>${audioLabel}</strong>
      </button>
    </div>
  `;
}

function _renderGoalProgress(summary) {
  const progress = _runningGoalProgress(summary);
  if (!progress.active) return '';
  const pct = Math.round(progress.ratio * 100);
  const goalLabel = _runningGoalLabel();
  const remaining = _runningGoalRemainingLabel(progress);
  return `
    <div class="wt-run-goal-progress" aria-label="${_escapeHtml(`${goalLabel} ${pct}%`)}">
      <div class="wt-run-goal-progress-head">
        <span>${_escapeHtml(goalLabel)}</span>
        <strong>${pct}%</strong>
      </div>
      <div class="wt-run-goal-progress-bar"><i style="width:${pct}%"></i></div>
      <p>${_escapeHtml(remaining)}</p>
    </div>
  `;
}

function _renderGoalSheet() {
  const goal = _cloneRunningGoal(_session.goal);
  const distanceValue = goal.type === 'distance' ? goal.value : RUNNING_GOAL_DEFAULTS.distance;
  const timeValue = goal.type === 'time' ? goal.value : RUNNING_GOAL_DEFAULTS.time;
  const checked = type => goal.type === type ? 'checked' : '';
  return `
    <div class="wt-run-goal-sheet-backdrop" data-running-action="goal-close" aria-hidden="true"></div>
    <form class="wt-run-goal-sheet" data-running-goal-sheet>
      <header>
        <div>
          <span>러닝 목표</span>
          <strong>목표와 음성 안내</strong>
        </div>
        <button type="button" class="wt-run-icon-btn" data-running-action="goal-close" aria-label="닫기">×</button>
      </header>
      <div class="wt-run-goal-modes" role="radiogroup" aria-label="러닝 목표 종류">
        <label><input type="radio" name="running-goal-type" value="free" ${checked('free')}><span>자유</span></label>
        <label><input type="radio" name="running-goal-type" value="distance" ${checked('distance')}><span>거리</span></label>
        <label><input type="radio" name="running-goal-type" value="time" ${checked('time')}><span>시간</span></label>
      </div>
      <div class="wt-run-goal-fields">
        <label>
          <span>거리 목표</span>
          <input id="wt-run-goal-distance" type="number" inputmode="decimal" min="0.1" max="99.99" step="0.1" value="${_escapeHtml(distanceValue)}">
          <i>km</i>
        </label>
        <label>
          <span>시간 목표</span>
          <input id="wt-run-goal-time" type="number" inputmode="numeric" min="1" max="999" step="1" value="${_escapeHtml(timeValue)}">
          <i>분</i>
        </label>
      </div>
      <label class="wt-run-audio-row">
        <input type="checkbox" name="running-audio-guide" ${_session.audioGuide ? 'checked' : ''}>
        <span>
          <strong>음성 안내</strong>
          <em>시작, 1km split, 목표 절반/완료, 종료를 안내</em>
        </span>
      </label>
      <footer>
        <button type="button" data-running-action="goal-close">취소</button>
        <button type="button" data-running-action="goal-save">저장</button>
      </footer>
    </form>
  `;
}

function _readRunningGoalForm() {
  const root = _root();
  const sheet = root?.querySelector?.('[data-running-goal-sheet]');
  const type = sheet?.querySelector?.('input[name="running-goal-type"]:checked')?.value || 'free';
  const valueSource = type === 'distance'
    ? sheet?.querySelector?.('#wt-run-goal-distance')?.value
    : sheet?.querySelector?.('#wt-run-goal-time')?.value;
  return {
    goal: _sanitizeRunningGoal(type, valueSource),
    audioGuide: !!sheet?.querySelector?.('input[name="running-audio-guide"]')?.checked,
  };
}

function _saveRunningGoalForm() {
  const next = _readRunningGoalForm();
  _session.goal = next.goal;
  _session.audioGuide = next.audioGuide;
  _session.goalSheetOpen = false;
  _render();
  _persistRunningDraft('goal save');
  const label = _session.goal.type === 'free' ? '자유 러닝' : `${_runningGoalLabel(_session.goal)} 목표`;
  _showToast(`${label}로 설정했어요`, 1800, 'success');
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
      ${_renderStartOptions()}
      <div class="wt-run-start-map">
        ${_renderRealMapShell('start', '러닝 지도')}
        <button type="button" class="wt-run-start-btn" data-running-action="start">시작</button>
        <button type="button" class="wt-run-goal-btn" data-running-action="goal">목표 설정</button>
      </div>
    </section>
  `;
}

function _renderProgress() {
  const summary = _currentSummary();
  const elapsed = _elapsedSec();
  const isPaused = _session.phase === 'paused';
  const pace = summary.distanceKm > 0 ? formatRunningPace(elapsed / summary.distanceKm) : "--'--''";
  const bpm = _latestRouteMetric('heartRateBpm');
  const error = _session.lastError ? `<div class="wt-run-gps-note">${_escapeHtml(_session.lastError)}</div>` : '';
  return `
    <section class="wt-running-screen wt-running-screen--progress" data-running-screen="progress">
      <div class="wt-run-live-stats">
        <div><b>${pace}</b><span>페이스</span></div>
        <div><b>${bpm ?? '--'}</b><span>BPM</span></div>
        <div><b>${formatRunningDuration(elapsed)}</b><span>시간</span></div>
      </div>
      ${_renderGoalProgress(summary)}
      <main class="wt-run-live-main">
        <div class="wt-run-live-heart">
          <strong>${bpm ?? '--'}</strong>
          <span>분당 심박수</span>
          ${error}
        </div>
      </main>
      <div class="wt-run-live-actions">
        <button type="button" class="wt-run-live-btn" data-running-action="${isPaused ? 'resume' : 'pause'}" aria-label="${isPaused ? '재개' : '일시정지'}">${isPaused ? '▶' : 'Ⅱ'}</button>
        ${isPaused ? '<button type="button" class="wt-run-finish-btn" data-running-action="finish">종료</button>' : ''}
      </div>
      <footer class="wt-run-music-bar">
        <span class="wt-run-muted-music">♩</span>
        <strong>선택된 음악 없음</strong>
        <span>♫</span>
      </footer>
    </section>
  `;
}

function _latestRouteMetric(key) {
  for (let i = _session.route.length - 1; i >= 0; i -= 1) {
    const value = _optionalNumber(_session.route[i]?.[key]);
    if (value != null) return Math.round(value);
  }
  return null;
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
  const location = _session.placeSummary?.label || _runningPlaceFallback(summary).label;
  const elevation = summary.elevationGainM == null ? '--' : `${Math.round(summary.elevationGainM)} m`;
  const heartRate = summary.avgHeartRateBpm == null ? '--' : `${Math.round(summary.avgHeartRateBpm)}`;
  const cadence = summary.cadenceSpm == null ? '--' : `${Math.round(summary.cadenceSpm)}`;
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
          <div><b>${elevation}</b><span>고도 상승</span></div>
          <div><b>${heartRate}</b><span>평균 심박수</span></div>
          <div><b>${cadence}</b><span>케이던스</span></div>
        </div>
        <div class="wt-run-summary-map">
          ${_renderRealMapShell('summary', location)}
          <div class="wt-run-summary-map-label">${_escapeHtml(location)}</div>
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
  let screen = '';
  if (_session.phase === 'active' || _session.phase === 'paused') screen = _renderProgress();
  else if (_session.phase === 'summary') screen = _renderSummary();
  else screen = _renderStart();
  root.innerHTML = `${screen}${_session.goalSheetOpen ? _renderGoalSheet() : ''}`;
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
  if (action === 'goal') {
    if (_session.phase !== 'start') return _showToast('러닝 중에는 시작 전 목표를 유지해요', 1800, 'info');
    _session.goalSheetOpen = true;
    return _render();
  }
  if (action === 'goal-close') {
    _session.goalSheetOpen = false;
    return _render();
  }
  if (action === 'goal-save') return _saveRunningGoalForm();
  if (action === 'audio-toggle') {
    _session.audioGuide = !_session.audioGuide;
    _render();
    return _showToast(`음성 안내 ${_session.audioGuide ? '켜짐' : '꺼짐'}`, 1500, 'info');
  }
  if (action === 'settings') return _showToast('러닝 설정은 준비 중이에요', 1800, 'info');
  if (action === 'music') return _showToast('음악 연동은 준비 중이에요', 1800, 'info');
}

export function initRunningSession() {
  const root = _root();
  _bindRunningDraftEvents();
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
  if (wtRestoreRunningSessionIfActive()) return;
  _resetLiveSession();
  S.workout.sessionIndex = RUNNING_WORKOUT_SESSION_INDEX;
  S.workout.sessionId = 'running-track';
  _session.open = true;
  _session.phase = 'start';
  _render();
}

export function wtRestoreRunningSessionIfActive() {
  initRunningSession();
  return _restoreRunningDraftIfAvailable();
}

export function wtCloseRunningSession() {
  const root = _root();
  if (root) destroyRunningMaps(root);
  _clearRunningDraft();
  _resetLiveSession();
  _session.open = false;
  _publishRunningLiveState(false);
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
