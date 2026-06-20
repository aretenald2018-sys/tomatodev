// ================================================================
// render-calendar.js — 캘린더 탭
// 월별 그리드로 일자별 100점 만점 점수 + (섭취kcal/소모kcal/체중) 표시
// ================================================================

import {
  getCache,
  getBodyCheckins,
  getDietPlan,
  getLatestCheckinWeight,
} from './data.js';
import {
  calcDietMetrics,
  getDayTargetKcal,
  calcBurnedKcal,
  calcDayScore,
} from './calc.js';
import { calcSetVolume } from './calc/volume.js';
import { dateKey, TODAY, isFuture, isBeforeStart } from './data/data-date.js';
import { openModal, closeModal } from './utils/dom.js';

// ═════════════════════════════════════════════════════════════
// 뷰 상태
// ═════════════════════════════════════════════════════════════
let _viewYear  = TODAY.getFullYear();
let _viewMonth = TODAY.getMonth();
let _calendarMode = 'summary';

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

function _exerciseRows(day) {
  return (Array.isArray(day?.exercises) ? day.exercises : [])
    .map((entry) => {
      const sets = (Array.isArray(entry?.sets) ? entry.sets : []).filter(_isActualWorkoutSet);
      const note = (entry?.note || '').toString().trim();
      if (!sets.length && !note) return null;
      const volume = sets.reduce((sum, set) => sum + calcSetVolume(set), 0);
      const topSet = [...sets].sort((a, b) => calcSetVolume(b) - calcSetVolume(a))[0] || null;
      return {
        name: entry?.name || entry?.exerciseName || entry?.exerciseId || '운동',
        setCount: sets.length,
        volume,
        topSetText: topSet ? _formatSetText(topSet) : '세트 기록 없음',
        setTexts: sets.map(_formatSetText),
        note,
      };
    })
    .filter(Boolean);
}

function _workoutMetrics(key, day, bodyWeight) {
  const d = day || {};
  const exercises = _exerciseRows(d);
  const activities = _activityRows(d);
  const burned = calcBurnedKcal(d, bodyWeight);
  const workoutDurationSec = Math.max(0, Math.round(_num(d.workoutDuration)));
  const activityDurationSec = activities.reduce((sum, row) => sum + (row.durationSec || 0), 0);
  const gymDurationSec = exercises.length ? workoutDurationSec : 0;
  const durationSec = Math.max(gymDurationSec + activityDurationSec, workoutDurationSec, activityDurationSec);
  const setCount = exercises.reduce((sum, row) => sum + row.setCount, 0);
  const volume = exercises.reduce((sum, row) => sum + row.volume, 0);
  const labels = [
    ...exercises.map(row => row.name),
    ...activities.map(row => row.label),
  ].filter(Boolean);
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
    primaryLabel: labels[0] || '',
    hasWorkout,
  };
}

function _renderWorkoutCalendar(root, { cache, plan, checkins, y, m, firstDow, daysCount }) {
  let monthSum = { days: 0, durationSec: 0, sets: 0, volume: 0, kcalBurn: 0 };
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(`<div class="cal-cell cal-cell-empty"></div>`);

  for (let d = 1; d <= daysCount; d++) {
    const k = dateKey(y, m, d);
    const day = cache[k] || {};
    const future = isFuture(y, m, d);
    const before = isBeforeStart(y, m, d);
    const today = k === dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    const disabled = future || before;
    const bodyWeight = _weightAt(checkins, k) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
    const wx = _workoutMetrics(k, day, bodyWeight);

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
      disabled ? 'cal-cell-disabled' : '',
      wx.hasWorkout ? 'cal-workout-cell-active' : 'cal-workout-cell-rest',
    ].filter(Boolean).join(' ');
    const onclick = disabled ? '' : `onclick="window._calOpenDay('${k}')"`;
    const labelLines = wx.labels.slice(0, 2);
    const moreCount = Math.max(0, wx.labels.length - labelLines.length);
    const detailHtml = wx.hasWorkout ? `
      <div class="cal-workout-bars">
        ${wx.durationSec > 0 ? `<span class="cal-workout-bar cal-workout-bar-time">${_formatDurationShort(wx.durationSec)}</span>` : ''}
        ${wx.setCount > 0 ? `<span class="cal-workout-bar">${wx.setCount}세트</span>` : ''}
        ${labelLines.map(label => `<span class="cal-workout-bar cal-workout-bar-name">${_esc(label)}</span>`).join('')}
        ${moreCount > 0 ? `<span class="cal-workout-bar cal-workout-bar-more">+${moreCount}</span>` : ''}
      </div>
      <div class="cal-workout-cell-kcal">${wx.burned.total > 0 ? `${wx.burned.total} kcal` : ''}</div>
    ` : `
      <div class="cal-workout-rest-mark">—</div>
    `;

    cells.push(`
      <div class="${classes}" ${onclick}>
        <div class="cal-cell-head">
          <span class="cal-cell-date">${d}</span>
          ${wx.hasWorkout ? `<span class="cal-workout-dot"></span>` : ''}
        </div>
        ${detailHtml}
      </div>
    `);
  }

  const monthLabel = `${y}년 ${m + 1}월`;
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
    ${summaryHtml}

    <div class="cal-weekdays">
      ${weekdays.map((w, i) => `<div class="cal-wd ${i === 0 ? 'cal-wd-sun' : ''} ${i === 6 ? 'cal-wd-sat' : ''}">${w}</div>`).join('')}
    </div>
    <div class="cal-grid cal-workout-grid">${cells.join('')}</div>
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
}

function _goToday() {
  _viewYear  = TODAY.getFullYear();
  _viewMonth = TODAY.getMonth();
  renderCalendar();
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

// ═════════════════════════════════════════════════════════════
// 일자 상세 요약 모달
// ═════════════════════════════════════════════════════════════
function _openWorkoutDay(key) {
  const cache = getCache() || {};
  const day = cache[key] || {};
  const plan = getDietPlan() || null;
  const checkins = _sortedCheckins();
  const bodyWeight = _weightAt(checkins, key) ?? getLatestCheckinWeight() ?? plan?.weight ?? 70;
  const wx = _workoutMetrics(key, day, bodyWeight);

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

  const timerOnlyHtml = !wx.exercises.length && !wx.activities.length && wx.workoutDurationSec > 0 ? `
    <div class="cal-workout-detail-section">
      <div class="cal-workout-activity-row">
        <div class="cal-workout-activity-head">
          <strong>운동 시간</strong>
          <span>${_formatDurationShort(wx.workoutDurationSec)}</span>
        </div>
        <div class="cal-workout-activity-main">${_formatDuration(wx.workoutDurationSec)}</div>
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
      ${wx.workoutDurationSec > 0 && wx.exercises.length ? `<div class="cal-workout-timer-line">운동 타이머 ${_formatDuration(wx.workoutDurationSec)}</div>` : ''}
      ${exerciseHtml}
      ${activityHtml}
      ${timerOnlyHtml}
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

// ═════════════════════════════════════════════════════════════
// window.* 노출
// ═════════════════════════════════════════════════════════════
window._calShiftMonth   = _shiftMonth;
window._calGoToday      = _goToday;
window._calSetMode      = _setCalendarMode;
window._calOpenDay      = _openDay;
window._calCloseDay     = _closeDay;
window.renderCalendar   = renderCalendar;
