// ================================================================
// render-calendar.js — 캘린더 탭
// 월별 그리드로 일자별 100점 만점 점수 + (섭취kcal/소모kcal/체중) 표시
// ================================================================

import {
  getCache,
  getBodyCheckins,
  getDietPlan,
  getExList,
  getMuscleParts,
  getLatestCheckinWeight,
  saveDay,
} from './data.js';
import {
  calcDietMetrics,
  getDayTargetKcal,
  calcBurnedKcal,
  calcDayScore,
  getTrackMetricHistory,
  normalizeWorkoutTrack,
  estimateSet1RM,
  SUBPATTERN_TO_MAJOR,
} from './calc.js';
import { calcSetVolume } from './calc/volume.js';
import { MOVEMENTS } from './config.js';
import { dateKey, TODAY, isFuture, isBeforeStart } from './data/data-date.js';
import { openModal, closeModal } from './utils/dom.js';
import { confirmAction } from './utils/confirm-modal.js';
import {
  getWorkoutSessions,
  hasWorkoutSessionData,
  upsertWorkoutSession,
  deleteWorkoutSession,
} from './workout/sessions.js';
import { deriveDietSuccessFromWorkout } from './workout/cross-domain.js';

// ═════════════════════════════════════════════════════════════
// 뷰 상태
// ═════════════════════════════════════════════════════════════
let _viewYear  = TODAY.getFullYear();
let _viewMonth = TODAY.getMonth();
let _calendarMode = 'summary';
let _workoutHomeSelectedKey = dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
let _workoutHomeView = 'month';
let _workoutHomeSheetState = 'bar';
let _workoutHomeSessionIndex = 0;
let _workoutHomeSuppressSheetClickUntil = 0;
const _workoutDetailCollapsed = new Set();
let _workoutTrackGraphSeq = 0;
const WORKOUT_HOME_SHEET_STATES = ['bar', 'full'];
const WORKOUT_HOME_SHEET_CLASS_STATES = ['bar', 'mid', 'full'];
const WORKOUT_HOME_SHEET_POST_DRAG_CLICK_SUPPRESS_MS = 900;
const WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX = 10;
const WORKOUT_HOME_SHEET_DRAG_OPEN_RATIO = 0.1;
const WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX = 220;
const WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO = 0.35;
const WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY = 0.55;

const MAX_WEAK_LABEL = {
  chest_upper:'가슴 상부', chest_lower:'가슴 하부',
  back_width:'등 넓이', back_thickness:'등 두께',
  shoulder_side:'어깨 측면', rear_delt:'어깨 후면',
  bicep:'이두', tricep:'삼두', core:'복근',
  hamstring:'햄스트링', glute:'둔근', calf:'종아리',
};

const CALENDAR_MODES = new Set(['summary', 'workout']);

function _esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function _num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function _fmtNum(value, digits = 1) {
  const n = _num(value);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * (10 ** digits)) / (10 ** digits));
}

function _isActualWorkoutSet(set) {
  if (!set || set.setType === 'warmup') return false;
  if (set.done === true) return true;
  if (set.done === false) return false;
  return _num(set.kg) > 0 && _num(set.reps) > 0;
}

function _formatSetText(set) {
  const kg = _num(set?.kg);
  const reps = _num(set?.reps);
  const rpe = _num(set?.rpe);
  const base = [
    kg > 0 ? `${_fmtNum(kg)}kg` : '',
    reps > 0 ? `${_fmtNum(reps)}회` : '',
  ].filter(Boolean).join(' x ');
  const rpeText = rpe > 0 ? ` · RPE ${_fmtNum(rpe)}` : '';
  return `${base || '세트 기록'}${rpeText}`;
}

function _formatDuration(seconds) {
  const sec = Math.max(0, Math.round(_num(seconds)));
  if (sec <= 0) return '시간 미기록';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

function _formatDurationShort(seconds) {
  const sec = Math.max(0, Math.round(_num(seconds)));
  if (sec <= 0) return '—';
  if (sec < 60) return `${sec}초`;
  return `${Math.round(sec / 60)}분`;
}

function _formatVolume(value) {
  const volume = Math.round(_num(value));
  if (volume <= 0) return '—';
  if (volume >= 10000) return `${Math.round(volume / 1000).toLocaleString()}k`;
  return volume.toLocaleString();
}

function _parseDateKey(key) {
  const parts = String(key || '').split('-').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
  return { y: parts[0], m: parts[1] - 1, d: parts[2] };
}

function _dateFromKey(key) {
  const p = _parseDateKey(key);
  return p ? new Date(p.y, p.m, p.d) : null;
}

function _isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function _formatWorkoutWeekHours(seconds) {
  const sec = Math.max(0, Math.round(_num(seconds)));
  if (sec <= 0) return '—';
  const hours = Math.round((sec / 3600) * 10) / 10;
  return `${String(hours).replace(/\.0$/, '')}h`;
}

function _dateDistanceLabel(key) {
  const target = _dateFromKey(key);
  if (!target) return '';
  const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return '오늘';
  if (diff > 0) return `${diff}일 전`;
  return `${Math.abs(diff)}일 후`;
}

function _dateTitle(key) {
  const p = _parseDateKey(key);
  if (!p) return key || '';
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

function _isTodayKey(key) {
  return key === dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
}

function _sessionLabel(index) {
  return `${Number(index) + 1}회차`;
}

function _workoutRecordOrdinalForKey(cache, selectedKey, plan, checkins, lookup) {
  const keys = Object.keys(cache || {})
    .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .filter(key => key <= selectedKey)
    .sort();
  let count = 0;
  keys.forEach((key) => {
    const bodyWeight = _weightAt(checkins, key) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
    if (_workoutMetrics(key, cache[key] || {}, bodyWeight, lookup).hasWorkout) count += 1;
  });
  return count;
}

function _openWorkoutEditorForSession(key, sessionIndex = 0) {
  const p = _parseDateKey(key);
  if (!p) return;
  window.__wtTargetSessionIndex = Math.max(0, Math.floor(Number(sessionIndex) || 0));
  window.openWorkoutTab?.(p.y, p.m, p.d);
}

async function _loadWorkoutEditorForSession(key, sessionIndex = 0) {
  const p = _parseDateKey(key);
  if (!p) return false;
  window.__wtTargetSessionIndex = Math.max(0, Math.floor(Number(sessionIndex) || 0));
  if (typeof window.switchTab === 'function') {
    await window.switchTab('workout', { workoutDate: { y: p.y, m: p.m, d: p.d } });
    return true;
  }
  if (typeof window.openWorkoutTab === 'function') {
    window.openWorkoutTab(p.y, p.m, p.d);
    await new Promise(resolve => setTimeout(resolve, 0));
    return true;
  }
  return false;
}

function _clonePlain(value) {
  if (value == null) return value;
  try { return JSON.parse(JSON.stringify(value)); }
  catch { return value; }
}

function _workoutHomeDay(key) {
  return (getCache() || {})[key] || {};
}

function _workoutHomeSessionAt(key, sessionIndex, minCount = 1) {
  const day = _workoutHomeDay(key);
  const index = Math.max(0, Math.floor(Number(sessionIndex) || 0));
  const sessions = getWorkoutSessions(day, { minCount: Math.max(minCount, index + 1) });
  return {
    day,
    sessions,
    index,
    session: sessions[index] || sessions[0] || {},
  };
}

function _workoutSessionSavePayload(result) {
  return {
    ...result.aggregate,
    workoutSessions: result.workoutSessions,
  };
}

function _hasWorkoutHomeMealRecord(day, mealKey) {
  const textKey = mealKey;
  const foodsKey = `${mealKey[0]}Foods`;
  const kcalKey = `${mealKey[0]}Kcal`;
  const skipKey = `${mealKey}_skipped`;
  if (day?.[skipKey]) return true;
  if (String(day?.[textKey] || '').trim()) return true;
  if (Array.isArray(day?.[foodsKey]) && day[foodsKey].length > 0) return true;
  return _num(day?.[kcalKey]) > 0;
}

function _mealOkPatchForWorkoutHomeDay(key, existingDay, aggregate) {
  const p = _parseDateKey(key);
  if (!p) return {};
  try {
    const diet = {
      bKcal: existingDay.bKcal || 0,
      lKcal: existingDay.lKcal || 0,
      dKcal: existingDay.dKcal || 0,
      sKcal: existingDay.sKcal || 0,
    };
    const isDietSuccess = deriveDietSuccessFromWorkout(aggregate, diet, { y: p.y, m: p.m, d: p.d }, aggregate.exercises || []);
    return {
      bOk: _hasWorkoutHomeMealRecord(existingDay, 'breakfast')
        ? (existingDay.breakfast_skipped ? true : isDietSuccess) : null,
      lOk: _hasWorkoutHomeMealRecord(existingDay, 'lunch')
        ? (existingDay.lunch_skipped ? true : isDietSuccess) : null,
      dOk: _hasWorkoutHomeMealRecord(existingDay, 'dinner')
        ? (existingDay.dinner_skipped ? true : isDietSuccess) : null,
      sOk: _hasWorkoutHomeMealRecord(existingDay, 'snack') ? isDietSuccess : null,
    };
  } catch (e) {
    console.warn('[workout-calendar] meal ok recompute skipped:', e);
    return {};
  }
}

async function _saveWorkoutHomeSessionResult(key, result) {
  const existingDay = _workoutHomeDay(key);
  const payload = {
    ..._workoutSessionSavePayload(result),
    ..._mealOkPatchForWorkoutHomeDay(key, existingDay, result.aggregate || {}),
  };
  await saveDay(key, payload, { mode: 'merge', rethrow: true });
  _workoutDetailCollapsed.clear();
  renderWorkoutCalendarHome();
  document.dispatchEvent(new CustomEvent('sheet:saved'));
}

function _durationFromMinSec(min, sec) {
  return Math.max(0, Math.round((_num(min) * 60) + _num(sec)));
}

function _renderCalendarModeTabs() {
  return `
    <div class="cal-mode-tabs" role="tablist" aria-label="캘린더 보기">
      <button type="button" class="cal-mode-tab ${_calendarMode === 'summary' ? 'active' : ''}"
        role="tab" aria-selected="${_calendarMode === 'summary'}" onclick="window._calSetMode('summary')">종합</button>
      <button type="button" class="cal-mode-tab ${_calendarMode === 'workout' ? 'active' : ''}"
        role="tab" aria-selected="${_calendarMode === 'workout'}" onclick="window._calSetMode('workout')">운동</button>
    </div>
  `;
}

function _setCalendarMode(mode) {
  if (!CALENDAR_MODES.has(mode)) return;
  _calendarMode = mode;
  renderCalendar();
}

// ═════════════════════════════════════════════════════════════
// 체중 시계열 유틸
// ═════════════════════════════════════════════════════════════
function _sortedCheckins() {
  return (getBodyCheckins() || [])
    .filter(c => c?.date && typeof c.weight === 'number' && isFinite(c.weight))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function _weightAt(sortedCheckins, key) {
  for (let i = sortedCheckins.length - 1; i >= 0; i--) {
    if (sortedCheckins[i].date <= key) return sortedCheckins[i].weight;
  }
  return null;
}

function _shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(n => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function _maxWeakMetrics(day) {
  const meta = day?.maxMeta;
  if (!meta || meta.mode !== 'max') return null;
  const block = meta.weakBlock || {};
  const activeAdd = block.activeStartedAt ? Math.max(0, Math.floor((Date.now() - block.activeStartedAt) / 1000)) : 0;
  const durationSec = Math.max(0, Math.floor(Number(block.durationSec) || 0) + activeAdd);
  const summary = meta.weakSummary || {};
  const sets = Math.max(0, Number(summary.sets) || 0);
  const volume = Math.max(0, Math.round(Number(summary.volume) || 0));
  const selected = Array.isArray(meta.selectedWeakParts) ? meta.selectedWeakParts : [];
  const bonus = Math.min(5, Math.floor(durationSec / 600) + Math.floor(sets / 4));
  return {
    durationSec,
    durationMin: Math.floor(durationSec / 60),
    sets,
    volume,
    selected,
    bonus,
    hasAny: durationSec > 0 || sets > 0 || selected.length > 0,
  };
}

// ═════════════════════════════════════════════════════════════
// 한 날짜의 전체 메트릭 계산
// ═════════════════════════════════════════════════════════════
function _dayMetrics(key, day, plan, metrics, checkins) {
  // 체중 (stepwise)
  const weight = _weightAt(checkins, key);
  const bodyWeight = weight != null
    ? weight
    : (getLatestCheckinWeight() ?? plan?.weight ?? 70);

  // 섭취 칼로리
  const kcalIn = (day.bKcal||0) + (day.lKcal||0) + (day.dKcal||0) + (day.sKcal||0);

  // 소모 칼로리 (MET 기반)
  const burned = calcBurnedKcal(day, bodyWeight);

  // 목표 칼로리 & 탄단지
  let targetKcal = 0;
  let macroTarget = null;
  if (plan && plan.weight && plan.height) {
    const [yy, mm, dd] = key.split('-').map(n => parseInt(n, 10));
    try {
      targetKcal = getDayTargetKcal(plan, yy, mm - 1, dd, day);
      const dow = new Date(yy, mm - 1, dd).getDay();
      const isRefeed = (plan.refeedDays || []).includes(dow);
      const macro = isRefeed ? metrics.refeed : metrics.deficit;
      macroTarget = { proteinG: macro.proteinG, carbG: macro.carbG, fatG: macro.fatG };
    } catch (_) { /* plan 불완전 */ }
  }

  // 체중 방향성 (7일전 대비)
  let weightDeltaKg = null;
  let weightDirSign = -1; // 기본: 감량
  if (plan && plan.targetWeight && plan.weight) {
    weightDirSign = plan.targetWeight < plan.weight ? -1
                  : plan.targetWeight > plan.weight ? +1 : 0;
  }
  if (weight != null) {
    const prevKey = _shiftDateKey(key, -7);
    const prevW = _weightAt(checkins, prevKey);
    if (prevW != null) weightDeltaKg = weight - prevW;
  }

  // 점수
  const scoreResult = calcDayScore({
    day, targetKcal, macroTarget, burnedKcal: burned.total,
    weightDeltaKg, weightDirSign,
  });
  const maxWeak = _maxWeakMetrics(day);
  const baseScore = scoreResult.score;
  const score = baseScore != null
    ? Math.min(100, baseScore + (maxWeak?.bonus || 0))
    : baseScore;
  const band =
    score == null ? scoreResult.band :
    score >= 95 ? 'great' :
    score >= 90 ? 'good' :
    score >= 80 ? 'soso' : 'bad';

  return {
    key, day,
    kcalIn, kcalBurned: burned.total, burnedBreakdown: burned,
    weight,
    targetKcal, macroTarget,
    weightDeltaKg, weightDirSign,
    score,
    band,
    breakdown: scoreResult.breakdown,
    maxWeak,
  };
}

function _activityRows(day) {
  const d = day || {};
  const rows = [];

  const runDuration = _durationFromMinSec(d.runDurationMin, d.runDurationSec);
  const runDistance = _num(d.runDistance);
  const runMemo = (d.runMemo || '').toString().trim();
  if (d.running || runDistance > 0 || runDuration > 0 || runMemo) {
    rows.push({
      key: 'running',
      label: '런닝',
      tone: 'run',
      durationSec: runDuration,
      main: [
        runDistance > 0 ? `${_fmtNum(runDistance, 2)}km` : '',
        _formatDuration(runDuration),
      ].filter(Boolean).join(' · '),
      detail: runMemo,
    });
  }

  const swimDuration = _durationFromMinSec(d.swimDurationMin, d.swimDurationSec);
  const swimDistance = _num(d.swimDistance);
  const swimStroke = (d.swimStroke || '').toString().trim();
  const swimMemo = (d.swimMemo || '').toString().trim();
  if (d.swimming || swimDistance > 0 || swimDuration > 0 || swimStroke || swimMemo) {
    rows.push({
      key: 'swimming',
      label: '수영',
      tone: 'swim',
      durationSec: swimDuration,
      main: [
        swimDistance > 0 ? `${_fmtNum(swimDistance, 1)}m` : '',
        _formatDuration(swimDuration),
        swimStroke,
      ].filter(Boolean).join(' · '),
      detail: swimMemo,
    });
  }

  const cfDuration = _durationFromMinSec(d.cfDurationMin, d.cfDurationSec);
  const cfWod = (d.cfWod || '').toString().trim();
  const cfMemo = (d.cfMemo || '').toString().trim();
  if (d.cf || cfDuration > 0 || cfWod || cfMemo) {
    rows.push({
      key: 'cf',
      label: '크로스핏',
      tone: 'cf',
      durationSec: cfDuration,
      main: [
        _formatDuration(cfDuration),
        cfWod,
      ].filter(Boolean).join(' · '),
      detail: cfMemo,
    });
  }

  const stretchDuration = Math.max(0, Math.round(_num(d.stretchDuration) * 60));
  const stretchMemo = (d.stretchMemo || '').toString().trim();
  if (d.stretching || stretchDuration > 0 || stretchMemo) {
    rows.push({
      key: 'stretching',
      label: '스트레칭',
      tone: 'stretch',
      durationSec: stretchDuration,
      main: _formatDuration(stretchDuration),
      detail: stretchMemo,
    });
  }

  return rows;
}

const FALLBACK_MAJOR_LABELS = {
  chest: '가슴',
  back: '등',
  shoulder: '어깨',
  lower: '하체',
  glute: '둔부',
  bicep: '이두',
  tricep: '삼두',
  abs: '복부',
  other: '기타',
};

function _buildWorkoutLookup() {
  return {
    exById: new Map((getExList() || []).filter(Boolean).map(ex => [ex.id, ex])),
    movById: new Map((MOVEMENTS || []).filter(Boolean).map(mv => [mv.id, mv])),
    muscleById: new Map((getMuscleParts() || []).filter(Boolean).map(m => [m.id, m])),
  };
}

function _primaryFromIds(value) {
  return Array.isArray(value) ? value.find(Boolean) : null;
}

function _normalizeMajorId(id) {
  if (!id) return null;
  return SUBPATTERN_TO_MAJOR[id] || id;
}

function _resolveExerciseMajorId(entry, lookup) {
  const lib = lookup?.exById?.get(entry?.exerciseId);
  const primaryId = _primaryFromIds(entry?.muscleIds) || _primaryFromIds(lib?.muscleIds);
  if (primaryId) return _normalizeMajorId(primaryId);

  const movementId = entry?.movementId || lib?.movementId || null;
  const movement = movementId ? lookup?.movById?.get(movementId) : null;
  if (movement?.primary) return movement.primary;
  if (movement?.subPattern) return _normalizeMajorId(movement.subPattern);

  return _normalizeMajorId(entry?.muscleId || lib?.muscleId);
}

function _majorLabel(id, lookup) {
  if (!id) return FALLBACK_MAJOR_LABELS.other;
  return lookup?.muscleById?.get(id)?.name || FALLBACK_MAJOR_LABELS[id] || id;
}

function _partDisplayLabels(exercises, lookup) {
  const byMajor = new Map();
  exercises.forEach((row) => {
    if (row.setCount <= 0) return;
    const id = row.majorId || 'other';
    if (!byMajor.has(id)) {
      byMajor.set(id, {
        id,
        name: _majorLabel(id, lookup),
        setCount: 0,
        volume: 0,
        order: byMajor.size,
      });
    }
    const item = byMajor.get(id);
    item.setCount += row.setCount;
    item.volume += row.volume;
  });
  return [...byMajor.values()]
    .sort((a, b) => (b.setCount - a.setCount) || (b.volume - a.volume) || (a.order - b.order))
    .map(item => ({
      text: `${item.name} ${item.setCount}`,
      title: `${item.name} ${item.setCount}세트`,
    }));
}

function _exerciseRows(day, lookup = _buildWorkoutLookup(), key = null) {
  return (Array.isArray(day?.exercises) ? day.exercises : [])
    .map((entry, originalIndex) => {
      const sets = (Array.isArray(entry?.sets) ? entry.sets : []).filter(_isActualWorkoutSet);
      const note = (entry?.note || '').toString().trim();
      if (!sets.length && !note) return null;
      const volume = sets.reduce((sum, set) => sum + calcSetVolume(set), 0);
      const topSet = [...sets].sort((a, b) => calcSetVolume(b) - calcSetVolume(a))[0] || null;
      const majorId = _resolveExerciseMajorId(entry, lookup);
      const lib = lookup?.exById?.get(entry?.exerciseId);
      return {
        dateKey: key,
        exerciseId: entry?.exerciseId || null,
        name: entry?.name || entry?.exerciseName || entry?.exerciseId || '운동',
        majorId,
        majorName: _majorLabel(majorId, lookup),
        recommendationMeta: entry?.recommendationMeta || null,
        maxPrescription: entry?.maxPrescription || null,
        maxTrackPreference: lib?.maxTrackPreference || null,
        setCount: sets.length,
        volume,
        topSetText: topSet ? _formatSetText(topSet) : '세트 기록 없음',
        setTexts: sets.map(_formatSetText),
        setDetails: sets.map((set, setIndex) => ({
          setIndex,
          kg: _num(set.kg),
          reps: _num(set.reps),
          rpe: _num(set.rpe),
          rir: Number.isFinite(Number(set.rir)) ? Number(set.rir) : null,
          romPct: Number.isFinite(Number(set.romPct)) ? Number(set.romPct) : 100,
          setType: set.setType || 'main',
          done: _isActualWorkoutSet(set),
        })),
        note,
        originalIndex,
      };
    })
    .filter(Boolean);
}

function _workoutMetrics(key, day, bodyWeight, lookup = _buildWorkoutLookup()) {
  const d = day || {};
  const exercises = _exerciseRows(d, lookup, key);
  const activities = _activityRows(d);
  const burned = calcBurnedKcal(d, bodyWeight);
  const workoutDurationSec = Math.max(0, Math.round(_num(d.workoutDuration)));
  const activityDurationSec = activities.reduce((sum, row) => sum + (row.durationSec || 0), 0);
  const gymDurationSec = exercises.length ? workoutDurationSec : 0;
  const durationSec = Math.max(gymDurationSec + activityDurationSec, workoutDurationSec, activityDurationSec);
  const setCount = exercises.reduce((sum, row) => sum + row.setCount, 0);
  const volume = exercises.reduce((sum, row) => sum + row.volume, 0);
  const displayLabels = [
    ..._partDisplayLabels(exercises, lookup),
    ...activities.map(row => ({
      text: row.label,
      title: row.main ? `${row.label} · ${row.main}` : row.label,
    })),
  ].filter(row => row?.text);
  const labels = displayLabels.map(row => row.text);
  const hasWorkout = exercises.length > 0 || activities.length > 0 || workoutDurationSec > 0 || burned.total > 0;
  return {
    key,
    day: d,
    exercises,
    activities,
    burned,
    durationSec,
    workoutDurationSec,
    activityDurationSec,
    setCount,
    volume,
    labels,
    displayLabels,
    primaryLabel: labels[0] || '',
    hasWorkout,
  };
}

function _renderWorkoutCalendar(root, { cache, plan, checkins, y, m, firstDow, daysCount, surface = 'calendar', showModeTabs = true } = {}) {
  let monthSum = { days: 0, durationSec: 0, sets: 0, volume: 0, kcalBurn: 0 };
  const flatCells = [];
  const dayCells = new Map();
  const dayMetrics = new Map();
  const lookup = _buildWorkoutLookup();
  const isWorkoutHome = surface === 'workout-home';
  const openDayFn = isWorkoutHome ? '_wtCalOpenDay' : '_calOpenDay';
  const shiftMonthFn = isWorkoutHome ? '_wtCalShiftMonth' : '_calShiftMonth';
  const goTodayFn = isWorkoutHome ? '_wtCalGoToday' : '_calGoToday';
  const surfaceClass = isWorkoutHome ? 'cal-workout-surface-home' : 'cal-workout-surface-calendar';
  const selectedParsed = _parseDateKey(_workoutHomeSelectedKey);
  const todayKey = dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  if (isWorkoutHome && (!selectedParsed || selectedParsed.y !== y || selectedParsed.m !== m || selectedParsed.d < 1 || selectedParsed.d > daysCount)) {
    const todayInView = TODAY.getFullYear() === y && TODAY.getMonth() === m;
    _workoutHomeSelectedKey = todayInView ? todayKey : dateKey(y, m, 1);
  }

  if (!isWorkoutHome) {
    for (let i = 0; i < firstDow; i++) flatCells.push(`<div class="cal-cell cal-cell-empty"></div>`);
  }

  for (let d = 1; d <= daysCount; d++) {
    const k = dateKey(y, m, d);
    const day = cache[k] || {};
    const future = isFuture(y, m, d);
    const before = isBeforeStart(y, m, d);
    const today = k === todayKey;
    const selected = isWorkoutHome && k === _workoutHomeSelectedKey;
    const disabled = future || before;
    const bodyWeight = _weightAt(checkins, k) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
    const wx = _workoutMetrics(k, day, bodyWeight, lookup);

    if (wx.hasWorkout) {
      monthSum.days += 1;
      monthSum.durationSec += wx.durationSec;
      monthSum.sets += wx.setCount;
      monthSum.volume += wx.volume;
      monthSum.kcalBurn += wx.burned.total;
    }

    const classes = [
      'cal-cell',
      'cal-workout-cell',
      today ? 'cal-cell-today' : '',
      selected ? 'cal-workout-cell-selected' : '',
      disabled ? 'cal-cell-disabled' : '',
      wx.hasWorkout ? 'cal-workout-cell-active' : 'cal-workout-cell-rest',
    ].filter(Boolean).join(' ');
    const onclick = disabled ? '' : `onclick="window.${openDayFn}('${k}')"`;
    const maxLabelLines = isWorkoutHome ? 4 : (wx.durationSec > 0 && wx.setCount > 0 ? 3 : 4);
    const labelLines = wx.displayLabels.slice(0, maxLabelLines);
    const moreCount = Math.max(0, wx.displayLabels.length - labelLines.length);
    const detailHtml = wx.hasWorkout ? `
      <div class="cal-workout-bars">
        ${wx.durationSec > 0 ? `<span class="cal-workout-bar cal-workout-bar-time">${_formatDurationShort(wx.durationSec)}</span>` : ''}
        ${wx.setCount > 0 ? `<span class="cal-workout-bar">${wx.setCount}세트</span>` : ''}
        ${labelLines.map(label => `<span class="cal-workout-bar cal-workout-bar-part" title="${_esc(label.title || label.text)}">${_esc(label.text)}</span>`).join('')}
        ${moreCount > 0 ? `<span class="cal-workout-bar cal-workout-bar-more">+${moreCount}</span>` : ''}
      </div>
      <div class="cal-workout-cell-kcal">${wx.burned.total > 0 ? `${wx.burned.total} kcal` : ''}</div>
    ` : `
      <div class="cal-workout-rest-mark">—</div>
    `;

    const cellHtml = `
      <div class="${classes}" ${onclick}>
        <div class="cal-cell-head">
          <span class="cal-cell-date">${d}</span>
          ${wx.hasWorkout ? `<span class="cal-workout-dot"></span>` : ''}
        </div>
        ${detailHtml}
      </div>
    `;

    if (isWorkoutHome) {
      dayCells.set(d, cellHtml);
      dayMetrics.set(d, wx);
    } else {
      flatCells.push(cellHtml);
    }
  }

  const monthLabel = isWorkoutHome
    ? `${y}.${String(m + 1).padStart(2, '0')}`
    : `${y}년 ${m + 1}월`;
  const weekdays = ['일','월','화','수','목','금','토'];
  const summaryHtml = monthSum.days > 0 ? `
    <div class="cal-month-summary cal-workout-summary">
      <div class="cal-month-avg">
        <span class="cal-month-avg-label">이번 달 운동</span>
        <span class="cal-month-avg-score">${monthSum.days}<span>일</span></span>
      </div>
      <div class="cal-month-side">
        <div><span>총 시간</span><strong>${_formatDurationShort(monthSum.durationSec)}</strong></div>
        <div><span>총 세트</span><strong>${monthSum.sets.toLocaleString()}세트</strong></div>
        <div><span>총 볼륨</span><strong>${_formatVolume(monthSum.volume)} vol</strong></div>
        <div><span>총 소모</span><strong>${monthSum.kcalBurn.toLocaleString()} kcal</strong></div>
      </div>
    </div>
  ` : `
    <div class="cal-month-summary cal-month-empty">
      <span>이번 달 운동 기록이 아직 없어요</span>
    </div>
  `;

  const weekdayHtml = isWorkoutHome ? `
    <div class="cal-weekdays cal-workout-weekdays">
      <div class="cal-week-rail-spacer" aria-hidden="true"></div>
      ${weekdays.map((w, i) => `<div class="cal-wd ${i === 0 ? 'cal-wd-sun' : ''} ${i === 6 ? 'cal-wd-sat' : ''}">${w}</div>`).join('')}
    </div>
  ` : `
    <div class="cal-weekdays">
      ${weekdays.map((w, i) => `<div class="cal-wd ${i === 0 ? 'cal-wd-sun' : ''} ${i === 6 ? 'cal-wd-sat' : ''}">${w}</div>`).join('')}
    </div>
  `;

  const gridHtml = isWorkoutHome
    ? _renderWorkoutHomeMonthGrid({ y, m, firstDow, daysCount, dayCells, dayMetrics })
    : `<div class="cal-grid cal-workout-grid">${flatCells.join('')}</div>`;
  const bottomSheetHtml = isWorkoutHome
    ? _renderWorkoutHomeBottomSheet(_workoutHomeSelectedKey, { cache, plan, checkins, lookup })
    : '';

  root.innerHTML = `
    <div class="cal-workout-surface ${surfaceClass}">
      <div class="cal-header">
        <button class="cal-nav-btn" onclick="window.${shiftMonthFn}(-1)" aria-label="이전 달">‹</button>
        <div class="cal-title">
          <span>${monthLabel}</span>
          <button class="cal-today-btn" onclick="window.${goTodayFn}()">오늘</button>
        </div>
        <button class="cal-nav-btn" onclick="window.${shiftMonthFn}(1)" aria-label="다음 달">›</button>
      </div>

      ${showModeTabs ? _renderCalendarModeTabs() : ''}
      ${summaryHtml}
      ${weekdayHtml}
      ${gridHtml}
      ${bottomSheetHtml}
    </div>
  `;
}

function _renderWorkoutHomeMonthGrid({ y, m, firstDow, daysCount, dayCells, dayMetrics }) {
  const weekRows = [];
  const rowCount = Math.ceil((firstDow + daysCount) / 7);
  for (let row = 0; row < rowCount; row++) {
    const cellHtmls = [];
    let weekDurationSec = 0;
    let weekSets = 0;
    for (let dow = 0; dow < 7; dow++) {
      const day = (row * 7) + dow - firstDow + 1;
      if (day < 1 || day > daysCount) {
        cellHtmls.push(`<div class="cal-cell cal-cell-empty cal-workout-cell cal-workout-cell-outside"></div>`);
        continue;
      }
      const wx = dayMetrics.get(day);
      if (wx?.hasWorkout) {
        weekDurationSec += wx.durationSec || 0;
        weekSets += wx.setCount || 0;
      }
      cellHtmls.push(dayCells.get(day) || `<div class="cal-cell cal-cell-empty cal-workout-cell"></div>`);
    }

    const anchorDay = Math.min(daysCount, Math.max(1, (row * 7) - firstDow + 1));
    const weekNo = _isoWeekNumber(new Date(y, m, anchorDay));
    weekRows.push(`
      <div class="cal-workout-week-row">
        <div class="cal-workout-week-rail">
          <strong>${weekNo}주</strong>
          <span>${_formatWorkoutWeekHours(weekDurationSec)}</span>
          <span>${weekSets > 0 ? `${weekSets}s` : '—'}</span>
        </div>
        <div class="cal-workout-week-cells">
          ${cellHtmls.join('')}
        </div>
      </div>
    `);
  }
  return `<div class="cal-workout-month-grid">${weekRows.join('')}</div>`;
}

function _renderWorkoutHomeDayBar(selectedKey, { cache, plan, checkins, lookup }) {
  const selected = _parseDateKey(selectedKey) ? selectedKey : dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const bodyWeight = _weightAt(checkins, selected) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
  const wx = _workoutMetrics(selected, cache[selected] || {}, bodyWeight, lookup);
  const ordinal = _workoutRecordOrdinalForKey(cache, selected, plan, checkins, lookup);
  const recordText = ordinal > 0 ? `${ordinal}번째 기록` : '운동 기록 없음';
  const sessionText = wx.hasWorkout ? '1회차 보기' : '1회차 없음';
  const sheetState = _currentWorkoutHomeSheetState();
  const expanded = sheetState !== 'bar';
  return `
    <div class="cal-workout-day-bar" data-wt-sheet-handle tabindex="0" aria-expanded="${expanded ? 'true' : 'false'}">
      <span class="cal-workout-day-grip" aria-hidden="true"></span>
      <button type="button" class="cal-workout-day-expand" data-wt-sheet-toggle onclick="window._wtCalToggleSheet('${selected}')" aria-label="${expanded ? '날짜 상세 접기' : '선택한 날짜 열기'}">${expanded ? '⌄' : '⌃'}</button>
      <button type="button" class="cal-workout-day-main" onclick="window._wtCalOpenDay('${selected}')">
        <span class="cal-workout-day-date">${selected} <em>${_dateDistanceLabel(selected)}</em></span>
        <span class="cal-workout-day-sub">${recordText} · ${sessionText}</span>
      </button>
      <div class="cal-workout-day-actions">
        <button type="button" data-wt-sheet-action onclick="window._wtCalGoToday()">오늘</button>
        <button type="button" data-wt-sheet-action onclick="window._wtCalOpenRoutine('${selected}')">루틴</button>
      </div>
    </div>
  `;
}

function _renderWorkoutHomeBottomSheet(selectedKey, { cache, plan, checkins, lookup }) {
  const selected = _parseDateKey(selectedKey) ? selectedKey : dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const sheetState = _currentWorkoutHomeSheetState();
  return `
    <section class="cal-workout-day-sheet is-${sheetState}" data-wt-day-sheet data-wt-sheet-state="${sheetState}" role="dialog" aria-modal="false" aria-expanded="${sheetState !== 'bar' ? 'true' : 'false'}" aria-label="선택 날짜 운동 기록">
      ${_renderWorkoutHomeDayBar(selected, { cache, plan, checkins, lookup })}
      <div class="cal-workout-day-sheet-body">
        ${_renderWorkoutHomeDetailHtml({ cache, plan, checkins, key: selected, includeHead: false })}
      </div>
    </section>
  `;
}

// ═════════════════════════════════════════════════════════════
// 월 이동
// ═════════════════════════════════════════════════════════════
function _shiftMonth(delta) {
  const d = new Date(_viewYear, _viewMonth + delta, 1);
  _viewYear  = d.getFullYear();
  _viewMonth = d.getMonth();
  renderCalendar();
  renderWorkoutCalendarHome();
}

function _goToday() {
  _viewYear  = TODAY.getFullYear();
  _viewMonth = TODAY.getMonth();
  renderCalendar();
  renderWorkoutCalendarHome();
}

// ═════════════════════════════════════════════════════════════
// 렌더
// ═════════════════════════════════════════════════════════════
export function renderCalendar() {
  const root = document.getElementById('calendar-root');
  if (!root) return;

  const cache = getCache() || {};
  const plan = getDietPlan() || null;
  const metrics = (plan && plan.weight && plan.height) ? calcDietMetrics(plan) : null;
  const checkins = _sortedCheckins();

  const y = _viewYear, m = _viewMonth;
  const first = new Date(y, m, 1);
  const firstDow = first.getDay();
  const daysCount = new Date(y, m + 1, 0).getDate();

  if (_calendarMode === 'workout') {
    _renderWorkoutCalendar(root, { cache, plan, checkins, y, m, firstDow, daysCount });
    return;
  }

  // 월내 집계 (상단 요약용)
  let monthSum = { scored: 0, count: 0, kcalIn: 0, kcalBurn: 0 };
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(`<div class="cal-cell cal-cell-empty"></div>`);

  for (let d = 1; d <= daysCount; d++) {
    const k = dateKey(y, m, d);
    const day = cache[k] || {};
    const future = isFuture(y, m, d);
    const before = isBeforeStart(y, m, d);
    const today  = k === dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    const disabled = future || before;

    const mx = _dayMetrics(k, day, plan, metrics, checkins);

    if (mx.score != null) {
      monthSum.scored += mx.score;
      monthSum.count  += 1;
      monthSum.kcalIn += mx.kcalIn;
      monthSum.kcalBurn += mx.kcalBurned;
    }

    const classes = [
      'cal-cell',
      today ? 'cal-cell-today' : '',
      disabled ? 'cal-cell-disabled' : '',
      mx.band ? `cal-cell-band-${mx.band}` : '',
    ].filter(Boolean).join(' ');

    const onclick = disabled ? '' : `onclick="window._calOpenDay('${k}')"`;
    const scoreHtml = mx.score != null
      ? `<div class="cal-score">${mx.score}<span>점</span></div>`
      : `<div class="cal-score cal-score-empty">—</div>`;

    const kcalInTxt   = mx.kcalIn     > 0 ? `${mx.kcalIn.toLocaleString()}` : '—';
    const kcalBurnTxt = mx.kcalBurned > 0 ? `${mx.kcalBurned.toLocaleString()}` : '—';
    const weightTxt   = mx.weight != null ? `${mx.weight.toFixed(1)}` : '—';
    const maxWeakHtml = mx.maxWeak?.hasAny
      ? `<div class="cal-max-weak-mini">약 ${mx.maxWeak.durationMin}분 · ${mx.maxWeak.sets}세트</div>`
      : '';

    const stampHtml = (mx.score != null && mx.score >= 90)
      ? `<img class="cal-stamp" src="./public/characters/tomato-happy.svg" alt="" aria-hidden="true">`
      : '';

    cells.push(`
      <div class="${classes}" ${onclick}>
        ${stampHtml}
        <div class="cal-cell-head">
          <span class="cal-cell-date">${d}</span>
          ${scoreHtml}
        </div>
        <div class="cal-cell-metrics">
          <div class="cal-metric"><span class="cal-metric-label">섭</span><span class="cal-metric-val">${kcalInTxt}</span></div>
          <div class="cal-metric"><span class="cal-metric-label">소</span><span class="cal-metric-val">${kcalBurnTxt}</span></div>
          <div class="cal-metric"><span class="cal-metric-label">체</span><span class="cal-metric-val">${weightTxt}</span></div>
        </div>
        ${maxWeakHtml}
      </div>
    `);
  }

  const monthLabel = `${y}년 ${m + 1}월`;
  const avgScore = monthSum.count > 0 ? Math.round(monthSum.scored / monthSum.count) : null;
  const weekdays = ['일','월','화','수','목','금','토'];

  root.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav-btn" onclick="window._calShiftMonth(-1)" aria-label="이전 달">‹</button>
      <div class="cal-title">
        <span>${monthLabel}</span>
        <button class="cal-today-btn" onclick="window._calGoToday()">오늘</button>
      </div>
      <button class="cal-nav-btn" onclick="window._calShiftMonth(1)" aria-label="다음 달">›</button>
    </div>

    ${_renderCalendarModeTabs()}

    ${avgScore != null ? `
    <div class="cal-month-summary">
      <div class="cal-month-avg">
        <span class="cal-month-avg-label">이번 달 평균</span>
        <span class="cal-month-avg-score">${avgScore}<span>점</span></span>
      </div>
      <div class="cal-month-side">
        <div><span>기록일</span><strong>${monthSum.count}일</strong></div>
        <div><span>총 섭취</span><strong>${monthSum.kcalIn.toLocaleString()} kcal</strong></div>
        <div><span>총 소모</span><strong>${monthSum.kcalBurn.toLocaleString()} kcal</strong></div>
      </div>
    </div>` : `
    <div class="cal-month-summary cal-month-empty">
      <span>이번 달 기록이 아직 없어요</span>
    </div>`}

    <div class="cal-weekdays">
      ${weekdays.map((w, i) => `<div class="cal-wd ${i === 0 ? 'cal-wd-sun' : ''} ${i === 6 ? 'cal-wd-sat' : ''}">${w}</div>`).join('')}
    </div>
    <div class="cal-grid">${cells.join('')}</div>

    <div class="cal-footnote">
      점수 산정 (100점 만점, 최저 70점): 칼로리(12) · 탄단지(5) · 운동 소모(8) · 체중 방향(3) · 기록 완결(2)
    </div>
  `;
}

export function renderWorkoutCalendarHome() {
  const root = document.getElementById('workout-calendar-root');
  if (!root) return;

  const cache = getCache() || {};
  const plan = getDietPlan() || null;
  const checkins = _sortedCheckins();

  const y = _viewYear, m = _viewMonth;
  const first = new Date(y, m, 1);
  const firstDow = first.getDay();
  const daysCount = new Date(y, m + 1, 0).getDate();

  _renderWorkoutCalendar(root, {
    cache,
    plan,
    checkins,
    y,
    m,
    firstDow,
    daysCount,
    surface: 'workout-home',
    showModeTabs: false,
  });
  _bindWorkoutHomeSheetDrag(root);
}

function _renderWorkoutHomeDetail(root, args) {
  root.innerHTML = _renderWorkoutHomeDetailHtml(args);
}

function _renderWorkoutHomeDetailHtml({ cache, plan, checkins, key, includeHead = true }) {
  const lookup = _buildWorkoutLookup();
  const day = cache[key] || {};
  const sessions = getWorkoutSessions(day, { minCount: 3 });
  if (_workoutHomeSessionIndex >= sessions.length) _workoutHomeSessionIndex = Math.max(0, sessions.length - 1);
  const sessionIndex = Math.max(0, _workoutHomeSessionIndex);
  const session = sessions[sessionIndex] || sessions[0] || {};
  const bodyWeight = _weightAt(checkins, key) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
  const wx = _workoutMetrics(key, session, bodyWeight, lookup);
  const ordinal = _workoutRecordOrdinalForKey(cache, key, plan, checkins, lookup);
  const recordText = ordinal > 0 ? `${ordinal}번째 기록` : '운동 기록 없음';
  const sessionTabs = _renderWorkoutDetailSessionTabs(sessions, sessionIndex);
  const content = wx.hasWorkout
    ? _renderWorkoutDetailRecorded(key, sessionIndex, wx)
    : _renderWorkoutDetailEmpty(sessionIndex);
  const headHtml = includeHead ? `
      <div class="wt-day-head">
        <button type="button" class="wt-day-back" onclick="window._wtCalBackToMonth()" aria-label="캘린더로 돌아가기">⌄</button>
        <div class="wt-day-titlebox">
          <div class="wt-day-date">${_dateTitle(key)} <span>${_dateDistanceLabel(key)}</span></div>
          <div class="wt-day-record">${recordText}</div>
        </div>
        ${_renderWorkoutDetailSummaryCard(wx)}
      </div>
  ` : `
      <div class="wt-day-sheet-summary">
        ${_renderWorkoutDetailSummaryCard(wx)}
      </div>
  `;

  return `
    <div class="wt-day-detail">
      ${headHtml}

      <div class="wt-day-sheet-scroll">
        ${content}
      </div>

      <div class="wt-day-sessionbar">
        <div class="wt-day-session-tabs">${sessionTabs}</div>
        <button type="button" class="wt-day-edit" onclick="window._wtCalEditSession('${key}', ${sessionIndex})" aria-label="선택 회차 편집">✎</button>
        <button type="button" class="wt-day-add-inline" onclick="window._wtCalAddSession('${key}')" aria-label="운동 추가">＋</button>
      </div>
    </div>
  `;
}

function _renderWorkoutDetailSummaryCard(wx) {
  const metrics = [
    { label: '운동시간', value: wx?.durationSec ? _formatDurationShort(wx.durationSec) : '—' },
    { label: '세트', value: wx?.setCount ? `${wx.setCount}세트` : '—' },
    { label: '볼륨', value: wx?.volume > 0 ? `${_formatVolume(wx.volume)}톤` : '—' },
  ];
  return `
    <div class="wt-day-summary-card" aria-label="선택한 회차 요약">
      ${metrics.map(item => `
        <span>
          <i>${item.label}</i>
          <strong>${item.value}</strong>
        </span>
      `).join('')}
    </div>
  `;
}

function _renderWorkoutDetailSessionTabs(sessions, activeIndex) {
  return sessions.map((session, index) => {
    const hasRecord = hasWorkoutSessionData(session);
    return `
      <button type="button"
        class="${index === activeIndex ? 'active' : ''} ${hasRecord ? 'has-record' : ''}"
        onclick="window._wtCalSelectSession(${index})">
        ${_sessionLabel(index)}${hasRecord ? '<b></b>' : ''}
      </button>
    `;
  }).join('');
}

function _renderWorkoutDetailRecorded(key, sessionIndex, wx) {
  return `
    <div class="wt-day-recorded">
      ${_renderWorkoutDetailCards(key, sessionIndex, wx)}
    </div>
  `;
}

function _renderWorkoutDetailCards(key, sessionIndex, wx) {
  const cards = [
    ...wx.exercises.map((row, index) => _renderWorkoutExerciseDetailCard(key, sessionIndex, row, index)),
    ...wx.activities.map((row, index) => _renderWorkoutActivityDetailCard(key, sessionIndex, row, index)),
  ];
  return `<div class="wt-day-card-list">${cards.join('')}</div>`;
}

function _formatWorkoutKg(value) {
  const n = _num(value);
  if (n <= 0) return '-';
  return _fmtNum(n, 1);
}

function _formatWorkoutReps(value) {
  const n = _num(value);
  if (n <= 0) return '-';
  return _fmtNum(n, 0);
}

function _formatWorkoutRir(set) {
  if (set?.rir != null && Number.isFinite(Number(set.rir))) return _fmtNum(set.rir, 1);
  const rpe = _num(set?.rpe);
  if (rpe > 0) return _fmtNum(Math.max(0, 10 - rpe), 1);
  return '-';
}

function _formatWorkoutVolumeTon(value) {
  const tons = _num(value) / 1000;
  if (tons <= 0) return '0t';
  return `${_fmtNum(tons, 1)}t`;
}

function _workoutSetTypeLabel(type) {
  if (type === 'warmup') return '웜';
  if (type === 'drop') return '드롭';
  return '본';
}

function _bestWorkoutSet(row) {
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  return [...sets].sort((a, b) => (_num(b.kg) * _num(b.reps)) - (_num(a.kg) * _num(a.reps)))[0] || null;
}

function _workoutSetSummary(row) {
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  if (!sets.length) return row?.topSetText || '세트 기록 없음';
  const grouped = new Map();
  sets.forEach((set) => {
    const kg = _formatWorkoutKg(set.kg);
    const reps = _formatWorkoutReps(set.reps);
    const key = `${kg}kg×${reps}`;
    const cur = grouped.get(key) || { kg, reps, count: 0 };
    cur.count += 1;
    grouped.set(key, cur);
  });
  return [...grouped.values()]
    .map(item => `${item.kg}kg×${item.reps} ${item.count}세트`)
    .join(' / ');
}

function _smoothPath(points) {
  if (!Array.isArray(points) || !points.length) return '';
  const fmt = (n) => String(Math.round(n * 10) / 10);
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };
    d += ` C ${fmt(cp1.x)} ${fmt(cp1.y)}, ${fmt(cp2.x)} ${fmt(cp2.y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

function _activeWorkoutTrack(row = {}, bestSet = null) {
  const explicit = normalizeWorkoutTrack(
    row?.recommendationMeta?.track ||
    row?.maxPrescription?.benchmarkTrack ||
    row?.maxPrescription?.track ||
    row?.maxTrackPreference
  );
  if (explicit) return explicit;
  const reps = _num(bestSet?.reps);
  return reps > 0 && reps <= 8 ? 'H' : 'M';
}

function _workoutTrackLabel(track) {
  return track === 'H' ? '강도' : '볼륨';
}

function _formatWorkoutTrackValue(track, value) {
  const v = _num(value);
  if (v <= 0) return track === 'H' ? '추정1RM' : '총볼륨';
  if (track === 'H') return `${Math.round(v)}kg`;
  if (v >= 1000) return `${_fmtNum(v / 1000, 1)}t`;
  return `${Math.round(v)}kg`;
}

function _formatWorkoutTrackDelta(points = []) {
  if (!Array.isArray(points) || points.length < 2) return '';
  const last = _num(points[points.length - 1]?.value);
  const prev = _num(points[points.length - 2]?.value);
  if (!(last > 0) || !(prev > 0)) return '';
  const pct = Math.round(((last - prev) / prev) * 100);
  if (!Number.isFinite(pct) || pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function _workoutTrackDeltaClass(delta) {
  if (!delta) return 'flat';
  if (delta.startsWith('+')) return 'up';
  if (delta.startsWith('-')) return 'down';
  return 'flat';
}

function _workoutTrackHistoryPoints(row, track) {
  if (!row?.exerciseId) return [];
  const history = getTrackMetricHistory(getCache(), getExList(), row.exerciseId);
  const points = Array.isArray(history?.[track]) ? history[track] : [];
  const currentKey = String(row?.dateKey || '');
  const scoped = currentKey
    ? points.filter(point => !point?.date || String(point.date) <= currentKey)
    : points;
  return scoped.slice(-6);
}

function _workoutFallbackSparkValues(row, track = 'M') {
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  const raw = sets.map((set) => {
    const kg = _num(set.kg);
    if (track === 'H') return estimateSet1RM(set) || kg;
    return Math.max(0, kg * _num(set.reps));
  }).filter(v => v > 0);
  return raw.length >= 2 ? raw : raw.length === 1 ? [raw[0], raw[0], raw[0]] : [0, 1, 0];
}

function _workoutFallbackTrackValue(row, bestSet, track = 'M') {
  if (track !== 'H') return _num(row?.volume);
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  const values = sets
    .map(set => estimateSet1RM(set) || _num(set.kg))
    .filter(value => value > 0);
  if (values.length) return Math.max(...values);
  return bestSet ? estimateSet1RM(bestSet) || _num(bestSet.kg) : 0;
}

function _buildWorkoutTrackTrend(row, bestSet, requestedTrack = null) {
  const activeTrack = _activeWorkoutTrack(row, bestSet);
  const track = requestedTrack === 'H' || requestedTrack === 'M' ? requestedTrack : activeTrack;
  const points = _workoutTrackHistoryPoints(row, track);
  const latest = points.length ? points[points.length - 1] : null;
  const fallbackValue = _workoutFallbackTrackValue(row, bestSet, track);
  const value = _num(latest?.value) || fallbackValue;
  const delta = _formatWorkoutTrackDelta(points);
  const bestKg = bestSet ? _formatWorkoutKg(bestSet.kg) : '-';
  return {
    track,
    trackLabel: _workoutTrackLabel(track),
    activeTrack,
    points,
    valueLabel: _formatWorkoutTrackValue(track, value),
    delta,
    deltaClass: _workoutTrackDeltaClass(delta),
    bottomLabel: bestKg === '-' ? `${row?.setCount || 0}세트` : `${bestKg}kg`,
  };
}

function _renderWorkoutSparkline(row, trend = null) {
  const historyValues = (Array.isArray(trend?.points) ? trend.points : [])
    .map(point => _num(point?.value))
    .filter(value => value > 0);
  const raw = historyValues.length >= 2 ? historyValues : _workoutFallbackSparkValues(row, trend?.track === 'H' ? 'H' : 'M');
  const values = raw.length >= 2 ? raw : raw.length === 1 ? [raw[0], raw[0], raw[0]] : [0, 1, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);
  const step = values.length > 1 ? 112 / (values.length - 1) : 112;
  const points = values.map((value, index) => {
    const x = 4 + (step * index);
    const y = 26 - (((value - min) / spread) * 18);
    return { x, y };
  });
  const path = _smoothPath(points);
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const track = trend?.track === 'H' ? 'H' : 'M';
  const color = track === 'H' ? '#be123c' : '#2563eb';
  const fillId = `wt-history-track-${track}-${_workoutTrackGraphSeq++}`;
  const fillPath = `${path} L ${Math.round(lastPt.x * 10) / 10} 32 L ${Math.round(firstPt.x * 10) / 10} 32 Z`;
  return `
    <svg class="wt-max-spark-svg" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path class="wt-max-spark-area" d="${fillPath}" fill="url(#${fillId})"></path>
      <path class="wt-max-spark-line" d="${path}" stroke="${color}"></path>
      <circle class="wt-max-spark-dot" cx="${Math.round(lastPt.x * 10) / 10}" cy="${Math.round(lastPt.y * 10) / 10}" r="2.3" fill="${color}"></circle>
    </svg>
  `;
}

function _renderWorkoutTrackGraphRow(row, bestSet, track, activeTrack) {
  const trend = _buildWorkoutTrackTrend(row, bestSet, track);
  const delta = trend.delta || '';
  return `
    <div class="ex-max-track-graph-row ${track === activeTrack ? 'is-active' : ''}" data-track="${track}">
      <span class="ex-max-track-graph-chip">${_esc(trend.trackLabel)}</span>
      <span class="wt-max-spark">${_renderWorkoutSparkline(row, trend)}</span>
      <span class="ex-max-track-graph-value">${_esc(trend.valueLabel)}${delta ? `<small class="${_esc(trend.deltaClass)}">${_esc(delta)}</small>` : ''}</span>
    </div>
  `;
}

function _renderWorkoutTrackGraph(row, bestSet) {
  const activeTrack = _activeWorkoutTrack(row, bestSet);
  return `
    <div class="ex-max-track-graph wt-max-track-graph" title="볼륨 트랙은 총볼륨, 강도 트랙은 추정 1RM으로 따로 그립니다.">
      ${_renderWorkoutTrackGraphRow(row, bestSet, 'M', activeTrack)}
      ${_renderWorkoutTrackGraphRow(row, bestSet, 'H', activeTrack)}
    </div>
  `;
}

function _renderWorkoutSetRows(row) {
  const sets = Array.isArray(row?.setDetails) ? row.setDetails : [];
  if (!sets.length) return `<div class="wt-max-empty-sets">세트 상세 기록이 없습니다</div>`;
  return sets.map((set) => {
    const rom = Math.max(0, Math.min(100, Math.round(_num(set.romPct) || 100)));
    return `
      <div class="wt-max-set-row ${set.done ? 'is-done' : ''}">
        <div class="wt-max-set-main">
          <span class="wt-max-set-type ${set.setType === 'warmup' ? 'is-warmup' : set.setType === 'drop' ? 'is-drop' : ''}">${_workoutSetTypeLabel(set.setType)}</span>
          <label><span>KG</span><b>${_esc(_formatWorkoutKg(set.kg))}</b></label>
          <label><span>REP</span><b>${_esc(_formatWorkoutReps(set.reps))}</b></label>
          <label><span>RIR</span><b>${_esc(_formatWorkoutRir(set))}</b></label>
          <div class="wt-max-rom-inline">
            <span>ROM</span>
            <i><b style="width:${rom}%"></b></i>
            <strong>${rom}</strong>
          </div>
          <i class="wt-max-set-check" aria-hidden="true">✓</i>
          <i class="wt-max-set-remove" aria-hidden="true">×</i>
          <i class="wt-max-set-grip" aria-hidden="true">⋮</i>
        </div>
      </div>
    `;
  }).join('');
}

function _renderWorkoutExerciseDetailCard(key, sessionIndex, row, index) {
  const cardId = `ex:${key}:${sessionIndex}:${index}`;
  const collapsed = _workoutDetailCollapsed.has(cardId);
  const originalIndex = Number.isFinite(Number(row.originalIndex)) ? Number(row.originalIndex) : index;
  const bestSet = _bestWorkoutSet(row);
  const bestKg = bestSet ? _formatWorkoutKg(bestSet.kg) : '-';
  const bestReps = bestSet ? _formatWorkoutReps(bestSet.reps) : '-';
  const setSummary = _workoutSetSummary(row);
  const activeTrack = _activeWorkoutTrack(row, bestSet);
  const activeTrackLabel = _workoutTrackLabel(activeTrack);
  return `
    <article class="wt-day-ex-card wt-max-read-card ${collapsed ? 'is-collapsed' : 'is-expanded'}">
      <div class="wt-max-card-kicker">
        <span><i></i>추천 종목 · 선택 헬스장</span>
        <button type="button" onclick="window._wtCalDeleteExercise('${key}', ${sessionIndex}, ${originalIndex})" aria-label="운동 삭제">×</button>
      </div>
      <div class="wt-max-card-name">${_esc(row.name)}</div>
      <div class="wt-max-plan">
        <div class="wt-max-plan-goal">
          <span>오늘 성공 기준</span>
          <strong>${_esc(bestKg)}kg × ${_esc(bestReps)}회</strong>
          <em>오늘 ${_esc(activeTrackLabel)} 트랙 · ${row.setCount}세트</em>
        </div>
        <div class="wt-max-trend">
          ${_renderWorkoutTrackGraph(row, bestSet)}
        </div>
      </div>
      <div class="wt-max-last">
        <span>오늘 기록</span>
        <strong>${_esc(setSummary)}</strong>
      </div>
      ${row.note ? `<div class="wt-max-note">${_esc(row.note)}</div>` : ''}
      <div class="wt-max-collapsed-note">모든 세트 완료 · 카드가 접혔어요</div>
      <div class="wt-max-set-list">${_renderWorkoutSetRows(row)}</div>
      <div class="wt-max-actions">
        ${collapsed
          ? `<button type="button" class="wt-max-action-primary is-muted" aria-disabled="true" tabindex="-1">운동 완료</button>
             <button type="button" class="wt-max-action-secondary" onclick="window._wtCalToggleExerciseCard('${cardId}')">세트 다시 보기</button>`
          : `<button type="button" class="wt-max-action-primary" onclick="window._wtCalToggleExerciseCard('${cardId}')">카드 접기</button>
             <button type="button" class="wt-max-action-secondary" onclick="window._wtCalEditSession('${key}', ${sessionIndex})">편집하기</button>`}
      </div>
    </article>
  `;
}

function _renderWorkoutActivityDetailCard(key, sessionIndex, row, index) {
  const cardId = `act:${key}:${sessionIndex}:${index}`;
  const collapsed = _workoutDetailCollapsed.has(cardId);
  const activityKey = String(row.key || '').replace(/[^a-z0-9_-]/gi, '');
  return `
    <article class="wt-day-ex-card wt-day-activity-card ${collapsed ? 'is-collapsed' : ''}">
      <div class="wt-day-ex-top">
        <div>
          <strong>${_esc(row.label || '활동')}</strong>
          <span>${_esc(row.main || '')}</span>
        </div>
        <div class="wt-day-ex-frames" aria-hidden="true"><i></i><i></i></div>
      </div>
      <div class="wt-day-ex-body">
        <p>${_esc(row.detail || row.main || '기록 있음')}</p>
      </div>
      <div class="wt-day-ex-foot">
        <span class="wt-day-check">✓</span>
        <span>${row.durationSec ? _formatDurationShort(row.durationSec) : '기록'}</span>
        <button type="button" onclick="window._wtCalToggleExerciseCard('${cardId}')">${collapsed ? '펼치기' : '접기'}</button>
        <button type="button" onclick="window._wtCalDeleteActivity('${key}', ${sessionIndex}, '${activityKey}')">삭제</button>
      </div>
    </article>
  `;
}

function _renderWorkoutDetailEmpty(sessionIndex) {
  return `
    <div class="wt-day-empty">
      <div class="wt-day-session-label">${_sessionLabel(sessionIndex)}</div>
      <div class="wt-empty-center">
        <div class="wt-empty-dumbbell" aria-hidden="true"></div>
        <p><strong>${_sessionLabel(sessionIndex)} 운동 기록</strong>이 없습니다</p>
        <span>하단 + 버튼으로 추가해보세요</span>
      </div>
      <div class="wt-empty-help">
        <p>하루에 운동을 여러번 하시나요?</p>
        <p>회차를 선택해서 구분해보세요</p>
        <p>운동 시간 등이 별도로 기록됩니다</p>
      </div>
    </div>
  `;
}

// ═════════════════════════════════════════════════════════════
// 일자 상세 요약 모달
// ═════════════════════════════════════════════════════════════
function _openWorkoutDay(key) {
  const cache = getCache() || {};
  const day = cache[key] || {};
  const plan = getDietPlan() || null;
  const checkins = _sortedCheckins();
  const bodyWeight = _weightAt(checkins, key) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
  const wx = _workoutMetrics(key, day, bodyWeight, _buildWorkoutLookup());

  const [yy, mm, dd] = key.split('-').map(n => parseInt(n, 10));
  const d = new Date(yy, mm - 1, dd);
  const dowLabel = ['일','월','화','수','목','금','토'][d.getDay()];
  const title = `${yy}.${String(mm).padStart(2,'0')}.${String(dd).padStart(2,'0')} (${dowLabel}) 운동`;

  const titleEl = document.getElementById('calendar-day-title');
  const body = document.getElementById('calendar-day-body');
  if (!titleEl || !body) return;
  titleEl.textContent = title;

  const exerciseHtml = wx.exercises.length ? `
    <div class="cal-workout-detail-section">
      <div class="cal-workout-detail-title">근력</div>
      <div class="cal-workout-detail-list">
        ${wx.exercises.map((row) => {
          const volumeText = row.volume > 0 ? ` · ${_formatVolume(row.volume)} vol` : '';
          return `
            <div class="cal-workout-ex-row">
              <div class="cal-workout-ex-head">
                <strong>${_esc(row.name)}</strong>
                <span>${row.setCount}세트${volumeText}</span>
              </div>
              <div class="cal-workout-ex-top">대표 ${_esc(row.topSetText)}</div>
              ${row.setTexts.length ? `
                <div class="cal-workout-set-list">
                  ${row.setTexts.map((text, i) => `<span>${i + 1}. ${_esc(text)}</span>`).join('')}
                </div>
              ` : ''}
              ${row.note ? `<div class="cal-workout-note">${_esc(row.note)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const activityHtml = wx.activities.length ? `
    <div class="cal-workout-detail-section">
      <div class="cal-workout-detail-title">활동</div>
      <div class="cal-workout-activity-list">
        ${wx.activities.map(row => `
          <div class="cal-workout-activity-row cal-workout-activity-${row.tone}">
            <div class="cal-workout-activity-head">
              <strong>${_esc(row.label)}</strong>
              <span>${_formatDurationShort(row.durationSec)}</span>
            </div>
            <div class="cal-workout-activity-main">${_esc(row.main || '기록 있음')}</div>
            ${row.detail ? `<div class="cal-workout-note">${_esc(row.detail)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  body.innerHTML = `
    <div class="cal-workout-detail-summary">
      <div><span>시간</span><strong>${_formatDurationShort(wx.durationSec)}</strong></div>
      <div><span>세트</span><strong>${wx.setCount ? `${wx.setCount}세트` : '—'}</strong></div>
      <div><span>볼륨</span><strong>${wx.volume > 0 ? `${_formatVolume(wx.volume)} vol` : '—'}</strong></div>
      <div><span>소모</span><strong>${wx.burned.total > 0 ? `${wx.burned.total} kcal` : '—'}</strong></div>
    </div>

    ${wx.hasWorkout ? `
      ${exerciseHtml}
      ${activityHtml}
    ` : `
      <div class="cal-workout-empty-detail">운동 기록이 없어요</div>
    `}
  `;

  openModal('calendar-day-modal');
}

function _openDay(key) {
  if (_calendarMode === 'workout') {
    _openWorkoutDay(key);
    return;
  }

  const cache = getCache() || {};
  const day = cache[key] || {};
  const plan = getDietPlan() || null;
  const metrics = (plan && plan.weight && plan.height) ? calcDietMetrics(plan) : null;
  const checkins = _sortedCheckins();

  const mx = _dayMetrics(key, day, plan, metrics, checkins);

  const [yy, mm, dd] = key.split('-').map(n => parseInt(n, 10));
  const d = new Date(yy, mm - 1, dd);
  const dowLabel = ['일','월','화','수','목','금','토'][d.getDay()];
  const title = `${yy}.${String(mm).padStart(2,'0')}.${String(dd).padStart(2,'0')} (${dowLabel})`;

  const titleEl = document.getElementById('calendar-day-title');
  const body = document.getElementById('calendar-day-body');
  if (!titleEl || !body) return;
  titleEl.textContent = title;

  // 점수 카드
  // 토마토 팔레트 농도 그라데이션
  const scoreColor =
    mx.band === 'great' ? '#ca1d13' :  // Dark
    mx.band === 'good'  ? '#fa342c' :  // Primary
    mx.band === 'soso'  ? '#fc6a66' :  // Sub
    mx.band === 'bad'   ? '#e89591' :  // Light 중간 (가독성)
    'var(--muted)';
  const scoreText = mx.score != null ? `${mx.score}` : '—';
  const bandLabel = mx.band === 'great' ? '완벽' :
                    mx.band === 'good'  ? '잘한 날' :
                    mx.band === 'soso'  ? '아쉬운 날' :
                    mx.band === 'bad'   ? '개선 필요' : '기록 없음';

  // breakdown
  const bd = mx.breakdown || {};
  const row = (label, item, desc, extraClass = '') => {
    if (!item) return '';
    const gained = item.max - item.penalty;
    const actionAttrs = extraClass ? ' role="button" tabindex="0" aria-label="해당일 운동 기록 열기"' : '';
    return `<div class="cal-bd-row ${extraClass}"${actionAttrs}>
      <div class="cal-bd-main">
        <span class="cal-bd-label">${label}</span>
        <span class="cal-bd-score">${gained}<small>/${item.max}</small></span>
      </div>
      <div class="cal-bd-desc">${desc}</div>
    </div>`;
  };

  const kcalDesc = mx.targetKcal > 0
    ? `목표 ${Math.round(mx.targetKcal).toLocaleString()} kcal · 실제 ${mx.kcalIn.toLocaleString()} kcal`
    : (mx.kcalIn > 0 ? `실제 ${mx.kcalIn.toLocaleString()} kcal (목표 미설정)` : '기록 없음');

  const macroDesc = mx.macroTarget
    ? (() => {
        const p = (day.bProtein||0)+(day.lProtein||0)+(day.dProtein||0)+(day.sProtein||0);
        const c = (day.bCarbs||0)+(day.lCarbs||0)+(day.dCarbs||0)+(day.sCarbs||0);
        const f = (day.bFat||0)+(day.lFat||0)+(day.dFat||0)+(day.sFat||0);
        return `단백 ${Math.round(p)}/${mx.macroTarget.proteinG}g · 탄수 ${Math.round(c)}/${mx.macroTarget.carbG}g · 지방 ${Math.round(f)}/${mx.macroTarget.fatG}g`;
      })()
    : '식단 플랜 미설정';

  const b = mx.burnedBreakdown;
  const workoutParts = [];
  if (b.gym > 0)      workoutParts.push(`헬스 ${b.gym}`);
  if (b.running > 0)  workoutParts.push(`런닝 ${b.running}`);
  if (b.swimming > 0) workoutParts.push(`수영 ${b.swimming}`);
  if (b.cf > 0)       workoutParts.push(`CF ${b.cf}`);
  const workoutDesc = workoutParts.length
    ? `총 ${b.total} kcal (${workoutParts.join(' · ')})`
    : '운동 기록 없음';

  const weightDesc = mx.weight != null
    ? (mx.weightDeltaKg != null
        ? `${mx.weight.toFixed(1)}kg (7일전 대비 ${mx.weightDeltaKg >= 0 ? '+' : ''}${mx.weightDeltaKg.toFixed(1)}kg)`
        : `${mx.weight.toFixed(1)}kg`)
    : '7일 내 체중 기록 없음';

  const meals = [
    { label: '아침', v: day.bKcal || 0, skipped: day.breakfast_skipped },
    { label: '점심', v: day.lKcal || 0, skipped: day.lunch_skipped },
    { label: '저녁', v: day.dKcal || 0, skipped: day.dinner_skipped },
    { label: '간식', v: day.sKcal || 0, skipped: false },
  ];
  const loggedMeals = meals.filter(m => m.v > 0 || m.skipped).length;
  const completeDesc = `식사 기록 ${loggedMeals}/4 (${meals.filter(m => m.skipped).length > 0 ? '굶음 포함' : '기록 중심'})`;
  const maxWeak = mx.maxWeak;
  const weakNames = maxWeak?.selected?.length
    ? maxWeak.selected.map(x => MAX_WEAK_LABEL[x] || x).join(' · ')
    : '선택 없음';
  const maxWeakDesc = maxWeak?.hasAny
    ? `약점 ${weakNames} · ${maxWeak.durationMin}분 · ${maxWeak.sets}세트 · ${maxWeak.volume.toLocaleString()}vol · +${maxWeak.bonus}점`
    : '';

  body.innerHTML = `
    <div class="cal-score-card" style="border-color:${scoreColor}22;background:${scoreColor}0d;">
      <div class="cal-score-big" style="color:${scoreColor};">
        ${scoreText}<span>${mx.score != null ? '점' : ''}</span>
      </div>
      <div class="cal-score-band" style="color:${scoreColor};">${bandLabel}</div>
    </div>

    <div class="cal-bd-list">
      ${row('섭취 칼로리', bd.kcal, kcalDesc)}
      ${row('탄단지 균형', bd.macro, macroDesc)}
      ${row('운동 소모',   bd.workout, workoutDesc, 'cal-bd-row-workout')}
      ${row('체중 방향',   bd.weight, weightDesc)}
      ${row('기록 완결',   bd.complete, completeDesc)}
      ${maxWeak?.hasAny ? `<div class="cal-bd-row cal-bd-row-max">
        <div class="cal-bd-main">
          <span class="cal-bd-label">맥스 약점 공략</span>
          <span class="cal-bd-score">+${maxWeak.bonus}<small>/5</small></span>
        </div>
        <div class="cal-bd-desc">${maxWeakDesc}</div>
      </div>` : ''}
    </div>
  `;

  openModal('calendar-day-modal');
  const workoutRow = body.querySelector('.cal-bd-row-workout');
  if (workoutRow) {
    const openWorkout = () => {
      closeModal('calendar-day-modal');
      window.openWorkoutTab?.(yy, mm - 1, dd);
    };
    workoutRow.addEventListener('click', openWorkout);
    workoutRow.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openWorkout();
      }
    });
  }
}

function _closeDay(e) {
  if (e && e.target && e.target.id !== 'calendar-day-modal' && !e.target.classList.contains('cal-day-close')) return;
  closeModal('calendar-day-modal');
}

function _normalizeWorkoutHomeSheetState(state) {
  return WORKOUT_HOME_SHEET_STATES.includes(state) ? state : 'bar';
}

function _currentWorkoutHomeSheetState() {
  return _workoutHomeView === 'detail' ? _normalizeWorkoutHomeSheetState(_workoutHomeSheetState) : 'bar';
}

function _applyWorkoutHomeSheetState() {
  if (typeof document === 'undefined') return;
  const sheet = document.querySelector('#workout-calendar-root [data-wt-day-sheet]');
  if (!sheet) return;
  const state = _currentWorkoutHomeSheetState();
  WORKOUT_HOME_SHEET_CLASS_STATES.forEach(item => sheet.classList.toggle(`is-${item}`, item === state));
  sheet.dataset.wtSheetState = state;
  sheet.setAttribute('aria-expanded', state !== 'bar' ? 'true' : 'false');
  const bar = sheet.querySelector('[data-wt-sheet-handle]');
  if (bar) bar.setAttribute('aria-expanded', state !== 'bar' ? 'true' : 'false');
  const toggle = sheet.querySelector('[data-wt-sheet-toggle]');
  if (toggle) {
    toggle.textContent = state === 'bar' ? '⌃' : '⌄';
    toggle.setAttribute('aria-label', state === 'bar' ? '선택한 날짜 열기' : '날짜 상세 접기');
  }
}

function _setWorkoutHomeSheetState(state, { render = false } = {}) {
  const next = _normalizeWorkoutHomeSheetState(state);
  _workoutHomeSheetState = next;
  _workoutHomeView = next === 'bar' ? 'month' : 'detail';
  if (render) {
    renderWorkoutCalendarHome();
    return;
  }
  _applyWorkoutHomeSheetState();
}

function _animateWorkoutHomeSheetTo(state) {
  const apply = () => _setWorkoutHomeSheetState(state);
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(apply));
    return;
  }
  apply();
}

function _stepWorkoutHomeSheet(direction) {
  _setWorkoutHomeSheetState(direction > 0 ? 'full' : 'bar');
}

function _resolveWorkoutHomeSheetDragTarget(
  dy,
  velocityY,
  openThresholdPx = WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX,
  collapseThresholdPx = WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX
) {
  const current = _currentWorkoutHomeSheetState();
  const openDistance = Math.max(WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX, Number(openThresholdPx) || 0);
  const collapseDistance = Math.max(WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX, Number(collapseThresholdPx) || 0);
  const isUp = dy <= -openDistance || velocityY < -WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY;
  const isIntentionalDown = dy >= collapseDistance;
  if (current === 'bar') return isUp ? 'full' : 'bar';
  if (isIntentionalDown) return 'bar';
  return 'full';
}

function _toggleWorkoutHomeSheet(key = _workoutHomeSelectedKey) {
  if (_consumeWorkoutHomeSuppressedClick()) return;
  _workoutHomeSelectedKey = _parseDateKey(key) ? key : _workoutHomeSelectedKey;
  if (_currentWorkoutHomeSheetState() === 'bar') {
    _workoutHomeView = 'detail';
    _workoutHomeSheetState = 'bar';
    renderWorkoutCalendarHome();
    _animateWorkoutHomeSheetTo('full');
    return;
  }
  _setWorkoutHomeSheetState('bar');
}

function _consumeWorkoutHomeSuppressedClick() {
  const now = Date.now();
  if (now < _workoutHomeSuppressSheetClickUntil) return true;
  _workoutHomeSuppressSheetClickUntil = 0;
  return false;
}

function _suppressWorkoutHomeSheetClick(ms = WORKOUT_HOME_SHEET_POST_DRAG_CLICK_SUPPRESS_MS) {
  _workoutHomeSuppressSheetClickUntil = Math.max(_workoutHomeSuppressSheetClickUntil, Date.now() + ms);
}

function _bindWorkoutHomeSheetDrag(root) {
  const handle = root?.querySelector?.('[data-wt-sheet-handle]');
  if (!handle) return;
  handle.addEventListener('pointerdown', _startWorkoutHomeSheetDrag);
  handle.addEventListener('keydown', _handleWorkoutHomeSheetKey);
}

function _handleWorkoutHomeSheetKey(event) {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    _stepWorkoutHomeSheet(1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    _stepWorkoutHomeSheet(-1);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    _setWorkoutHomeSheetState('bar');
  }
}

function _startWorkoutHomeSheetDrag(event) {
  if (event.button != null && event.button !== 0) return;
  if (event.target?.closest?.('[data-wt-sheet-action]')) return;
  const sheet = event.currentTarget?.closest?.('[data-wt-day-sheet]');
  if (!sheet) return;

  const startY = event.clientY || 0;
  let lastY = startY;
  let lastMoveY = startY;
  let lastMoveAt = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  let velocityY = 0;
  let hasMoved = false;
  const startHeight = sheet.getBoundingClientRect?.().height || 0;
  const barHeight = sheet.querySelector?.('.cal-workout-day-bar')?.getBoundingClientRect?.().height || 132;
  const minHeight = Math.max(64, Math.min(startHeight, barHeight || startHeight));
  const maxHeight = Math.max(startHeight, (window.innerHeight || startHeight) - 64);
  const startState = _currentWorkoutHomeSheetState();
  const dragTravel = Math.max(0, maxHeight - minHeight);
  const openThresholdPx = Math.max(WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX, dragTravel * WORKOUT_HOME_SHEET_DRAG_OPEN_RATIO);
  const collapseThresholdPx = Math.max(WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX, dragTravel * WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO);
  const minDragY = startHeight - maxHeight;
  const maxDragY = startHeight - minHeight;
  sheet.classList.add('is-dragging');
  sheet.style.setProperty('--wt-day-sheet-drag-y', '0px');
  sheet.style.setProperty('--wt-day-sheet-drag-height', `${startHeight}px`);
  event.currentTarget.setPointerCapture?.(event.pointerId);

  const onMove = (moveEvent) => {
    lastY = moveEvent.clientY || startY;
    hasMoved = true;
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
    const elapsed = Math.max(1, now - lastMoveAt);
    velocityY = (lastY - lastMoveY) / elapsed;
    lastMoveY = lastY;
    lastMoveAt = now;
    const dy = Math.max(minDragY, Math.min(maxDragY, lastY - startY));
    const shouldPreviewFull = startState === 'bar' && dy <= -openThresholdPx;
    const nextHeight = shouldPreviewFull ? maxHeight : Math.max(minHeight, Math.min(maxHeight, startHeight - dy));
    sheet.style.setProperty('--wt-day-sheet-drag-height', `${nextHeight}px`);
  };
  const onUp = (upEvent) => {
    lastY = upEvent.clientY || lastY;
    sheet.classList.remove('is-dragging');
    sheet.style.removeProperty('--wt-day-sheet-drag-y');
    sheet.style.removeProperty('--wt-day-sheet-drag-height');
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);

    const dy = lastY - startY;
    if (Math.abs(dy) < WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX && Math.abs(velocityY) < WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY) {
      if (hasMoved) _suppressWorkoutHomeSheetClick();
      return;
    }
    _suppressWorkoutHomeSheetClick();
    _setWorkoutHomeSheetState(_resolveWorkoutHomeSheetDragTarget(dy, velocityY, openThresholdPx, collapseThresholdPx));
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
}

function _openWorkoutHomeDay(key) {
  if (_consumeWorkoutHomeSuppressedClick()) return;
  const nextKey = _parseDateKey(key) ? key : _workoutHomeSelectedKey;
  if (_workoutHomeSelectedKey === nextKey && _currentWorkoutHomeSheetState() === 'full') return;
  _workoutHomeSelectedKey = nextKey;
  _workoutHomeView = 'detail';
  _workoutHomeSheetState = 'bar';
  _workoutHomeSessionIndex = 0;
  renderWorkoutCalendarHome();
  _animateWorkoutHomeSheetTo('full');
}

async function _openWorkoutHomeRoutine(key) {
  _workoutHomeSelectedKey = key;
  const sessionIndex = _workoutHomeSessionIndex;
  if (!_isTodayKey(key)) {
    window.showToast?.('과거 기록에서는 루틴을 열지 않아요. 오늘 운동에서 시작해 주세요.', 2200, 'info');
    return;
  }
  renderWorkoutCalendarHome();

  try {
    const loaded = await _loadWorkoutEditorForSession(key, sessionIndex);
    if (!loaded) throw new Error('workout editor is not available');

    if (typeof window.openRoutineSuggestWithRecent !== 'function' && typeof window.openRoutineSuggest !== 'function') {
      await import('./workout/expert.js');
    }
    if (typeof window.openRoutineSuggestWithRecent === 'function') {
      await window.openRoutineSuggestWithRecent();
      return;
    }
    if (typeof window.openRoutineSuggest === 'function') {
      await window.openRoutineSuggest();
      return;
    }
    if (typeof window.tm2OpenBoard !== 'function') {
      await import('./workout/test-v2/entry.js?v=20260620z27-selected-scope');
    }
    if (typeof window.tm2OpenBoard === 'function') {
      await window.tm2OpenBoard();
      return;
    }
    throw new Error('routine entry is not registered');
  } catch (e) {
    console.warn('[workout-calendar] routine open failed:', e);
    window.showToast?.('루틴을 여는 데 실패했어요', 2200, 'error');
  }
}

function _backWorkoutHomeMonth() {
  _setWorkoutHomeSheetState('bar');
}

function _goTodayWorkoutDetail() {
  const key = dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  _viewYear = TODAY.getFullYear();
  _viewMonth = TODAY.getMonth();
  _workoutHomeSelectedKey = key;
  _workoutHomeView = 'detail';
  _workoutHomeSheetState = 'bar';
  _workoutHomeSessionIndex = 0;
  renderCalendar();
  renderWorkoutCalendarHome();
  _animateWorkoutHomeSheetTo('full');
}

function _selectWorkoutHomeSession(index) {
  _workoutHomeSessionIndex = Math.max(0, Math.floor(Number(index) || 0));
  renderWorkoutCalendarHome();
}

function _toggleWorkoutDetailCard(cardId) {
  if (!cardId) return;
  if (_workoutDetailCollapsed.has(cardId)) _workoutDetailCollapsed.delete(cardId);
  else _workoutDetailCollapsed.add(cardId);
  renderWorkoutCalendarHome();
}

function _editWorkoutHomeSession(key, sessionIndex = _workoutHomeSessionIndex) {
  _openWorkoutEditorForSession(key, sessionIndex);
}

async function _addWorkoutHomeSession(key) {
  const cache = getCache() || {};
  const sessions = getWorkoutSessions(cache[key] || {}, { minCount: 3 });
  const emptyIndex = sessions.findIndex(session => !hasWorkoutSessionData(session));
  const targetIndex = emptyIndex >= 0 ? emptyIndex : sessions.length;

  try {
    const loaded = await _loadWorkoutEditorForSession(key, targetIndex);
    if (!loaded) throw new Error('workout editor is not available');
    if (typeof window.wtOpenExercisePicker === 'function') {
      await window.wtOpenExercisePicker();
      return;
    }
    throw new Error('exercise picker is not registered');
  } catch (e) {
    console.warn('[workout-calendar] add session picker open failed:', e);
    _openWorkoutEditorForSession(key, targetIndex);
  }
}

function _formatWorkoutExportText(key, sessionIndex, session, wx) {
  const lines = [
    `${_dateTitle(key)} ${_sessionLabel(sessionIndex)}`,
    `운동시간: ${_formatDuration(wx.durationSec)}`,
  ];
  if (wx.setCount > 0) lines.push(`총 세트: ${wx.setCount}세트`);
  if (wx.volume > 0) lines.push(`총 볼륨: ${_formatVolume(wx.volume)}톤`);
  if (wx.burned?.total > 0) lines.push(`소모: ${wx.burned.total} kcal`);

  wx.exercises.forEach((row) => {
    lines.push('', `${row.name}${row.majorName ? ` (${row.majorName})` : ''}`);
    row.setTexts.forEach((text, i) => lines.push(`- ${i + 1}세트: ${text}`));
    if (row.note) lines.push(`- 메모: ${row.note}`);
  });

  wx.activities.forEach((row) => {
    lines.push('', `${row.label}${row.main ? `: ${row.main}` : ''}`);
    if (row.detail) lines.push(`- 메모: ${row.detail}`);
  });

  const memo = String(session?.memo || '').trim();
  if (memo) lines.push('', `운동 메모: ${memo}`);
  return lines.join('\n');
}

async function _shareOrCopyText(text, title) {
  const nav = window.navigator;
  if (nav?.share) {
    try {
      await nav.share({ title, text });
      return 'share';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel';
    }
  }
  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(text);
    return 'clipboard';
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  textarea.remove();
  if (!ok) throw new Error('clipboard fallback failed');
  return 'clipboard';
}

async function _exportWorkoutHomeSession(key, sessionIndex = _workoutHomeSessionIndex) {
  const { session, index } = _workoutHomeSessionAt(key, sessionIndex, 1);
  if (!hasWorkoutSessionData(session)) {
    window.showToast?.('내보낼 운동 기록이 없어요', 1800, 'info');
    return;
  }
  const plan = getDietPlan() || null;
  const checkins = _sortedCheckins();
  const bodyWeight = _weightAt(checkins, key) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
  const wx = _workoutMetrics(key, session, bodyWeight, _buildWorkoutLookup());
  const title = `${_dateTitle(key)} ${_sessionLabel(index)} 운동 기록`;
  const text = _formatWorkoutExportText(key, index, session, wx);
  try {
    const mode = await _shareOrCopyText(text, title);
    if (mode === 'cancel') return;
    window.showToast?.(mode === 'share' ? '운동 기록을 공유했어요' : '운동 기록을 복사했어요', 1800, 'success');
  } catch (e) {
    console.warn('[workout-calendar] export failed:', e);
    window.showToast?.('내보내기에 실패했어요', 2200, 'error');
  }
}

async function _deleteWorkoutHomeSession(key, sessionIndex = _workoutHomeSessionIndex) {
  const { day, index, session } = _workoutHomeSessionAt(key, sessionIndex, 1);
  if (!hasWorkoutSessionData(session)) {
    window.showToast?.('삭제할 운동 기록이 없어요', 1800, 'info');
    return;
  }
  const ok = await confirmAction({
    title: '회차를 삭제할까요?',
    message: `${_dateTitle(key)} ${_sessionLabel(index)} 기록만 삭제합니다.\n식단 기록은 유지됩니다.`,
    confirmLabel: '삭제',
    cancelLabel: '취소',
    destructive: true,
  });
  if (!ok) return;
  try {
    const result = deleteWorkoutSession(day, index);
    _workoutHomeSessionIndex = Math.max(0, Math.min(index, result.workoutSessions.length - 1));
    await _saveWorkoutHomeSessionResult(key, result);
    window.showToast?.('회차 운동 기록을 삭제했어요', 1800, 'success');
  } catch (e) {
    console.warn('[workout-calendar] session delete failed:', e);
    window.showToast?.('회차 삭제에 실패했어요', 2200, 'error');
  }
}

async function _deleteWorkoutExercise(key, sessionIndex, exerciseIndex) {
  const { day, session, index } = _workoutHomeSessionAt(key, sessionIndex, 1);
  const exIndex = Math.max(0, Math.floor(Number(exerciseIndex) || 0));
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  const target = exercises[exIndex];
  if (!target) {
    window.showToast?.('삭제할 운동을 찾지 못했어요', 1800, 'warning');
    return;
  }
  const label = target.name || target.exerciseName || '운동';
  const ok = await confirmAction({
    title: '운동을 삭제할까요?',
    message: `${_sessionLabel(index)}의 ${label} 기록을 삭제합니다.`,
    confirmLabel: '삭제',
    cancelLabel: '취소',
    destructive: true,
  });
  if (!ok) return;
  try {
    const nextSession = _clonePlain(session) || {};
    nextSession.exercises = exercises.filter((_, i) => i !== exIndex);
    const result = upsertWorkoutSession(day, nextSession, index, { now: Date.now() });
    await _saveWorkoutHomeSessionResult(key, result);
    window.showToast?.('운동을 삭제했어요', 1800, 'success');
  } catch (e) {
    console.warn('[workout-calendar] exercise delete failed:', e);
    window.showToast?.('운동 삭제에 실패했어요', 2200, 'error');
  }
}

function _clearWorkoutActivityFields(activityKey) {
  if (activityKey === 'running') {
    return {
      running: false,
      runDistance: 0,
      runDurationMin: 0,
      runDurationSec: 0,
      runMemo: '',
    };
  }
  if (activityKey === 'swimming') {
    return {
      swimming: false,
      swimDistance: 0,
      swimDurationMin: 0,
      swimDurationSec: 0,
      swimStroke: '',
      swimMemo: '',
    };
  }
  if (activityKey === 'cf') {
    return {
      cf: false,
      cfWod: '',
      cfDurationMin: 0,
      cfDurationSec: 0,
      cfMemo: '',
    };
  }
  if (activityKey === 'stretching') {
    return {
      stretching: false,
      stretchDuration: 0,
      stretchMemo: '',
    };
  }
  if (activityKey === 'timer') {
    return { workoutDuration: 0 };
  }
  return null;
}

async function _deleteWorkoutActivity(key, sessionIndex, activityKey) {
  const patch = _clearWorkoutActivityFields(activityKey);
  if (!patch) {
    window.showToast?.('삭제할 활동을 찾지 못했어요', 1800, 'warning');
    return;
  }
  const { day, session, index } = _workoutHomeSessionAt(key, sessionIndex, 1);
  const label = {
    running: '런닝',
    swimming: '수영',
    cf: '크로스핏',
    stretching: '스트레칭',
  }[activityKey] || '활동';
  const ok = await confirmAction({
    title: '활동을 삭제할까요?',
    message: `${_sessionLabel(index)}의 ${label} 기록을 삭제합니다.`,
    confirmLabel: '삭제',
    cancelLabel: '취소',
    destructive: true,
  });
  if (!ok) return;
  try {
    const nextSession = { ...(_clonePlain(session) || {}), ...patch };
    const result = upsertWorkoutSession(day, nextSession, index, { now: Date.now() });
    await _saveWorkoutHomeSessionResult(key, result);
    window.showToast?.('활동을 삭제했어요', 1800, 'success');
  } catch (e) {
    console.warn('[workout-calendar] activity delete failed:', e);
    window.showToast?.('활동 삭제에 실패했어요', 2200, 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// window.* 노출
// ═════════════════════════════════════════════════════════════
window._calShiftMonth   = _shiftMonth;
window._calGoToday      = _goToday;
window._calSetMode      = _setCalendarMode;
window._calOpenDay      = _openDay;
window._calCloseDay     = _closeDay;
window.renderCalendar   = renderCalendar;
window._wtCalShiftMonth = _shiftMonth;
window._wtCalGoToday    = _goToday;
window._wtCalOpenDay    = _openWorkoutHomeDay;
window._wtCalToggleSheet = _toggleWorkoutHomeSheet;
window._wtCalOpenRoutine = _openWorkoutHomeRoutine;
window._wtCalBackToMonth = _backWorkoutHomeMonth;
window._wtCalGoTodayDetail = _goTodayWorkoutDetail;
window._wtCalSelectSession = _selectWorkoutHomeSession;
window._wtCalToggleExerciseCard = _toggleWorkoutDetailCard;
window._wtCalEditSession = _editWorkoutHomeSession;
window._wtCalAddSession = _addWorkoutHomeSession;
window._wtCalExportSession = _exportWorkoutHomeSession;
window._wtCalDeleteSession = _deleteWorkoutHomeSession;
window._wtCalDeleteExercise = _deleteWorkoutExercise;
window._wtCalDeleteActivity = _deleteWorkoutActivity;
window.renderWorkoutCalendarHome = renderWorkoutCalendarHome;
