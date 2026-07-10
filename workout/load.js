// ================================================================
// workout/load.js — 날짜 로드, 상태 복원
// 2026-04-21: S.workout / S.diet / S.shared 네임스페이스 마이그레이션 완료.
// ================================================================

import { S }                          from './state.js';
import { _renderDateLabel,
         _renderStretchingToggle, _renderWineFreeToggle,
         _renderMealSkippedToggles, _renderDietResults,
         _renderMealFoodItems, _renderMealPhotos,
         renderCalorieTracker }
                                     from './render.js';
import { _renderWorkoutTimer, _renderTimerControls,
         _fmtDuration, wtRestTimerSkip, _isViewingTimerDate,
         wtApplyActiveWorkoutDraft, wtPersistActiveWorkoutDraft }
                                     from './timers.js';
import { _renderRunningForm, _renderCfForm,
         _renderStretchForm, _renderSwimForm }
                                     from './activity-forms.js';
import { _initButtonEventListeners } from './status.js';
import { _renderExerciseList }       from './exercises.js?v=20260625z47-workout-record-card-standard';
import { getDay, isFuture, TODAY, isExpertModeEnabled, getExpertPreset, dateKey } from '../data.js';
import { getWorkoutSessions } from './sessions.js';

function _isActualWorkoutSet(set) {
  if (!set || set.setType === 'warmup') return false;
  if (set.done === true) return true;
  if (set.done === false) return false;
  return (Number(set.kg) || 0) > 0 && (Number(set.reps) || 0) > 0;
}

function _isActualWorkoutEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if ((entry.note || '').toString().trim()) return true;
  return (entry.sets || []).some(_isActualWorkoutSet);
}

function _isMaxDraftEntry(entry) {
  return !!(entry && (
    entry.recommendationMeta?.mode === 'max' ||
    entry.maxPrescription ||
    entry.maxWeakPart
  ));
}

function _normalizeLoadedMaxMeta(day, key) {
  const raw = day?.maxMeta && typeof day.maxMeta === 'object'
    ? JSON.parse(JSON.stringify(day.maxMeta))
    : null;
  if (!raw) return { meta: null, rejectedLegacy: false };
  if (raw.dateKey && raw.dateKey !== key) return { meta: null, rejectedLegacy: false };

  const hasActualWorkout = (day?.exercises || []).some(_isActualWorkoutEntry)
    || !!(day?.cf || day?.stretching || day?.swimming || day?.running)
    || (Number(day?.workoutDuration) || 0) > 0
    || (Number(day?.runDistance) || 0) > 0
    || (Number(day?.swimDistance) || 0) > 0;
  const weakBlock = raw.weakBlock || {};
  const weakSummary = raw.weakSummary || {};
  const hasWeakWork = (Number(weakBlock.durationSec) || 0) > 0
    || !!weakBlock.activeStartedAt
    || (Number(weakSummary.sets) || 0) > 0
    || (Number(weakSummary.volume) || 0) > 0;
  const hasLegacySelection = !raw.dateKey && (
    (Array.isArray(raw.selectedMajors) && raw.selectedMajors.length > 0) ||
    (Array.isArray(raw.selectedWeakParts) && raw.selectedWeakParts.length > 0)
  );
  if (hasLegacySelection && !hasActualWorkout && !hasWeakWork) {
    return { meta: null, rejectedLegacy: true };
  }

  if (!raw.dateKey) raw.dateKey = key;
  return { meta: raw, rejectedLegacy: false };
}

function _restoreWorkoutExercises(day, rejectedLegacyMaxMeta) {
  const exercises = JSON.parse(JSON.stringify(day.exercises || []));
  if (!rejectedLegacyMaxMeta) return exercises;
  return exercises.filter(entry => _isActualWorkoutEntry(entry) || !_isMaxDraftEntry(entry));
}

function _takeTargetSessionIndex() {
  const raw = window.__wtTargetSessionIndex;
  if (raw === undefined || raw === null) return null;
  try { delete window.__wtTargetSessionIndex; } catch { window.__wtTargetSessionIndex = null; }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

// ── 날짜 로드 ────────────────────────────────────────────────────
export function loadWorkoutDate(y, m, d) {
  const cur = S.shared.date;
  const isSameDate = cur && cur.y === y && cur.m === m && cur.d === d;
  const requestedSessionIndex = _takeTargetSessionIndex();
  const targetSessionIndex = requestedSessionIndex ?? (isSameDate ? Math.max(0, Number(S.workout.sessionIndex) || 0) : 0);

  if (isSameDate && targetSessionIndex === (Number(S.workout.sessionIndex) || 0)) {
    _renderDateLabel();
    _renderExerciseList();
    _renderWorkoutTimer();
    _renderTimerControls();
    _renderDietResults();
    renderCalorieTracker();
    _renderMealPhotos();
    return;
  }

  if (window._wtResetFlowUI) window._wtResetFlowUI();

  // 날짜가 실제로 바뀔 때 진행 중인 AI 추정 배너/상태를 모두 정리.
  if (window.aiEstimateClearAll) {
    try { window.aiEstimateClearAll(); } catch (e) { console.warn('[aiEstimateClearAll]', e); }
  }

  S.shared.date = { y, m, d };
  const currentKey = dateKey(y, m, d);
  const day  = getDay(y, m, d);
  const sessions = getWorkoutSessions(day, { minCount: targetSessionIndex + 1 });
  const draftResult = wtApplyActiveWorkoutDraft(sessions[targetSessionIndex] || sessions[0] || {}, {
    date: { y, m, d },
    sessionIndex: targetSessionIndex,
  });
  const workoutSource = draftResult.source;
  const loadedMax = _normalizeLoadedMaxMeta(workoutSource, currentKey);

  // 운동 도메인 복원
  const w = S.workout;
  w.sessionIndex = targetSessionIndex;
  w.sessionId    = workoutSource.id || `session-${targetSessionIndex + 1}`;
  w.exercises   = _restoreWorkoutExercises(workoutSource, loadedMax.rejectedLegacy);
  w.cf          = !!workoutSource.cf;
  w.stretching  = !!workoutSource.stretching;
  w.swimming    = !!workoutSource.swimming;
  w.running     = !!workoutSource.running;
  w.runData     = {
    distance:    workoutSource.runDistance || 0,
    durationMin: workoutSource.runDurationMin || 0,
    durationSec: workoutSource.runDurationSec || 0,
    memo:        workoutSource.runMemo || '',
    source:      workoutSource.runSource || 'manual',
    startedAt:   workoutSource.runStartedAt || null,
    endedAt:     workoutSource.runEndedAt || null,
    route:       Array.isArray(workoutSource.runRoute) ? workoutSource.runRoute : [],
    routeRef:    workoutSource.runRouteRef || null,
    routeSummary: workoutSource.runRouteSummary || null,
    placeSummary: workoutSource.runPlaceSummary || null,
    avgPaceSecPerKm: Number(workoutSource.runAvgPaceSecPerKm) || 0,
    gpsAccuracySummary: workoutSource.runGpsAccuracySummary || null,
  };
  w.cfData = {
    wod:         workoutSource.cfWod || '',
    durationMin: workoutSource.cfDurationMin || 0,
    durationSec: workoutSource.cfDurationSec || 0,
    memo:        workoutSource.cfMemo || '',
  };
  w.stretchData = {
    duration:    workoutSource.stretchDuration || 0,
    memo:        workoutSource.stretchMemo || '',
  };
  w.swimData = {
    distance:    workoutSource.swimDistance || 0,
    durationMin: workoutSource.swimDurationMin || 0,
    durationSec: workoutSource.swimDurationSec || 0,
    stroke:      workoutSource.swimStroke || '',
    memo:        workoutSource.swimMemo || '',
  };
  w.wineFree        = !!workoutSource.wine_free;
  w.workoutDuration = workoutSource.workoutDuration || 0;
  w.workoutTimeline = workoutSource.workoutTimeline || null;
  // 전문가 모드 메타데이터 복원 (day에 저장된 값 > preset 기본값)
  // 테스트모드도 그날 헬스장/기구 필터를 유지해야 하므로 gymId를 복원한다.
  w.routineMeta  = workoutSource.routineMeta || null;
  w.pickerGymFilter = workoutSource.pickerGymFilter || null;
  w.maxMeta = loadedMax.meta;
  const _preset = getExpertPreset();
  w.currentGymId = workoutSource.gymId || (isExpertModeEnabled() ? (_preset.currentGymId || null) : null);

  // ⚠️ 스톱워치(S.workout.workoutStartTime/workoutTimerInterval/workoutTimerDate)는
  // 끝내기/리셋 전에는 절대 멈추면 안 됨. 여기서는 건드리지 않는다.
  // running 상태의 cross-day 복원은 wtRecoverTimers() 가 _settings/active_timer 를
  // 통해 수행 — 날짜 네비게이션과 무관하게 동작한다.
  //
  // 2026-04-20: rest 타이머는 위 `isSameDate` early-return 경로에선 건드리지 않는다.
  //   여기(=실제 날짜 변경) 만 skip — 이전 날짜의 세트 간 휴식이 새 날짜로 이어지면
  //   쉬는시간 개념이 깨지므로. 같은 날짜 autoSave/재렌더에서는 rest 유지.
  wtRestTimerSkip();
  const timerControls = document.querySelector('.wt-timer-controls');
  if (timerControls) timerControls.style.display = '';
  const timerText = document.getElementById('wt-workout-timer');
  if (timerText) timerText.style.display = '';
  const resultEl = document.getElementById('wt-workout-duration-result');
  if (resultEl) resultEl.style.display = 'none';

  // 식단 도메인 복원 — skip 플래그까지 diet 내부로 일원화.
  S.diet = {
    breakfast: day.breakfast||'', lunch: day.lunch||'', dinner: day.dinner||'', snack: day.snack||'',
    breakfastSkipped: !!day.breakfast_skipped,
    lunchSkipped:     !!day.lunch_skipped,
    dinnerSkipped:    !!day.dinner_skipped,
    bOk:    day.bOk    ?? null, lOk:    day.lOk    ?? null, dOk:    day.dOk    ?? null, sOk: day.sOk ?? null,
    bKcal:  day.bKcal  || 0,   lKcal:  day.lKcal  || 0,   dKcal:  day.dKcal  || 0,   sKcal: day.sKcal || 0,
    bReason:day.bReason|| '',  lReason:day.lReason|| '',  dReason:day.dReason|| '',  sReason: day.sReason || '',
    bProtein:day.bProtein||0, bCarbs:day.bCarbs||0, bFat:day.bFat||0,
    lProtein:day.lProtein||0, lCarbs:day.lCarbs||0, lFat:day.lFat||0,
    dProtein:day.dProtein||0, dCarbs:day.dCarbs||0, dFat:day.dFat||0,
    sProtein:day.sProtein||0, sCarbs:day.sCarbs||0, sFat:day.sFat||0,
    bFoods:day.bFoods||[], lFoods:day.lFoods||[], dFoods:day.dFoods||[], sFoods:day.sFoods||[],
    bEstimateMeta: day.bEstimateMeta || null,
    lEstimateMeta: day.lEstimateMeta || null,
    dEstimateMeta: day.dEstimateMeta || null,
    sEstimateMeta: day.sEstimateMeta || null,
  };

  window._mealPhotos = {};
  if (day.bPhoto) window._mealPhotos.breakfast = day.bPhoto;
  if (day.lPhoto) window._mealPhotos.lunch = day.lPhoto;
  if (day.dPhoto) window._mealPhotos.dinner = day.dPhoto;
  if (day.sPhoto) window._mealPhotos.snack = day.sPhoto;
  if (workoutSource.workoutPhoto) window._mealPhotos.workout = workoutSource.workoutPhoto;

  _renderDateLabel();
  _renderStretchingToggle();
  document.getElementById('wt-chip-swimming')?.classList.toggle('active', w.swimming);
  document.getElementById('wt-chip-running')?.classList.toggle('has-record', w.running);
  _renderRunningForm();
  _renderCfForm();
  _renderStretchForm();
  _renderSwimForm();
  _renderWorkoutTimer();
  _renderTimerControls();
  _renderWineFreeToggle();
  _renderMealSkippedToggles();
  _initButtonEventListeners();
  _renderExerciseList();
  _renderMealFoodItems('breakfast');
  _renderMealFoodItems('lunch');
  _renderMealFoodItems('dinner');
  _renderMealFoodItems('snack');
  _renderDietResults();
  _renderMealPhotos();

  const memoEl = document.getElementById('wt-workout-memo');
  if (memoEl) {
    memoEl.value = workoutSource.memo || '';
    if (memoEl.dataset.wtDraftBound !== '1') {
      memoEl.addEventListener('input', () => wtPersistActiveWorkoutDraft('memo input'));
      memoEl.dataset.wtDraftBound = '1';
    }
  }
  const bEl = document.getElementById('wt-meal-breakfast');
  const lEl = document.getElementById('wt-meal-lunch');
  const dEl = document.getElementById('wt-meal-dinner');
  const sEl = document.getElementById('wt-meal-snack');
  if (bEl) bEl.value = S.diet.breakfast;
  if (lEl) lEl.value = S.diet.lunch;
  if (dEl) dEl.value = S.diet.dinner;
  if (sEl) sEl.value = S.diet.snack;

  const isFutureDay = isFuture(y, m, d);
  _setInputsDisabled(isFutureDay);

  _restoreFlowState(workoutSource);
  if (draftResult.restored) {
    setTimeout(() => {
      window.showToast?.('진행 중이던 운동 기록을 복구했어요', 2200, 'success');
    }, 0);
  }
}

function _restoreFlowState(day) {
  const timerBar = document.getElementById('wt-workout-timer-bar');

  const hasExercises  = (day.exercises || []).length > 0;
  const hasCf         = !!day.cf;
  const hasStretching = !!day.stretching;
  const hasSwimming   = !!day.swimming;
  const hasRunning    = !!day.running;

  const flags = {
    gym: hasExercises, cf: hasCf, stretch: hasStretching,
    swimming: hasSwimming, running: hasRunning,
  };
  Object.entries(flags).forEach(([t, on]) => {
    const chip = document.getElementById('wt-chip-' + t);
    if (!chip) return;
    chip.classList.toggle('has-record', on);
  });
  let active = 'gym';
  if (!hasExercises) {
    const firstWithRecord = Object.entries(flags).find(([, on]) => on);
    if (firstWithRecord) active = firstWithRecord[0];
  }
  if (active === 'running') active = 'gym';
  if (window._wtSetActiveType) window._wtSetActiveType(active);

  // 2026-04-20: 타이머 바는 운동 탭에 있는 동안 **항상** 노출.
  const hasAnyRecord = hasExercises || hasCf || hasStretching || hasSwimming || hasRunning;
  if (timerBar) timerBar.classList.add('wt-open');
  if (hasAnyRecord) {
    document.getElementById('wt-memo-section')?.classList.add('wt-open');
    document.getElementById('wt-save-section')?.classList.add('wt-open');
  } else {
    document.getElementById('wt-memo-section')?.classList.remove('wt-open');
    document.getElementById('wt-save-section')?.classList.remove('wt-open');
  }

  // 2026-04-19: 타이머 컨트롤 노출 규칙 — 오늘 or 타이머 날짜.
  const date = S.shared.date;
  const isToday = date && date.y === TODAY.getFullYear() && date.m === TODAY.getMonth() && date.d === TODAY.getDate();
  const showControls = isToday || _isViewingTimerDate();
  if (!showControls && timerBar) {
    const controls = timerBar.querySelector('.wt-timer-controls');
    if (controls) controls.style.display = 'none';
    if (S.workout.workoutDuration > 0) {
      const resultEl = document.getElementById('wt-workout-duration-result');
      if (resultEl) { resultEl.textContent = `총 ${_fmtDuration(S.workout.workoutDuration)}`; resultEl.style.display = ''; }
      const timerText = document.getElementById('wt-workout-timer');
      if (timerText) timerText.style.display = 'none';
    }
  } else {
    _renderTimerControls();
  }
}

function _setInputsDisabled(disabled) {
  const panel = document.getElementById('tab-workout');
  if (!panel) return;
  panel.querySelectorAll('input, textarea, select, button').forEach(el => {
    if (el.classList.contains('wt-date-nav-btn')) return;
    if (el.classList.contains('wt-today-btn')) return;
    el.disabled = disabled;
  });
  panel.classList.toggle('wt-readonly', !!disabled);
  const notice = document.getElementById('wt-future-notice');
  if (notice) notice.style.display = disabled ? 'block' : 'none';
}

export function changeWorkoutDate(delta) {
  const date = S.shared.date;
  if (!date) return;
  const d = new Date(date.y, date.m, date.d + delta);
  loadWorkoutDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export function goToTodayWorkout() {
  loadWorkoutDate(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
}
