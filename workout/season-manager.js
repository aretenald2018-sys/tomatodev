import {
  createWorkoutSeason,
  getCache,
  getExList,
  getSeasonRunningPlan,
  getSeasonRegistry,
  getSeasonTestBoardV2,
  getSeasonWorkoutPlan,
  getTestBoardV2,
  updateWorkoutSeason,
} from '../data.js';
import {
  addSeasonDays,
  findSeasonForDate,
  seasonPresetEndDate,
  validateSeasonRegistry,
} from '../data/season-model.js';
import {
  activeBenchmarks,
  roundToPlate,
} from './test-v2/board-core.js';
import {
  buildSeasonExerciseSetup,
  buildSeasonExerciseHistory,
  buildSeasonStairOverrideDraft,
  calculateSeasonWendlerFromTenRm,
  SEASON_NORMAL_INCREMENTS_KG,
  SEASON_NORMAL_PROGRESSION_WEEKS,
  seasonResetPreview,
} from './season-reset.js';
import { inferW863Profile, W863_ORIGINAL_PROFILES } from './w863-original.js';
import { showToast } from '../ui/toast.js';
import { listRunningActivities } from './running-analytics.js';
import {
  deriveComparablePaceBaseline,
  formatPaceSecPerKm,
  normalizeRunningPacePlan,
  RUNNING_ADAPTIVE_RATE_OPTIONS,
} from '../data/running-pace-goal.js';

const STEP_LABELS = ['기간', '종목·목표', '선택 확인', '러닝', '최종 확인'];
const WENDLER_PLATE_STEP_KG = 1.25;
const WENDLER_THREE_WEEK_BLOCKS_PER_CYCLE = 2;
const GROUP_LABELS = Object.freeze({
  chest: '가슴', back: '등', shoulder: '어깨', lower: '하체', arm: '팔', abs: '복부', other: '기타',
});
const GROUP_ORDER = Object.freeze(['chest', 'back', 'shoulder', 'lower', 'arm', 'abs', 'other']);
let _state = null;

function _esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function _todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function _seasonName(startDate) {
  const month = Number(String(startDate).slice(5, 7));
  const year = String(startDate).slice(0, 4);
  const label = month >= 3 && month <= 5 ? '봄' : month <= 8 ? '여름' : month <= 11 ? '가을' : '겨울';
  return `${year} ${label} 시즌`;
}

function _requestId() {
  return globalThis.crypto?.randomUUID?.() || `season-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function _inclusiveSeasonDays(season = {}) {
  const start = new Date(`${season.startDate}T00:00:00Z`);
  const end = new Date(`${season.endDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
}

function _seasonWeeks(season = {}) {
  if (season?.startDate && season?.endDate) {
    for (const weeks of [6, 7]) {
      if (season.endDate === seasonPresetEndDate(season.startDate, weeks)) return weeks;
    }
  }
  const days = _inclusiveSeasonDays(season);
  return days ? Math.round((days / 7) * 10) / 10 : 0;
}

function _goalPaceText(plan = {}) {
  return formatPaceSecPerKm(plan.targetPaceSecPerKm);
}

function _paceParts(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return { minutes: seconds ? Math.floor(seconds / 60) : '', seconds: seconds ? seconds % 60 : '' };
}

function _initialPaceBaseline(cache, startDate, referenceDistanceKm = 5) {
  return deriveComparablePaceBaseline(listRunningActivities(Object.entries(cache || {})), {
    asOfDate: addSeasonDays(startDate, -1),
    referenceDistanceKm,
  });
}

function _overridesFromBoard(board = {}) {
  return Object.fromEntries(activeBenchmarks(board).map(benchmark => {
    const exerciseId = String(benchmark.exerciseId || benchmark.id);
    if (benchmark.program === 'wendler') {
      return [exerciseId, {
        program: 'wendler',
        benchmarkId: benchmark.id,
        wendler: { ...(benchmark.wendler || {}) },
      }];
    }
    return [exerciseId, {
      program: 'stair',
      benchmarkId: benchmark.id,
      progressionWeeks: Number(benchmark.progressionWeeks) || SEASON_NORMAL_PROGRESSION_WEEKS,
      tracks: Object.fromEntries((benchmark.tracks || ['volume']).map(track => [track, {
        kg: Number(benchmark.seed?.[track]?.kg) || '',
        sets: Number(benchmark.setsByTrack?.[track]) || Number(benchmark.setsDefault) || '',
        incrementKg: Number(benchmark.incrementKgByTrack?.[track]) || Number(benchmark.incrementKg) || '',
      }])),
    }];
  }));
}

function _configurationFor(exerciseId) {
  return _state?.exerciseSetup?.configurations?.find(configuration => configuration.exerciseId === exerciseId) || null;
}

function _emptyTrackDraft(previous = {}) {
  return {
    kg: previous.kg ?? '',
    sets: previous.sets ?? '',
    incrementKg: previous.incrementKg ?? '',
  };
}

function _normalTrackReady(track = {}) {
  return Number(track.kg) > 0
    && Number(track.sets) > 0
    && SEASON_NORMAL_INCREMENTS_KG.includes(Number(track.incrementKg));
}

function _goalTrackIds(override = {}) {
  if (override.program === 'wendler') return Number(override.wendler?.oneRmKg) > 0 ? ['volume'] : [];
  if (override.program !== 'stair') return [];
  return ['volume', 'intensity'].filter(track => _normalTrackReady(override.tracks?.[track]));
}

function _refreshSelectedExerciseIds() {
  if (!_state) return;
  _state.selectedExerciseIds = new Set(_state.exerciseSetup.configurations
    .filter(configuration => _goalTrackIds(_state.overrides[configuration.exerciseId]).length)
    .map(configuration => configuration.exerciseId));
}

function _recentSetSummary(history) {
  if (!history?.sets?.length) return '아직 수행 기록이 없습니다.';
  const groups = [];
  for (const set of history.sets) {
    const key = `${set.kg}|${set.reps}`;
    const existing = groups.find(group => group.key === key);
    if (existing) existing.count += 1;
    else groups.push({ key, kg: set.kg, reps: set.reps, count: 1 });
  }
  return groups.map(group => `${group.kg}kg×${group.reps}회 ${group.count}세트`).join(' · ');
}

function _wendlerDraft(configuration) {
  const id = configuration.exerciseId;
  const override = _state.overrides[id] || {};
  const benchmark = configuration.benchmark;
  const profileId = override.wendler?.profileId || inferW863Profile({
    ...benchmark,
    exerciseId: id,
    movementId: configuration.movementId,
    label: configuration.label,
    primaryMajor: configuration.groupId,
  });
  const profile = W863_ORIGINAL_PROFILES[profileId] || Object.values(W863_ORIGINAL_PROFILES)[0];
  const sourceWendler = { ...(benchmark?.wendler || {}), ...(override.wendler || {}) };
  const roundKg = WENDLER_PLATE_STEP_KG;
  const oneRmKg = Number(override.wendler?.oneRmKg)
    || Number(benchmark?.wendler?.oneRmKg)
    || Number(benchmark?.wendler?.tmKg) / 0.9
    || profile.reference1RmKg;
  return {
    profileId,
    tenRmKg: Number(override.wendler?.tenRmKg) || 0,
    oneRmKg: Math.round(oneRmKg * 10) / 10,
    tmKg: roundToPlate(oneRmKg * 0.9, roundKg),
    threeWeekIncrementKg: _wendlerThreeWeekIncrement(sourceWendler, profile),
    roundKg,
  };
}

function _syncExerciseSetup(state) {
  const setup = buildSeasonExerciseSetup({
    registeredExercises: state.exercises,
    previousBoard: state.board,
    benchmarkMappings: state.benchmarkMappings,
  });
  const overrides = { ...(state.overrides || {}) };
  for (const configuration of setup.configurations) {
    const id = configuration.exerciseId;
    const previous = overrides[id] || {};
    const program = ['wendler', 'stair', 'none'].includes(previous.program)
      ? previous.program
      : 'none';
    if (program === 'wendler') {
      const benchmark = configuration.benchmark;
      const profileId = previous.wendler?.profileId || inferW863Profile({
        ...benchmark,
        exerciseId: id,
        movementId: configuration.movementId,
        label: configuration.label,
      });
      const profile = W863_ORIGINAL_PROFILES[profileId] || Object.values(W863_ORIGINAL_PROFILES)[0];
      overrides[id] = {
        ...previous,
        program: 'wendler',
        benchmarkId: benchmark?.id || configuration.benchmarkId,
        wendler: {
          profileId,
          oneRmKg: Number(previous.wendler?.oneRmKg)
            || Number(benchmark?.wendler?.oneRmKg)
            || Number(benchmark?.wendler?.tmKg) / 0.9
            || profile.reference1RmKg,
          incrementKg: Number(previous.wendler?.incrementKg)
            || Number(benchmark?.wendler?.incrementKg)
            || profile.defaultIncrementKg,
          roundKg: Number(previous.wendler?.roundKg) || Number(benchmark?.wendler?.roundKg) || 2.5,
          ...(Number(previous.wendler?.tenRmKg) > 0 ? { tenRmKg: Number(previous.wendler.tenRmKg) } : {}),
        },
      };
    } else {
      overrides[id] = {
        ...previous,
        program,
        benchmarkId: configuration.benchmarkId,
        tracks: {
          volume: _emptyTrackDraft(previous.tracks?.volume),
          intensity: _emptyTrackDraft(previous.tracks?.intensity),
        },
        progressionWeeks: SEASON_NORMAL_PROGRESSION_WEEKS,
      };
    }
  }
  state.exerciseSetup = setup;
  state.overrides = overrides;
  state.exerciseWindows = state.exerciseWindows || {};
  for (const configuration of setup.configurations) {
    state.exerciseWindows[configuration.exerciseId] = {
      startDate: state.exerciseWindows[configuration.exerciseId]?.startDate || state.season.startDate,
      endDate: state.exerciseWindows[configuration.exerciseId]?.endDate || state.season.endDate,
    };
  }
  state.selectedExerciseIds = new Set(setup.configurations
    .filter(configuration => _goalTrackIds(overrides[configuration.exerciseId]).length)
    .map(configuration => configuration.exerciseId));
}

function _initialState(editingSeasonId = null) {
  const registry = getSeasonRegistry();
  const editingSeason = editingSeasonId
    ? registry.seasons.find(season => season.id === editingSeasonId) || null
    : null;
  const board = editingSeason ? (getSeasonTestBoardV2(editingSeason.id) || getTestBoardV2()) : getTestBoardV2();
  const exercises = getExList().filter(exercise => exercise?.id);
  const latest = registry.seasons.at(-1) || null;
  const today = _todayKey();
  const startDate = latest && latest.endDate >= today ? addSeasonDays(latest.endDate, 1) : today;
  const existingWorkoutPlan = editingSeason ? getSeasonWorkoutPlan(editingSeason.id) : null;
  const existingRunningPlan = editingSeason ? getSeasonRunningPlan(editingSeason.id) : null;
  const baseline = _initialPaceBaseline(getCache() || {}, editingSeason?.startDate || startDate, 5);
  const normalizedRunning = normalizeRunningPacePlan({
    ...(existingRunningPlan || {}),
    baselinePaceSecPerKm: existingRunningPlan?.baselinePaceSecPerKm || baseline.paceSecPerKm,
  }, editingSeason || { startDate, endDate: addSeasonDays(startDate, 41) });
  const benchmarks = activeBenchmarks(board || {});
  const state = {
    step: 0,
    registry,
    board,
    exercises,
    exerciseHistory: buildSeasonExerciseHistory(getCache() || {}, exercises),
    benchmarks,
    selectedExerciseIds: new Set(),
    season: editingSeason
      ? { ...editingSeason }
      : { name: _seasonName(startDate), startDate, endDate: addSeasonDays(startDate, 41) },
    benchmarkMappings: {},
    exerciseSetup: null,
    overrides: editingSeason ? _overridesFromBoard(board || {}) : {},
    exerciseWindows: { ...(existingWorkoutPlan?.exerciseSeasonWindowsByExercise || {}) },
    weeklySessionTarget: Number(existingWorkoutPlan?.weeklySessionTarget) || 3,
    runningPlan: {
      goalType: 'pace',
      paceMode: 'adaptive-weekly',
      targetPaceSecPerKm: baseline.paceSecPerKm || null,
      baselinePaceSecPerKm: baseline.paceSecPerKm,
      adaptiveRatePct: 1,
      referenceDistanceKm: 5,
      startDate: editingSeason?.startDate || startDate,
      endDate: editingSeason?.endDate || addSeasonDays(startDate, 41),
      recoveryEveryWeeks: 4,
      baselineWeeklyDistanceKm: 10,
      weeklyDistanceKm: 15,
      weeklySessions: 3,
      longestRunKm: 7,
      speedSessionsPerWeek: 1,
      optionalDurationMin: 120,
      ...(existingRunningPlan || {}),
      ...normalizedRunning,
      targetPaceSecPerKm: normalizedRunning.targetPaceSecPerKm || baseline.paceSecPerKm || null,
    },
    activeGroupId: null,
    wendlerEditor: null,
    clientRequestId: _requestId(),
    editingSeasonId: editingSeason?.id || null,
    originalStartDate: editingSeason?.startDate || null,
    saving: false,
  };
  _syncExerciseSetup(state);
  state.activeGroupId = GROUP_ORDER.find(groupId => (
    state.exerciseSetup.configurations.some(configuration => configuration.groupId === groupId)
  )) || 'other';
  return state;
}

function _modal() {
  let modal = document.getElementById('workout-season-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'workout-season-modal';
  modal.className = 'modal-backdrop workout-season-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="modal-sheet workout-season-sheet" role="dialog" aria-modal="true" aria-labelledby="workout-season-title"></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if (event.target === modal && !_state?.saving) closeWorkoutSeasonWizard();
  });
  const sheet = modal.querySelector('.workout-season-sheet');
  sheet.addEventListener('click', _handleClick);
  sheet.addEventListener('input', _handleInput);
  sheet.addEventListener('change', _handleInput);
  return modal;
}

function _stepper() {
  return `<div class="season-stepper" aria-label="시즌 설정 단계">${STEP_LABELS.map((label, index) => (
    `<span class="${index === _state.step ? 'is-current' : index < _state.step ? 'is-done' : ''}"><b>${index + 1}</b>${_esc(label)}</span>`
  )).join('')}</div>`;
}

function _periodStep() {
  const otherSeasons = _state.registry.seasons.filter(season => season.id !== _state.editingSeasonId);
  const existing = otherSeasons.length
    ? `<div class="season-existing-list">${otherSeasons.map(season => `<span>${_esc(season.name)} · ${season.startDate}–${season.endDate}</span>`).join('')}</div>`
    : `<p class="season-empty-copy">${_state.editingSeasonId ? '현재 시즌의 기간과 목표를 안전하게 수정할 수 있어요.' : '등록된 시즌이 없습니다. 첫 시즌을 오늘부터 시작할 수 있어요.'}</p>`;
  const weeks = _seasonWeeks(_state.season);
  return `
    <div class="season-step-copy"><strong>${_state.editingSeasonId ? '시즌 기간 수정' : '새 시즌 기간'}</strong><p>헬스 성장판에 맞춰 6주 또는 7주를 권장합니다. 기록은 그대로 유지됩니다.</p></div>
    ${existing}
    <label class="season-field"><span>시즌 이름</span><input data-season-field="name" value="${_esc(_state.season.name)}" maxlength="40"></label>
    <div class="season-length-presets" aria-label="시즌 기간 빠른 선택">
      ${[6, 7].map(value => `<button type="button" class="${weeks === value ? 'is-active' : ''}" data-season-action="season-length" data-season-weeks="${value}"><b>${value}주</b><small>${value === 6 ? '기본 성장판' : '8/6/3 포함'}</small></button>`).join('')}
      <span>현재 ${weeks || '-'}주</span>
    </div>
    <div class="season-field-row">
      <label class="season-field"><span>시작일</span><input type="date" data-season-field="startDate" value="${_esc(_state.season.startDate)}" ${_state.editingSeasonId ? 'disabled' : ''}></label>
      <label class="season-field"><span>종료일</span><input type="date" data-season-field="endDate" value="${_esc(_state.season.endDate)}"></label>
    </div>`;
}

function _wendlerThreeWeekIncrement(wendler = {}, profile = {}) {
  const saved = Number(wendler.threeWeekIncrementKg);
  if (SEASON_NORMAL_INCREMENTS_KG.includes(saved)) return saved;
  const converted = Number(wendler.incrementKg) / WENDLER_THREE_WEEK_BLOCKS_PER_CYCLE;
  if (SEASON_NORMAL_INCREMENTS_KG.includes(converted)) return converted;
  const profileConverted = Number(profile.defaultIncrementKg) / WENDLER_THREE_WEEK_BLOCKS_PER_CYCLE;
  if (SEASON_NORMAL_INCREMENTS_KG.includes(profileConverted)) return profileConverted;
  return SEASON_NORMAL_INCREMENTS_KG[0];
}

function _exerciseStep() {
  const configurations = [..._state.exerciseSetup.configurations].sort((left, right) => {
    const leftDate = _state.exerciseHistory[left.exerciseId]?.dateKey || '';
    const rightDate = _state.exerciseHistory[right.exerciseId]?.dateKey || '';
    return rightDate.localeCompare(leftDate) || left.order - right.order;
  });
  const grouped = GROUP_ORDER.map(groupId => ({
    groupId,
    items: configurations.filter(configuration => configuration.groupId === groupId),
  })).filter(group => group.items.length);
  if (!grouped.some(group => group.groupId === _state.activeGroupId)) {
    _state.activeGroupId = grouped[0]?.groupId || 'other';
  }
  const activeGroup = grouped.find(group => group.groupId === _state.activeGroupId) || grouped[0] || { groupId: 'other', items: [] };
  const tabs = grouped.map(({ groupId, items }) => {
    const selectedCount = items.filter(item => _state.selectedExerciseIds.has(item.exerciseId)).length;
    return `<button type="button" class="${groupId === activeGroup.groupId ? 'is-active' : ''}" data-season-action="select-group" data-season-group="${_esc(groupId)}" aria-pressed="${groupId === activeGroup.groupId}"><span>${_esc(GROUP_LABELS[groupId] || groupId)}</span><small>${selectedCount}/${items.length}</small></button>`;
  }).join('');
  return `
    <div class="season-step-copy"><strong>부위별 종목 · 새 시즌 목표</strong><p>최근 수행한 종목부터 표시합니다. 입력을 완료한 트랙만 목표가 되고, 비워 둔 종목은 나중에 설정할 수 있어요.</p></div>
    <nav class="season-exercise-tabs" aria-label="운동 부위">${tabs}</nav>
    <section class="season-exercise-group">
      <header><strong>${GROUP_LABELS[activeGroup.groupId] || activeGroup.groupId}</strong><span>${activeGroup.items.length}종목</span></header>
      <div class="season-exercise-list">${activeGroup.items.map((configuration) => {
        const id = configuration.exerciseId;
        const config = _state.overrides[id];
        const isWendler = config.program === 'wendler';
        const isStair = config.program === 'stair';
        const goalTracks = _goalTrackIds(config);
        const selected = goalTracks.length > 0;
        const hasPartialGoal = isStair && ['volume', 'intensity'].some(track => {
          const draft = config.tracks?.[track] || {};
          return draft.kg !== '' || draft.sets !== '' || draft.incrementKg !== '';
        });
        const history = _state.exerciseHistory[id];
        const wendler = config.wendler || _wendlerDraft(configuration);
        const tmKg = roundToPlate(Number(wendler.oneRmKg) * 0.9, WENDLER_PLATE_STEP_KG);
        const exerciseWindow = _state.exerciseWindows[id] || {
          startDate: _state.season.startDate,
          endDate: _state.season.endDate,
        };
        const badge = isWendler && selected ? 'W1 시작' : selected ? `${goalTracks.length}트랙 목표` : hasPartialGoal ? '입력 중' : '미설정';
        return `<section class="season-exercise-card${selected ? ' has-goal' : ''}" data-season-exercise-card="${_esc(id)}">
          <header>
            <div class="season-exercise-identity"><b>${_esc(configuration.label)}</b><small>${_esc(GROUP_LABELS[configuration.groupId] || configuration.groupId)} · ID ${_esc(id)}</small></div>
            <em class="${isWendler && selected ? 'is-wendler' : selected ? 'is-goal' : ''}">${badge}</em>
          </header>
          <div class="season-recent-reference${history ? '' : ' is-empty'}"><span>최근 수행${history ? ` · ${_esc(history.dateKey.slice(5).replace('-', '.'))}` : ''}</span><strong>${_esc(_recentSetSummary(history))}</strong></div>
          <div class="season-card-settings">
            <label class="season-compact-field season-program-field"><span>목표 방식</span><select data-season-program="program"><option value="none" ${config.program === 'none' ? 'selected' : ''}>목표 없음</option><option value="stair" ${isStair ? 'selected' : ''}>일반 · 3주 증량</option><option value="wendler" ${isWendler ? 'selected' : ''}>8/6/3</option></select></label>
            <div class="season-exercise-window" aria-label="${_esc(configuration.label)} 시즌 기간">
              <label><span>종목 시작</span><input type="date" data-season-exercise-window="startDate" min="${_esc(_state.season.startDate)}" max="${_esc(_state.season.endDate)}" value="${_esc(exerciseWindow.startDate)}"></label>
              <label><span>종목 종료</span><input type="date" data-season-exercise-window="endDate" min="${_esc(_state.season.startDate)}" max="${_esc(_state.season.endDate)}" value="${_esc(exerciseWindow.endDate)}"></label>
            </div>
            ${isWendler ? `<div class="season-wendler-goal"><div class="season-wendler-summary"><span>1RM <b>${_esc(wendler.oneRmKg)}kg</b></span><span>TM <b>${_esc(tmKg)}kg</b></span></div><button type="button" class="season-wendler-open" data-season-action="open-wendler" data-exercise-id="${_esc(id)}">목표 설정</button></div>` : ''}
            ${isStair ? `<div class="season-track-grid">${[['volume', '볼륨 트랙'], ['intensity', '강도 트랙']].map(([track, label]) => {
              const draft = config.tracks?.[track] || _emptyTrackDraft();
              return `<section class="season-track-row${_normalTrackReady(draft) ? ' is-ready' : ''}"><strong>${label}</strong><label><span>기준중량</span><span class="season-input-unit"><input type="number" inputmode="decimal" min="0" step="0.25" data-season-normal-track="${track}" data-season-normal-field="kg" value="${_esc(draft.kg)}" placeholder="미설정"><b>kg</b></span></label><label><span>기준세트</span><span class="season-input-unit"><input type="number" inputmode="numeric" min="1" max="20" step="1" data-season-normal-track="${track}" data-season-normal-field="sets" value="${_esc(draft.sets)}" placeholder="미설정"><b>세트</b></span></label><label><span>3주 증량</span><select data-season-normal-track="${track}" data-season-normal-field="incrementKg"><option value="">미설정</option>${SEASON_NORMAL_INCREMENTS_KG.map(increment => `<option value="${increment}" ${Number(draft.incrementKg) === increment ? 'selected' : ''}>+${increment}kg</option>`).join('')}</select></label></section>`;
            }).join('')}</div>` : ''}
          </div>
        </section>`;
      }).join('')}</div>
    </section>`;
}

function _selectionReviewStep() {
  const selected = _state.exerciseSetup.configurations
    .filter(configuration => _state.selectedExerciseIds.has(configuration.exerciseId));
  const grouped = GROUP_ORDER.map(groupId => ({
    groupId,
    items: selected.filter(configuration => configuration.groupId === groupId),
  })).filter(group => group.items.length);
  const wendlerCount = selected.filter(configuration => _state.overrides[configuration.exerciseId]?.program === 'wendler').length;
  const trackCount = selected.reduce((sum, configuration) => (
    sum + _goalTrackIds(_state.overrides[configuration.exerciseId]).length
  ), 0);
  return `
    <div class="season-step-copy season-review-heading"><strong>선택한 운동과 목표를 확인해 주세요</strong><p>결제 전 주문서를 확인하듯, 빠진 종목이나 잘못 입력한 목표가 없는지 마지막으로 점검합니다.</p></div>
    <div class="season-review-summary">
      <span><small>선택 종목</small><b>${selected.length}개</b></span>
      <span><small>목표 트랙</small><b>${trackCount}개</b></span>
      <span><small>8/6/3</small><b>${wendlerCount}개</b></span>
      <button type="button" data-season-action="go-to-step" data-season-step="1">수정</button>
    </div>
    ${selected.length ? `<div class="season-review-groups">${grouped.map(group => `
      <section>
        <header><strong>${_esc(GROUP_LABELS[group.groupId] || group.groupId)}</strong><span>${group.items.length}종목</span></header>
        ${group.items.map(configuration => {
          const config = _state.overrides[configuration.exerciseId];
          const tracks = _goalTrackIds(config);
          const detail = config.program === 'wendler'
            ? `8/6/3 · 1RM ${_esc(config.wendler?.oneRmKg || 0)}kg · 3주 +${_esc(config.wendler?.threeWeekIncrementKg || _wendlerThreeWeekIncrement(config.wendler))}kg`
            : tracks.map(track => {
              const goal = config.tracks[track];
              return `${track === 'volume' ? '볼륨' : '강도'} ${goal.kg}kg · ${goal.sets}세트 · +${goal.incrementKg}kg`;
            }).join(' / ');
          return `<div class="season-review-item"><span><b>${_esc(configuration.label)}</b><small>${_esc(detail)}</small></span><i>확인</i></div>`;
        }).join('')}
      </section>`).join('')}</div>` : '<div class="season-review-empty">설정된 운동 목표가 없습니다. 이전 단계에서 한 종목 이상 목표를 설정해 주세요.</div>'}`;
}

function _wendlerEditorHtml() {
  const editor = _state.wendlerEditor;
  if (!editor) return '';
  const configuration = _configurationFor(editor.exerciseId);
  if (!configuration) return '';
  const draft = editor.draft;
  return `<div class="season-wendler-editor-backdrop">
    <section class="season-wendler-editor" role="dialog" aria-modal="true" aria-labelledby="season-wendler-title">
      <header><div><span>8/6/3 ORIGINAL</span><h3 id="season-wendler-title">웬들러 목표 설정</h3></div><button type="button" data-season-action="wendler-cancel" aria-label="닫기">×</button></header>
      <div class="season-wendler-editor-body">
        <div class="season-wendler-exercise"><span>기록 종목</span><strong>${_esc(configuration.label)}</strong><small>ID · ${_esc(configuration.exerciseId)}</small></div>
        <label class="season-field"><span>리프트 프로필</span><select data-season-wendler-draft="profileId">${Object.values(W863_ORIGINAL_PROFILES).map(profile => `<option value="${profile.id}" ${profile.id === draft.profileId ? 'selected' : ''}>${_esc(profile.label)}</option>`).join('')}</select></label>
        <section class="season-ten-rm-box"><div><strong>10RM 자동 환산</strong><small>10회 수행 가능한 중량을 입력하면 Epley 공식으로 1RM과 TM(90%)을 계산합니다.</small></div><label><span>10RM</span><span class="season-input-unit"><input type="number" inputmode="decimal" min="0" step="0.5" data-season-wendler-draft="tenRmKg" value="${draft.tenRmKg || ''}" placeholder="예: 50"><b>kg</b></span></label></section>
        <div class="season-wendler-calc" aria-live="polite"><span>추정 1RM<strong data-season-wendler-calc-one-rm>${_esc(draft.oneRmKg)}kg</strong></span><i>→</i><span>시작 TM<strong data-season-wendler-calc-tm>${_esc(draft.tmKg)}kg</strong></span></div>
        <div class="season-wendler-editor-grid">
          <label class="season-field"><span>1RM 직접 조정</span><input type="number" inputmode="decimal" min="1" step="0.1" data-season-wendler-draft="oneRmKg" value="${draft.oneRmKg}"></label>
          <label class="season-field"><span>3주 증량</span><select data-season-wendler-draft="threeWeekIncrementKg">${SEASON_NORMAL_INCREMENTS_KG.map(increment => `<option value="${increment}" ${Number(draft.threeWeekIncrementKg) === increment ? 'selected' : ''}>+${increment}kg</option>`).join('')}</select></label>
        </div>
        <p class="season-wendler-note">1.25kg 원판 단위로 처방하며, 선택한 3주 증량을 두 번 적용한 값이 7주 사이클 정산 증량으로 환산됩니다.</p>
      </div>
      <footer><button type="button" class="season-secondary" data-season-action="wendler-cancel">취소</button><button type="button" class="season-primary" data-season-action="wendler-apply">이 목표 적용</button></footer>
    </section>
  </div>`;
}

function _runningStep() {
  const plan = _state.runningPlan;
  const pace = _paceParts(plan.targetPaceSecPerKm);
  const baselineText = plan.baselinePaceSecPerKm
    ? formatPaceSecPerKm(plan.baselinePaceSecPerKm)
    : '최근 28일 내 유사 거리 3회가 쌓이면 자동 계산';
  return `
    <div class="season-step-copy"><strong>km당 페이스 목표</strong><p>모든 러닝을 빠르게 달리는 대신, 주 1회 페이스 체크 결과만 다음 주 목표에 반영합니다. 이지·회복·롱런은 페이스 실패로 처리하지 않습니다.</p></div>
    <section class="season-race-goal season-pace-goal">
      <div class="season-race-head"><span>PACE GOAL</span><strong>${_esc(_goalPaceText(plan))}</strong><small>기준 페이스 ${_esc(baselineText)}</small></div>
      <div class="season-field-row season-running-window">
        <label class="season-field"><span>러닝 시작</span><input type="date" data-season-running="startDate" min="${_state.season.startDate}" max="${_state.season.endDate}" value="${_esc(plan.startDate)}"></label>
        <label class="season-field"><span>러닝 종료</span><input type="date" data-season-running="endDate" min="${_state.season.startDate}" max="${_state.season.endDate}" value="${_esc(plan.endDate)}"></label>
      </div>
      <div class="season-goal-toggle" role="group" aria-label="러닝 페이스 목표 방식">
        <button type="button" class="${plan.paceMode === 'manual' ? 'is-active' : ''}" data-season-action="running-pace-mode" data-running-pace-mode="manual">직접 목표</button>
        <button type="button" class="${plan.paceMode !== 'manual' ? 'is-active' : ''}" data-season-action="running-pace-mode" data-running-pace-mode="adaptive-weekly">주간 적응형</button>
      </div>
      <div class="season-race-time-row season-pace-input-row">
        <div class="season-duration-block"><span>목표 페이스</span><div class="season-duration-inputs"><label><input type="number" inputmode="numeric" min="2" max="20" data-season-running-pace-field="minutes" value="${pace.minutes}" placeholder="6"><b>분</b></label><label><input type="number" inputmode="numeric" min="0" max="59" data-season-running-pace-field="seconds" value="${pace.seconds}" placeholder="00"><b>초/km</b></label></div></div>
        <div class="season-pace-output"><span>적용 목표</span><strong data-season-running-pace>${_esc(_goalPaceText(plan))}</strong></div>
      </div>
      ${plan.paceMode !== 'manual' ? `<div class="season-adaptive-settings"><label class="season-field"><span>성공 주 개선폭</span><select data-season-running="adaptiveRatePct">${RUNNING_ADAPTIVE_RATE_OPTIONS.map(rate => `<option value="${rate}" ${Number(plan.adaptiveRatePct) === rate ? 'selected' : ''}>${rate}%</option>`).join('')}</select></label><label class="season-field"><span>비교 거리</span><input type="number" min="1" max="42.2" step="0.5" data-season-running="referenceDistanceKm" value="${plan.referenceDistanceKm || 5}"></label><label class="season-field"><span>페이스 체크 요일</span><select data-season-running="paceCheckWeekday">${['일','월','화','수','목','금','토'].map((label, day) => `<option value="${day}" ${Number(plan.paceCheckWeekday ?? 3) === day ? 'selected' : ''}>${label}요일</option>`).join('')}</select></label></div>` : ''}
      <div class="season-race-finish-note">성공한 주만 최대 5초/km 개선합니다. 회복 주, 표본 부족, 직전 주보다 총거리가 10% 넘게 늘거나 최근 30일 최장거리보다 10% 넘게 긴 단일 러닝이 있는 주에는 유지하고 2주 연속 미달 시 최근 중앙값으로 완화합니다.</div>
    </section>
    <section class="season-running-metrics">
      <header><strong>훈련 메트릭</strong><span>현재 → 시즌 목표</span></header>
      <div class="season-field-row season-field-row-4">
        <label class="season-field"><span>현재 km/주</span><input type="number" min="0" step="0.5" data-season-running="baselineWeeklyDistanceKm" value="${plan.baselineWeeklyDistanceKm ?? ''}"></label>
        <label class="season-field"><span>목표 km/주</span><input type="number" min="1" step="0.5" data-season-running="weeklyDistanceKm" value="${plan.weeklyDistanceKm}"></label>
        <label class="season-field"><span>러닝 횟수/주</span><input type="number" min="1" max="7" data-season-running="weeklySessions" value="${plan.weeklySessions}"></label>
        <label class="season-field"><span>최장 거리</span><input type="number" min="1" step="0.5" data-season-running="longestRunKm" value="${plan.longestRunKm || ''}"></label>
        <label class="season-field"><span>스피드런/주</span><input type="number" min="0" max="3" data-season-running="speedSessionsPerWeek" value="${plan.speedSessionsPerWeek ?? 1}"></label>
        <label class="season-field"><span>러닝 시간/주</span><input type="number" min="0" step="5" data-season-running="optionalDurationMin" value="${plan.optionalDurationMin || ''}"></label>
        <label class="season-field"><span>헬스 횟수/주</span><input type="number" min="1" max="14" data-season-plan="weeklySessionTarget" value="${_state.weeklySessionTarget}"></label>
      </div>
      <p>주간 총거리가 10%를 초과해 늘어난 주에는 다음 페이스 목표를 올리지 않습니다. 심박은 함께 표시하되 기록이 없다고 목표 판정을 막지 않습니다.</p>
    </section>`;
}

function _previewStep() {
  const selected = [..._state.selectedExerciseIds];
  const preview = seasonResetPreview(_state.board, selected, {
    registeredExercises: _state.exercises,
    benchmarkMappings: _state.benchmarkMappings,
    overrides: _state.overrides,
  });
  const current = findSeasonForDate(_state.registry, addSeasonDays(_state.season.startDate, -1));
  return `
    <div class="season-step-copy"><strong>${_state.editingSeasonId ? '수정 내용 최종 확인' : '시즌 시작 최종 확인'}</strong><p>저장 후 원본 운동 기록과 사진·러닝 경로는 바뀌지 않습니다.</p></div>
    <div class="season-impact-grid">
      <section><span>목표</span><strong>${selected.length}개 종목</strong><small>입력하지 않은 종목은 목표 없이 등록 목록에 유지</small></section>
      <section><span>재시작</span><strong>W1 ${preview.wendlerCount}개</strong><small>8/6/3 원본 · 과거 웬들러 로그 제외</small></section>
      <section><span>새 목표</span><strong>트랙 ${preview.trackCount}개</strong><small>헬스 ${_state.weeklySessionTarget}회 · 러닝 ${_state.runningPlan.weeklyDistanceKm}km</small></section>
      <section><span>러닝</span><strong>${_state.runningPlan.paceMode === 'manual' ? '직접 페이스' : `주간 ${_state.runningPlan.adaptiveRatePct || 1}% 개선`}</strong><small>${_esc(_goalPaceText(_state.runningPlan))} · ${_state.runningPlan.startDate}–${_state.runningPlan.endDate}</small></section>
      <section><span>시즌</span><strong>${_esc(_state.season.name)}</strong><small>${_state.season.startDate}–${_state.season.endDate}${current ? ` · ${_esc(current.name)} 다음` : ''}</small></section>
    </div>
    <div class="season-final-note">시즌 시작 후 달력·통계·APK 위젯은 이 시즌 범위만 기본값으로 사용합니다.</div>`;
}

function _stepBody() {
  return [_periodStep, _exerciseStep, _selectionReviewStep, _runningStep, _previewStep][_state.step]();
}

function _render() {
  _refreshSelectedExerciseIds();
  const modal = _modal();
  const sheet = modal.querySelector('.workout-season-sheet');
  const isFinal = _state.step === STEP_LABELS.length - 1;
  sheet.innerHTML = `
    <header class="season-sheet-head"><div><span>WORKOUT SEASON</span><h2 id="workout-season-title">${_state.editingSeasonId ? '시즌 설정 수정' : '새 시즌 시작'}</h2></div><button type="button" data-season-action="close" aria-label="닫기">×</button></header>
    ${_stepper()}
    <div class="season-sheet-body">${_stepBody()}</div>
    <footer class="season-sheet-actions">
      <button type="button" class="season-secondary" data-season-action="${_state.step ? 'back' : 'close'}">${_state.step ? '이전' : '취소'}</button>
      <button type="button" class="season-primary" data-season-action="${isFinal ? 'save' : 'next'}" ${_state.saving ? 'disabled' : ''}>${_state.saving ? '저장 중…' : isFinal ? (_state.editingSeasonId ? '수정 내용 저장' : '이 설정으로 시즌 시작') : '다음'}</button>
    </footer>
    ${_wendlerEditorHtml()}`;
}

function _openWendlerEditor(exerciseId, previousProgram = null) {
  const configuration = _configurationFor(exerciseId);
  if (!configuration) return false;
  const override = _state.overrides[exerciseId] || {};
  const fromProgram = previousProgram || override.program || configuration.program || 'stair';
  override.program = 'wendler';
  _state.overrides[exerciseId] = override;
  _state.wendlerEditor = {
    exerciseId,
    previousProgram: fromProgram,
    draft: _wendlerDraft(configuration),
  };
  return true;
}

function _cancelWendlerEditor() {
  const editor = _state?.wendlerEditor;
  if (!editor) return;
  if (editor.previousProgram !== 'wendler') {
    _state.overrides[editor.exerciseId].program = editor.previousProgram || 'none';
  }
  _state.wendlerEditor = null;
}

function _applyWendlerEditor() {
  const editor = _state?.wendlerEditor;
  if (!editor) return false;
  const draft = editor.draft;
  if (!(Number(draft.oneRmKg) > 0)) {
    showToast('1RM 또는 10RM 중량을 입력해 주세요.', 2200, 'error');
    return false;
  }
  const wendler = {
    ..._state.overrides[editor.exerciseId].wendler,
    profileId: draft.profileId,
    oneRmKg: Math.round(Number(draft.oneRmKg) * 10) / 10,
    tmKg: Number(draft.tmKg),
    threeWeekIncrementKg: Number(draft.threeWeekIncrementKg),
    incrementKg: Number(draft.threeWeekIncrementKg) * WENDLER_THREE_WEEK_BLOCKS_PER_CYCLE,
    roundKg: WENDLER_PLATE_STEP_KG,
  };
  if (Number(draft.tenRmKg) > 0) wendler.tenRmKg = Number(draft.tenRmKg);
  else delete wendler.tenRmKg;
  _state.overrides[editor.exerciseId] = {
    ..._state.overrides[editor.exerciseId],
    program: 'wendler',
    wendler,
  };
  _refreshSelectedExerciseIds();
  _state.wendlerEditor = null;
  return true;
}

function _syncNormalTrackCardState(exerciseId, track, card) {
  const config = _state?.overrides?.[exerciseId];
  if (!config || !card) return;
  const goalTracks = _goalTrackIds(config);
  const selected = goalTracks.length > 0;
  const hasPartialGoal = ['volume', 'intensity'].some(trackId => {
    const draft = config.tracks?.[trackId] || {};
    return draft.kg !== '' || draft.sets !== '' || draft.incrementKg !== '';
  });
  card.classList.toggle('has-goal', selected);
  const trackRow = [...card.querySelectorAll('.season-track-row')].find(row => (
    row.querySelector('[data-season-normal-track]')?.getAttribute('data-season-normal-track') === track
  ));
  trackRow?.classList.toggle('is-ready', _normalTrackReady(config.tracks?.[track]));
  const badge = card.querySelector(':scope > header em');
  if (badge) {
    badge.classList.remove('is-wendler', 'is-goal');
    if (selected) badge.classList.add('is-goal');
    badge.textContent = selected ? `${goalTracks.length}트랙 목표` : hasPartialGoal ? '입력 중' : '미설정';
  }
  const configuration = _configurationFor(exerciseId);
  const groupId = configuration?.groupId;
  const groupItems = _state.exerciseSetup?.configurations?.filter(item => item.groupId === groupId) || [];
  const groupSelectedCount = groupItems.filter(item => _state.selectedExerciseIds.has(item.exerciseId)).length;
  const groupTab = [...card.closest('.season-sheet-body')?.querySelectorAll('[data-season-group]') || []]
    .find(tab => tab.getAttribute('data-season-group') === groupId);
  const groupCount = groupTab?.querySelector('small');
  if (groupCount) groupCount.textContent = `${groupSelectedCount}/${groupItems.length}`;
}

function _handleInput(event) {
  if (!_state) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const seasonField = target.getAttribute('data-season-field');
  if (seasonField) {
    const previousValue = _state.season[seasonField];
    _state.season[seasonField] = target.value;
    if (seasonField === 'startDate' && !_state.season.name.trim()) _state.season.name = _seasonName(target.value);
    if (seasonField === 'startDate' || seasonField === 'endDate') {
      for (const exerciseWindow of Object.values(_state.exerciseWindows || {})) {
        if (seasonField === 'startDate' && exerciseWindow.startDate === previousValue) exerciseWindow.startDate = target.value;
        if (seasonField === 'endDate' && exerciseWindow.endDate === previousValue) exerciseWindow.endDate = target.value;
      }
      if (seasonField === 'startDate' && _state.runningPlan.startDate === previousValue) _state.runningPlan.startDate = target.value;
      if (seasonField === 'endDate' && _state.runningPlan.endDate === previousValue) _state.runningPlan.endDate = target.value;
    }
    return;
  }
  const mapBenchmarkId = target.getAttribute('data-season-wendler-map');
  if (mapBenchmarkId) {
    if (target.value) _state.benchmarkMappings[mapBenchmarkId] = target.value;
    else delete _state.benchmarkMappings[mapBenchmarkId];
    _syncExerciseSetup(_state);
    _render();
    return;
  }
  const exerciseRoot = target.closest('[data-season-exercise-card]');
  const configuredExerciseId = exerciseRoot?.getAttribute('data-season-exercise-card');
  const programField = target.getAttribute('data-season-program');
  if (configuredExerciseId && programField) {
    if (event.type !== 'change') return;
    const previousProgram = _state.overrides[configuredExerciseId].program || 'stair';
    if (target.value === 'wendler') {
      _openWendlerEditor(configuredExerciseId, previousProgram);
    } else if (target.value === 'none') {
      _state.overrides[configuredExerciseId].program = 'none';
      _state.wendlerEditor = null;
    } else {
      _state.overrides[configuredExerciseId] = buildSeasonStairOverrideDraft(
        _state.overrides[configuredExerciseId],
      );
      _state.wendlerEditor = null;
    }
    _render();
    return;
  }
  const wendlerDraftField = target.getAttribute('data-season-wendler-draft');
  if (wendlerDraftField && _state.wendlerEditor) {
    const draft = _state.wendlerEditor.draft;
    draft[wendlerDraftField] = wendlerDraftField === 'profileId' ? target.value : Number(target.value);
    if (wendlerDraftField === 'tenRmKg' && Number(target.value) > 0) {
      const calculated = calculateSeasonWendlerFromTenRm(target.value, draft.roundKg);
      draft.oneRmKg = calculated.estimatedOneRmKg;
      draft.tmKg = calculated.tmKg;
      const oneRmInput = target.closest('.season-wendler-editor')?.querySelector('[data-season-wendler-draft="oneRmKg"]');
      if (oneRmInput) oneRmInput.value = String(draft.oneRmKg);
    } else if (wendlerDraftField === 'oneRmKg' || wendlerDraftField === 'roundKg') {
      draft.tmKg = roundToPlate(Number(draft.oneRmKg) * 0.9, Number(draft.roundKg) || 2.5);
    }
    const editorRoot = target.closest('.season-wendler-editor');
    const oneRmOutput = editorRoot?.querySelector('[data-season-wendler-calc-one-rm]');
    const tmOutput = editorRoot?.querySelector('[data-season-wendler-calc-tm]');
    if (oneRmOutput) oneRmOutput.textContent = `${Number(draft.oneRmKg) || 0}kg`;
    if (tmOutput) tmOutput.textContent = `${Number(draft.tmKg) || 0}kg`;
    return;
  }
  const normalTrack = target.getAttribute('data-season-normal-track');
  const normalField = target.getAttribute('data-season-normal-field');
  if (configuredExerciseId && normalTrack && normalField) {
    _state.overrides[configuredExerciseId].tracks[normalTrack][normalField] = target.value;
    _refreshSelectedExerciseIds();
    _syncNormalTrackCardState(configuredExerciseId, normalTrack, exerciseRoot);
    return;
  }
  const exerciseWindowField = target.getAttribute('data-season-exercise-window');
  if (configuredExerciseId && exerciseWindowField) {
    _state.exerciseWindows[configuredExerciseId] = {
      ...(_state.exerciseWindows[configuredExerciseId] || {}),
      [exerciseWindowField]: target.value,
    };
    return;
  }
  const planField = target.getAttribute('data-season-plan');
  if (planField) _state[planField] = Number(target.value);
  const runningField = target.getAttribute('data-season-running');
  if (runningField) {
    const stringFields = new Set(['startDate', 'endDate']);
    _state.runningPlan[runningField] = stringFields.has(runningField)
      ? target.value
      : (target.value === '' ? null : Number(target.value));
  }
  if (target.hasAttribute('data-season-running-pace-field')) {
    const root = target.closest('.season-duration-inputs');
    const minutes = Number(root?.querySelector('[data-season-running-pace-field="minutes"]')?.value) || 0;
    const seconds = Number(root?.querySelector('[data-season-running-pace-field="seconds"]')?.value) || 0;
    _state.runningPlan.targetPaceSecPerKm = (Math.max(0, minutes) * 60) + Math.max(0, Math.min(59, seconds));
    const output = target.closest('.season-race-time-row')?.querySelector('[data-season-running-pace]');
    if (output) output.textContent = _goalPaceText(_state.runningPlan);
  }
}

function _validateCurrentStep() {
  if (_state.step === 0) {
    if (!_state.season.name.trim()) return '시즌 이름을 입력해 주세요.';
    if (_inclusiveSeasonDays(_state.season) < 7) return '시즌 기간은 최소 1주 이상이어야 합니다.';
    if (_state.editingSeasonId && _state.season.endDate < _todayKey()) return '현재 시즌 종료일은 오늘 이전으로 바꿀 수 없습니다.';
    const result = validateSeasonRegistry({
      ..._state.registry,
      seasons: _state.editingSeasonId
        ? _state.registry.seasons.map(season => season.id === _state.editingSeasonId ? { ...season, ..._state.season } : season)
        : [..._state.registry.seasons, { id: 'preview-season', ..._state.season }],
    });
    if (!result.valid) return result.errors.some(error => error.includes('overlap'))
      ? '기존 시즌과 날짜가 겹칩니다.'
      : '시작일과 종료일을 확인해 주세요.';
  }
  if (_state.step === 1) {
    for (const exerciseId of _state.selectedExerciseIds) {
      const window = _state.exerciseWindows[exerciseId] || {};
      if (!window.startDate || !window.endDate || window.startDate > window.endDate) return '종목별 시작일과 종료일을 확인해 주세요.';
      if (window.startDate < _state.season.startDate || window.endDate > _state.season.endDate) return '종목별 기간은 전체 시즌 안에서 설정해 주세요.';
    }
  }
  if (_state.step === 2 && !_state.selectedExerciseIds.size) return '목표를 설정한 운동을 한 종목 이상 선택해 주세요.';
  if (_state.step === 3) {
    const plan = _state.runningPlan;
    if (!(Number(plan.weeklyDistanceKm) > 0) || !(Number(plan.weeklySessions) > 0)) return '러닝 거리와 횟수 목표를 확인해 주세요.';
    if (!(Number(plan.targetPaceSecPerKm) > 0)) return 'km당 목표 페이스를 입력해 주세요.';
    if (!plan.startDate || !plan.endDate || plan.startDate > plan.endDate) return '러닝 시작일과 종료일을 확인해 주세요.';
    if (plan.startDate < _state.season.startDate || plan.endDate > _state.season.endDate) return '러닝 기간은 전체 시즌 안에서 설정해 주세요.';
  }
  return null;
}

async function _save() {
  if (_state.saving) return;
  const error = _validateCurrentStep();
  if (error) return showToast(error, 2400, 'error');
  _state.saving = true;
  _render();
  try {
    const input = {
      season: _state.editingSeasonId ? { ..._state.season, id: _state.editingSeasonId } : _state.season,
      clientRequestId: _state.clientRequestId,
      selectedExerciseIds: [..._state.selectedExerciseIds],
      registeredExerciseIds: _state.exercises.map(exercise => String(exercise.id)),
      registeredExercises: _state.exercises,
      benchmarkMappings: _state.benchmarkMappings,
      overrides: _state.overrides,
      exerciseSeasonWindowsByExercise: Object.fromEntries(
        [..._state.selectedExerciseIds].map(exerciseId => [exerciseId, _state.exerciseWindows[exerciseId]]),
      ),
      weeklySessionTarget: _state.weeklySessionTarget,
      runningPlan: _state.runningPlan,
      todayKey: _todayKey(),
    };
    const wasEditing = !!_state.editingSeasonId;
    const result = wasEditing
      ? await updateWorkoutSeason(input)
      : await createWorkoutSeason(input);
    closeWorkoutSeasonWizard();
    showToast(wasEditing
      ? `${result.season.name} 설정을 수정했어요.`
      : (result.duplicate ? '이미 생성된 시즌을 불러왔어요.' : `${result.season.name}을 시작했어요.`), 2600, 'success');
    document.dispatchEvent(new CustomEvent('season:changed', { detail: { seasonId: result.season.id } }));
  } catch (error) {
    console.warn('[season] save failed:', error);
    _state.saving = false;
    _render();
    showToast(error?.message?.includes('overlap') ? '기존 시즌과 날짜가 겹칩니다.' : '시즌 저장에 실패했어요.', 2600, 'error');
  }
}

function _handleClick(event) {
  event.stopPropagation();
  const button = event.target.closest?.('[data-season-action]');
  if (!button || !_state) return;
  const action = button.getAttribute('data-season-action');
  if (action === 'season-length') {
    const weeks = Number(button.getAttribute('data-season-weeks'));
    if ([6, 7].includes(weeks)) {
      const previousEndDate = _state.season.endDate;
      _state.season.endDate = seasonPresetEndDate(_state.season.startDate, weeks);
      for (const exerciseWindow of Object.values(_state.exerciseWindows || {})) {
        if (!exerciseWindow.endDate || exerciseWindow.endDate === previousEndDate) exerciseWindow.endDate = _state.season.endDate;
      }
      if (!_state.runningPlan.endDate || _state.runningPlan.endDate === previousEndDate) _state.runningPlan.endDate = _state.season.endDate;
      return _render();
    }
  }
  if (action === 'go-to-step') {
    _state.step = Math.max(0, Math.min(STEP_LABELS.length - 1, Number(button.getAttribute('data-season-step')) || 0));
    return _render();
  }
  if (action === 'running-pace-mode') {
    _state.runningPlan.paceMode = button.getAttribute('data-running-pace-mode') === 'manual'
      ? 'manual'
      : 'adaptive-weekly';
    return _render();
  }
  if (action === 'select-group') {
    _state.activeGroupId = button.getAttribute('data-season-group') || _state.activeGroupId;
    return _render();
  }
  if (action === 'open-wendler') {
    const exerciseId = button.getAttribute('data-exercise-id');
    if (exerciseId && _openWendlerEditor(exerciseId, 'wendler')) return _render();
    return;
  }
  if (action === 'wendler-cancel') {
    _cancelWendlerEditor();
    return _render();
  }
  if (action === 'wendler-apply') {
    if (_applyWendlerEditor()) _render();
    return;
  }
  if (action === 'close') return closeWorkoutSeasonWizard();
  if (action === 'back') {
    _state.step = Math.max(0, _state.step - 1);
    return _render();
  }
  if (action === 'next') {
    const error = _validateCurrentStep();
    if (error) return showToast(error, 2400, 'error');
    _state.step = Math.min(STEP_LABELS.length - 1, _state.step + 1);
    return _render();
  }
  if (action === 'save') void _save();
}

export function openWorkoutSeasonWizard(options = {}) {
  _state = _initialState(options.editingSeasonId || null);
  const modal = _modal();
  modal.hidden = false;
  modal.classList.add('open');
  document.body.classList.add('wt-modal-scroll-lock');
  _render();
}

export function closeWorkoutSeasonWizard() {
  const modal = document.getElementById('workout-season-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.hidden = true;
  }
  document.body.classList.remove('wt-modal-scroll-lock');
  _state = null;
}
