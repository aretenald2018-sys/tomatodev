// ================================================================
// render-stats.js
// 의존성: config.js, data.js
// 변경: 13번 CSV 내보내기 추가
// ================================================================

import { MOVEMENTS }                                 from './config.js';
import { TODAY, getMuscles, getCF, getDiet, dietDayOk,
         daysInMonth, isFuture, getExList, getAllMuscles,
         getVolumeHistory, getCache, calcVolume, getExpertPreset,
         getExercises, dateKey, getBodyCheckins, getDietPlan,
         hasExerciseRecord, hasDietRecord }    from './data.js';
import { SUBPATTERN_TO_MAJOR, calcBurnedKcal }       from './calc.js';
import { getWorkoutSessions }                        from './workout/sessions.js';

let _selectedExerciseId = null;
let _selectedVolumeDate = null;
let _selectedFatiguePeriod = 'week';
let _healthChartPeriod = 90;
const _healthSeriesVisible = {
  weight: true,
  bodyFat: true,
  intake: true,
  burned: true,
};

export function setPeriod() {
  _renderMuscleFatigue();
}

let _healthMetricsChart = null;

export function renderStats() {
  _bindStatsViewTabs();
  _renderMuscleFatigue();
  _renderOverallSummary();
  _renderVolumeSection();
  _bindHealthChartControls();
  _renderHealthMetricsChart();
  _renderHeatmap();
  _renderDeepStats();
}

function _bindStatsViewTabs() {
  document.querySelectorAll('.stats-view-btn').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => switchStatsView(btn.dataset.statsView || 'overall', btn));
  });
}

export function switchStatsView(view = 'overall', btn = null) {
  const next = view === 'deep' ? 'deep' : 'overall';
  document.querySelectorAll('.stats-view-btn').forEach(b => b.classList.toggle('active', b === btn || b.dataset.statsView === next));
  document.getElementById('stats-overall-panel')?.classList.toggle('active', next === 'overall');
  document.getElementById('stats-deep-panel')?.classList.toggle('active', next === 'deep');
  if (next === 'deep') _renderDeepStats();
}

if (typeof window !== 'undefined') window.switchStatsView = switchStatsView;

function _esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function _keyOffset(daysAgo) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}
const FOOD_KEYS = ['bFoods', 'lFoods', 'dFoods', 'sFoods'];
const MEAL_PREFIXES = ['b', 'l', 'd', 's'];
const SKELETAL_KEYS = ['skeletalMuscleMassKg', 'skeletalMuscleMass', 'skeletalMuscleKg', 'muscleMassKg', 'muscleMass', 'smmKg', 'smm'];
const BODY_FAT_MASS_KEYS = ['bodyFatMassKg', 'fatMassKg', 'bodyFatKg', 'fatKg'];
function _dayKcal(day) { return (day?.bKcal||0)+(day?.lKcal||0)+(day?.dKcal||0)+(day?.sKcal||0); }
function _dayProtein(day) { return (day?.bProtein||0)+(day?.lProtein||0)+(day?.dProtein||0)+(day?.sProtein||0); }
function _dayCarbs(day) { return (day?.bCarbs||0)+(day?.lCarbs||0)+(day?.dCarbs||0)+(day?.sCarbs||0); }
function _dayFat(day) { return (day?.bFat||0)+(day?.lFat||0)+(day?.dFat||0)+(day?.sFat||0); }
const MAJOR_LABELS = { chest:'가슴', back:'등', lower:'하체', shoulder:'어깨', bicep:'이두', tricep:'삼두', abs:'복근', core:'복근' };
const LANDMARKS = {
  chest: { label:'가슴', low:8, good:14, high:22 },
  back: { label:'등', low:10, good:16, high:25 },
  lower: { label:'하체', low:8, good:14, high:20 },
  shoulder: { label:'어깨', low:6, good:14, high:22 },
  bicep: { label:'이두', low:6, good:12, high:20 },
  tricep: { label:'삼두', low:6, good:14, high:18 },
  abs: { label:'복근', low:0, good:12, high:25 },
};
const FATIGUE_PERIODS = {
  week: { label: '주별', title: '이번 주', days: 7 },
  month: { label: '월별', title: '이번 달', days: 30 },
};
const FATIGUE_GROUPS = [
  {
    id: 'back', label: '등', majors: ['back'],
    spots: [{ x: 62, y: 16, w: 24, h: 29, r: -6 }, { x: 65, y: 35, w: 18, h: 16, r: 8 }],
  },
  {
    id: 'shoulder', label: '어깨', majors: ['shoulder'],
    spots: [{ x: 11, y: 18, w: 29, h: 10, r: 3 }, { x: 63, y: 15, w: 26, h: 10, r: -2 }],
  },
  {
    id: 'arms', label: '팔', majors: ['bicep', 'tricep'],
    spots: [{ x: 7, y: 23, w: 10, h: 28, r: -8 }, { x: 32, y: 27, w: 9, h: 27, r: -12 }, { x: 58, y: 23, w: 9, h: 29, r: 10 }, { x: 83, y: 23, w: 8, h: 30, r: -10 }],
  },
  {
    id: 'chest', label: '가슴', majors: ['chest'],
    spots: [{ x: 17, y: 20, w: 22, h: 15, r: 5 }],
  },
  {
    id: 'legs', label: '다리', majors: ['lower', 'glute'],
    spots: [{ x: 12, y: 50, w: 27, h: 39, r: 4 }, { x: 64, y: 49, w: 25, h: 40, r: -3 }],
  },
  {
    id: 'core', label: '코어', majors: ['abs', 'core'],
    spots: [{ x: 21, y: 32, w: 16, h: 19, r: 2 }],
  },
];
const FATIGUE_GROUP_BY_MAJOR = FATIGUE_GROUPS.reduce((acc, group) => {
  group.majors.forEach(major => { acc[major] = group.id; });
  return acc;
}, {});
const PHASE_LABELS = { ACCUMULATION:'쌓는 구간', DELOAD:'회복 구간', RESET:'재정렬 구간' };
function _setsBand(sets, lm) {
  if (sets < lm.low) return { tone:'under', label:'부족', msg:`주 ${lm.low - sets}세트만 더` };
  if (sets > lm.high) return { tone:'over', label:'많음', msg:'회복 확인' };
  return { tone:'ok', label: sets >= lm.good ? '충분' : '적정', msg:'유지 가능' };
}
function _progressView(e) {
  const count = e.pointsCount || 0;
  const deltaKg = e.last - e.first;
  const deltaPct = e.first ? (deltaKg / e.first * 100) : 0;
  const name = String(e.name || '').toLowerCase();
  const likelyAccessory = e.major === 'abs' || /crunch|크런치|curl|컬|raise|레이즈|extension|익스텐션|pushdown|푸시다운/.test(name);
  const suspicious = Math.abs(deltaPct) >= 60 && (count < 4 || likelyAccessory || e.first < 25);
  const reliablePct = count >= 3 && !suspicious && Math.abs(deltaPct) < 60;
  const main = suspicious ? '기록 점검 필요' : (deltaKg >= 0 ? `+${deltaKg.toFixed(1)}kg` : `${deltaKg.toFixed(1)}kg`);
  const sub = suspicious
    ? `변화폭 ${Math.round(deltaPct)}% · 표본 ${count}회`
    : `${e.slope>=0?'+':''}${e.slope.toFixed(1)}kg/주${reliablePct ? ` · ${deltaPct>=0?'+':''}${Math.round(deltaPct)}%` : ` · 표본 ${count}회`}`;
  return { suspicious, main, sub };
}
function _entryMajor(entry, exById, movById) {
  const ex = exById.get(entry?.exerciseId);
  const sp = Array.isArray(entry?.muscleIds) && entry.muscleIds[0]
    ? entry.muscleIds[0]
    : (Array.isArray(ex?.muscleIds) && ex.muscleIds[0] ? ex.muscleIds[0] : null);
  if (sp && SUBPATTERN_TO_MAJOR[sp]) return SUBPATTERN_TO_MAJOR[sp];
  const mov = movById.get(entry?.movementId || ex?.movementId);
  if (mov?.primary) return mov.primary;
  return entry?.muscleId || ex?.muscleId || 'etc';
}
function _setE1rm(set) {
  const kg = Number(set?.kg) || 0, reps = Number(set?.reps) || 0;
  if (kg <= 0 || reps <= 0) return 0;
  return kg * (1 + Math.min(reps, 30) / 30);
}
function _isHardSet(set) {
  if (!set || set.setType === 'warmup' || set.done === false) return false;
  if (!((Number(set.kg)||0) > 0 && (Number(set.reps)||0) > 0)) return false;
  const rpe = Number(set.rpe);
  if (Number.isFinite(rpe) && rpe > 0) return rpe >= 7;
  return Number(set.reps) >= 5;
}
function _topSetE1rm(entry) {
  let best = 0;
  for (const set of entry?.sets || []) {
    if (!_isHardSet(set)) continue;
    best = Math.max(best, _setE1rm(set));
  }
  return best;
}

function _fmtDateShort(key) {
  return String(key || '').slice(5).replace('-', '.');
}

function _normalizeFatigueMajor(major) {
  if (major === 'glute') return 'glute';
  if (major === 'core') return 'abs';
  return major || 'etc';
}

function _emptyFatigueGroups() {
  return FATIGUE_GROUPS.map(group => ({
    ...group,
    score: 0,
    sets: 0,
    volume: 0,
    days: new Set(),
    lastDate: '',
    level: 0,
  }));
}
function _fatigueRed(level) {
  const n = _clamp(Number(level) || 0, 0, 1);
  const saturation = Math.round(34 + n * 62);
  const lightness = Math.round(72 - n * 16);
  return `hsl(3, ${saturation}%, ${lightness}%)`;
}

function _fatigueBlue(level) {
  const n = _clamp(Number(level) || 0, 0, 1);
  const saturation = Math.round(46 + n * 38);
  const lightness = Math.round(72 - n * 24);
  return `hsl(205, ${saturation}%, ${lightness}%)`;
}

function _fatigueStatus(group, relative) {
  if (relative <= 0) return { tone: 'under', label: '보강', hint: '이번 기간 기록 없음' };
  if (relative < 0.35) return { tone: 'under', label: '보강', hint: '최고 활성 대비 낮음' };
  if (relative < 0.55) return { tone: 'low', label: '낮음', hint: '다음 운동에서 먼저 채우기' };
  if (relative >= 0.82) return { tone: 'hot', label: '집중', hint: '회복 상태 확인' };
  return { tone: 'steady', label: '균형', hint: '현재 흐름 유지' };
}

function _fatigueExerciseEntries(day) {
  return getWorkoutSessions(day, { minCount: 1 })
    .flatMap(session => Array.isArray(session?.exercises) ? session.exercises : []);
}

function _buildMuscleFatigue(periodKey) {
  const period = FATIGUE_PERIODS[periodKey] || FATIGUE_PERIODS.week;
  const groups = _emptyFatigueGroups();
  const byId = new Map(groups.map(group => [group.id, group]));
  const exById = new Map(getExList().map(ex => [ex.id, ex]));
  const movById = new Map(MOVEMENTS.map(mov => [mov.id, mov]));
  const todayKey = _keyOffset(0);
  const sinceKey = _keyOffset(period.days - 1);
  let trainingDays = 0;

  Object.entries(getCache())
    .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && key >= sinceKey && key <= todayKey)
    .forEach(([key, day]) => {
      let touched = false;
      const date = _dateFromKey(key);
      const daysAgo = date ? Math.max(0, Math.round((new Date(TODAY) - date) / 86400000)) : 0;
      const recency = 1 - Math.min(daysAgo, Math.max(period.days - 1, 1)) / Math.max(period.days, 1) * 0.3;

      for (const entry of _fatigueExerciseEntries(day)) {
        const major = _normalizeFatigueMajor(_entryMajor(entry, exById, movById));
        const groupId = FATIGUE_GROUP_BY_MAJOR[major];
        const group = byId.get(groupId);
        if (!group) continue;

        const sets = (entry.sets || []).filter(_isHardSet).length;
        const volume = calcVolume(entry.sets || []);
        if (sets <= 0 && volume <= 0) continue;

        group.sets += sets;
        group.volume += volume;
        group.score += (sets || Math.min(volume / 500, 1)) * recency;
        group.days.add(key);
        group.lastDate = group.lastDate && group.lastDate > key ? group.lastDate : key;
        touched = true;
      }

      if (touched) trainingDays++;
    });

  const totalScore = groups.reduce((sum, group) => sum + group.score, 0);
  const maxScore = Math.max(...groups.map(group => group.score), 1);
  groups.forEach(group => {
    const relative = totalScore > 0 ? group.score / maxScore : 0;
    const status = totalScore > 0 ? _fatigueStatus(group, relative) : { tone: 'empty', label: '기록 없음', hint: '' };
    const visualLevel = totalScore > 0
      ? (relative > 0 ? _clamp(relative, 0.18, 1) : 0.30)
      : 0;
    group.level = group.score > 0 ? _clamp(relative, 0.18, 1) : 0;
    group.visualLevel = visualLevel;
    group.relativePct = Math.round(relative * 100);
    group.tone = status.tone;
    group.statusLabel = status.label;
    group.hint = status.hint;
    group.tint = totalScore > 0
      ? (status.tone === 'under' || status.tone === 'low' ? _fatigueBlue(visualLevel) : _fatigueRed(visualLevel))
      : '';
    group.days = group.days.size;
    group.volume = Math.round(group.volume);
  });

  const active = groups.filter(group => group.level > 0).sort((a, b) => b.score - a.score);
  const underactive = totalScore > 0
    ? groups.filter(group => group.tone === 'under' || group.tone === 'low').sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'ko'))
    : [];
  const hot = totalScore > 0
    ? groups.filter(group => group.tone === 'hot').sort((a, b) => b.score - a.score)
    : [];
  return {
    period,
    groups,
    active,
    underactive,
    hot,
    top: active[0] || null,
    trainingDays,
    totalSets: groups.reduce((sum, group) => sum + group.sets, 0),
    totalVolume: groups.reduce((sum, group) => sum + group.volume, 0),
    totalScore,
  };
}

function _fatigueHotspotsHtml(groups) {
  return groups.filter(group => group.visualLevel > 0).flatMap(group => {
    const opacity = (0.22 + group.visualLevel * 0.48).toFixed(2);
    const saturation = (0.74 + group.visualLevel * 0.54).toFixed(2);
    return group.spots.map((spot, idx) => `
      <i class="stats-fatigue-hotspot is-${_esc(group.tone)}" aria-hidden="true"
         style="left:${spot.x}%;top:${spot.y}%;width:${spot.w}%;height:${spot.h}%;--mf:${group.tint};--sat:${saturation};--r:${spot.r || 0}deg;opacity:${opacity}"
         data-muscle="${_esc(group.id)}-${idx}"></i>`);
  }).join('');
}

function _fatigueRowsHtml(groups) {
  const visible = groups.filter(group => group.visualLevel > 0);
  if (!visible.length) {
    return '<div class="stats-fatigue-empty">선택 기간에 활성 부위 기록이 없어요.</div>';
  }
  return visible
    .sort((a, b) => {
      const rank = { under: 0, low: 1, hot: 2, steady: 3, empty: 4 };
      return (rank[a.tone] ?? 9) - (rank[b.tone] ?? 9) || b.score - a.score;
    })
    .map(group => {
      const pct = group.score > 0 ? Math.max(8, group.relativePct) : 8;
      const volume = group.volume ? `${_fmt(group.volume / 1000, 1)}k` : '0.0k';
      return `
        <div class="stats-fatigue-row is-${_esc(group.tone)}" style="--mf:${group.tint};--pct:${pct}%">
          <span class="stats-fatigue-name">${_esc(group.label)}<em>${_esc(group.statusLabel)}</em></span>
          <span class="stats-fatigue-meter"><i></i></span>
          <b>${_esc(volume)}</b>
          <small>${group.sets ? `${group.sets}세트` : '0세트'} · ${_esc(group.hint)}</small>
        </div>`;
    }).join('');
}

function _fatigueInsight(state) {
  if (!state.top) {
    return {
      tone: 'empty',
      title: '운동 기록이 쌓이면 보강 부위를 잡아드릴게요',
      note: '주별 또는 월별 기록이 생기면 많이 쓴 부위는 빨강, 덜 쓴 부위는 파랑으로 나눠 다음 운동 우선순위를 보여줍니다.',
    };
  }
  const focus = state.underactive.slice(0, 2);
  const topShare = state.totalScore > 0 ? Math.round(state.top.score / state.totalScore * 100) : 0;
  if (focus.length) {
    const focusLabel = focus.map(group => group.label).join(' · ');
    return {
      tone: 'under',
      title: `다음 운동은 ${focusLabel} 2-4세트 먼저`,
      note: `${state.top.label}은 ${state.period.title} 활성 비중 ${topShare}%로 높습니다. 파란 부위는 보조종목을 먼저 넣고, 빨간 부위는 강도를 올리기보다 회복 상태를 확인하세요.`,
    };
  }
  return {
    tone: 'steady',
    title: `${state.period.title} 부위 균형이 크게 무너지지 않았어요`,
    note: `가장 많이 쓴 부위는 ${state.top.label}이며 활성 비중은 ${topShare}%입니다. 다음 운동은 기존 계획을 유지하되 빨간 부위의 통증/피로만 확인하세요.`,
  };
}

function _renderMuscleFatigue() {
  const root = document.getElementById('stats-muscle-fatigue');
  if (!root) return;

  const state = _buildMuscleFatigue(_selectedFatiguePeriod);
  const insight = _fatigueInsight(state);
  const focusText = state.underactive.length ? state.underactive.slice(0, 2).map(group => group.label).join(' · ') : '균형 유지';
  const hotText = state.hot.length ? state.hot.map(group => group.label).join(' · ') : (state.top?.label || '-');
  const headline = state.top
    ? `${state.period.title} ${state.top.label} 집중${state.underactive[0] ? ` · ${state.underactive[0].label} 보강` : ''}`
    : `${state.period.title} 기록 없음`;
  const summary = state.top
    ? `${state.trainingDays}일 운동 · ${state.totalSets}세트 · 다음 ${focusText}`
    : '선택 기간의 운동 기록이 아직 없어요.';

  root.innerHTML = `
    <div class="stats-fatigue-head">
      <div>
        <span>운동 활성 부위</span>
        <h3>${_esc(headline)}</h3>
        <p>${_esc(summary)}</p>
      </div>
      <div class="stats-fatigue-tabs" role="tablist" aria-label="근육 피로도 기간">
        ${Object.entries(FATIGUE_PERIODS).map(([key, period]) => `
          <button type="button" class="${key === _selectedFatiguePeriod ? 'active' : ''}" data-fatigue-period="${_esc(key)}" role="tab" aria-selected="${key === _selectedFatiguePeriod ? 'true' : 'false'}">${_esc(period.label)}</button>
        `).join('')}
      </div>
    </div>
    <div class="stats-fatigue-body">
      <div class="stats-fatigue-figure" aria-label="활성 근육 렌더링">
        <img src="./assets/stats/muscle-fatigue-body.png" alt="">
        ${_fatigueHotspotsHtml(state.groups)}
      </div>
      <div class="stats-fatigue-summary">
        <div><span>집중 부위</span><b>${_esc(hotText)}</b></div>
        <div><span>보강 후보</span><b>${_esc(focusText)}</b></div>
        <div><span>총 볼륨</span><b>${_fmt(state.totalVolume)}vol</b></div>
      </div>
      <div class="stats-fatigue-insight is-${_esc(insight.tone)}">
        <span>다음 운동 힌트</span>
        <b>${_esc(insight.title)}</b>
        <p>${_esc(insight.note)}</p>
      </div>
    </div>
    <div class="stats-fatigue-rows">${_fatigueRowsHtml(state.groups)}</div>
  `;

  root.querySelectorAll('[data-fatigue-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.fatiguePeriod;
      if (!FATIGUE_PERIODS[next] || next === _selectedFatiguePeriod) return;
      _selectedFatiguePeriod = next;
      _renderMuscleFatigue();
    });
  });
}

function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function _maybeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function _firstNumber(obj, keys) {
  for (const key of keys) {
    const n = _maybeNum(obj?.[key]);
    if (n !== null) return n;
  }
  return null;
}
function _fmt(n, digits = 0) {
  return Number(n).toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function _fmtSigned(n, digits = 1, unit = 'kg') {
  return `${n >= 0 ? '+' : ''}${_fmt(n, digits)} ${unit}`;
}
function _dateFromKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function _keyFromDate(d) {
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}
function _dateRange(startKey, endKey) {
  const start = _dateFromKey(startKey), end = _dateFromKey(endKey);
  if (!start || !end || start > end) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(_keyFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
function _dateEntries() {
  const todayKey = _keyOffset(0);
  return Object.entries(getCache())
    .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= todayKey)
    .sort(([a], [b]) => a.localeCompare(b));
}
function _foodItems(day) {
  return FOOD_KEYS.flatMap(key => Array.isArray(day?.[key]) ? day[key] : []);
}
function _foodName(food) {
  return String(food?.name || food?.foodName || food?.label || '').trim();
}
function _foodKcal(food) {
  return _num(food?.kcal ?? food?.calories ?? food?.energy);
}
function _sumMealFields(day, suffixes) {
  let total = 0, seen = false;
  MEAL_PREFIXES.forEach(prefix => suffixes.forEach(suffix => {
    const n = _maybeNum(day?.[`${prefix}${suffix}`]);
    if (n !== null) { total += n; seen = true; }
  }));
  return seen ? total : null;
}
function _sumFoodFields(day, keys) {
  let total = 0, seen = false;
  _foodItems(day).forEach(food => {
    const n = _firstNumber(food, keys);
    if (n !== null) { total += n; seen = true; }
  });
  return seen ? total : null;
}
function _daySugar(day) {
  return _sumMealFields(day, ['Sugar', 'Sugars']) ?? _sumFoodFields(day, ['sugar', 'sugars']);
}
function _daySodium(day) {
  return _sumMealFields(day, ['Sodium', 'SodiumMg']) ?? _sumFoodFields(day, ['sodium', 'sodiumMg']);
}
function _bodyFatMass(checkin) {
  const direct = _firstNumber(checkin, BODY_FAT_MASS_KEYS);
  if (direct !== null) return direct;
  const weight = _maybeNum(checkin?.weight);
  const pct = _maybeNum(checkin?.bodyFatPct);
  if (weight !== null && pct !== null) return weight * pct / 100;
  return null;
}
function _avgFrom(list, getter) {
  let total = 0, count = 0;
  list.forEach(item => {
    const n = getter(item);
    if (n !== null && Number.isFinite(n)) { total += n; count++; }
  });
  return count ? total / count : null;
}
function _weightOnOrBefore(checkins, key) {
  for (let i = checkins.length - 1; i >= 0; i--) {
    const c = checkins[i];
    if ((c?.date || '') <= key) {
      const n = _maybeNum(c.weight);
      if (n !== null) return n;
    }
  }
  return null;
}
function _joinedMetrics(values) {
  if (values.every(v => !v)) return null;
  return values.map(v => v || '없음').join(' | ');
}
function _avgDayMetric(entries, specs) {
  let total = 0, count = 0;
  entries.forEach(([, day]) => {
    for (const spec of specs) {
      const n = _firstNumber(day, spec.keys);
      if (n === null) continue;
      total += n * (spec.scale || 1);
      count++;
      break;
    }
  });
  return count ? total / count : null;
}
function _summaryKpi(label, value, note = '', tone = '') {
  const hasValue = value !== null && value !== undefined && value !== '';
  const cls = ['stats-summary-kpi'];
  if (!hasValue) cls.push('is-empty');
  if (tone) cls.push(`is-${tone}`);
  return `
    <div class="${cls.join(' ')}">
      <span>${_esc(label)}</span>
      <b>${_esc(hasValue ? value : '-')}</b>
      ${note ? `<small>${_esc(note)}</small>` : ''}
    </div>`;
}
function _summaryFact(label, value) {
  const hasValue = value !== null && value !== undefined && value !== '';
  return `
    <div class="stats-summary-fact ${hasValue ? '' : 'is-empty'}">
      <span>${_esc(label)}</span>
      <b>${_esc(hasValue ? value : '데이터 없음')}</b>
    </div>`;
}
function _renderOverallSummary() {
  const root = document.getElementById('stats-overall-summary');
  if (!root) return;

  const cache = getCache();
  const entries = _dateEntries();
  const checkins = getBodyCheckins().filter(c => (c?.date || '') <= _keyOffset(0));
  const avgWeight = _avgFrom(checkins, c => _maybeNum(c.weight));
  const avgSkeletal = _avgFrom(checkins, c => _firstNumber(c, SKELETAL_KEYS));
  const avgFatMass = _avgFrom(checkins, _bodyFatMass);
  const foodsByName = new Map();
  let topFoodDay = null;
  let topExerciseDay = null;
  const macro = { carbs: 0, protein: 0, fat: 0, days: 0 };
  const sugar = { total: 0, days: 0 };
  const sodium = { total: 0, days: 0 };
  const ny = TODAY.getFullYear();
  let recordDays = 0, exerciseDays = 0, okDays = 0, ngDays = 0;
  let yearFoodKcalTotal = 0, yearFoodKcalDays = 0, yearExerciseKcalTotal = 0, yearExerciseKcalDays = 0;

  entries.forEach(([key, day]) => {
    const kcal = _dayKcal(day);
    if (kcal > 0) {
      if (!topFoodDay || kcal > topFoodDay.kcal) topFoodDay = { key, kcal };
    }

    _foodItems(day).forEach(food => {
      const name = _foodName(food);
      if (!name) return;
      const next = foodsByName.get(name) || { name, count: 0, kcalTotal: 0 };
      next.count++;
      next.kcalTotal += _foodKcal(food);
      foodsByName.set(name, next);
    });

    const weight = _weightOnOrBefore(checkins, key) ?? avgWeight ?? 70;
    const burned = calcBurnedKcal(day, weight).total;
    if (burned > 0) {
      if (!topExerciseDay || burned > topExerciseDay.kcal) topExerciseDay = { key, kcal: burned };
    }

    const carbs = _dayCarbs(day);
    const protein = _dayProtein(day);
    const fat = _dayFat(day);
    if (carbs + protein + fat > 0) {
      macro.carbs += carbs;
      macro.protein += protein;
      macro.fat += fat;
      macro.days++;
    }
    const daySugar = _daySugar(day);
    if (daySugar !== null) { sugar.total += daySugar; sugar.days++; }
    const daySodium = _daySodium(day);
    if (daySodium !== null) { sodium.total += daySodium; sodium.days++; }
  });

  for (let m = 0; m < 12; m++) for (let d = 1; d <= daysInMonth(ny, m); d++) {
    if (isFuture(ny, m, d)) continue;
    const key = dateKey(ny, m, d);
    const day = cache[key] || {};
    const diet = getDiet(ny, m, d);
    const hasDiet = hasDietRecord(ny,m,d);
    const hasEx = hasExerciseRecord(ny, m, d);
    const dok = dietDayOk(ny, m, d);
    if (hasDiet || hasEx) recordDays++;
    if (hasEx) exerciseDays++;
    if (dok === true) okDays++;
    else if (dok === false) ngDays++;

    const kcal = _dayKcal(diet);
    if (kcal > 0) {
      yearFoodKcalTotal += kcal;
      yearFoodKcalDays++;
    }
    const weight = _weightOnOrBefore(checkins, key) ?? avgWeight ?? 70;
    const burned = calcBurnedKcal(day, weight).total;
    if (burned > 0) {
      yearExerciseKcalTotal += burned;
      yearExerciseKcalDays++;
    }
  }

  const topFood = [...foodsByName.values()]
    .sort((a, b) => (b.count - a.count) || (b.kcalTotal - a.kcalTotal) || a.name.localeCompare(b.name))[0];

  const monthPrefix = dateKey(TODAY.getFullYear(), TODAY.getMonth(), 1).slice(0, 7);
  const monthCheckins = checkins.filter(c => (c?.date || '').startsWith(monthPrefix));
  const monthFirst = monthCheckins.length >= 2 ? monthCheckins[0] : null;
  const monthLast = monthCheckins.length >= 2 ? monthCheckins[monthCheckins.length - 1] : null;
  const monthWeightFirst = monthFirst ? _maybeNum(monthFirst.weight) : null;
  const monthWeightLast = monthLast ? _maybeNum(monthLast.weight) : null;
  const monthWeightDelta = monthWeightFirst !== null && monthWeightLast !== null ? monthWeightLast - monthWeightFirst : null;
  const monthSkeletalFirst = monthFirst ? _firstNumber(monthFirst, SKELETAL_KEYS) : null;
  const monthSkeletalLast = monthLast ? _firstNumber(monthLast, SKELETAL_KEYS) : null;
  const monthSkeletalDelta = monthSkeletalFirst !== null && monthSkeletalLast !== null ? monthSkeletalLast - monthSkeletalFirst : null;
  const monthFatFirst = monthFirst ? _bodyFatMass(monthFirst) : null;
  const monthFatLast = monthLast ? _bodyFatMass(monthLast) : null;
  const monthFatDelta = monthFatFirst !== null && monthFatLast !== null ? monthFatLast - monthFatFirst : null;
  const avgSteps = _avgDayMetric(entries, [{ keys: ['steps', 'stepCount', 'dailySteps', 'walkSteps', 'walkingSteps'] }]);
  const avgStepKcal = _avgDayMetric(entries, [{ keys: ['stepsKcal', 'stepKcal', 'walkKcal', 'walkingKcal'] }]);
  const avgWaterMl = _avgDayMetric(entries, [
    { keys: ['waterMl', 'waterIntakeMl', 'hydrationMl', 'drinkWaterMl'] },
    { keys: ['waterL', 'waterLiter'], scale: 1000 },
    { keys: ['waterCups', 'waterCupCount'], scale: 250 },
  ]);
  const avgBowel = _avgDayMetric(entries, [{ keys: ['bowelCount', 'bowelMovementCount', 'stoolCount', 'poopCount', 'defecationCount'] }]);

  const hasAnyNutrient = macro.days || sugar.days || sodium.days;
  const nutrientValue = hasAnyNutrient ? [
    macro.days ? `탄수 ${_fmt(macro.carbs / macro.days, 1)}g` : '탄수 없음',
    macro.days ? `단백 ${_fmt(macro.protein / macro.days, 1)}g` : '단백 없음',
    macro.days ? `지방 ${_fmt(macro.fat / macro.days, 1)}g` : '지방 없음',
    sugar.days ? `당 ${_fmt(sugar.total / sugar.days, 1)}g` : '당 없음',
    sodium.days ? `나트륨 ${_fmt(sodium.total / sodium.days, 0)}mg` : '나트륨 없음',
  ].join(' | ') : null;

  const dietTotal = okDays + ngDays;
  const dietRate = dietTotal ? Math.round(okDays / dietTotal * 100) : null;
  const dietTone = dietRate === null ? '' : (dietRate >= 80 ? 'good' : dietRate >= 50 ? 'warn' : 'bad');
  const avgFoodKcal = yearFoodKcalDays ? Math.round(yearFoodKcalTotal / yearFoodKcalDays) : null;
  const avgExerciseKcal = yearExerciseKcalDays ? Math.round(yearExerciseKcalTotal / yearExerciseKcalDays) : null;
  const bodyValue = _joinedMetrics([
    avgWeight !== null ? `체중 ${_fmt(avgWeight, 1)}kg` : null,
    avgSkeletal !== null ? `골격근 ${_fmt(avgSkeletal, 1)}kg` : null,
    avgFatMass !== null ? `체지방량 ${_fmt(avgFatMass, 1)}kg` : null,
  ]);
  const lifestyleValue = _joinedMetrics([
    avgSteps !== null ? `걸음 ${_fmt(Math.round(avgSteps))}${avgStepKcal !== null ? `/${_fmt(Math.round(avgStepKcal))}kcal` : ''}` : null,
    avgWaterMl !== null ? `물 ${_fmt(Math.round(avgWaterMl))}ml` : null,
    avgBowel !== null ? `배변 ${_fmt(avgBowel, 1)}회` : null,
  ]);

  const kpis = [
    _summaryKpi('기록일', `${_fmt(recordDays)}일`, '식단 또는 운동'),
    _summaryKpi('운동일', `${_fmt(exerciseDays)}일`, '올해 운동 기록'),
    _summaryKpi('식단 성공률', dietRate !== null ? `${dietRate}%` : null, dietTotal ? `${okDays}성공 · ${ngDays}실패` : '판정 없음', dietTone),
    _summaryKpi('평균 섭취', avgFoodKcal !== null ? `${_fmt(avgFoodKcal)}kcal` : null, yearFoodKcalDays ? `${_fmt(yearFoodKcalDays)}일 평균` : '기록 없음'),
    _summaryKpi('평균 운동', avgExerciseKcal !== null ? `${_fmt(avgExerciseKcal)}kcal` : null, yearExerciseKcalDays ? `${_fmt(yearExerciseKcalDays)}일 평균` : '기록 없음'),
    _summaryKpi('이달 체중', monthWeightDelta !== null && Number.isFinite(monthWeightDelta) ? _fmtSigned(monthWeightDelta) : null, monthCheckins.length ? `${monthCheckins.length}회 체크인` : '체크인 부족'),
  ].join('');

  const facts = [
    _summaryFact('자주 먹은 음식', topFood ? `${topFood.name} · ${_fmt(Math.round(topFood.kcalTotal / Math.max(topFood.count, 1)))}kcal · ${topFood.count}회` : null),
    _summaryFact('최고 섭취일', topFoodDay ? `${topFoodDay.key} · ${_fmt(topFoodDay.kcal)}kcal` : null),
    _summaryFact('최고 운동일', topExerciseDay ? `${topExerciseDay.key} · ${_fmt(topExerciseDay.kcal)}kcal` : null),
    _summaryFact('평균 체성분', bodyValue),
    _summaryFact('평균 영양소', nutrientValue),
    _summaryFact('생활지표', lifestyleValue),
  ].join('');

  root.innerHTML = `
    <div class="stats-summary-head">
      <span>${ny}년 핵심 지표</span>
      <b>전체 기록 ${_fmt(entries.length)}일</b>
    </div>
    <div class="stats-summary-kpis">${kpis}</div>
    <div class="stats-summary-details">${facts}</div>`;
}

function _linearSlope(points) {
  const pts = points.filter(p => Number.isFinite(p.y));
  if (pts.length < 2) return 0;
  const n = pts.length, sx = pts.reduce((s,p)=>s+p.x,0), sy = pts.reduce((s,p)=>s+p.y,0);
  const sxx = pts.reduce((s,p)=>s+p.x*p.x,0), sxy = pts.reduce((s,p)=>s+p.x*p.y,0);
  const den = n*sxx - sx*sx;
  return den ? (n*sxy - sx*sy) / den : 0;
}
function _analyzeTrainerWindow(fromKey, toKey) {
  const cache = getCache();
  const exList = getExList();
  const exById = new Map(exList.map(e => [e.id, e]));
  const movById = new Map(MOVEMENTS.map(m => [m.id, m]));
  const byMajor = {};
  const byExercise = {};
  const rpeByMajor = {};
  let trainingDays = 0, hardSets = 0, rpeSum = 0, rpeCount = 0, kcalTotal = 0, kcalDays = 0, proteinTotal = 0, proteinDays = 0;
  for (const [key, day] of Object.entries(cache)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < fromKey || key > toKey) continue;
    if (Array.isArray(day.exercises) && day.exercises.length > 0) trainingDays++;
    if (_dayKcal(day) > 0) { kcalTotal += _dayKcal(day); kcalDays++; }
    if (_dayProtein(day) > 0) { proteinTotal += _dayProtein(day); proteinDays++; }
    for (const entry of day.exercises || []) {
      const major = _entryMajor(entry, exById, movById);
      const ex = exById.get(entry.exerciseId);
      byMajor[major] = byMajor[major] || { hardSets:0, volume:0 };
      const id = entry.movementId || ex?.movementId || entry.exerciseId;
      byExercise[id] = byExercise[id] || { name: ex?.name || entry.name || id, major, points:[], volume:0, rpes:[] };
      byExercise[id].volume += calcVolume(entry.sets);
      const best = _topSetE1rm(entry);
      if (best > 0) byExercise[id].points.push({ date:key, y:best });
      for (const set of entry.sets || []) {
        if (!_isHardSet(set)) continue;
        hardSets++;
        byMajor[major].hardSets++;
        byMajor[major].volume += (Number(set.kg)||0) * (Number(set.reps)||0);
        const rpe = Number(set.rpe);
        if (Number.isFinite(rpe) && rpe > 0) {
          rpeSum += rpe; rpeCount++;
          byExercise[id].rpes.push({ date:key, rpe });
          rpeByMajor[major] = rpeByMajor[major] || { sum:0, count:0 };
          rpeByMajor[major].sum += rpe; rpeByMajor[major].count++;
        }
      }
    }
  }
  return {
    trainingDays, hardSets,
    avgKcal: kcalDays ? Math.round(kcalTotal / kcalDays) : 0,
    avgProtein: proteinDays ? Math.round(proteinTotal / proteinDays) : 0,
    avgRpe: rpeCount ? rpeSum / rpeCount : 0,
    byMajor, byExercise, rpeByMajor,
  };
}

function _renderDeepStats() {
  const root = document.getElementById('deep-stats-report');
  if (!root) return;
  const four = _analyzeTrainerWindow(_keyOffset(27), _keyOffset(0));
  const recent2 = _analyzeTrainerWindow(_keyOffset(13), _keyOffset(0));
  const prior2 = _analyzeTrainerWindow(_keyOffset(27), _keyOffset(14));
  const preset = getExpertPreset?.() || {};
  const week = _clamp(Number(preset.maxCycle?.weekIndex || preset.maxCycle?.currentWeek || 3) || 3, 1, 6);
  const phase = week === 5 ? 'DELOAD' : (week === 6 ? 'RESET' : 'ACCUMULATION');
  const phaseTone = phase === 'DELOAD' ? 'warn' : 'good';
  const weeklySets = Math.round(four.hardSets / 4);
  const setDelta = recent2.hardSets - prior2.hardSets;
  const dayDelta = recent2.trainingDays - prior2.trainingDays;
  const volumeRows = Object.entries(LANDMARKS).map(([major, lm]) => {
    const sets = Math.round((four.byMajor[major]?.hardSets || 0) / 4);
    const pct = _clamp(Math.round(sets / lm.high * 100), 0, 100);
    const band = _setsBand(sets, lm);
    return `<div class="trainer-vol-row ${band.tone}"><span>${lm.label}</span><div class="trainer-vol-track" style="--fill:${pct}%"><i style="left:${pct}%"></i><b style="left:${Math.round(lm.low/lm.high*100)}%"></b><b style="left:${Math.round(lm.good/lm.high*100)}%"></b></div><strong>${sets}세트</strong><small>${band.label} · ${band.msg}</small></div>`;
  }).join('');
  const liftAnalyses = Object.values(four.byExercise).map(e => {
    const rawPts = e.points.sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);
    const baseTime = rawPts[0] ? new Date(rawPts[0].date).getTime() : 0;
    const pts = rawPts.map((p,i)=>({
      x: baseTime ? Math.max((new Date(p.date).getTime() - baseTime) / 604800000, i * 0.25) : i,
      y:p.y,
      date:p.date
    }));
    const rpes = e.rpes.sort((a,b)=>a.date.localeCompare(b.date));
    const slope = _linearSlope(pts);
    const first = pts[0]?.y || 0, last = pts.at(-1)?.y || 0;
    const delta = first ? Math.round((last-first)/first*100) : 0;
    const plateau = pts.length >= 3 && Math.abs(slope) < .15 && (rpes.at(-1)?.rpe || 0) - (rpes[0]?.rpe || 0) >= .5;
    const next = { ...e, slope, first, last, delta, plateau, pointsCount: pts.length };
    return { ...next, view: _progressView(next) };
  }).filter(e => e.last > 0);
  const liftRows = liftAnalyses
    .sort((a,b)=>(b.plateau-a.plateau) || (b.view.suspicious-a.view.suspicious) || Math.abs(b.slope)-Math.abs(a.slope)).slice(0,5)
    .map(e => `<div class="trainer-lift-row ${e.plateau?'plateau':''} ${e.view.suspicious?'suspicious':''}"><div><span>${_esc(MAJOR_LABELS[e.major]||e.major)}</span><b>${_esc(e.name)}</b></div><strong>${_esc(e.view.main)}</strong><small>${Math.round(e.first)} → ${Math.round(e.last)}kg · ${_esc(e.view.sub)}${e.plateau?' · 피로 누적 의심':''}</small></div>`).join('');
  const dataWarnings = liftAnalyses.filter(e => e.view.suspicious).slice(0,3)
    .map(e => `<li><b>${_esc(e.name)}</b><span>${Math.round(e.first)} → ${Math.round(e.last)}kg, 표본 ${e.pointsCount}회. 기록 단위/기구/운동명 혼합 여부를 확인하세요.</span></li>`).join('');
  const checkins = getBodyCheckins();
  const firstC = checkins.find(c => c.date >= _keyOffset(27));
  const lastC = [...checkins].reverse().find(c => c.date <= _keyOffset(0));
  const weightDelta = firstC && lastC ? (Number(lastC.weight)-Number(firstC.weight)) : 0;
  const bfDelta = firstC && lastC && firstC.bodyFatPct != null && lastC.bodyFatPct != null ? Number(lastC.bodyFatPct)-Number(firstC.bodyFatPct) : null;
  const phaseBody = Math.abs(weightDelta) < .2 && (bfDelta ?? 0) < 0 ? 'Recomp' : (weightDelta > .3 ? ((bfDelta ?? 0) > .4 ? 'Dirty Bulk 경계' : 'Lean Bulk') : (weightDelta < -.3 ? 'Cutting' : 'Maintenance'));
  const bodyDirection = {
    Recomp: '체중 유지 + 체지방 감량',
    'Dirty Bulk 경계': '증량 속도 빠름',
    'Lean Bulk': '천천히 증량',
    Cutting: '감량 중',
    Maintenance: '유지 중',
  }[phaseBody] || phaseBody;
  const proteinPerKg = lastC?.weight ? (four.avgProtein / Number(lastC.weight)) : 0;
  const rpeRows = Object.entries(four.rpeByMajor).map(([major, r]) => {
    const avg = r.count ? r.sum / r.count : 0;
    return `<div class="trainer-rpe-cell ${avg>=8.5?'high':avg<7?'low':''}"><span>${_esc(MAJOR_LABELS[major]||major)}</span><b>${avg.toFixed(1)}</b></div>`;
  }).join('');
  const under = Object.entries(LANDMARKS).map(([major,lm])=>({ major, lm, sets:Math.round((four.byMajor[major]?.hardSets||0)/4) })).filter(x=>x.sets < x.lm.low).sort((a,b)=>(a.sets-a.lm.low)-(b.sets-b.lm.low))[0];
  const plateauCount = liftAnalyses.filter(e => e.plateau).length;
  const briefTitle = dataWarnings ? '먼저 기록 신뢰도를 확인하세요' : (under ? `${under.lm.label} 운동량 보강이 1순위` : (plateauCount ? '정체 종목 회복 관리가 1순위' : '현재 루프 유지, 미세 증량'));
  const brief = under
    ? `${under.lm.label}이 주당 ${under.sets}세트로 최소 성장 신호보다 낮습니다. 다음 2주는 해당 부위 보조종목 2-3세트를 먼저 추가하세요.`
    : (plateauCount ? '같은 무게에서 RPE가 올라가는 종목이 있습니다. 다음 주 볼륨 -30~50% 또는 종목 rotate를 검토하세요.' : '자극·적응·회복 루프가 크게 무너지지 않았습니다. 벤치마크 1-2개만 소폭 증량하세요.');
  const asIs = under
    ? `${under.lm.label} 자극량이 기준선보다 낮아 성장 신호가 약합니다.`
    : (plateauCount ? '일부 종목은 수행능력 증가보다 피로 누적 신호가 더 큽니다.' : '핵심 부위의 자극-회복 균형은 유지되고 있습니다.');
  const toBe = under
    ? `${under.lm.label} 보조종목을 먼저 채우고, 벤치마크 증량은 유지 가능한 RPE 안에서 진행하세요.`
    : (plateauCount ? '다음 마이크로사이클은 디로드, 종목 교체, RIR 여유 확보 중 하나를 선택하세요.' : '현재 루프를 유지하되, e1RM 상승폭이 작은 종목만 미세 조정하세요.');
  root.innerHTML = `
    <section class="trainer-pulse ${phaseTone}">
      <div><span>이번 4주 요약</span><h3>${PHASE_LABELS[phase]} · ${week}/6주차</h3><p>체감강도 평균 ${four.avgRpe ? four.avgRpe.toFixed(1) : '-'} · 주당 유효세트 ${weeklySets} · 최근 2주 ${setDelta>=0?'+':''}${setDelta}세트 / ${dayDelta>=0?'+':''}${dayDelta}일</p></div>
      <div class="trainer-weeks">${[1,2,3,4,5,6].map(w=>`<i class="${w<week?'done':w===week?'now':''}">W${w}</i>`).join('')}</div>
    </section>
    <section class="trainer-panel"><div class="trainer-panel-head"><b>부위별 운동량</b><span>최근 4주 기준 · 주당 유효세트</span></div>${volumeRows}</section>
    <section class="trainer-panel"><div class="trainer-panel-head"><b>성장 추세</b><span>과장된 퍼센트 대신 kg 변화와 신뢰도 표시</span></div>${liftRows || '<p class="trainer-empty">성장 추세를 계산할 운동 기록이 부족합니다.</p>'}</section>
    ${dataWarnings ? `<section class="trainer-panel trainer-data-panel"><div class="trainer-panel-head"><b>기록 점검</b><span>갑자기 크게 뛴 종목</span></div><ul class="trainer-data-list">${dataWarnings}</ul></section>` : ''}
    <section class="trainer-panel"><div class="trainer-panel-head"><b>몸 변화와 식단</b><span>운동 성과가 몸에 반영되는지 확인</span></div><div class="trainer-body-grid"><div><span>현재 방향</span><b>${bodyDirection}</b></div><div><span>체중 4주</span><b>${weightDelta>=0?'+':''}${weightDelta.toFixed(1)}kg</b></div><div><span>체지방</span><b>${bfDelta==null?'-':`${bfDelta>=0?'+':''}${bfDelta.toFixed(1)}%p`}</b></div><div><span>단백질</span><b>${proteinPerKg ? proteinPerKg.toFixed(2) : '-'} g/kg</b></div></div><p>${four.avgKcal ? `평균 ${four.avgKcal}kcal, 단백질 ${four.avgProtein}g. 이 수치가 낮으면 운동량이 좋아도 성장 체감이 약할 수 있습니다.` : '식단 칼로리 기록이 부족해서 운동 성과와 몸 변화의 연결을 판단하기 어렵습니다.'}</p></section>
    <section class="trainer-panel"><div class="trainer-panel-head"><b>피로도</b><span>부위별 체감강도</span></div><div class="trainer-rpe-grid">${rpeRows || '<p class="trainer-empty">RPE 기록이 부족합니다.</p>'}</div><p>${four.avgRpe >= 8.6 ? '평균 체감강도가 높습니다. 이번 주는 세트 수를 줄이거나 실패지점 전 1-2회 여유를 남기세요.' : '피로도는 아직 관리 가능한 범위입니다.'}</p></section>
    <section class="trainer-brief"><span>코치 제안</span><h3>${_esc(briefTitle)}</h3><p>${_esc(dataWarnings ? '성장률이 비정상적으로 크게 잡힌 종목이 있습니다. 증량 판단보다 먼저 같은 기구/같은 단위/같은 종목명으로 기록됐는지 확인하세요.' : brief)}</p></section>
    <section class="trainer-transition"><div><span>현재 상태</span><p>${_esc(asIs)}</p></div><div><span>다음 2주</span><p>${_esc(toBe)}</p></div></section>
  `;
}

// ── 13번: CSV 내보내기 ───────────────────────────────────────────
export function exportCSV(period) {
  const cache  = getCache();
  const exList = getExList();
  const rows   = [['날짜','운동부위','종목','세트수','총볼륨(vol)','아침','점심','저녁','총칼로리','식단OK']];

  // 기간 필터
  const now   = new Date(TODAY);
  const since = period > 0
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - period)
    : null;

  Object.entries(cache)
    .filter(([key]) => !since || key >= dateKey(since.getFullYear(), since.getMonth(), since.getDate()))
    .sort(([a],[b]) => a.localeCompare(b))
    .forEach(([key, day]) => {
      // canonical diet 기록 — 텍스트(snack 포함)/food-chip/kcal-only/skip/photo 전부 인정
      const dietHas = day.breakfast || day.lunch || day.dinner || day.snack ||
                      day.bFoods?.length || day.lFoods?.length || day.dFoods?.length || day.sFoods?.length ||
                      (day.bKcal||0) > 0 || (day.lKcal||0) > 0 || (day.dKcal||0) > 0 || (day.sKcal||0) > 0 ||
                      day.breakfast_skipped || day.lunch_skipped || day.dinner_skipped ||
                      day.bPhoto || day.lPhoto || day.dPhoto || day.sPhoto;
      const diet     = dietHas ? day : null;
      const totalKcal= (day.bKcal||0)+(day.lKcal||0)+(day.dKcal||0)+(day.sKcal||0);
      const dietOk   = diet ? (day.bOk!==false&&day.lOk!==false&&day.dOk!==false?'O':'X') : '';

      if (day.exercises?.length) {
        const allMuscles = getAllMuscles();
        day.exercises.forEach(entry => {
          const ex  = exList.find(e => e.id === entry.exerciseId);
          const mc  = allMuscles.find(m => m.id === entry.muscleId);
          const vol = calcVolume(entry.sets);
          rows.push([
            key,
            mc?.name||entry.muscleId,
            ex?.name||entry.exerciseId,
            entry.sets.length,
            vol,
            day.breakfast||'', day.lunch||'', day.dinner||'',
            totalKcal||'', dietOk,
          ]);
        });
      } else if (day.cf) {
        rows.push([key,'크로스핏','크로스핏','','','',day.breakfast||'',day.lunch||'',day.dinner||'',totalKcal||'',dietOk]);
      } else if (diet) {
        rows.push([key,'','','','',day.breakfast||'',day.lunch||'',day.dinner||'',totalKcal||'',dietOk]);
      }
    });

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `life-streak-${TODAY.toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 종목별 볼륨 추이 ──────────────────────────────────────────────
function _volumeDateLabel(date) {
  return String(date || '').replace(/-/g, '/');
}

function _volumeExerciseOptions(usedExIds) {
  const exById = new Map(getExList().map(ex => [ex.id, ex]));
  const muscleById = new Map(getAllMuscles().map(m => [m.id, m]));
  return [...usedExIds].map(id => {
    const ex = exById.get(id);
    const history = getVolumeHistory(id);
    const muscle = muscleById.get(ex?.muscleId);
    return {
      id,
      name: ex?.name || id,
      color: muscle?.color || '#14b8a6',
      muscleName: muscle?.name || ex?.muscleId || '종목',
      latestDate: history.at(-1)?.date || '',
      history,
    };
  })
    .filter(opt => opt.history.length)
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate) || a.name.localeCompare(b.name, 'ko'));
}

function _volumeSetRowsHtml(entry) {
  const rows = (entry?.sets || []).map((set, idx) => {
    const vol = calcVolume([set]);
    const counted = vol > 0;
    const kg = _maybeNum(set?.kg);
    const reps = _maybeNum(set?.reps);
    const rpe = _maybeNum(set?.rpe);
    const rom = _maybeNum(set?.romPct);
    const kind = set?.setType === 'warmup' ? '워밍업' : (set?.done === false ? '미완료' : '본세트');
    const parts = [
      kg !== null ? `${_fmt(kg, kg % 1 ? 1 : 0)}kg` : '무게 없음',
      reps !== null ? `${_fmt(reps, reps % 1 ? 1 : 0)}회` : '횟수 없음',
    ];
    if (rom !== null && rom > 0 && rom < 100) parts.push(`ROM ${_fmt(rom)}%`);
    if (rpe !== null && rpe > 0) parts.push(`RPE ${_fmt(rpe, rpe % 1 ? 1 : 0)}`);
    return `
      <div class="vol-set-row ${counted ? '' : 'is-muted'}">
        <span class="vol-set-no">${idx + 1}</span>
        <span class="vol-set-main">${_esc(parts.join(' × '))}<small>${_esc(kind)}</small></span>
        <b>${counted ? `${_fmt(Math.round(vol))} vol` : '-'}</b>
      </div>`;
  }).join('');
  return rows || '<div class="vol-set-empty">세트 기록이 없어요.</div>';
}

function _volumeEntryDetailHtml(entry, selectedExerciseId) {
  const ex = getExList().find(item => item.id === entry?.exerciseId);
  const muscle = getAllMuscles().find(m => m.id === (ex?.muscleId || entry?.muscleId));
  const total = calcVolume(entry?.sets || []);
  const countedSets = (entry?.sets || []).filter(set => calcVolume([set]) > 0).length;
  const isSelected = entry?.exerciseId === selectedExerciseId;
  const color = muscle?.color || '#14b8a6';
  return `
    <div class="vol-entry ${isSelected ? 'is-selected' : ''}" style="--mc:${_esc(color)}">
      <div class="vol-entry-head">
        <div>
          <span>${_esc(muscle?.name || '운동')}</span>
          <b>${_esc(ex?.name || entry?.name || entry?.exerciseId || '운동')}</b>
        </div>
        <strong>${_fmt(Math.round(total))} vol</strong>
      </div>
      <div class="vol-entry-meta">${countedSets}개 본세트 반영</div>
      <div class="vol-set-list">${_volumeSetRowsHtml(entry)}</div>
    </div>`;
}

function _renderVolumeDayDetail(detailEl, exerciseId, date, pointVolume = null) {
  if (!detailEl) return;
  const day = getCache()[date] || {};
  const entries = Array.isArray(day.exercises) ? day.exercises : [];
  const selectedEntry = entries.find(entry => entry.exerciseId === exerciseId);
  const selectedEx = getExList().find(ex => ex.id === exerciseId);
  const selectedVolume = pointVolume ?? (selectedEntry ? calcVolume(selectedEntry.sets || []) : 0);
  const dayVolume = entries.reduce((sum, entry) => sum + calcVolume(entry.sets || []), 0);
  const selectedSets = (selectedEntry?.sets || []).filter(set => calcVolume([set]) > 0).length;
  const orderedEntries = [
    ...entries.filter(entry => entry.exerciseId === exerciseId),
    ...entries.filter(entry => entry.exerciseId !== exerciseId),
  ];
  detailEl.innerHTML = `
    <div class="vol-detail-head">
      <div><span>선택일</span><b>${_esc(_volumeDateLabel(date))}</b></div>
      <div><span>그래프값</span><b>${_fmt(Math.round(selectedVolume))} vol</b></div>
      <div><span>기준 세트</span><b>${selectedSets}세트</b></div>
    </div>
    <div class="vol-detail-note">
      ${_esc(selectedEx?.name || exerciseId)} 기준 ${_fmt(Math.round(selectedVolume))} vol · 해당일 전체 ${_fmt(Math.round(dayVolume))} vol
    </div>
    <div class="vol-entry-list">
      ${orderedEntries.length ? orderedEntries.map(entry => _volumeEntryDetailHtml(entry, exerciseId)).join('') : '<div class="vol-set-empty">해당일 운동 기록이 없어요.</div>'}
    </div>`;
}

function _syncVolumeRows(container) {
  container.querySelectorAll('[data-volume-date]').forEach(row => {
    row.classList.toggle('active', row.dataset.volumeDate === _selectedVolumeDate);
  });
}

function _renderVolumeSection() {
  const container=document.getElementById('volume-section');container.innerHTML='';
  const usedExIds=new Set();
  Object.values(getCache()).forEach(day=>(day.exercises||[]).forEach(e=>usedExIds.add(e.exerciseId)));

  if(!usedExIds.size){
    container.innerHTML='<div style="font-size:12px;color:var(--muted)">운동 기록이 없어요.</div>';
    return;
  }

  const options = _volumeExerciseOptions(usedExIds);
  if(!options.length){
    container.innerHTML+='<div style="font-size:12px;color:var(--muted);margin-top:8px">볼륨 기록이 없어요.</div>';
    return;
  }

  if(!_selectedExerciseId || !options.some(opt => opt.id === _selectedExerciseId)) {
    _selectedExerciseId = options[0].id;
    _selectedVolumeDate = null;
  }

  const selectedOption = options.find(opt => opt.id === _selectedExerciseId) || options[0];
  const history=selectedOption.history;
  if(!history.length){
    container.innerHTML+='<div style="font-size:12px;color:var(--muted);margin-top:8px">기록이 없어요.</div>';
    return;
  }

  if(!_selectedVolumeDate || !history.some(h => h.date === _selectedVolumeDate))
    _selectedVolumeDate = history.at(-1)?.date || history[0].date;

  const basis=document.createElement('div');
  basis.className='vol-basis';
  basis.style.setProperty('--mc', selectedOption.color);
  basis.innerHTML=`
    <div class="vol-basis-copy">
      <span>기준 종목</span>
      <b>${_esc(selectedOption.name)}</b>
      <small>완료 본세트의 kg × 횟수 합산 · ROM 보정 포함</small>
    </div>
    ${options.length > 1 ? `<select class="vol-select" aria-label="볼륨 그래프 기준 종목">
      ${options.map(opt => `<option value="${_esc(opt.id)}" ${opt.id === _selectedExerciseId ? 'selected' : ''}>${_esc(opt.name)}</option>`).join('')}
    </select>` : ''}`;
  container.appendChild(basis);
  basis.querySelector('.vol-select')?.addEventListener('change', (event) => {
    _selectedExerciseId = event.target.value;
    _selectedVolumeDate = null;
    _renderVolumeSection();
  });

  const chartWrap=document.createElement('div');
  chartWrap.className='vol-chart-wrap';
  const canvas=document.createElement('canvas');canvas.id='vol-chart';
  chartWrap.appendChild(canvas);container.appendChild(chartWrap);

  const detailEl=document.createElement('div');
  detailEl.className='vol-detail';
  container.appendChild(detailEl);

  const selectDate = (date) => {
    const point = history.find(h => h.date === date) || history.at(-1);
    if (!point) return;
    _selectedVolumeDate = point.date;
    _renderVolumeDayDetail(detailEl, _selectedExerciseId, point.date, point.volume);
    _syncVolumeRows(container);
    const chart = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
    if (chart) chart.update();
  };

  const recent=history.slice(-5).reverse();
  const tableWrap=document.createElement('div');tableWrap.className='vol-table';
  tableWrap.innerHTML=`<div class="vol-table-title">최근 ${recent.length}회 기록</div>`+
    recent.map((h,i)=>{
      const prev=recent[i+1],diff=prev?h.volume-prev.volume:0;
      const arrow=diff>0?'↑':diff<0?'↓':'→';
      const col=diff>0?'var(--diet-ok)':diff<0?'var(--diet-bad)':'var(--muted)';
      return `<button type="button" class="vol-row" data-volume-date="${_esc(h.date)}" aria-label="${_esc(_volumeDateLabel(h.date))} 운동 상세">
        <span class="vol-date">${h.date.replace(/-/g,'/')}</span>
        <span class="vol-val">${h.volume.toLocaleString()} vol</span>
        <span class="vol-diff" style="color:${col}">${diff!==0?arrow+Math.abs(diff).toLocaleString():arrow}</span>
      </button>`;
    }).join('');
  container.appendChild(tableWrap);

  tableWrap.querySelectorAll('[data-volume-date]').forEach(row => {
    row.addEventListener('click', () => selectDate(row.dataset.volumeDate));
  });
  selectDate(_selectedVolumeDate);
  requestAnimationFrame(()=>_drawVolumeChart(canvas,history,selectDate,selectedOption.color));
}

function _drawVolumeChart(canvas,history,onSelect,color){
  if(typeof Chart==='undefined')return;
  const existing=Chart.getChart(canvas);if(existing)existing.destroy();
  new Chart(canvas,{
    type:'line',
    data:{labels:history.map(h=>h.date.slice(5)),
      datasets:[{data:history.map(h=>h.volume),borderColor:color,backgroundColor:color+'22',tension:.3,fill:true,
        pointRadius:ctx=>history[ctx.dataIndex]?.date===_selectedVolumeDate?6:4,
        pointHoverRadius:7,
        pointHitRadius:14,
        pointBorderWidth:ctx=>history[ctx.dataIndex]?.date===_selectedVolumeDate?2:0,
        pointBorderColor:'#fff',
        pointBackgroundColor:color}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'nearest',intersect:false},onClick:(evt,elements,chart)=>{
        const hit=elements?.[0]||chart.getElementsAtEventForMode(evt,'nearest',{intersect:false},true)?.[0];
        const point=history[hit?.index];
        if(point)onSelect(point.date);
      },
      plugins:{legend:{display:false},tooltip:{callbacks:{
        title:items=>_volumeDateLabel(history[items[0]?.dataIndex]?.date),
        label:ctx=>`볼륨: ${_fmt(Math.round(ctx.parsed.y))} vol`,
      }}},
      scales:{x:{ticks:{color:'#5c6478',font:{size:10}},grid:{color:document.documentElement.classList.contains('light') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}},
              y:{title:{display:true,text:'vol',color:'#5c6478',font:{size:10}},ticks:{color:'#5c6478',font:{size:10}},grid:{color:document.documentElement.classList.contains('light') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}}}},
  });
}

function _recentChartKeys(days = 90) {
  const todayKey = _keyOffset(0);
  const start = new Date(TODAY);
  start.setDate(start.getDate() - (days - 1));
  return _dateRange(_keyFromDate(start), todayKey);
}

function _chartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
               window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    text: dark ? '#8899a6' : '#6b7280',
  };
}

const HEALTH_CHART_SERIES = {
  weight: { label: '체중', axis: 'weight', unit: 'kg', color: '#ef6a6a', background: 'rgba(239,106,106,0.08)', order: 1 },
  bodyFat: { label: '체지방률', axis: 'pct', unit: '%', color: '#10b981', background: 'rgba(16,185,129,0.08)', order: 2 },
  intake: { label: '섭취칼로리', axis: 'kcal', unit: 'kcal', color: '#6366f1', background: 'rgba(99,102,241,0.10)', order: 3 },
  burned: { label: '운동칼로리', axis: 'kcal', unit: 'kcal', color: '#f59e0b', background: 'rgba(245,158,11,0.10)', order: 4 },
};

function _bindHealthChartControls() {
  document.querySelectorAll('[data-health-series]').forEach(input => {
    const key = input.dataset.healthSeries;
    if (!HEALTH_CHART_SERIES[key]) return;
    input.checked = _healthSeriesVisible[key] !== false;
    if (input.dataset.bound === '1') return;
    input.dataset.bound = '1';
    input.addEventListener('change', () => {
      _healthSeriesVisible[key] = !!input.checked;
      _renderHealthMetricsChart();
    });
  });
  document.querySelectorAll('[data-health-period]').forEach(btn => {
    _syncHealthPeriodButton(btn);
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const raw = btn.dataset.healthPeriod;
      _healthChartPeriod = raw === 'all' ? 0 : Math.max(1, Number(raw) || 90);
      document.querySelectorAll('[data-health-period]').forEach(_syncHealthPeriodButton);
      _renderHealthMetricsChart();
    });
  });
}

function _syncHealthPeriodButton(btn) {
  const raw = btn.dataset.healthPeriod;
  const active = raw === 'all' ? _healthChartPeriod === 0 : Number(raw) === _healthChartPeriod;
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function _allHealthChartKeys(cache, checkins) {
  const todayKey = _keyOffset(0);
  const keys = new Set([
    ...Object.keys(cache || {}),
    ...checkins.map(c => c?.date).filter(Boolean),
  ]);
  const sorted = [...keys]
    .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= todayKey)
    .sort();
  const startKey = sorted[0] || _keyOffset(89);
  return _dateRange(startKey, todayKey);
}

function _healthChartKeys(cache, checkins) {
  return _healthChartPeriod === 0 ? _allHealthChartKeys(cache, checkins) : _recentChartKeys(_healthChartPeriod);
}

function _buildHealthChartData(keys, cache, checkins) {
  const plan = getDietPlan();
  const checkinByDate = new Map(checkins.map(c => [c.date, c]));
  const labels = keys.map(key => key.slice(5).replace('-', '/'));
  const data = { weight: [], bodyFat: [], intake: [], burned: [] };

  keys.forEach(key => {
    const day = cache[key] || {};
    const checkin = checkinByDate.get(key) || null;
    const weight = _maybeNum(checkin?.weight);
    const bodyFat = _maybeNum(checkin?.bodyFatPct);
    const intake = _dayKcal(day);
    const weightForBurn = _weightOnOrBefore(checkins, key) ?? _maybeNum(plan?.weight) ?? 70;
    const burned = calcBurnedKcal(day, weightForBurn).total;

    data.weight.push(weight !== null ? weight : null);
    data.bodyFat.push(bodyFat !== null ? bodyFat : null);
    data.intake.push(intake > 0 ? intake : null);
    data.burned.push(burned > 0 ? burned : null);
  });

  return { labels, data };
}

function _healthDataset(key, data) {
  const cfg = HEALTH_CHART_SERIES[key];
  return {
    label: cfg.label,
    data,
    borderColor: cfg.color,
    backgroundColor: cfg.background,
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: key === 'bodyFat' || key === 'weight' ? 0.3 : 0.22,
    spanGaps: true,
    yAxisID: cfg.axis,
    order: cfg.order,
  };
}

function _formatHealthTooltip(ctx) {
  const cfg = Object.values(HEALTH_CHART_SERIES).find(item => item.label === ctx.dataset.label);
  const value = ctx.parsed.y;
  if (value == null) return `${ctx.dataset.label}: -`;
  if (cfg?.unit === 'kcal') return `${ctx.dataset.label}: ${_fmt(value)}kcal`;
  if (cfg?.unit === '%') return `${ctx.dataset.label}: ${Number(value).toFixed(1)}%`;
  return `${ctx.dataset.label}: ${Number(value).toFixed(1)}kg`;
}

function _renderHealthMetricsChart() {
  const canvas = document.getElementById('health-metrics-chart');
  const emptyEl = document.getElementById('health-chart-empty');
  const metaEl = document.getElementById('health-chart-meta');
  if (!canvas) return;

  if (_healthMetricsChart) { _healthMetricsChart.destroy(); _healthMetricsChart = null; }

  const cache = getCache();
  const checkins = getBodyCheckins();
  const keys = _healthChartKeys(cache, checkins);
  const { labels, data } = _buildHealthChartData(keys, cache, checkins);
  const visibleKeys = Object.keys(HEALTH_CHART_SERIES).filter(key => _healthSeriesVisible[key] !== false);
  const datasets = visibleKeys
    .filter(key => data[key]?.some(v => v !== null))
    .map(key => _healthDataset(key, data[key]));
  const hasChartData = datasets.length > 0;

  canvas.style.display = hasChartData ? 'block' : 'none';
  if (emptyEl) {
    emptyEl.style.display = hasChartData ? 'none' : 'block';
    emptyEl.textContent = visibleKeys.length
      ? '선택한 기간에 표시할 건강 지표 기록이 없어요.'
      : '비교할 지표를 선택하세요.';
  }
  if (metaEl) {
    const first = keys[0]?.replace(/-/g, '.') || '';
    const last = keys[keys.length - 1]?.replace(/-/g, '.') || '';
    const picked = visibleKeys.map(key => HEALTH_CHART_SERIES[key].label).join(' · ') || '선택 없음';
    metaEl.textContent = first && last ? `${first} - ${last} · ${picked}` : picked;
  }
  if (!hasChartData || typeof Chart === 'undefined') return;

  const colors = _chartColors();
  _healthMetricsChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: _formatHealthTooltip } },
      },
      scales: {
        x: {
          ticks: { color: colors.text, font: { size: 10 }, maxTicksLimit: 7, maxRotation: 0 },
          grid: { color: colors.grid },
        },
        weight: {
          position: 'left',
          title: { display: true, text: 'kg', color: colors.text, font: { size: 10 } },
          ticks: { color: colors.text, font: { size: 10 } },
          grid: { color: colors.grid },
        },
        kcal: {
          position: 'right',
          title: { display: true, text: 'kcal', color: colors.text, font: { size: 10 } },
          ticks: { color: colors.text, font: { size: 10 }, callback: v => _fmt(v) },
          grid: { drawOnChartArea: false },
        },
        pct: {
          position: 'right',
          title: { display: true, text: '%', color: colors.text, font: { size: 10 } },
          ticks: { color: colors.text, font: { size: 10 } },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

// ── 연간 히트맵 ──────────────────────────────────────────────────
function _renderHeatmap(){
  const y=TODAY.getFullYear();
  const yearEl=document.getElementById('heatmap-year');
  if(yearEl) yearEl.textContent=y+'년';
  const el=document.getElementById('heatmap');if(!el)return;el.innerHTML='';
  const startDow=new Date(y,0,1).getDay();
  for(let i=0;i<startDow;i++){const b=document.createElement('div');b.style.aspectRatio='1';el.appendChild(b);}
  for(let m=0;m<12;m++)for(let d=1;d<=daysInMonth(y,m);d++){
    const hasGym=getMuscles(y,m,d).length>0,hasCF=getCF(y,m,d),hasDiet=dietDayOk(y,m,d)===true,fut=isFuture(y,m,d);
    const hasEx=hasExerciseRecord(y,m,d);
    const cell=document.createElement('div');cell.className='heatmap-cell';
    if(!fut){
      if(hasGym&&hasCF)cell.classList.add('h4');
      else if(hasGym){const cnt=getMuscles(y,m,d).length;cell.classList.add(cnt>=3?'h3':cnt===2?'h2':'h1');}
      else if(hasCF)cell.classList.add('hcf');
      else if(hasEx)cell.classList.add('hcf'); // stretching/running/swimming도 표시
      else if(hasDiet)cell.classList.add('hdiet');
    }
    el.appendChild(cell);
  }
}
