// ================================================================
// workout/exercises.js — 세트 CRUD + 운동 picker/editor + 운동 목록 렌더
// ================================================================

import { S }                           from './state.js';
import { saveWorkoutDay }              from './save.js';
import { wtRestTimerStart,
         wtRefreshWorkoutTimelineDuration,
         wtPersistActiveWorkoutDraft } from './timers.js';
import { showToast }                   from '../home/utils.js';
import { getExList, getGlobalExList, getGymExList, getGyms, getLastSession, detectPRs, getCache,
         dateKey, saveExercise,
         deleteExercise, getMuscleParts,
         saveCustomMuscle,
         isExpertModeEnabled,
         getExpertPreset, getExpertMode, getMaxCycle,
         getTestBoardV2, saveTestBoardV2 }              from '../data.js';
import { estimate1RM, estimateSet1RM, rpeRepsToPct, targetWeightKg, weightRange, SUBPATTERN_TO_MAJOR,
         getTrackMetricHistory, getWendlerMetricHistory, getLastTrackSession, normalizeWorkoutTrack,
         calcSetVolume, isWendlerWorkoutEntry } from '../calc.js?v=20260514v72';
import { MOVEMENTS } from '../config.js';
import {
  buildMaxPickerExerciseEntry,
  resolveMaxBenchmarkPickerItems,
} from './expert/max-benchmark-picker.js?v=20260517v3';
import {
  buildExerciseEditorRecord,
  customExerciseMuscleId,
  exerciseEditorRecordId,
  verifyExerciseEditorSavedRecord,
} from './exercise-editor-actions.js';
import {
  findWorkoutEntryIndexByExerciseId,
  selectWorkoutExerciseEntry,
  workoutExerciseSelectionDetail,
} from './exercise-entry-actions.js';
import {
  buildExerciseProgramWorkoutPrescription,
  findExerciseProgramBenchmark,
  getExerciseProgramSettings,
  mondayOf,
  upsertExerciseProgramBenchmark,
} from './test-v2/board-core.js';
import { getWorkoutSessions } from './sessions.js';
import { clearSetCompletedAt, stampSetCompletedAt, stripSetCompletedAt } from './timeline.js';
// resolveCurrentGymId는 expert.js의 단일 진실원 (preset + S.workout.currentGymId 동기화).
// isExpertViewShown은 세션 뷰 상태 (일반 모드 뷰 ↔ 프로 모드 뷰) 조회용.
// expert.js는 exercises.js를 static import 하지 않으므로 순환 참조 없음.
import { resolveCurrentGymId, isExpertViewShown } from './expert.js';

const DASHBOARD3_TEST_MODE_UI = true;

function _isDashboardTestModeSurface() {
  return DASHBOARD3_TEST_MODE_UI;
}

function _isMaxEntryData(entry) {
  return !!entry && (
    entry.recommendationMeta?.mode === 'max' ||
    !!entry.maxPrescription ||
    !!entry.maxWeakPart
  );
}

function _hasMaxWorkoutSessionState() {
  return S?.workout?.maxMeta?.mode === 'max' ||
    (Array.isArray(S?.workout?.exercises) && S.workout.exercises.some(_isMaxEntryData));
}

function _isTestModeEntry(entry = null) {
  return _isDashboardTestModeSurface() || _isMaxWorkoutMode() || _isMaxEntryData(entry) || _hasMaxWorkoutSessionState();
}

function _isTestModePickerContext() {
  return _isDashboardTestModeSurface() || _isMaxWorkoutMode() || _hasMaxWorkoutSessionState();
}

// preset.enabled=true + 프로 모드 뷰 둘 다일 때만 'expert 세션'으로 간주.
// '일반 모드 뷰' 중에는 picker가 전체 기구 풀을 쓰도록 분기 (현재 헬스장에 기구 0개여도
// 디폴트 종목이 보이게 함).
function _isExpertSessionActive() {
  if (_isDashboardTestModeSurface()) return true;
  try {
    const mode = getExpertMode?.() || getExpertPreset()?.mode || 'normal';
    return !!isExpertModeEnabled() && (mode === 'pro' || mode === 'max' || !!isExpertViewShown());
  }
  catch { return false; }
}

function _isMaxWorkoutMode() {
  try { return (getExpertMode?.() || getExpertPreset()?.mode) === 'max'; }
  catch { return false; }
}

const NEW_MUSCLE_OPTION = '__new_custom_muscle__';
const _embeddedMaxCards = new Map();
const WORKOUT_NUMBER_INPUT_SELECTOR = '.set-input, .set-rpe-input, .set-rom-input';
const WORKOUT_INPUT_SCROLL_GUARD_BOTTOM_PX = 156;
const WORKOUT_INPUT_SCROLL_GUARD_MAX_DELTA = 96;
const _workoutInputFocusState = new WeakMap();
let _activeWorkoutEntryIdx = 0;

function _isEmbeddedMaxEntry(entryIdx) {
  const slot = _embeddedMaxCards.get(entryIdx);
  return !!slot?.container?.isConnected;
}

function _isMaxEntryMode(entryIdx) {
  return _isEmbeddedMaxEntry(entryIdx) || _isTestModeEntry(S.workout.exercises?.[entryIdx]);
}

function _rerenderMaxEntryOwner(entryIdx) {
  const slot = _embeddedMaxCards.get(entryIdx);
  if (!slot?.container?.isConnected) return false;
  renderEmbeddedMaxExerciseCard(slot.container, entryIdx, slot.options);
  return true;
}

function _workoutEntries() {
  return Array.isArray(S?.workout?.exercises) ? S.workout.exercises : [];
}

function _isWorkoutEntryComplete(entry) {
  const sets = Array.isArray(entry?.sets) ? entry.sets : [];
  return sets.length > 0 && sets.every(set => set.done !== false);
}

function _openWorkoutSetCount(entry) {
  const sets = Array.isArray(entry?.sets) ? entry.sets : [];
  return sets.filter(set => set.done === false).length;
}

function _normalizeActiveWorkoutEntryIdx(preferred = _activeWorkoutEntryIdx) {
  const entries = _workoutEntries();
  if (!entries.length) {
    _activeWorkoutEntryIdx = 0;
    return -1;
  }
  const raw = Math.floor(Number(preferred));
  const next = Number.isFinite(raw) ? raw : 0;
  _activeWorkoutEntryIdx = Math.max(0, Math.min(entries.length - 1, next));
  if (entries[_activeWorkoutEntryIdx]?.uiCollapsed) entries[_activeWorkoutEntryIdx].uiCollapsed = false;
  return _activeWorkoutEntryIdx;
}

function _workoutEntryName(entry) {
  const ex = getExList().find(item => item.id === entry?.exerciseId);
  return ex?.name || entry?.name || entry?.exerciseId || '운동';
}

function _renderWorkoutEntryCarouselControls(activeIdx) {
  const entries = _workoutEntries();
  if (entries.length <= 1) return '';
  const dots = entries.map((entry, idx) => {
    const active = idx === activeIdx;
    const complete = _isWorkoutEntryComplete(entry);
    const cls = `ex-entry-carousel-dot${active ? ' is-active' : ''}${complete ? ' is-complete' : ' is-pending'}`;
    const label = `${idx + 1}번 ${_workoutEntryName(entry)}${complete ? ' 완료' : ' 진행 중'}`;
    return `
      <button type="button" class="${cls}" data-wt-entry-dot-idx="${idx}" aria-current="${active ? 'true' : 'false'}" aria-label="${_escPicker(label)}">
        <span></span>
      </button>
    `;
  }).join('');
  return `
    <div class="ex-entry-carousel-controls" aria-label="운동 종목 카드 이동">
      <button type="button" class="ex-entry-carousel-nav" data-wt-entry-carousel-prev ${activeIdx <= 0 ? 'disabled' : ''}>이전</button>
      <div class="ex-entry-carousel-status">
        <div class="ex-entry-carousel-dots">${dots}</div>
        <span class="ex-entry-carousel-count">${activeIdx + 1} / ${entries.length}</span>
      </div>
      <button type="button" class="ex-entry-carousel-nav" data-wt-entry-carousel-next ${activeIdx >= entries.length - 1 ? 'disabled' : ''}>다음</button>
    </div>
  `;
}

function _nextWorkoutEntryIdx(entryIdx) {
  const entries = _workoutEntries();
  if (!entries.length) return -1;
  return entryIdx < entries.length - 1 ? entryIdx + 1 : entryIdx;
}

function _workoutEntryCarouselTrack() {
  return document.querySelector('#wt-exercise-list .ex-entry-carousel-track');
}

function _setWorkoutEntryCarouselActive(track, entryIdx) {
  const entries = _workoutEntries();
  if (!track || !entries.length) return;
  const idx = _normalizeActiveWorkoutEntryIdx(entryIdx);
  track.querySelectorAll('[data-wt-entry-slide-idx]').forEach((slide) => {
    slide.classList.toggle('is-active', Number(slide.dataset.wtEntrySlideIdx) === idx);
  });
  const shell = track.closest('.ex-entry-carousel');
  shell?.querySelectorAll('[data-wt-entry-dot-idx]').forEach((dot) => {
    const active = Number(dot.dataset.wtEntryDotIdx) === idx;
    dot.classList.toggle('is-active', active);
    dot.setAttribute('aria-current', active ? 'true' : 'false');
  });
  const count = shell?.querySelector('.ex-entry-carousel-count');
  if (count) count.textContent = `${idx + 1} / ${entries.length}`;
  shell?.querySelector('[data-wt-entry-carousel-prev]')?.toggleAttribute('disabled', idx <= 0);
  shell?.querySelector('[data-wt-entry-carousel-next]')?.toggleAttribute('disabled', idx >= entries.length - 1);
}

function _scrollWorkoutEntryCarouselTo(entryIdx, options = {}) {
  const idx = _normalizeActiveWorkoutEntryIdx(entryIdx);
  const track = _workoutEntryCarouselTrack();
  const slide = track?.querySelector(`[data-wt-entry-slide-idx="${idx}"]`);
  if (!track || !slide) return false;
  const left = Math.max(0, slide.offsetLeft - track.offsetLeft);
  track.scrollTo?.({ left, behavior: options.behavior || 'smooth' });
  if (!track.scrollTo) track.scrollLeft = left;
  _setWorkoutEntryCarouselActive(track, idx);
  return true;
}

function _syncWorkoutEntryCarouselFromScroll(track) {
  const slides = [...(track?.querySelectorAll?.('[data-wt-entry-slide-idx]') || [])];
  if (!track || !slides.length) return;
  const center = track.scrollLeft + track.clientWidth / 2;
  let closest = slides[0];
  let closestDistance = Infinity;
  for (const slide of slides) {
    const slideCenter = slide.offsetLeft - track.offsetLeft + slide.offsetWidth / 2;
    const distance = Math.abs(center - slideCenter);
    if (distance < closestDistance) {
      closest = slide;
      closestDistance = distance;
    }
  }
  _setWorkoutEntryCarouselActive(track, Number(closest.dataset.wtEntrySlideIdx));
}

function _bindWorkoutEntryCarousel(shell) {
  const track = shell?.querySelector('.ex-entry-carousel-track');
  if (!shell || !track) return;
  let scrollTimer = null;
  track.addEventListener('scroll', () => {
    window.clearTimeout?.(scrollTimer);
    scrollTimer = window.setTimeout?.(() => _syncWorkoutEntryCarouselFromScroll(track), 80);
  }, { passive: true });
  shell.querySelector('[data-wt-entry-carousel-prev]')?.addEventListener('click', () => {
    wtSelectWorkoutEntryCard(_activeWorkoutEntryIdx - 1, { render: false, focus: true });
  });
  shell.querySelector('[data-wt-entry-carousel-next]')?.addEventListener('click', () => {
    wtSelectWorkoutEntryCard(_activeWorkoutEntryIdx + 1, { render: false, focus: true });
  });
  shell.querySelectorAll('[data-wt-entry-dot-idx]').forEach((dot) => {
    dot.addEventListener('click', () => {
      wtSelectWorkoutEntryCard(Number(dot.dataset.wtEntryDotIdx), { render: false, focus: true });
    });
  });
}

export function wtSelectWorkoutEntryCard(entryIdx, options = {}) {
  const idx = _normalizeActiveWorkoutEntryIdx(entryIdx);
  if (idx < 0) return false;
  if (options.render !== false) _renderExerciseList();
  if (options.focus) {
    window.requestAnimationFrame?.(() => {
      _scrollWorkoutEntryCarouselTo(idx, { behavior: options.behavior || 'smooth' });
      const block = document.querySelector(`#wt-exercise-list [data-wt-entry-idx="${idx}"]`);
      block?.scrollIntoView?.({ block: options.block || 'nearest', behavior: options.behavior || 'smooth' });
    });
  }
  return true;
}

function _advanceWorkoutEntry(entryIdx) {
  const entries = _workoutEntries();
  if (!entries.length) return;
  const nextIdx = _nextWorkoutEntryIdx(entryIdx);
  _normalizeActiveWorkoutEntryIdx(nextIdx);
  _renderExerciseList();
  const cur = entries[entryIdx];
  const name = _workoutEntryName(cur);
  if (nextIdx !== entryIdx) showToast(`${name} 완료. 다음 종목으로 넘어갑니다`, 1800, 'success');
  else showToast(`${name} 완료. 오늘 운동 종목을 모두 확인했어요`, 1800, 'success');
}

function _syncExpertTopArea() {
  if (typeof window.renderExpertTopArea === 'function') {
    window.renderExpertTopArea();
  }
}

function _setWorkoutModalLock(on) {
  document.body?.classList.toggle('wt-modal-scroll-lock', !!on);
}

function _workoutScrollTop() {
  if (typeof window === 'undefined') return 0;
  const root = document.scrollingElement || document.documentElement;
  return Number(window.scrollY ?? root?.scrollTop ?? 0) || 0;
}

function _restoreWorkoutScrollTop(top) {
  if (typeof window === 'undefined') return;
  const next = Math.max(0, Number(top) || 0);
  try {
    window.scrollTo({ top: next, behavior: 'auto' });
  } catch {
    window.scrollTo(0, next);
  }
}

function _captureWorkoutRenderScroll() {
  return typeof window === 'undefined' ? null : { top: _workoutScrollTop() };
}

function _restoreWorkoutRenderScroll(state) {
  if (!state) return;
  const restore = () => _restoreWorkoutScrollTop(state.top);
  window.requestAnimationFrame?.(restore) || restore();
  window.setTimeout?.(restore, 80);
  window.setTimeout?.(restore, 220);
}

function _captureWorkoutNumberInputRenderScroll(input) {
  if (!input?.matches?.(WORKOUT_NUMBER_INPUT_SELECTOR) || !input.closest?.('#tab-workout')) return null;
  return _captureWorkoutRenderScroll();
}

function _captureWorkoutNumberInputScroll(input) {
  if (!input?.matches?.(WORKOUT_NUMBER_INPUT_SELECTOR) || !input.closest?.('#tab-workout')) return;
  const rect = input.getBoundingClientRect?.();
  const viewportHeight = Number(window.visualViewport?.height || window.innerHeight || document.documentElement?.clientHeight || 0);
  if (!rect || !viewportHeight) return;
  const comfortableBottom = Math.max(120, viewportHeight - WORKOUT_INPUT_SCROLL_GUARD_BOTTOM_PX);
  _workoutInputFocusState.set(input, {
    at: Date.now(),
    restore: rect.top >= 48 && rect.bottom <= comfortableBottom,
    top: _workoutScrollTop(),
  });
}

function _restoreWorkoutNumberInputScroll(input) {
  const state = _workoutInputFocusState.get(input);
  if (!state?.restore) return;
  const restore = () => {
    if (document.activeElement !== input) return;
    const delta = _workoutScrollTop() - state.top;
    if (Math.abs(delta) > 0 && Math.abs(delta) <= WORKOUT_INPUT_SCROLL_GUARD_MAX_DELTA) {
      _restoreWorkoutScrollTop(state.top);
    }
  };
  window.requestAnimationFrame?.(restore) || restore();
  window.setTimeout?.(restore, 80);
  window.setTimeout?.(restore, 220);
}

function _focusWorkoutNumberInputWithoutScroll(input) {
  if (document.activeElement === input) return;
  try {
    input.focus({ preventScroll: true });
  } catch {
    input.focus();
  }
}

function _bindWorkoutNumberInputFocusGuard(scope) {
  scope?.querySelectorAll?.(WORKOUT_NUMBER_INPUT_SELECTOR).forEach((input) => {
    if (input.dataset.wtNumberInputGuard === '1') return;
    input.dataset.wtNumberInputGuard = '1';
    input.addEventListener('pointerdown', (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return;
      _captureWorkoutNumberInputScroll(input);
      _focusWorkoutNumberInputWithoutScroll(input);
    }, { passive: true });
    input.addEventListener('touchstart', () => _captureWorkoutNumberInputScroll(input), { passive: true });
    input.addEventListener('focus', () => {
      if (!_workoutInputFocusState.has(input)) _captureWorkoutNumberInputScroll(input);
      _restoreWorkoutNumberInputScroll(input);
    });
  });
}

// _isExpertUiEnabled — RPE 등 프로모드 전용 UI 표시 여부 판정.
// 이전에는 preset.enabled만 봐서, 일반모드 뷰에서도 RPE select이 세트 행에 삽입되어
// flex 레이아웃이 깨지는 이슈가 있었음 (유저: '운동체크 시 RPE 버튼이 생기면서 디자인 망가짐').
// 이제는 '프로모드 preset 활성 && 프로모드 뷰 표시' 동시 조건만 true.
function _isExpertUiEnabled() {
  if (_isDashboardTestModeSurface()) return false;
  try {
    return !!isExpertModeEnabled() && !!isExpertViewShown();
  } catch {
    return false;
  }
}

function _ensureExpertManualSession() {
  if (!_isExpertSessionActive()) return;
  S.workout.currentGymId = resolveCurrentGymId();
  if (!S.workout.routineMeta) {
    S.workout.routineMeta = {
      source: 'manual',
      candidateKey: null,
      rationale: '',
    };
  }
}

function _normalizeExpertSessionAfterExerciseChange() {
  if (!_isExpertSessionActive()) return;
  if (S.workout.exercises.length === 0) {
    S.workout.routineMeta = null;
    return;
  }
  if (!S.workout.routineMeta) {
    _ensureExpertManualSession();
  }
}

// ── 세트 조작 ────────────────────────────────────────────────────
export function wtAddSet(entryIdx) {
  const entry = S.workout.exercises?.[entryIdx];
  if (!entry) return;
  if (!Array.isArray(entry.sets)) entry.sets = [];
  const prev = entry.sets.slice(-1)[0];
  entry.uiCollapsed = false;
  const restoreScroll = _captureWorkoutRenderScroll();
  entry.sets.push({
    kg: '',
    reps: '',
    rpe: prev?.rpe ?? null,
    romPct: prev?.romPct ?? 100,
    setType: 'main',
    done: false,
  });
  if (!_rerenderMaxEntryOwner(entryIdx)) _renderSets(entryIdx);
  _restoreWorkoutRenderScroll(restoreScroll);
  wtPersistActiveWorkoutDraft('set add');
  saveWorkoutDay({ silent: true }).catch(e => console.error('Save error:', e));
}

export function wtRemoveSet(entryIdx, si) {
  // Undo Toast 3초: 세트 객체와 원래 위치를 기억해두고 복원 지원
  const removed = S.workout.exercises[entryIdx].sets.splice(si, 1)[0];
  if (!_rerenderMaxEntryOwner(entryIdx)) _renderSets(entryIdx);
  wtPersistActiveWorkoutDraft('set remove');
  saveWorkoutDay({ silent: true }).catch(e => console.error('Save error:', e));
  if (!removed) return;
  window.showToast?.('세트 삭제됨', 3000, 'info', {
    action: '실행 취소',
    onAction: () => {
      if (!S.workout.exercises[entryIdx]) return;
      S.workout.exercises[entryIdx].sets.splice(si, 0, removed);
      if (!_rerenderMaxEntryOwner(entryIdx)) _renderSets(entryIdx);
      wtPersistActiveWorkoutDraft('set remove undo');
      saveWorkoutDay({ silent: true }).catch(e => console.error('Restore error:', e));
    },
  });
}

function _refreshWorkoutTimeline(context) {
  try { wtRefreshWorkoutTimelineDuration(context); }
  catch (e) { console.warn('[workoutTimeline] refresh fail:', e?.message || e); }
}

function _exerciseSubPattern(entry, ex) {
  if (entry?.maxWeakPart) return entry.maxWeakPart;
  const muscleIds = Array.isArray(entry?.muscleIds) && entry.muscleIds.length
    ? entry.muscleIds
    : (Array.isArray(ex?.muscleIds) ? ex.muscleIds : []);
  if (muscleIds[0]) return muscleIds[0];
  const movId = entry?.movementId || ex?.movementId || null;
  return MOVEMENTS.find(m => m.id === movId)?.subPattern || null;
}

function _maybeShowMaxSetCoach(entryIdx, si) {
  let preset;
  try { preset = getExpertPreset(); } catch { return; }
  if (preset?.mode !== 'max') return;
  const entry = S.workout.exercises[entryIdx];
  const set = entry?.sets?.[si];
  if (!entry || !set || set.setType === 'warmup') return;
  const kg = Number(set.kg) || 0;
  const reps = Number(set.reps) || 0;
  if (kg <= 0 || reps <= 0) return;
  const meta = S.workout.maxMeta || {};
  const sessionType = meta.sessionType === 'heavy_volume' ? 'heavy_volume' : 'high_volume';
  const ex = getExList().find(e => e.id === entry.exerciseId);
  const prescription = _resolveMaxPrescription(entry, ex);
  const sp = _exerciseSubPattern(entry, ex);
  const isWeak = Array.isArray(meta.selectedWeakParts) && sp && meta.selectedWeakParts.includes(sp);
  const key = `${dateKey(S.shared.date.y, S.shared.date.m, S.shared.date.d)}:${entry.exerciseId}:${si}:${kg}:${reps}`;
  window.__maxCoachShown = window.__maxCoachShown || new Set();
  if (window.__maxCoachShown.has(key)) return;
  window.__maxCoachShown.add(key);
  const repsHigh = Number(prescription?.repsHigh) || (sessionType === 'heavy_volume' ? 10 : 18);
  const repsLow = Number(prescription?.repsLow) || (sessionType === 'heavy_volume' ? 6 : 12);
  if (reps >= repsHigh + 3) {
    showToast(`맥스 코치: ${reps}회 가능하면 다음 세트 +${_stepForExercise(ex)}kg 검토`, 3200, 'info');
  } else if (sessionType === 'high_volume' && reps >= repsHigh) {
    showToast('맥스 코치: 고볼륨 Day 적합. 같은 중량으로 1-2세트 더 쌓아도 좋아요.', 3200, 'info');
  } else if (reps < Math.max(1, repsLow - 2)) {
    showToast('맥스 코치: 목표 반복 하한보다 낮습니다. 오늘은 무게를 유지하고 반복 품질을 맞추세요.', 3200, 'info');
  } else if (isWeak && reps >= 10) {
    showToast('약점 코치: 선택한 약점 부위 유효 세트로 집계됩니다.', 2400, 'success');
  }
}

function _stepForExercise(ex) {
  const mov = MOVEMENTS.find(m => m.id === ex?.movementId);
  return mov?.stepKg || ex?.incrementKg || 2.5;
}

function _roundToStep(kg, step) {
  const s = Number(step) > 0 ? Number(step) : 2.5;
  const k = Number(kg) || 0;
  return Math.round(k / s) * s;
}

function _localMaxPrescription({ movement, exerciseId, sessionType, weakTarget } = {}) {
  if (!movement?.id) return null;
  const isHeavy = sessionType === 'heavy_volume';
  const isCore = movement.subPattern === 'core' || movement.primary === 'abs';
  const isLarge = movement.sizeClass === 'large';
  const targetSets = weakTarget ? 5 : 4;
  const repsLow = isCore ? 10 : (isHeavy ? (isLarge ? 6 : 8) : (isLarge ? 8 : 12));
  const repsHigh = isCore ? 15 : (isHeavy ? (isLarge ? 10 : 12) : (isLarge ? 12 : 18));
  const targetRpe = isHeavy ? 9 : 8;
  const targetReps = isHeavy ? repsLow : repsHigh;
  const step = Number(movement.stepKg) > 0 ? Number(movement.stepKg) : 2.5;
  const todayKey = dateKey(S.shared.date.y, S.shared.date.m, S.shared.date.d);
  const last = exerciseId ? getLastSession(exerciseId, todayKey) : null;
  const bestSet = (last?.sets || [])
    .filter(s => s && s.setType !== 'warmup' && (s.done === true || ((s.kg || 0) > 0 && (s.reps || 0) > 0)))
    .map(s => ({ ...s, e1rm: estimateSet1RM(s) }))
    .sort((a, b) => b.e1rm - a.e1rm)[0] || null;
  const pct = Math.max(0.55, Math.min(0.86, 1 - targetReps * 0.025 - (targetRpe >= 9 ? 0 : 0.03)));
  let startKg = bestSet ? _roundToStep(estimateSet1RM(bestSet) * pct, step) : 0;
  let action = isHeavy ? 'load' : (weakTarget || !isLarge ? 'volume' : 'hold');
  let reason = '과거 기록 기반으로 오늘 목표 세트와 반복을 제안합니다.';
  let transparency = null;
  if (bestSet && (Number(bestSet.reps) || 0) >= repsHigh + 3) {
    action = 'load';
    startKg = startKg > 0 ? _roundToStep(startKg + step, step) : startKg;
    reason = `상한보다 ${(Number(bestSet.reps) || 0) - repsHigh}회 더 가능해 증량 후보입니다.`;
  } else if (bestSet && !isHeavy && (Number(bestSet.reps) || 0) >= repsHigh) {
    action = 'volume';
    reason = '고볼륨 Day에서는 같은 무게로 유효 세트 누적을 우선합니다.';
  }
  if (bestSet && startKg > 0 && (Number(bestSet.kg) || 0) > 0 && startKg < Number(bestSet.kg)) {
    transparency = {
      label: `지난 ${Number(bestSet.kg)}kg보다 낮아 보이는 이유`,
      detail: `${targetReps}회·RIR ${_rpeToRir(targetRpe)} 목표로 ROM 보정 e1RM을 환산해 시작 무게를 낮췄어요.`,
    };
  }
  const actionLabel = action === 'load' ? '증량' : (action === 'volume' ? '볼륨' : '유지');
  return {
    label: `${targetSets}세트 x ${repsLow}-${repsHigh}회 · RIR ${_rpeToRir(targetRpe)}`,
    targetSets, repsLow, repsHigh, targetRpe, startKg, action, actionLabel, reason, transparency,
  };
}

function _resolveMaxPrescription(entry, ex) {
  if (entry?.maxPrescription) return entry.maxPrescription;
  let preset;
  try { preset = getExpertPreset(); } catch { preset = null; }
  if (preset?.mode !== 'max' && !_isTestModeEntry(entry)) return null;
  const movement = MOVEMENTS.find(m => m.id === (entry?.movementId || ex?.movementId));
  if (!movement) return null;
  const meta = S.workout.maxMeta || {};
  return _localMaxPrescription({
    movement,
    exerciseId: entry?.exerciseId || ex?.id || null,
    sessionType: meta.sessionType === 'heavy_volume' ? 'heavy_volume' : 'high_volume',
    weakTarget: !!entry?.maxWeakPart,
  });
}

function _buildMaxPrescriptionBlock(entry, ex) {
  const prescription = _resolveMaxPrescription(entry, ex);
  if (!prescription) return '';
  const kg = Number(prescription.startKg) > 0 ? ` · 시작 ${prescription.startKg}kg` : '';
  const action = prescription.actionLabel || (prescription.action === 'load' ? '증량' : prescription.action === 'volume' ? '볼륨' : '유지');
  const reason = prescription.reason || '과거 기록 기반으로 오늘 목표 세트와 반복을 제안합니다.';
  const why = prescription.transparency?.detail ? `<div class="ex-max-prescription-why">${prescription.transparency.detail}</div>` : '';
  return `
    <div class="ex-max-prescription">
      <div class="ex-max-prescription-main">맥스 처방 · ${prescription.label}${kg}</div>
      <div class="ex-max-prescription-sub"><span>${action}</span>${reason}</div>
      ${why}
    </div>
  `;
}

function _buildMaxExerciseCardMeta(entry, ex, mc, idx) {
  const prescription = _resolveMaxPrescription(entry, ex);
  const kg = Number(prescription?.startKg) || Number(entry?.sets?.[0]?.kg) || 0;
  const reps = Number(prescription?.repsHigh) || Number(entry?.sets?.[0]?.reps) || 0;
  const sets = Number(prescription?.targetSets) || (entry?.sets?.length || 0);
  const isWendler = isWendlerWorkoutEntry(entry);
  const trackCode = isWendler ? 'W' : _activeMaxTrack(entry, ex);
  const track = isWendler ? '웬들러' : (trackCode === 'H' ? '강도' : '볼륨');
  const week = entry?.recommendationMeta?.cycleWeek ? `W${entry.recommendationMeta.cycleWeek}` : '오늘';
  const source = entry?.gymTagAtTime === '*' ? '공통 기구' : '선택 헬스장';
  const isBenchmark = !!prescription?.benchmarkId || !!entry?.recommendationMeta?.cycleId;
  const title = isWendler ? `${week} 웬들러 트랙` : `${week} ${track} 트랙`;
  const subtitle = prescription?.transparency?.detail || prescription?.reason || '최근 수행 기록과 오늘 선택한 부위를 기준으로 세트를 준비했어요.';
  const pace = prescription?.deltaKg == null
    ? '계획'
    : (Number(prescription.deltaKg) >= 0 ? '정상' : '조정');
  return { prescription, kg, reps, sets, trackCode, track, week, source, isBenchmark, title, subtitle, pace, isWendler };
}

let _maxTrackGraphSeq = 0;

function _smoothMiniPath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  return coords.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    const prev = coords[i - 1];
    const cx = (prev.x + point.x) / 2;
    return `${path} C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');
}

function _formatTrackGraphValue(track, value) {
  const v = Number(value) || 0;
  if (track === 'W') return `${Math.round(v)}kg`;
  if (track === 'H') return `${Math.round(v)}kg`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
  return `${Math.round(v)}kg`;
}

function _formatTrackGraphDelta(points = []) {
  if (!points || points.length < 2) return '';
  const recent = points.slice(-6);
  const last = Number(recent[recent.length - 1]?.value) || 0;
  const prev = Number(recent[recent.length - 2]?.value) || 0;
  const peak = Math.max(...recent.map(p => Number(p?.value) || 0));
  if (!(last > 0) || !(prev > 0) || !(peak > 0)) return '';
  const lastPoint = (last / peak) * 100;
  const prevPoint = (prev / peak) * 100;
  const pp = Math.round(lastPoint - prevPoint);
  if (!Number.isFinite(pp) || pp === 0) return '0pp';
  return `${pp > 0 ? '+' : ''}${pp}pp`;
}

function _trackGraphDeltaClass(delta) {
  if (!delta) return '';
  if (delta.startsWith('+')) return 'up';
  if (delta.startsWith('-')) return 'down';
  return 'flat';
}

function _buildTrackGraphSvg(points, color, track) {
  const recent = (points || []).slice(-6);
  if (recent.length < 2) {
    return `<span class="ex-max-track-graph-empty">${recent.length ? '1회 기록' : '기록 없음'}</span>`;
  }
  const vals = recent.map(p => Number(p.value) || 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 84;
  const H = 18;
  const pad = 2;
  const coords = vals.map((v, i) => ({
    x: pad + (i / Math.max(1, vals.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }));
  const linePath = _smoothMiniPath(coords);
  const lastPt = coords[coords.length - 1];
  const firstPt = coords[0];
  const fillId = `max-track-${track}-${_maxTrackGraphSeq++}`;
  const fillPath = `${linePath} L ${lastPt.x.toFixed(1)} ${H} L ${firstPt.x.toFixed(1)} ${H} Z`;
  return `
    <svg viewBox="0 0 ${W} ${H}" class="ex-max-track-graph-line" aria-hidden="true">
      <defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${fillPath}" fill="url(#${fillId})"/>
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="2" fill="${color}"/>
    </svg>`;
}

function _buildTrackGraphRow(track, points, active) {
  const color = track === 'W' ? '#0f766e' : (track === 'H' ? '#be123c' : '#2563eb');
  const last = points?.length ? points[points.length - 1].value : 0;
  const label = track === 'W' ? '웬들러' : (track === 'H' ? '강도' : '볼륨');
  const metric = track === 'W' ? 'e1RM' : (track === 'H' ? '추정1RM' : '총볼륨');
  const valueLabel = last > 0 ? _formatTrackGraphValue(track, last) : metric;
  const delta = _formatTrackGraphDelta(points || []);
  return `
    <div class="ex-max-track-graph-row ${active ? 'is-active' : ''}" data-track="${track}">
      <span class="ex-max-track-graph-chip">${label}</span>
      ${_buildTrackGraphSvg(points, color, track)}
      <span class="ex-max-track-graph-value" data-value="${_escPicker(valueLabel)}">${valueLabel}${delta ? `<small class="${_trackGraphDeltaClass(delta)}">${delta}</small>` : ''}</span>
    </div>`;
}

function _cacheWithCurrentWorkoutForTrackMetric(entry) {
  const currentKey = _todayDateKey();
  if (!currentKey || !entry?.exerciseId) return getCache();
  const cache = getCache() || {};
  const existingDay = cache[currentKey] || {};
  const currentEntries = Array.isArray(S.workout?.exercises)
    ? S.workout.exercises.filter(e => e?.exerciseId)
    : [];
  if (!currentEntries.length) return cache;
  const currentIds = new Set(currentEntries.map(e => e.exerciseId));
  const preserved = (existingDay.exercises || []).filter(e => !currentIds.has(e?.exerciseId));
  return {
    ...cache,
    [currentKey]: {
      ...existingDay,
      exercises: [...preserved, ...currentEntries],
    },
  };
}

function _activeMaxTrack(entry, ex) {
  return normalizeWorkoutTrack(
    entry?.recommendationMeta?.track ||
    entry?.maxPrescription?.benchmarkTrack ||
    entry?.maxPrescription?.track ||
    ex?.maxTrackPreference
  ) || 'M';
}

function _buildMaxTrackSparkline(entry, ex) {
  if (!entry?.exerciseId) return '';
  if (isWendlerWorkoutEntry(entry)) {
    const history = getWendlerMetricHistory(_cacheWithCurrentWorkoutForTrackMetric(entry), getExList(), entry.exerciseId);
    const rows = _buildTrackGraphRow('W', history.W, true);
    return `<div class="ex-max-track-graph is-wendler" title="웬들러 기록은 볼륨/강도와 분리해 메인 세트 e1RM으로 그립니다.">${rows}</div>`;
  }
  const history = getTrackMetricHistory(_cacheWithCurrentWorkoutForTrackMetric(entry), getExList(), entry.exerciseId);
  const activeTrack = _activeMaxTrack(entry, ex);
  const rows = [
    _buildTrackGraphRow('M', history.M, activeTrack === 'M'),
    _buildTrackGraphRow('H', history.H, activeTrack === 'H'),
  ].join('');
  const note = history.unclassified
    ? `<div class="ex-max-track-graph-note">미분류 ${history.unclassified}회 제외 · 종목 메타에서 정리</div>`
    : '';
  return `<div class="ex-max-track-graph" title="볼륨 트랙은 총볼륨, 강도 트랙은 추정 1RM으로 따로 그립니다.">${rows}${note}</div>`;
}

function _formatMaxLastSetLabel(set) {
  const kg = Number(set?.kg) || 0;
  const reps = Number(set?.reps) || 0;
  if (kg <= 0 || reps <= 0) return '';
  return `${_fmtNum(kg)}kg×${_fmtNum(reps)}`;
}

function _buildMaxLastSessionSummary(last, entry, ex) {
  if (!last?.sets?.length) return '';
  const workSets = (last.sets || []).filter(s =>
    s && s.setType !== 'warmup' &&
    ((Number(s.kg) || 0) > 0 && (Number(s.reps) || 0) > 0)
  );
  if (!workSets.length) return '';
  const grouped = new Map();
  workSets.forEach((set) => {
    const label = _formatMaxLastSetLabel(set);
    if (!label) return;
    grouped.set(label, (grouped.get(label) || 0) + 1);
  });
  const setSummary = [...grouped.entries()]
    .map(([label, count]) => `${label} ${count}세트`)
    .join(' / ');
  const dateLabel = String(last.date || '').slice(5).replace('-', '/') || '최근';
  const trackLabel = _activeMaxTrack(entry, ex) === 'H' ? '강도' : '볼륨';
  const text = `직전 ${trackLabel} ${dateLabel} · ${setSummary}`;
  return `
    <div class="ex-max-v2-last" title="${_escPicker(text)}">
      <span class="ex-max-v2-last-text">${_escPicker(text)}</span>
    </div>`;
}

function _buildMaxExerciseCardHeader(entry, ex, mc, idx, sparkline) {
  const meta = _buildMaxExerciseCardMeta(entry, ex, mc, idx);
  const kgText = meta.kg > 0 ? `${meta.kg}kg` : '무게 입력';
  const repsText = meta.reps > 0 ? `${meta.reps}회` : '반복 입력';
  const setText = meta.sets > 0 ? `${meta.sets}세트` : '세트';
  const planMeta = `${meta.title} · ${setText}`;
  const trackHint = meta.isWendler ? '웬들러 기준' : '탭해서 트랙 전환';
  return `
    <div class="ex-max-v2-head" data-action="toggle-max-entry-track" data-idx="${idx}" role="button" tabindex="0" aria-label="${meta.isWendler ? '웬들러 운동 카드' : '운동 트랙 전환'}">
      <div class="ex-max-v2-title-row">
        <div>
          <div class="ex-max-v2-source"><i style="background:${mc?.color || 'var(--primary)'}"></i>${meta.isBenchmark ? '벤치마크' : '추천 종목'} · ${meta.source}</div>
          <div class="ex-max-v2-name">${ex?.name || entry.name || entry.exerciseId}</div>
        </div>
        <button class="ex-remove-btn ex-max-v2-menu" data-idx="${idx}" aria-label="종목 삭제">×</button>
      </div>
      <div class="ex-max-v2-plan">
        <div class="ex-max-v2-plan-goal">
          <div class="ex-max-v2-kicker">오늘 성공 기준</div>
          <div class="ex-max-v2-main">${kgText} × ${repsText}</div>
          <div class="ex-max-v2-sub">${planMeta} · ${trackHint}</div>
        </div>
        ${sparkline
          ? `<div class="ex-max-v2-trend">${sparkline}</div>`
          : `<div class="ex-max-v2-pace ${meta.trackCode === 'H' ? 'is-heavy' : 'is-volume'}"><b>${meta.track}</b><span>현재 트랙</span></div>`}
      </div>
    </div>
  `;
}

function _isWendlerSet(set = {}) {
  return !!set?.wendlerRole;
}

function _maxSetTypeLabel(type, set = {}) {
  if (set?.wendlerRole === 'warmup') return '프리';
  if (set?.wendlerRole === 'main') return '메인';
  if (set?.wendlerRole === 'supplemental') {
    if (set.supplementalKind === 'bbb') return 'BBB';
    if (set.supplementalKind === 'fsl') return 'FSL';
    return '보조';
  }
  if (type === 'warmup') return '프리';
  if (type === 'drop') return '드랍';
  return '본';
}

function _maxSetTypeClass(type, set = {}) {
  if (set?.wendlerRole === 'warmup') return 'warmup';
  if (set?.wendlerRole === 'main') return 'wendler-main';
  if (set?.wendlerRole === 'supplemental') return set.supplementalKind === 'fsl' ? 'fsl' : 'bbb';
  if (type === 'warmup') return 'warmup';
  if (type === 'drop') return 'drop';
  return 'main';
}

function _nextMaxSetType(type, set = {}) {
  if (_isWendlerSet(set)) return type || 'main';
  if (type === 'warmup') return 'main';
  if (type === 'main' || !type) return 'drop';
  return 'warmup';
}

function _switchMaxEntryTrack(entryIdx) {
  const entry = S.workout.exercises[entryIdx];
  if (!entry) return false;
  if (isWendlerWorkoutEntry(entry)) return false;
  const current = normalizeWorkoutTrack(entry.recommendationMeta?.track || entry.maxPrescription?.benchmarkTrack || entry.maxPrescription?.track) || 'M';
  const next = current === 'H' ? 'M' : 'H';
  const alternative = entry.maxPrescription?.trackAlternatives?.[next] || null;
  entry.recommendationMeta = {
    ...(entry.recommendationMeta || {}),
    track: next,
    userTrackOverride: true,
    trackChangedAt: Date.now(),
  };
  if (entry.maxPrescription && alternative) {
    entry.maxPrescription = {
      ...entry.maxPrescription,
      ...alternative,
      benchmarkTrack: next,
      track: next,
      trackAlternatives: entry.maxPrescription.trackAlternatives,
    };
    const nextSets = JSON.parse(JSON.stringify(alternative.sets || []));
    if (nextSets.length) {
      const hasDone = (entry.sets || []).some(s => s.done === true);
      entry.sets = hasDone
        ? (entry.sets || []).map((set, i) => set.done === true ? set : { ...stripSetCompletedAt(nextSets[i] || nextSets[nextSets.length - 1] || set), done: false })
        : nextSets;
    }
  } else if (entry.maxPrescription) {
    const exMeta = getExList().find(item => item.id === entry.exerciseId);
    const baseKg = Number(entry.maxPrescription.startKg) || Number(entry.sets?.[0]?.kg) || 0;
    const nextReps = next === 'H' ? Math.max(5, Math.min(8, Number(entry.maxPrescription.repsLow) || 6)) : Math.max(10, Number(entry.maxPrescription.repsHigh) || 12);
    const nextKg = baseKg > 0 ? _roundToStep(next === 'H' ? baseKg * 1.08 : baseKg * 0.92, _stepForExercise(exMeta)) : 0;
    entry.maxPrescription = {
      ...entry.maxPrescription,
      benchmarkTrack: next,
      targetRpe: next === 'H' ? 9 : 8,
      startKg: nextKg,
      repsLow: nextReps,
      repsHigh: nextReps,
      label: `${next === 'H' ? '강도' : '볼륨'} 트랙 · ${entry.maxPrescription.targetSets || entry.sets?.length || 4}세트 x ${nextReps}회`,
    };
    entry.sets = (entry.sets || []).map(set => set.done === true ? set : { ...set, kg: nextKg || set.kg || 0, reps: nextReps, rpe: next === 'H' ? 9 : 8 });
  }
  return true;
}

export function wtToggleMaxEntryTrack(entryIdx) {
  if (!_switchMaxEntryTrack(entryIdx)) return;
  if (!_rerenderMaxEntryOwner(entryIdx)) _renderExerciseList();
  saveWorkoutDay({ silent: true }).catch(e => console.error('Save max entry track:', e));
}

function _rpeToRir(rpe) {
  const n = Number(rpe);
  if (!Number.isFinite(n) || n <= 0) return '';
  const rir = Math.max(0, Math.min(9, 10 - n));
  return Number.isInteger(rir) ? String(rir) : rir.toFixed(1);
}

function _rirToRpe(rir) {
  if (rir === '' || rir == null) return null;
  const n = Number(rir);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(10, 10 - n));
}

function _normalizeRpe(val) {
  if (val === '' || val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(10, Math.round(n * 2) / 2));
}

function _normalizeRomPct(val) {
  if (val === '' || val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function _romPctToScoreInput(val) {
  const pct = _normalizeRomPct(val);
  const score = (pct == null ? 100 : pct) / 10;
  return Number.isInteger(score) ? String(score) : String(score);
}

function _romScoreInputToPct(val) {
  if (val === '' || val == null) return null;
  const n = Number(String(val).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return _normalizeRomPct(n * 10);
}

function _setRomPctLocal(entryIdx, si, val) {
  const set = S.workout.exercises?.[entryIdx]?.sets?.[si];
  if (!set) return null;
  const next = _normalizeRomPct(val);
  if (next == null) delete set.romPct;
  else set.romPct = next;
  return next;
}

function _setFieldAffectsTrackMetric(field) {
  return field === 'kg' || field === 'reps' || field === 'rpe' || field === 'romPct' || field === 'setType';
}

function _parseWorkoutSetNumberInput(val, options = {}) {
  const text = String(val ?? '').trim();
  if (text === '') return '';
  const parsed = parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(parsed)) return '';
  const next = options.integer ? Math.round(parsed) : Math.round(parsed * 10) / 10;
  return Math.max(0, next);
}

function _updateSetDraftField(entryIdx, si, field, val) {
  const set = S.workout.exercises?.[entryIdx]?.sets?.[si];
  if (!set) return;
  if (field === 'rpe') {
    set.rpe = _normalizeRpe(val);
    return;
  }
  if (field === 'romPct') {
    _setRomPctLocal(entryIdx, si, val);
    return;
  }
  const parsed = _parseWorkoutSetNumberInput(val, { integer: field === 'reps' });
  set[field] = parsed;
  if (field === 'kg' || field === 'reps') {
    set.done = false;
    clearSetCompletedAt(set);
    if ((Number(set[field]) || 0) > 0) _refreshWorkoutTimeline(`set draft ${field}`);
  }
  wtPersistActiveWorkoutDraft(`set draft ${field}`);
}

export function wtUpdateSet(entryIdx, si, field, val, sourceInput = null) {
  // RPE 빈 값은 null로 저장 — 0과 구분해 _computeExpertRec의 prevRpeKnown 판정을 명확히.
  const restoreScroll = _captureWorkoutNumberInputRenderScroll(sourceInput);
  let parsed;
  if (field === 'setType') parsed = val;
  else if (field === 'rpe') parsed = _normalizeRpe(val);
  else if (field === 'romPct') parsed = _normalizeRomPct(val);
  else parsed = _parseWorkoutSetNumberInput(val, { integer: field === 'reps' });
  if (field === 'romPct' && parsed == null) delete S.workout.exercises[entryIdx].sets[si].romPct;
  else S.workout.exercises[entryIdx].sets[si][field] = parsed;
  if (field === 'kg' || field === 'reps') {
    const set = S.workout.exercises[entryIdx].sets[si];
    set.done = false;
    clearSetCompletedAt(set);
    // 의미 있는 수치(>0)가 들어오면 완료 타임라인 표시만 다시 계산한다.
    if ((parsed || 0) > 0) _refreshWorkoutTimeline(`set update ${field}`);
  }
  wtPersistActiveWorkoutDraft(`set update ${field}`);
  const isMaxEntry = _isMaxEntryMode(entryIdx);
  if (isMaxEntry && _setFieldAffectsTrackMetric(field)) {
    if (!_rerenderMaxEntryOwner(entryIdx)) _renderExerciseList();
  }
  else _renderSets(entryIdx);
  _restoreWorkoutRenderScroll(restoreScroll);
  saveWorkoutDay({ silent: true })
    .then(() => {
      if (isMaxEntry && _setFieldAffectsTrackMetric(field)) {
        if (!_rerenderMaxEntryOwner(entryIdx)) _renderExerciseList();
        _restoreWorkoutRenderScroll(restoreScroll);
      }
    })
    .catch(e => console.error('Save error:', e));
}

export function wtUpdateSetRir(entryIdx, si, val, sourceInput = null) {
  wtUpdateSet(entryIdx, si, 'rpe', _rirToRpe(val), sourceInput);
}

function _setSetDoneState(entryIdx, si, nextDone) {
  const set = S.workout.exercises?.[entryIdx]?.sets?.[si];
  if (!set) return;
  const wasDone = set.done === true;
  const shouldDone = nextDone === true;
  if (wasDone === shouldDone) return;
  set.done = shouldDone;
  if (shouldDone) stampSetCompletedAt(set);
  else clearSetCompletedAt(set);
  _refreshWorkoutTimeline('set done toggle');
  wtPersistActiveWorkoutDraft('set done toggle');
  if (_isMaxEntryMode(entryIdx)) {
    if (!_rerenderMaxEntryOwner(entryIdx)) _renderExerciseList();
  }
  else _renderSets(entryIdx);
  saveWorkoutDay({ silent: true }).then(() => {
    if (!_rerenderMaxEntryOwner(entryIdx)) _renderExerciseList();
    if (shouldDone) showToast('저장되었습니다', 1500, 'success');
  }).catch(e => console.error('Save error:', e));
  if (shouldDone) {
    _maybeShowMaxSetCoach(entryIdx, si);
    const ex = getExList().find(e => e.id === S.workout.exercises[entryIdx].exerciseId);
    const exName = ex?.name || S.workout.exercises[entryIdx].exerciseId;
    const setNum = si + 1;
    wtRestTimerStart(null, `${exName} ${setNum}세트 후 휴식`);
  }
}

export function wtToggleSetDone(entryIdx, si) {
  const set = S.workout.exercises?.[entryIdx]?.sets?.[si];
  if (!set) return;
  _setSetDoneState(entryIdx, si, set.done !== true);
}

export function wtUpdateSetType(entryIdx, si, val) {
  S.workout.exercises[entryIdx].sets[si].setType = val;
  if (!_rerenderMaxEntryOwner(entryIdx)) _renderSets(entryIdx);
  wtPersistActiveWorkoutDraft('set type update');
  saveWorkoutDay({ silent: true }).catch(e => console.error('Save error:', e));
}

export function wtMoveSet(entryIdx, si, direction) {
  const sets = S.workout.exercises[entryIdx].sets;
  const targetIdx = si + direction;
  if (targetIdx < 0 || targetIdx >= sets.length) return;
  [sets[si], sets[targetIdx]] = [sets[targetIdx], sets[si]];
  if (!_rerenderMaxEntryOwner(entryIdx)) _renderSets(entryIdx);
  wtPersistActiveWorkoutDraft('set move');
  saveWorkoutDay({ silent: true }).then(() => showToast('순서가 변경되었습니다', 1500, 'success')).catch(e => console.error('Save error:', e));
}

export function wtRemoveExerciseEntry(entryIdx) {
  S.workout.exercises.splice(entryIdx, 1);
  _normalizeActiveWorkoutEntryIdx(Math.min(_activeWorkoutEntryIdx, S.workout.exercises.length - 1));
  _normalizeExpertSessionAfterExerciseChange();
  _renderExerciseList();
  _syncExpertTopArea();
  wtPersistActiveWorkoutDraft('exercise remove');
  saveWorkoutDay({ silent: true }).catch(e => console.error('Save error:', e));
}

// ── Scene 12 UI 헬퍼 (프로 모드 전용) ─────────────────────────
// po-pill, 🏆 PR 도전, RPE 세그먼트, 보수/추천/공격 3칩, ws-foot 설명
//
// 모든 추천 계산은 _computeExpertRec()를 단일 진실원으로 사용.
// last는 호출부에서 today를 제외하고 넘겨줘야 함 (자기참조 방지 — Finding 2).
// e1RM은 RTS 룩업의 역산을 우선 사용(prevRpe 반영 — Finding 3),
// rpe 미상이면 Epley로 폴백.

function _todayDateKey() {
  return (S.shared.date) ? dateKey(S.shared.date.y, S.shared.date.m, S.shared.date.d) : null;
}

export function wtFocusWorkoutEntryCard(entryIdx, options = {}) {
  const idx = Math.max(0, Math.floor(Number(entryIdx)));
  const entry = S.workout.exercises?.[idx];
  if (!entry) return false;
  if (options.expand !== false && entry.uiCollapsed) entry.uiCollapsed = false;
  _normalizeActiveWorkoutEntryIdx(idx);
  if (options.render !== false) _renderExerciseList();

  const focus = () => {
    _scrollWorkoutEntryCarouselTo(idx, { behavior: options.behavior || 'smooth' });
    const block = document.querySelector(`#wt-exercise-list [data-wt-entry-idx="${idx}"]`);
    if (!block) return false;
    block.classList.remove('ex-block--record-focus');
    void block.offsetWidth;
    block.classList.add('ex-block--record-focus');
    block.scrollIntoView({
      block: options.block || 'center',
      behavior: options.behavior || 'smooth',
    });
    const focusTarget = block.querySelector('.ex-max-v2-name') || block;
    focusTarget?.focus?.({ preventScroll: true });
    window.setTimeout?.(() => block.classList.remove('ex-block--record-focus'), 1400);
    return true;
  };

  if (!focus()) window.requestAnimationFrame?.(focus);
  return true;
}

function _findWorkoutEntryIndexByExerciseId(exerciseId) {
  return findWorkoutEntryIndexByExerciseId(S.workout.exercises, exerciseId);
}

function _bindWorkoutEntryRecordFocus(block, entryIdx) {
  const open = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    wtFocusWorkoutEntryCard(entryIdx, { render: false });
  };
  block.querySelectorAll('.ex-max-v2-name, .ex-max-v2-plan-goal').forEach((target) => {
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.setAttribute('aria-label', '운동 카드 보기');
    target.addEventListener('click', open);
    target.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      open(event);
    });
  });
}

function _fmtNum(v) {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// 유저 preferredRpe('6-7'|'7-8'|'8-9') → targetRpe 정수.
// 범위 상한을 사용 — "오늘 마지막 세트에서 도달할 RPE" 의미이므로 상한이 적절.
// 기본값 8(중강도)은 점진적 과부하 표준 타깃.
function _presetTargetRpe() {
  try {
    const p = getExpertPreset();
    const str = String(p?.preferredRpe || '7-8');
    const high = parseInt(str.split('-').pop(), 10);
    return [6,7,8,9,10].includes(high) ? high : 8;
  } catch { return 8; }
}

// 추천 산출용 reference 세션 결정.
//   1순위: 이전 세션(today 제외) — 자기참조 방지(Finding 2)
//   2순위: 오늘 현재 entry의 완료 본세트 — prior 없을 때 fallback
//          (chips가 안 떠서 답답한 UX 방지)
//   둘 다 없으면 null → RPE 세그만 노출.
function _resolveLastForRec(entryIdx, exerciseId) {
  const todayKey = _todayDateKey();
  const prior = getLastSession(exerciseId, todayKey);
  if (prior?.sets?.length) return prior;
  const entry = S.workout.exercises[entryIdx];
  if (!entry) return null;
  const todayMain = (entry.sets || []).filter(s =>
    s && s.setType !== 'warmup' &&
    (s.done === true || ((s.kg || 0) > 0 && (s.reps || 0) > 0))
  );
  if (!todayMain.length) return null;
  return { date: todayKey, sets: todayMain, _fromCurrentEntry: true };
}

// 추천 계산 단일 진실원. last는 today 제외된 이전 세션이어야 함.
function _computeExpertRec({ exerciseId, last, targetRpe = 8 }) {
  if (!last?.sets?.length) return null;
  const mainSets = last.sets.filter(s => s.setType !== 'warmup');
  const refSet   = mainSets.length ? mainSets[mainSets.length - 1] : last.sets[last.sets.length - 1];
  const prevKg     = refSet.kg   || 0;
  const prevReps   = refSet.reps || 0;
  const prevRpeRaw = refSet.rpe;
  if (prevKg <= 0) return null;

  const exEntry  = getExList().find(e => e.id === exerciseId);
  const mov      = exEntry?.movementId ? MOVEMENTS.find(m => m.id === exEntry.movementId) : null;
  const sizeClass = mov?.sizeClass || 'small';
  const stepKg    = (mov?.stepKg > 0) ? mov.stepKg : 2.5;

  const todayReps = prevReps || 10;
  // Finding 3: prevRpe 알려져 있으면 RTS 룩업 역산으로 e1RM 추정,
  //            모르면 Epley 폴백 (RPE10 가정).
  const e1rm = (prevRpeRaw && prevReps > 0)
    ? prevKg / rpeRepsToPct(prevRpeRaw, prevReps)
    : estimate1RM(prevKg, todayReps);
  const target = targetWeightKg(e1rm, targetRpe, todayReps);
  const range  = weightRange(target, sizeClass, stepKg);
  const prInfo = detectPRs(exerciseId);
  const isPRChallenge = prInfo.prKg > 0 && range.recommended > prInfo.prKg;

  return {
    prevKg, prevReps, prevRpe: prevRpeRaw || 8, prevRpeKnown: !!prevRpeRaw,
    sizeClass, stepKg, todayReps,
    e1rm, target,
    conservative: range.conservative,
    recommended:  range.recommended,
    aggressive:   range.aggressive,
    prInfo, isPRChallenge,
    fromCurrentEntry: !!last._fromCurrentEntry,
  };
}

// po-pill HTML — _computeExpertRec 결과 기반. 비어있으면 ''.
function _buildPoPillHtml({ exerciseId, last, targetRpe = 8 }) {
  const r = _computeExpertRec({ exerciseId, last, targetRpe });
  if (!r) return '';
  if (r.isPRChallenge) return '<span class="po-pill pr">🏆 PR 도전</span>';
  const diff = +(r.recommended - r.prevKg).toFixed(2);
  if (diff > 0) return `<span class="po-pill">+${_fmtNum(diff)}kg ↑</span>`;
  return '';
}

function _buildExpertSceneBlock({ entryIdx, exerciseId, last, targetRpe = 8 }) {
  const fmt = _fmtNum;

  // ── RIR 세그 HTML (active는 내부 targetRpe 기준) ──
  const rpeSegs = [6, 7, 8, 9, 10].map(r =>
    `<div class="rpe-seg${r === targetRpe ? ' active' : ''}" data-rpe="${r}">${_rpeToRir(r)}</div>`
  ).join('');
  const rpeRow = `
    <div class="rpe-row">
      <span class="rpe-label">목표 RIR</span>
      <div class="rpe-segmented">${rpeSegs}</div>
    </div>`;

  const rec = _computeExpertRec({ exerciseId, last, targetRpe });
  // 지난 기록/오늘 완료 세트 모두 없음 → 안내용 placeholder + 설명 노출
  if (!rec) {
    const emptyChipsHtml = `
      <div class="weight-suggest">
        <div class="ws-chip">
          <div class="ws-chip-kind">보수</div>
          <div class="ws-chip-value">-</div>
        </div>
        <div class="ws-chip recommend">
          <div class="ws-chip-kind">추천</div>
          <div class="ws-chip-value">-</div>
        </div>
        <div class="ws-chip">
          <div class="ws-chip-kind">공격</div>
          <div class="ws-chip-value">-</div>
        </div>
      </div>`;
    const emptyFoot = `
      <div class="ws-foot">
        아직 기준 기록이 없어 추천 무게를 계산할 수 없어요.<br/>
        kg·횟수·RIR 기록이 쌓이면 선택한 RIR ${_rpeToRir(targetRpe)} 기준으로 보수/추천/공격 무게를 자동 제안해드릴게요.
      </div>`;
    return `
      <div class="ex-expert-section" data-entry-idx="${entryIdx}" data-target-rpe="${targetRpe}">
        ${rpeRow}
        ${emptyChipsHtml}
        ${emptyFoot}
      </div>`;
  }

  // ── ws-chip HTML ──
  const chipsHtml = `
    <div class="weight-suggest">
      <div class="ws-chip">
        <div class="ws-chip-kind">보수</div>
        <div class="ws-chip-value">${fmt(rec.conservative)}</div>
      </div>
      <div class="ws-chip recommend">
        <div class="ws-chip-kind">추천</div>
        <div class="ws-chip-value">${fmt(rec.recommended)}</div>
      </div>
      <div class="ws-chip">
        <div class="ws-chip-kind">공격</div>
        <div class="ws-chip-value">${fmt(rec.aggressive)}</div>
      </div>
    </div>`;

  // ── ws-foot 문구 ──
  const diff = +(rec.recommended - rec.prevKg).toFixed(2);
  const sizeLabel = rec.sizeClass === 'small' ? '소근육' : '대근육';
  const refLabel  = rec.fromCurrentEntry ? '방금' : '지난 기록';
  const nextLabel = rec.fromCurrentEntry ? '다음 세트' : '오늘';
  const foot2 = `e1RM ${rec.e1rm.toFixed(1)} · ${rec.todayReps}×RIR${_rpeToRir(targetRpe)} 환산 · ±${fmt(rec.stepKg)}kg (${sizeLabel} 스텝)`;
  // RTS 기반 RPE 갭 해설: 실제 수행 RPE가 목표 RPE보다 낮으면(여유) → 무게 증가 신호,
  // 높으면(버거움) → 무게 유지/감량 신호. e1RM 역산이 이 원리를 이미 반영하지만,
  // 사용자에게 "왜 이 무게인지"를 과학적으로 설명하기 위해 갭을 명시.
  const rpeGap = rec.prevRpeKnown ? +(targetRpe - rec.prevRpe).toFixed(1) : null;
  let rpeHint = '';
  if (rec.prevRpeKnown && rpeGap !== null) {
    if (rpeGap >= 1.5) rpeHint = ` · 지난 세트 여유(RIR${_rpeToRir(rec.prevRpe)}) → 오늘 ${nextLabel} 강도 상향`;
    else if (rpeGap <= -0.5) rpeHint = ` · 지난 세트 과부하(RIR${_rpeToRir(rec.prevRpe)}) → 유지/조금 낮춤`;
    else rpeHint = ` · 목표 RIR 근접 → 점진 증량 유지`;
  }
  let foot1;
  if (rec.isPRChallenge) {
    foot1 = `지금까지 최고 ${fmt(rec.prInfo.prKg)}kg · 오늘 추천 ${fmt(rec.recommended)}kg을 채우면 <b style="color:var(--primary, #fa342c);">개인 신기록</b>!`;
  } else if (diff > 0) {
    foot1 = `${refLabel} ${fmt(rec.prevKg)}kg×${rec.prevReps}@RIR${_rpeToRir(rec.prevRpe)}${rec.prevRpeKnown ? '' : '(추정)'} → ${nextLabel} <b style="color:var(--success, #1b854a);">+${fmt(diff)}kg 점진 과부하</b>${rpeHint}`;
  } else {
    foot1 = `${refLabel} ${fmt(rec.prevKg)}kg×${rec.prevReps}@RIR${_rpeToRir(rec.prevRpe)}${rec.prevRpeKnown ? '' : '(추정)'} → ${nextLabel} 동일 무게 유지${rpeHint}`;
  }
  const prBanner = rec.isPRChallenge
    ? `<div class="ws-foot" style="margin-bottom:6px;">${foot1}</div>`
    : '';
  const footFinal = rec.isPRChallenge
    ? `<div class="ws-foot">${foot2}</div>`
    : `<div class="ws-foot">${foot1}<br/>${foot2}</div>`;

  return `
    <div class="ex-expert-section" data-entry-idx="${entryIdx}" data-target-rpe="${targetRpe}">
      ${rpeRow}
      ${prBanner}
      ${chipsHtml}
      ${footFinal}
    </div>`;
}

// RPE 세그 클릭 시 expert section + po-pill 동시 재렌더 (Findings 2, 4)
function _rerenderExpertSection(exBlock, entryIdx, exerciseId, newRpe) {
  // Finding 2 + 폴백: 이전 세션 또는 오늘 entry의 완료 본세트 사용.
  const last = _resolveLastForRec(entryIdx, exerciseId);

  // expert section 교체
  const newSectionHtml = _buildExpertSceneBlock({ entryIdx, exerciseId, last, targetRpe: newRpe });
  const section = exBlock.querySelector('.ex-expert-section');
  if (section) section.outerHTML = newSectionHtml;

  // Finding 4: po-pill도 새 RPE 기준으로 갱신
  const newPillHtml = _buildPoPillHtml({ exerciseId, last, targetRpe: newRpe });
  const oldPill = exBlock.querySelector('.po-pill');
  if (oldPill) {
    if (newPillHtml) {
      oldPill.outerHTML = newPillHtml;
    } else {
      oldPill.remove();
    }
  } else if (newPillHtml) {
    const nameSpan = exBlock.querySelector('.ex-block-name');
    if (nameSpan) nameSpan.insertAdjacentHTML('afterend', newPillHtml);
  }
}

// ── 운동 목록 렌더 ──────────────────────────────────────────────
export function _renderExerciseList() {
  const container = document.getElementById('wt-exercise-list');
  if (!container) return;
  // Scene 12 chips/RPE 인터랙션 — 한 번만 등록 (재렌더 시 listeners 재생성 방지).
  // 저장 로직 없음(범위 A): RPE 클릭 시 expert section 재렌더, ws-chip 클릭 시 recommend 클래스 이동만.
  if (!container.dataset.sceneInteractive) {
    container.dataset.sceneInteractive = '1';
    container.addEventListener('click', (e) => {
      if (!_isExpertUiEnabled() || _isMaxWorkoutMode()) return;
      // RPE 세그 클릭 → expert section 재렌더 (추천 무게 재계산)
      const rpe = e.target.closest('.rpe-seg');
      if (rpe) {
        const newRpe = parseInt(rpe.dataset.rpe || rpe.textContent, 10);
        if (!newRpe) return;
        const exBlock = rpe.closest('.ex-block');
        const section = rpe.closest('.ex-expert-section');
        if (!exBlock || !section) return;
        const entryIdx = parseInt(section.dataset.entryIdx, 10);
        const entry    = S.workout.exercises[entryIdx];
        if (!entry) return;
        _rerenderExpertSection(exBlock, entryIdx, entry.exerciseId, newRpe);
        return;
      }
      // ws-chip 클릭 → recommend 클래스 시각 토글만 (저장 없음)
      const ws = e.target.closest('.ws-chip');
      if (ws) {
        const grp = ws.closest('.weight-suggest');
        grp?.querySelectorAll('.ws-chip').forEach(el => el.classList.toggle('recommend', el === ws));
      }
    });
  }
  container.innerHTML = '';
  const allMuscles = getMuscleParts();

  // Finding 2: 오늘 세션 제외 → 자기참조 방지. 최근 기록(today 제외).
  const todayKey = _todayDateKey();
  const entries = _workoutEntries();
  const activeIdx = _normalizeActiveWorkoutEntryIdx(_activeWorkoutEntryIdx);
  if (activeIdx < 0) return;
  const shell = document.createElement('div');
  shell.className = 'ex-entry-carousel';
  shell.innerHTML = `
    ${_renderWorkoutEntryCarouselControls(activeIdx)}
    <div class="ex-entry-carousel-track" data-wt-entry-carousel-track aria-label="운동 종목 카드"></div>
  `;
  const track = shell.querySelector('.ex-entry-carousel-track');

  entries.forEach((entry, idx) => {
    const ex   = getExList().find(e => e.id === entry.exerciseId);
    const mc   = allMuscles.find(m => m.id === entry.muscleId);
    const sparkline = _buildMaxTrackSparkline(entry, ex);
    const maxTrackLast = getLastTrackSession(getCache(), getExList(), entry.exerciseId, _activeMaxTrack(entry, ex), todayKey);
    const maxLastSummary = _buildMaxLastSessionSummary(maxTrackLast, { ...entry, _idx: idx }, ex);
    const maxAllDone = (entry.sets || []).length > 0 && (entry.sets || []).every(s => s.done !== false);
    const maxCollapsed = false;

    const slide = document.createElement('div');
    slide.className = 'ex-entry-carousel-slide' + (idx === activeIdx ? ' is-active' : '');
    slide.setAttribute('data-wt-entry-slide-idx', String(idx));
    const block = document.createElement('div');
    block.className = 'ex-block ex-block--max-v2' + (maxAllDone ? ' is-complete' : '') + (maxCollapsed ? ' is-collapsed' : '');
    block.dataset.wtEntryIdx = String(idx);
    block.innerHTML = `
      ${_buildMaxExerciseCardHeader(entry, ex, mc, idx, sparkline)}
      ${maxLastSummary}
      <div class="ex-sets ex-max-v2-sets" id="wt-sets-${idx}"></div>
      <div class="ex-max-v2-actions">
        <button class="ex-max-v2-primary${maxAllDone ? ' is-done' : ''}" data-idx="${idx}">${maxAllDone || _openWorkoutSetCount(entry) <= 1 ? '운동 완료' : '다음 세트 완료'}</button>
        ${maxCollapsed
          ? `<button class="ex-max-v2-secondary ex-max-v2-expand-card" data-idx="${idx}">세트 다시 보기</button>`
          : `<button class="ex-add-set-btn ex-max-v2-secondary" data-idx="${idx}">+ 세트 추가</button>`}
      </div>`;

    block.querySelector('.ex-remove-btn').addEventListener('click', () => wtRemoveExerciseEntry(idx));
    block.querySelector('.ex-add-set-btn')?.addEventListener('click', () => wtAddSet(idx));
    _bindWorkoutEntryRecordFocus(block, idx);
    const maxHead = block.querySelector('[data-action="toggle-max-entry-track"]');
    maxHead?.addEventListener('click', (e) => {
      if (e.target.closest('.ex-remove-btn')) return;
      wtToggleMaxEntryTrack(idx);
    });
    maxHead?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      wtToggleMaxEntryTrack(idx);
    });
    block.querySelector('.ex-max-v2-expand-card')?.addEventListener('click', () => {
      S.workout.exercises[idx].uiCollapsed = false;
      _renderExerciseList();
    });
    const completeBtn = block.querySelector('.ex-max-v2-primary');
    if (completeBtn) completeBtn.addEventListener('click', () => {
      if ((S.workout.exercises[idx]?.sets || []).length && (S.workout.exercises[idx]?.sets || []).every(s => s.done !== false)) {
        _advanceWorkoutEntry(idx);
        return;
      }
      const target = (S.workout.exercises[idx]?.sets || []).findIndex(s => s.done === false);
      if (target >= 0 && S.workout.exercises[idx]?.sets?.[target]) {
        const openSets = (S.workout.exercises[idx]?.sets || []).filter(s => s.done === false).length;
        _setSetDoneState(idx, target, true);
        if (openSets === 1) {
          _advanceWorkoutEntry(idx);
        }
        return;
      }
      _advanceWorkoutEntry(idx);
    });
    const copyBtn = block.querySelector('.ex-copy-btn');
    if (copyBtn && last) {
      copyBtn.addEventListener('click', () => {
        // C-1: 종목 세트 복사도 활동 복사와 동일하게 Undo 토스트 제공.
        const prevSets = JSON.parse(JSON.stringify(S.workout.exercises[idx].sets || []));
        S.workout.exercises[idx].sets = JSON.parse(JSON.stringify(last.sets)).map(s => ({ ...stripSetCompletedAt(s), done: false }));
        wtPersistActiveWorkoutDraft('set copy previous');
        saveWorkoutDay({ silent: true }).then(() => _renderExerciseList()).catch(e => console.error('Save error:', e));
        showToast('직전 세트를 불러왔어요', 3000, 'success', {
          action: '실행 취소',
          onAction: () => {
            if (!S.workout.exercises[idx]) return;
            S.workout.exercises[idx].sets = prevSets;
            wtPersistActiveWorkoutDraft('set copy undo');
            saveWorkoutDay({ silent: true }).then(() => _renderExerciseList()).catch(e => console.error('Undo save:', e));
          },
        });
      });
    }
    slide.appendChild(block);
    track?.appendChild(slide);
  });
  container.appendChild(shell);
  _bindWorkoutEntryCarousel(shell);
  entries.forEach((_, idx) => _renderSets(idx));
  window.requestAnimationFrame?.(() => _scrollWorkoutEntryCarouselTo(activeIdx, { behavior: 'auto' }));
}

export function renderEmbeddedMaxExerciseCard(container, entryIdx, options = {}) {
  if (!container || !S.workout.exercises[entryIdx]) return null;
  _embeddedMaxCards.set(entryIdx, { container, options });

  const entry = S.workout.exercises[entryIdx];
  const allMuscles = getMuscleParts();
  const todayKey = _todayDateKey();
  const ex = getExList().find(e => e.id === entry.exerciseId);
  const mc = allMuscles.find(m => m.id === entry.muscleId);
  const maxTrackLast = getLastTrackSession(getCache(), getExList(), entry.exerciseId, _activeMaxTrack(entry, ex), todayKey);
  const maxLastSummary = _buildMaxLastSessionSummary(maxTrackLast, { ...entry, _idx: entryIdx }, ex);
  const sparkline = _buildMaxTrackSparkline(entry, ex);
  const maxAllDone = (entry.sets || []).length > 0 && (entry.sets || []).every(s => s.done !== false);
  const maxCollapsed = !!entry.uiCollapsed && maxAllDone;

  const block = document.createElement('div');
  block.className = `ex-block ex-block--max-v2 tm2-card-sets${maxAllDone ? ' is-complete' : ''}${maxCollapsed ? ' is-collapsed' : ''}${options.className ? ` ${options.className}` : ''}`;
  block.innerHTML = `
    ${_buildMaxExerciseCardHeader(entry, ex, mc, entryIdx, sparkline)}
    ${maxLastSummary}
    <div class="ex-sets ex-max-v2-sets" data-wt-embedded-sets="${entryIdx}"></div>
    <div class="ex-max-v2-actions">
      <button class="ex-max-v2-primary${maxAllDone ? ' is-done' : ''}" data-idx="${entryIdx}">${maxAllDone ? '운동 완료' : '다음 세트 완료'}</button>
      ${maxCollapsed
        ? `<button class="ex-max-v2-secondary ex-max-v2-expand-card" data-idx="${entryIdx}">세트 다시 보기</button>`
        : `<button class="ex-add-set-btn ex-max-v2-secondary" data-idx="${entryIdx}">+ 세트 추가</button>`}
    </div>`;

  const removeBtn = block.querySelector('.ex-remove-btn');
  if (removeBtn && options.hideRemove !== false) {
    removeBtn.remove();
  } else {
    removeBtn?.addEventListener('click', () => {
      if (typeof options.onRemove === 'function') options.onRemove(entryIdx);
      else wtRemoveExerciseEntry(entryIdx);
    });
  }

  block.querySelector('.ex-add-set-btn')?.addEventListener('click', () => wtAddSet(entryIdx));
  const maxHead = block.querySelector('[data-action="toggle-max-entry-track"]');
  maxHead?.addEventListener('click', (e) => {
    if (e.target.closest('.ex-remove-btn')) return;
    if (options.allowTrackToggle === false) return;
    if (!_switchMaxEntryTrack(entryIdx)) return;
    if (typeof options.onTrackChange === 'function') options.onTrackChange(S.workout.exercises[entryIdx]);
    renderEmbeddedMaxExerciseCard(container, entryIdx, options);
    saveWorkoutDay({ silent: true }).catch(err => console.error('Save embedded max entry track:', err));
  });
  maxHead?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (options.allowTrackToggle === false) return;
    if (!_switchMaxEntryTrack(entryIdx)) return;
    if (typeof options.onTrackChange === 'function') options.onTrackChange(S.workout.exercises[entryIdx]);
    renderEmbeddedMaxExerciseCard(container, entryIdx, options);
    saveWorkoutDay({ silent: true }).catch(err => console.error('Save embedded max entry track:', err));
  });
  block.querySelector('.ex-max-v2-expand-card')?.addEventListener('click', () => {
    S.workout.exercises[entryIdx].uiCollapsed = false;
    renderEmbeddedMaxExerciseCard(container, entryIdx, options);
  });
  block.querySelector('.ex-max-v2-primary')?.addEventListener('click', () => {
    const cur = S.workout.exercises[entryIdx];
    if (!cur) return;
    if ((cur.sets || []).length && (cur.sets || []).every(s => s.done !== false)) {
      if (typeof options.onComplete === 'function') {
        options.onComplete(entryIdx);
        return;
      }
      cur.uiCollapsed = true;
      renderEmbeddedMaxExerciseCard(container, entryIdx, options);
      return;
    }
    const target = (cur.sets || []).findIndex(s => s.done === false);
    if (target >= 0 && cur.sets?.[target]) {
      _setSetDoneState(entryIdx, target, true);
      return;
    }
    const exName = ex?.name || cur?.name || cur.exerciseId;
    cur.uiCollapsed = true;
    renderEmbeddedMaxExerciseCard(container, entryIdx, options);
    showToast(`${exName} 종료. 다음 종목으로 넘어가도 좋아요`, 2200, 'success');
  });

  container.innerHTML = '';
  container.appendChild(block);
  _renderSets(entryIdx, block.querySelector('[data-wt-embedded-sets]'));
  return block;
}

// ── 세트 행 렌더 ────────────────────────────────────────────────
function _renderSets(entryIdx, targetEl = null) {
  const el = targetEl || document.getElementById(`wt-sets-${entryIdx}`);
  if (!el) return;
  const sets = S.workout.exercises[entryIdx].sets;
  el.innerHTML = '';

  const isExpert = _isExpertUiEnabled();
  const isMaxMode = _isMaxEntryMode(entryIdx);
  if (isMaxMode && S.workout.exercises[entryIdx]?.uiCollapsed && sets.length > 0 && sets.every(s => s.done !== false)) {
    el.innerHTML = '<div class="ex-max-v2-collapsed-note">모든 세트 완료 · 카드가 접혔어요</div>';
    return;
  }
  sets.forEach((set, si) => {
    const isWarmup = set.setType === 'warmup';
    const isDrop = set.setType === 'drop';
    const isDone   = set.done !== false;
    const typeClass = _maxSetTypeClass(set.setType, set);
    const romPct = _normalizeRomPct(set.romPct);
    const romValue = romPct == null ? 100 : romPct;
    const romScoreValue = _romPctToScoreInput(romValue);
    const volume = calcSetVolume(set);
    const vol = (set.kg && set.reps && !isWarmup && isDone)
      ? `<span style="color:var(--accent)">${Math.round(volume).toLocaleString()}vol</span>`
      : (isWarmup ? '<span style="color:var(--muted);font-size:9px">웜업</span>' : '');

    // 실제 수행 RIR 선택 UI — Expert + 본세트 + 완료 상태에서만 노출.
    // 저장된 RPE는 다음 세션 _computeExpertRec에서 e1RM 역산에 사용되어
    // preferredRpe ↔ 실수행 RPE 갭 기반 점진적 과부하 루프를 구성.
    const rpeSelHtml = (isExpert && !isWarmup && isDone) ? `
      <select class="set-rpe-select" data-idx="${si}" title="실제 수행 RIR">
        <option value="" ${!set.rpe?'selected':''}>RIR</option>
        ${[6,7,8,9,10].map(r => `<option value="${_rpeToRir(r)}" ${Number(set.rpe)===r?'selected':''}>RIR ${_rpeToRir(r)}</option>`).join('')}
      </select>` : '';

    const row = document.createElement('div');
    row.className = isMaxMode ? `set-row ex-max-v2-set${isDone ? ' done' : ''}` : 'set-row';
    row.innerHTML = isMaxMode ? `
      <div class="ex-max-v2-main-row">
        <button type="button" class="ex-max-v2-type-btn ${typeClass}" title="세트 타입">${_maxSetTypeLabel(set.setType, set)}</button>
        <label class="ex-max-v2-field"><span>KG</span><input class="set-input" type="number" inputmode="decimal" placeholder="kg" min="0" step="0.5" value="${set.kg||''}"></label>
        <label class="ex-max-v2-field"><span>REP</span><input class="set-input" type="number" inputmode="numeric" placeholder="회" min="1" step="1" value="${set.reps||''}"></label>
        <label class="ex-max-v2-field"><span>RIR</span><input class="set-rpe-input" type="number" inputmode="decimal" placeholder="-" min="0" max="9" step="0.5" value="${_rpeToRir(set.rpe)}"></label>
        <label class="ex-max-v2-rom-field"><span>ROM</span><input class="set-rom-input" type="number" inputmode="decimal" min="0" max="10" step="0.5" value="${romScoreValue}" aria-label="가동범위 10점 입력"><em>/10</em></label>
        <button class="set-done-btn ${isDone?'done':''}" title="완료 체크">✓</button>
        <button class="set-remove-btn" title="세트 삭제">×</button>
        <span class="set-drag-handle" title="드래그하여 순서 변경"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></span>
      </div>`
      : `
        <span class="set-num">${si+1}</span>
        <select class="set-type-select ${isWarmup ? 'warmup' : (isDrop ? 'drop' : 'main')}" data-idx="${si}">
          <option value="main"   ${!isWarmup && !isDrop ?'selected':''}>본</option>
          <option value="warmup" ${isWarmup ?'selected':''}>웜업</option>
          <option value="drop"   ${isDrop ?'selected':''}>드랍</option>
        </select>
        <input class="set-input" type="number" inputmode="decimal" placeholder="kg"  min="0" step="0.5" value="${set.kg||''}">
        <span class="set-sep">kg</span>
        <input class="set-input" type="number" inputmode="numeric" placeholder="회"  min="1" step="1"   value="${set.reps||''}">
        <span class="set-sep">회</span>
        ${rpeSelHtml}
        <span class="set-vol">${vol}</span>
        <button class="set-done-btn ${isDone?'done':''}" title="완료 체크">✓</button>
        <button class="set-remove-btn">✕</button>
        <span class="set-drag-handle" title="드래그하여 순서 변경"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></span>`;

    row.querySelector('.set-type-select')?.addEventListener('change', e => wtUpdateSetType(entryIdx, si, e.target.value));
    row.querySelector('.ex-max-v2-type-btn')?.addEventListener('click', () => {
      if (_isWendlerSet(set)) return;
      wtUpdateSetType(entryIdx, si, _nextMaxSetType(set.setType || 'main', set));
    });
    row.querySelectorAll('.set-input')[0].addEventListener('input', e => _updateSetDraftField(entryIdx, si, 'kg', e.target.value));
    row.querySelectorAll('.set-input')[0].addEventListener('change', e => wtUpdateSet(entryIdx, si, 'kg',   e.target.value, e.target));
    // 2026-04-20: kg/reps 입력 focus 시 rest 타이머 skip 호출 제거.
    //   기존: 입력칸 탭 = 휴식 증발 → 숫자 수정하려고 포커스만 줘도 꺼짐.
    //   유저 요구 "타이머는 항상 떠있어야 함" 에 따라 휴식 자동 종료 트리거 제거.
    row.querySelectorAll('.set-input')[1].addEventListener('input', e => _updateSetDraftField(entryIdx, si, 'reps', e.target.value));
    row.querySelectorAll('.set-input')[1].addEventListener('change', e => wtUpdateSet(entryIdx, si, 'reps', e.target.value, e.target));
    row.querySelector('.set-done-btn').addEventListener('click', () => wtToggleSetDone(entryIdx, si));
    row.querySelector('.set-remove-btn').addEventListener('click', () => wtRemoveSet(entryIdx, si));
    const rpeSel = row.querySelector('.set-rpe-select');
    if (rpeSel) rpeSel.addEventListener('change', e => wtUpdateSetRir(entryIdx, si, e.target.value, e.target));
    const maxRpeInput = row.querySelector('.set-rpe-input');
    if (maxRpeInput) {
      maxRpeInput.addEventListener('input', e => _updateSetDraftField(entryIdx, si, 'rpe', _rirToRpe(e.target.value)));
      maxRpeInput.addEventListener('change', e => wtUpdateSetRir(entryIdx, si, e.target.value, e.target));
    }
    const romInput = row.querySelector('.set-rom-input');
    if (romInput) {
      romInput.addEventListener('input', e => {
        const next = _romScoreInputToPct(e.target.value);
        if (next != null) {
          _setRomPctLocal(entryIdx, si, next);
        }
      });
      romInput.addEventListener('change', e => {
        const next = _romScoreInputToPct(e.target.value);
        wtUpdateSet(entryIdx, si, 'romPct', next == null ? '' : next, e.target);
      });
    }
    _bindWorkoutNumberInputFocusGuard(row);
    el.appendChild(row);
  });

  if (typeof Sortable !== 'undefined' && sets.length > 1) {
    new Sortable(el, {
      handle: '.set-drag-handle',
      direction: 'vertical',
      fallbackTolerance: 6,
      dragoverBubble: false,
      animation: 150,
      ghostClass: 'set-row-ghost',
      chosenClass: 'set-row-chosen',
      onEnd(evt) {
        const { oldIndex, newIndex } = evt;
        if (oldIndex === newIndex) return;
        const [moved] = S.workout.exercises[entryIdx].sets.splice(oldIndex, 1);
        S.workout.exercises[entryIdx].sets.splice(newIndex, 0, moved);
        if (!_rerenderMaxEntryOwner(entryIdx)) _renderSets(entryIdx, targetEl);
        wtPersistActiveWorkoutDraft('set drag move');
        saveWorkoutDay({ silent: true }).then(() => showToast('순서가 변경되었습니다', 1500, 'success')).catch(e => console.error('Save error:', e));
      }
    });
  }
}

// ── 종목 선택/에디터 모달 ───────────────────────────────────────
// 전문가 세션(preset.enabled + 프로 모드 뷰)에서만 해당 헬스장 기구만.
// S.workout.currentGymId가 stale이어도 resolveCurrentGymId가 자동 복구 + 동기화.
// 일반 모드 뷰(세션 토글) 중이면 preset.enabled=true여도 전체 풀을 써서
// 현재 헬스장이 비어있어도 디폴트 종목이 보이게 함.
function _getMaxBenchmarkPickerPool() {
  if (!_isTestModePickerContext()) return [];
  const preset = getExpertPreset?.();
  const cycle = getMaxCycle?.() || preset?.maxCycle || null;
  if (!cycle?.benchmarks?.length) return [];
  const selectedMajors = Array.isArray(S?.workout?.maxMeta?.selectedMajors)
    ? S.workout.maxMeta.selectedMajors
    : [];
  const items = resolveMaxBenchmarkPickerItems({
    cycle,
    exList: getExList(),
    selectedMajors,
    currentGymId: _currentPickerGymId(),
    todayKey: _todayDateKey(),
    cache: _cacheWithCurrentPickerWorkout(),
    fallbackMovements: MOVEMENTS,
    includeAllRegisteredExercises: true,
  });
  return items.map(item => ({
    ...item.exercise,
    __maxBenchmarkPicker: true,
    __maxBenchmark: item.benchmark,
    __maxCycle: item.cycle,
    __maxPickerLatest: item.latest || null,
    __maxPickerKind: item.kind || (item.benchmark ? 'benchmark' : 'exercise'),
  }));
}

function _getPickerExercisePool() {
  try {
    const maxPool = _getMaxBenchmarkPickerPool();
    if (maxPool.length) return maxPool;
    return getExList();
  } catch { return getExList(); }
}

function _isMaxBenchmarkPickerExercise(ex) {
  return !!ex?.__maxBenchmarkPicker;
}

function _cacheWithCurrentPickerWorkout() {
  const currentKey = _todayDateKey();
  const cache = getCache() || {};
  const currentEntries = Array.isArray(S?.workout?.exercises)
    ? S.workout.exercises.filter(entry => entry?.exerciseId)
    : [];
  if (!currentKey || !currentEntries.length) return cache;
  const existingDay = cache[currentKey] || {};
  const currentIds = new Set(currentEntries.map(entry => entry.exerciseId));
  const preserved = (existingDay.exercises || []).filter(entry => !currentIds.has(entry?.exerciseId));
  return {
    ...cache,
    [currentKey]: {
      ...existingDay,
      exercises: [...preserved, ...currentEntries],
    },
  };
}

function _pickerDisplaySetScore(set = {}) {
  const kg = Number(set?.kg) || 0;
  const reps = Number(set?.reps) || 0;
  return kg > 0 ? kg * 1000 + reps : reps;
}

function _bestPickerCurrentSet(exerciseId) {
  const entry = (S?.workout?.exercises || []).find(item => item?.exerciseId === exerciseId);
  if (!entry) return null;
  return (entry.sets || [])
    .filter(set => set && set.setType !== 'warmup')
    .map(set => ({
      kg: Math.max(0, Number(set?.kg) || 0),
      reps: Number(set?.reps) || 0,
    }))
    .filter(set => set.reps > 0)
    .sort((a, b) => _pickerDisplaySetScore(b) - _pickerDisplaySetScore(a))[0] || null;
}

function _formatPickerSetBadge(set) {
  if (!set || !(Number(set.reps) > 0)) return '';
  const kg = Number(set.kg) || 0;
  const reps = Number(set.reps) || 0;
  return kg > 0
    ? `${_fmtNum(kg)}kg x ${_fmtNum(reps)}회`
    : `${_fmtNum(reps)}회`;
}

function _renderMaxBenchmarkPickerMeta(ex) {
  const b = ex?.__maxBenchmark || null;
  if (!b) {
    const currentSet = _bestPickerCurrentSet(ex?.id);
    const currentLabel = _formatPickerSetBadge(currentSet);
    if (currentLabel) {
      return `<span class="ex-picker-benchmark-meta">${_escPicker('오늘')} · ${_escPicker(currentLabel)}</span>`;
    }
    const latest = ex?.__maxPickerLatest || null;
    const latestLabel = _formatPickerSetBadge(latest);
    if (latestLabel) {
      return `<span class="ex-picker-benchmark-meta">${_escPicker('최근')} · ${_escPicker(latestLabel)}</span>`;
    }
    return `<span class="ex-picker-benchmark-meta is-empty">데이터 없음</span>`;
  }
  const track = b.activeTrack === 'H' ? '강도' : '볼륨';
  const planned = b.planned || {};
  const kg = Number(planned.plannedKg) > 0 ? `${planned.plannedKg}kg` : '계획 중량';
  const reps = Number(planned.targetReps) > 0 ? `${planned.targetReps}회` : '목표 반복';
  return `<span class="ex-picker-benchmark-meta">${_escPicker(track)} · ${_escPicker(kg)} x ${_escPicker(reps)}</span>`;
}

function _pickerEditIconSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4.6L18.8 9.8a2.1 2.1 0 0 0 0-3L17.2 5.2a2.1 2.1 0 0 0-3 0L4 15.4V20Z"/><path d="m13.5 6.5 4 4"/></svg>`;
}

async function _deletePickerExercise(ex) {
  if (!ex?.id) {
    window.showToast?.('삭제할 종목을 찾지 못했어요', 2200, 'error');
    return;
  }
  const name = ex.name || ex.id;
  const ok = await (window.confirmAction?.({
    title: '종목을 삭제할까요?',
    message: `"${name}" 종목을 선택 후보에서 삭제합니다.\n과거 운동 기록은 유지됩니다.`,
    confirmLabel: '삭제',
    cancelLabel: '취소',
    destructive: true,
    longPress: 1200,
  }) || Promise.resolve(window.confirm?.(`"${name}" 종목을 삭제할까요?`) ?? false));
  if (!ok) return;
  try {
    await deleteExercise(ex.id);
    _renderPickerList();
    window.showToast?.('종목이 삭제됐어요', 1800, 'info');
  } catch (err) {
    console.warn('[picker.deleteExercise]:', err);
    window.showToast?.('종목 삭제 실패 — 다시 시도해주세요', 2600, 'error');
  }
}

function _defaultTestModeSet() {
  return {
    kg: 0,
    reps: 0,
    rpe: null,
    romPct: 100,
    setType: 'main',
    done: false,
  };
}

function _normalizeTestModeSets(sets) {
  const normalized = Array.isArray(sets) && sets.length ? sets : [_defaultTestModeSet()];
  return normalized.map(set => {
    const next = {
      ..._defaultTestModeSet(),
      ...set,
      rpe: set?.rpe ?? set?.rpeTarget ?? null,
      setType: set?.setType || 'main',
      done: set?.done === true,
      romPct: _normalizeRomPct(set?.romPct) ?? 100,
    };
    return next.done === true ? next : stripSetCompletedAt(next);
  });
}

function _testModeSetsFromPrescription(prescription) {
  if (!prescription) return null;
  if (prescription.applySets === true && Array.isArray(prescription.sets) && prescription.sets.length) {
    return prescription.sets.map(set => {
      const next = {
        ..._defaultTestModeSet(),
        ...set,
        setType: set?.setType || 'main',
        done: set?.done === true,
        romPct: _normalizeRomPct(set?.romPct) ?? 100,
      };
      return next.done === true ? next : stripSetCompletedAt(next);
    });
  }
  const rpe = Number(prescription.targetRpe) || null;
  return [{
    ..._defaultTestModeSet(),
    rpe,
  }];
}

function _ensureTestModePickerEntry(entry, ex, options = {}) {
  const base = {
    muscleId: entry?.muscleId || ex?.muscleId || null,
    exerciseId: entry?.exerciseId || ex?.id || null,
    name: entry?.name || ex?.name || '',
    movementId: entry?.movementId || ex?.movementId || null,
    ...entry,
  };
  const prescription = base.maxPrescription || _resolveMaxPrescription(base, ex);
  base.recommendationMeta = {
    mode: 'max',
    id: base.recommendationMeta?.id || `dashboard3:test:${base.exerciseId || ex?.id || Date.now()}`,
    kind: base.recommendationMeta?.kind || (options.benchmark ? 'benchmark' : 'manual'),
    source: base.recommendationMeta?.source || 'dashboard3-test-mode',
    reason: base.recommendationMeta?.reason || 'Dashboard3 운동 기록은 테스트모드 카드로 고정됩니다.',
    userAction: base.recommendationMeta?.userAction || 'accepted',
    acceptedAt: base.recommendationMeta?.acceptedAt || Date.now(),
    primaryMajor: base.recommendationMeta?.primaryMajor || base.muscleId || ex?.muscleId || null,
    ...base.recommendationMeta,
  };
  if (prescription) {
    base.maxPrescription = {
      ...prescription,
      exerciseId: base.exerciseId,
      movementId: base.movementId || prescription.movementId || null,
    };
  }
  const generatedSets = _testModeSetsFromPrescription(prescription);
  const keepExistingSets = Array.isArray(base.sets) && base.sets.length && !generatedSets;
  base.sets = _normalizeTestModeSets(keepExistingSets ? base.sets : generatedSets);
  return base;
}

function _todayKeyForProgramPicker() {
  const now = new Date();
  return _todayDateKey() || dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function _pickerProgramTrackForBenchmark(bm = {}) {
  if (bm.program === 'wendler') return 'volume';
  const tracks = Array.isArray(bm.tracks) && bm.tracks.length ? bm.tracks : ['volume'];
  return tracks.includes('volume') ? 'volume' : tracks[0];
}

function _buildProgramPickerExerciseEntry(ex) {
  const board = getTestBoardV2();
  if (!board || !ex?.id) return null;
  const benchmark = findExerciseProgramBenchmark(board, ex);
  if (!benchmark || benchmark.status === 'archived') return null;
  const todayKey = _todayKeyForProgramPicker();
  const program = buildExerciseProgramWorkoutPrescription(board, benchmark, {
    track: _pickerProgramTrackForBenchmark(benchmark),
    todayKey,
  });
  if (!program?.prescription) return null;
  return {
    muscleId: ex.muscleId || benchmark.muscleId || benchmark.groupId || null,
    exerciseId: ex.id,
    name: ex.name || benchmark.label || '',
    movementId: ex.movementId || benchmark.movementId || null,
    sets: program.prescription.sets || [{ kg: 0, reps: 0, setType: 'main', done: false }],
    maxPrescription: program.prescription,
    recommendationMeta: {
      ...program.recommendationMeta,
      id: `dashboard3:program:${benchmark.id}:${program.recommendationMeta.boardV2WeekStart}`,
      acceptedAt: Date.now(),
      userAction: 'accepted',
      primaryMajor: ex.muscleId || benchmark.muscleId || benchmark.groupId || null,
    },
  };
}

function _buildPickerExerciseEntry(ex) {
  const programEntry = _buildProgramPickerExerciseEntry(ex);
  if (programEntry) return _ensureTestModePickerEntry(programEntry, ex, { benchmark: programEntry.maxPrescription });
  if (_isMaxBenchmarkPickerExercise(ex)) {
    const entry = buildMaxPickerExerciseEntry({
      exercise: ex,
      benchmark: ex.__maxBenchmark,
      cycle: ex.__maxCycle,
      todayKey: _todayDateKey(),
      currentGymId: _currentPickerGymId(),
    });
    if (entry) return _ensureTestModePickerEntry(entry, ex, { benchmark: ex.__maxBenchmark, cycle: ex.__maxCycle });
  }
  const entry = {
    muscleId: ex.muscleId,
    exerciseId: ex.id,
    name: ex.name,
    movementId: ex.movementId || null,
    sets: [{ kg: 0, reps: 0, setType: 'main', done: false }],
  };
  return _isTestModePickerContext() ? _ensureTestModePickerEntry(entry, ex) : entry;
}

function _currentPickerGymId() {
  try { return resolveCurrentGymId() || S?.workout?.currentGymId || getExpertPreset()?.currentGymId || null; }
  catch { return S?.workout?.currentGymId || getExpertPreset()?.currentGymId || null; }
}

function _exerciseSourceMeta(ex) {
  const gyms = getGyms?.() || [];
  const currentGymId = _currentPickerGymId();
  const gymIds = _exerciseGymIds(ex);
  const gymId = gymIds[0] || null;
  const gym = gymId ? gyms.find(g => g.id === gymId) : null;
  const currentGym = currentGymId ? gyms.find(g => g.id === currentGymId) : null;
  if (_isExerciseGlobalScope(ex)) {
    return { label: '공통', detail: '모든 헬스장', cls: 'global', filterId: 'global', actionLabel: '공통 기구만 보기' };
  }
  if (currentGymId && gymIds.includes(currentGymId)) {
    const label = currentGym?.name || gym?.name || '현재 헬스장';
    return { label, detail: '전용 기구', cls: 'current', filterId: currentGymId, actionLabel: `${label} 기구만 보기` };
  }
  const label = gym?.name || '다른 헬스장';
  return { label, detail: '전용 기구', cls: 'other', filterId: gymId, actionLabel: `${label} 기구만 보기` };
}

function _exerciseGymIds(ex) {
  return [...new Set([
    ex?.gymId,
    ex?.primaryGymId,
    ...(Array.isArray(ex?.gymTags) ? ex.gymTags.filter(tag => tag && tag !== '*') : []),
  ].filter(Boolean))];
}

function _isExerciseGlobalScope(ex) {
  const tags = Array.isArray(ex?.gymTags) ? ex.gymTags : [];
  return tags.includes('*') || _exerciseGymIds(ex).length === 0;
}

function _exerciseGymKey(ex) {
  return _exerciseGymIds(ex)[0] || '';
}

function _isExerciseUsableAtCurrentGym(ex) {
  const currentGymId = _currentPickerGymId();
  if (_isExerciseGlobalScope(ex) || !currentGymId) return true;
  return _exerciseGymIds(ex).includes(currentGymId);
}

function _isConcretePickerGymFilter(gymId) {
  return !!gymId && !['all', 'usable', 'global'].includes(String(gymId));
}

function _normalizePickerGymFilter(gymId) {
  const value = String(gymId || '').trim();
  return value || 'all';
}

function _isExerciseUsableAtGym(ex, gymId) {
  const scope = _normalizePickerGymFilter(gymId);
  if (scope === 'global') return _isExerciseGlobalScope(ex);
  if (scope === 'usable') return _isExerciseUsableAtCurrentGym(ex);
  if (scope === 'all' || _isExerciseGlobalScope(ex)) return true;
  return _exerciseGymIds(ex).includes(scope);
}

function _applyPickerGymScope(pool, gymId = _pickerGymFilter) {
  const scope = _normalizePickerGymFilter(gymId);
  if (scope === 'all') return pool;
  return pool.filter(ex => _isExerciseUsableAtGym(ex, scope));
}

function _isExerciseEditable(ex) {
  if (!ex?.id) return false;
  return /^custom_/.test(String(ex.id)) || _exerciseGymIds(ex).length > 0 || !ex.movementId;
}

const EX_PROGRAM_MODES = [
  { id: 'none', label: '기본' },
  { id: 'volume', label: '볼륨' },
  { id: 'intensity', label: '강도' },
  { id: 'both', label: '볼륨+강도' },
  { id: 'wendler', label: '웬들러' },
];

function _numText(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

function _programModeFromSettings(settings = {}) {
  if (settings.program === 'wendler') return 'wendler';
  if (settings.program !== 'stair') return 'none';
  const tracks = Array.isArray(settings.tracks) ? settings.tracks : [];
  const hasVolume = tracks.includes('volume');
  const hasIntensity = tracks.includes('intensity');
  if (hasVolume && hasIntensity) return 'both';
  if (hasIntensity) return 'intensity';
  if (hasVolume) return 'volume';
  return 'none';
}

function _ensureExerciseProgramEditor() {
  const form = document.querySelector('#ex-editor-modal .ex-editor-form');
  if (!form) return null;
  let wrap = document.getElementById('ex-editor-program-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'ex-editor-program-wrap';
    wrap.className = 'ex-program-editor';
    const actions = form.querySelector('.ex-editor-actions');
    form.insertBefore(wrap, actions || null);
  }
  return wrap;
}

function _programDateKey(value, fallback = '') {
  const key = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  const fb = String(fallback || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fb)) return fb;
  return _todayKeyForProgramPicker();
}

function _dateKeyFromDate(dt) {
  return dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function _programMonthKey(key) {
  return _programDateKey(key).slice(0, 7);
}

function _programAddMonths(monthKey, delta) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  const dt = new Date(Number.isFinite(year) ? year : new Date().getFullYear(), (Number.isFinite(month) ? month : 1) - 1 + delta, 1);
  return _dateKeyFromDate(dt).slice(0, 7);
}

function _programCycleEndKey(startKey) {
  const dt = new Date(`${_programDateKey(startKey)}T00:00:00`);
  dt.setDate(dt.getDate() + 41);
  return _dateKeyFromDate(dt);
}

function _programStartButtonText(key) {
  return `${mondayOf(_programDateKey(key))} 시작`;
}

function _programCycleHint(key) {
  const start = mondayOf(_programDateKey(key));
  return `선택한 주부터 6주 사이클 (${start} ~ ${_programCycleEndKey(start)})`;
}

function _renderProgramStartCalendar(monthKey, selectedKey) {
  const month = String(monthKey || _programMonthKey(selectedKey));
  const [year, monthNo] = month.split('-').map(Number);
  const first = new Date(year, monthNo - 1, 1);
  const days = new Date(year, monthNo, 0).getDate();
  const selectedWeek = mondayOf(_programDateKey(selectedKey));
  const blanks = Array.from({ length: first.getDay() }, () => '<span class="ex-program-cal-blank"></span>').join('');
  const dayButtons = Array.from({ length: days }, (_, idx) => {
    const day = idx + 1;
    const key = dateKey(year, monthNo - 1, day);
    const isSelected = mondayOf(key) === selectedWeek;
    return `<button type="button" class="ex-program-cal-day${isSelected ? ' is-selected' : ''}" data-ex-program-date="${key}">${day}</button>`;
  }).join('');
  return `
    <div class="ex-program-cal-head">
      <button type="button" class="ex-program-cal-nav" data-ex-program-calendar-prev aria-label="이전 달">&lt;</button>
      <strong>${year}.${String(monthNo).padStart(2, '0')}</strong>
      <button type="button" class="ex-program-cal-nav" data-ex-program-calendar-next aria-label="다음 달">&gt;</button>
    </div>
    <div class="ex-program-cal-grid ex-program-cal-weekdays" aria-hidden="true">
      ${['일', '월', '화', '수', '목', '금', '토'].map(d => `<span>${d}</span>`).join('')}
    </div>
    <div class="ex-program-cal-grid">
      ${blanks}${dayButtons}
    </div>
  `;
}

function _selectedProgramStartDate() {
  return _programDateKey(document.getElementById('ex-program-start-date')?.value, _todayKeyForProgramPicker());
}

function _updateProgramStartDateUi(key) {
  const weekStart = mondayOf(_programDateKey(key, _todayKeyForProgramPicker()));
  const input = document.getElementById('ex-program-start-date');
  const btn = document.getElementById('ex-program-start-date-btn');
  const hint = document.getElementById('ex-program-start-date-hint');
  if (input) input.value = weekStart;
  if (btn) btn.textContent = _programStartButtonText(weekStart);
  if (hint) hint.textContent = _programCycleHint(weekStart);
  return weekStart;
}

function _bindProgramStartCalendar(monthKey = '') {
  const cal = document.getElementById('ex-program-start-calendar');
  if (!cal) return;
  const selected = _selectedProgramStartDate();
  const month = monthKey || cal.dataset.month || _programMonthKey(selected);
  cal.dataset.month = month;
  cal.innerHTML = _renderProgramStartCalendar(month, selected);
  cal.querySelector('[data-ex-program-calendar-prev]')?.addEventListener('click', () => {
    _bindProgramStartCalendar(_programAddMonths(cal.dataset.month, -1));
  });
  cal.querySelector('[data-ex-program-calendar-next]')?.addEventListener('click', () => {
    _bindProgramStartCalendar(_programAddMonths(cal.dataset.month, 1));
  });
  cal.querySelectorAll('[data-ex-program-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const weekStart = _updateProgramStartDateUi(btn.getAttribute('data-ex-program-date'));
      cal.dataset.month = _programMonthKey(weekStart);
      cal.hidden = true;
      _bindProgramStartCalendar(cal.dataset.month);
    });
  });
}

function _roundProgramWeight(value, step = 2.5) {
  const n = Number(value);
  const s = Number(step);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (!Number.isFinite(s) || s <= 0) return Math.round(n * 10) / 10;
  return Math.round(n / s) * s;
}

function _formatProgramWeight(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function _calculateWendlerTmFromInputs() {
  const kg = _numInput('ex-program-tm-calc-kg', 0);
  const reps = _numInput('ex-program-tm-calc-reps', 0);
  const roundKg = _numInput('ex-program-wendler-round', 2.5);
  const result = document.getElementById('ex-program-tm-calc-result');
  if (!kg || !reps) {
    if (result) result.textContent = '대표 세트의 kg와 회수를 입력하세요.';
    return;
  }
  const e1rm = estimate1RM(kg, reps);
  const tm = _roundProgramWeight(e1rm * 0.9, roundKg);
  const tmInput = document.getElementById('ex-program-wendler-tm');
  if (tmInput) tmInput.value = _formatProgramWeight(tm);
  if (result) result.textContent = `추정 1RM ${_formatProgramWeight(e1rm)}kg · TM ${_formatProgramWeight(tm)}kg`;
}

function _exerciseProgramEditorHtml(settings = {}) {
  const mode = _programModeFromSettings(settings);
  const seed = settings.seed || {};
  const w = settings.wendler || {};
  const supp = w.supplemental || {};
  const programStartDate = mondayOf(_programDateKey(settings.programStartDate || w.programStartDate, _todayKeyForProgramPicker()));
  const tmCalcKg = seed.volume?.kg || w.tmKg || '';
  const tmCalcReps = seed.volume?.reps || 5;
  return `
    <div class="ex-program-head">
      <div class="ex-editor-label">프로그램</div>
      <span class="ex-program-current">${mode === 'none' ? '기본' : EX_PROGRAM_MODES.find(m => m.id === mode)?.label || '기본'}</span>
    </div>
    <div class="ex-program-seg" role="tablist" aria-label="프로그램 선택">
      ${EX_PROGRAM_MODES.map(item => `
        <button type="button" class="ex-program-seg-btn${item.id === mode ? ' is-on' : ''}" data-ex-program-mode="${item.id}" aria-pressed="${item.id === mode ? 'true' : 'false'}">${item.label}</button>
      `).join('')}
      <button type="button" class="ex-program-seg-btn" data-ex-program-mode="custom" aria-disabled="true" disabled>사용자 지정</button>
    </div>
    <div class="ex-program-panel ex-program-stair" data-ex-program-panel="stair">
      <div class="ex-program-grid" data-ex-program-track="volume">
        <label><span>볼륨 kg</span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-volume-kg" min="0" step="0.5" value="${_escPicker(_numText(seed.volume?.kg))}"></label>
        <label><span>볼륨 회</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-volume-reps" min="1" step="1" value="${_escPicker(_numText(seed.volume?.reps || 12))}"></label>
      </div>
      <div class="ex-program-grid" data-ex-program-track="intensity">
        <label><span>강도 kg</span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-intensity-kg" min="0" step="0.5" value="${_escPicker(_numText(seed.intensity?.kg))}"></label>
        <label><span>강도 회</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-intensity-reps" min="1" step="1" value="${_escPicker(_numText(seed.intensity?.reps || 8))}"></label>
      </div>
      <div class="ex-program-grid ex-program-grid-three">
        <label><span>세트</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-sets" min="1" step="1" value="${_escPicker(_numText(settings.setsDefault || 4))}"></label>
        <label><span>증량</span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-increment" min="0" step="0.5" value="${_escPicker(_numText(settings.incrementKg))}"></label>
      </div>
      </div>
      <div class="ex-program-panel ex-program-wendler" data-ex-program-panel="wendler">
        <div class="ex-program-compact-list">
          <div class="ex-program-grid ex-program-grid-three">
            <label><span>방식</span><select class="ex-editor-select" id="ex-program-wendler-scheme">
              <option value="w863"${(w.scheme || 'w863') === 'w863' ? ' selected' : ''}>8/6/3</option>
              <option value="w531"${w.scheme === 'w531' ? ' selected' : ''}>5/3/1</option>
              <option value="custom"${w.scheme === 'custom' ? ' selected' : ''}>커스텀</option>
            </select></label>
            <label><span>TM <small>실제 1RM보다 낮은 기준 중량</small></span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-wendler-tm" min="0" step="0.5" value="${_escPicker(_numText(w.tmKg))}"></label>
            <div class="ex-program-date-field">
              <span>시작 주</span>
              <button type="button" class="ex-program-date-btn" id="ex-program-start-date-btn" data-ex-program-calendar-toggle>${_escPicker(_programStartButtonText(programStartDate))}</button>
            <input type="hidden" id="ex-program-start-date" value="${_escPicker(programStartDate)}">
            <input type="hidden" id="ex-program-wendler-start" value="${_escPicker(_numText(w.startWeek || 1))}">
            <small class="ex-program-helper" id="ex-program-start-date-hint">${_escPicker(_programCycleHint(programStartDate))}</small>
          </div>
        </div>
          <div class="ex-program-calendar-row">
            <div class="ex-program-mini-cal" id="ex-program-start-calendar" data-month="${_escPicker(_programMonthKey(programStartDate))}" hidden></div>
          </div>
          <div class="ex-program-tm-calc">
            <label><span>수행 kg</span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-tm-calc-kg" min="0" step="0.5" value="${_escPicker(_numText(tmCalcKg))}"></label>
            <label><span>회수</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-tm-calc-reps" min="1" step="1" value="${_escPicker(_numText(tmCalcReps))}"></label>
            <button type="button" class="ex-program-calc-btn" data-ex-program-tm-calc>TM 계산</button>
            <small class="ex-program-helper" id="ex-program-tm-calc-result">대표 세트 기준으로 TM을 계산합니다.</small>
          </div>
        <div class="ex-program-grid ex-program-grid-three">
          <label><span>사이클</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-wendler-cycle" min="1" step="1" value="${_escPicker(_numText(w.cycleNo || 1))}"></label>
          <label><span>증량</span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-wendler-increment" min="0" step="0.5" value="${_escPicker(_numText(w.incrementKg || settings.incrementKg))}"></label>
          <label><span>반올림</span><input class="ex-editor-input" type="number" inputmode="decimal" id="ex-program-wendler-round" min="0.5" step="0.5" value="${_escPicker(_numText(w.roundKg || 2.5))}"></label>
      </div>
      <div class="ex-program-grid ex-program-grid-four">
        <label><span>보조</span><select class="ex-editor-select" id="ex-program-wendler-supp">
          <option value="bbb"${(supp.kind || 'bbb') === 'bbb' ? ' selected' : ''}>BBB</option>
            <option value="fsl"${supp.kind === 'fsl' ? ' selected' : ''}>FSL</option>
            <option value="none"${supp.kind === 'none' ? ' selected' : ''}>없음</option>
          </select></label>
            <label><span>%TM <small>보조 세트에 쓰는 TM 비율</small></span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-wendler-supp-pct" min="10" max="100" step="1" value="${_escPicker(_numText(supp.pct || 50))}"></label>
          <label><span>세트</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-wendler-supp-sets" min="1" step="1" value="${_escPicker(_numText(supp.sets || 5))}"></label>
          <label><span>횟수</span><input class="ex-editor-input" type="number" inputmode="numeric" id="ex-program-wendler-supp-reps" min="1" step="1" value="${_escPicker(_numText(supp.reps || 10))}"></label>
        </div>
        </div>
      </div>
  `;
}

function _setExerciseProgramMode(mode) {
  const wrap = document.getElementById('ex-editor-program-wrap');
  if (!wrap) return;
  const next = EX_PROGRAM_MODES.some(item => item.id === mode) ? mode : 'none';
  wrap.dataset.programMode = next;
  wrap.querySelector('.ex-program-current').textContent = next === 'none' ? '기본' : EX_PROGRAM_MODES.find(item => item.id === next)?.label || '기본';
  wrap.querySelectorAll('[data-ex-program-mode]').forEach(btn => {
    const on = btn.getAttribute('data-ex-program-mode') === next;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const isStair = ['volume', 'intensity', 'both'].includes(next);
  wrap.querySelector('[data-ex-program-panel="stair"]')?.toggleAttribute('hidden', !isStair);
  wrap.querySelector('[data-ex-program-panel="wendler"]')?.toggleAttribute('hidden', next !== 'wendler');
  wrap.querySelector('[data-ex-program-track="volume"]')?.toggleAttribute('hidden', !(next === 'volume' || next === 'both' || next === 'wendler'));
  wrap.querySelector('[data-ex-program-track="intensity"]')?.toggleAttribute('hidden', !(next === 'intensity' || next === 'both'));
}

function _bindExerciseProgramEditor() {
  const wrap = document.getElementById('ex-editor-program-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('[data-ex-program-mode]').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => _setExerciseProgramMode(btn.getAttribute('data-ex-program-mode')));
  });
  wrap.querySelector('[data-ex-program-tm-calc]')?.addEventListener('click', _calculateWendlerTmFromInputs);
  const startBtn = wrap.querySelector('[data-ex-program-calendar-toggle]');
  if (startBtn) {
    _updateProgramStartDateUi(_selectedProgramStartDate());
    _bindProgramStartCalendar();
    startBtn.addEventListener('click', () => {
      const cal = document.getElementById('ex-program-start-calendar');
      if (!cal) return;
      const opening = cal.hidden;
      if (opening) _bindProgramStartCalendar(_programMonthKey(_selectedProgramStartDate()));
      cal.hidden = !opening;
    });
  }
}

function _renderExerciseProgramEditor(ex) {
  const wrap = _ensureExerciseProgramEditor();
  if (!wrap) return;
  const settings = getExerciseProgramSettings(getTestBoardV2(), ex || {});
  wrap.innerHTML = _exerciseProgramEditorHtml(settings);
  _bindExerciseProgramEditor();
  _setExerciseProgramMode(_programModeFromSettings(settings));
}

function _numInput(id, fallback = null) {
  const el = document.getElementById(id);
  const n = Number(el?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function _readExerciseProgramConfig() {
  const wrap = document.getElementById('ex-editor-program-wrap');
  const mode = wrap?.dataset.programMode || 'none';
  if (mode === 'none') return { program: 'none' };
  if (mode === 'wendler') {
    return {
      program: 'wendler',
      programStartDate: document.getElementById('ex-program-start-date')?.value || _todayKeyForProgramPicker(),
      tracks: ['volume'],
      seed: {
        volume: {
          kg: _numInput('ex-program-volume-kg', _numInput('ex-program-wendler-tm', 0)),
          reps: _numInput('ex-program-volume-reps', 5),
        },
      },
      incrementKg: _numInput('ex-program-wendler-increment', undefined),
      wendler: {
        scheme: document.getElementById('ex-program-wendler-scheme')?.value || 'w863',
        tmKg: _numInput('ex-program-wendler-tm', undefined),
        startWeek: _numInput('ex-program-wendler-start', 1),
        cycleNo: _numInput('ex-program-wendler-cycle', 1),
        incrementKg: _numInput('ex-program-wendler-increment', undefined),
        roundKg: _numInput('ex-program-wendler-round', 2.5),
        supplemental: {
          kind: document.getElementById('ex-program-wendler-supp')?.value || 'bbb',
          pct: _numInput('ex-program-wendler-supp-pct', 50),
          sets: _numInput('ex-program-wendler-supp-sets', 5),
          reps: _numInput('ex-program-wendler-supp-reps', 10),
        },
      },
    };
  }
  const tracks = mode === 'both' ? ['volume', 'intensity'] : [mode];
  return {
    program: 'stair',
    tracks,
    setsDefault: _numInput('ex-program-sets', 4),
    incrementKg: _numInput('ex-program-increment', undefined),
    seed: {
      volume: {
        kg: _numInput('ex-program-volume-kg', 0),
        reps: _numInput('ex-program-volume-reps', 12),
      },
      intensity: {
        kg: _numInput('ex-program-intensity-kg', 0),
        reps: _numInput('ex-program-intensity-reps', 8),
      },
    },
  };
}

async function _saveExerciseProgramFromEditor(record) {
  const config = _readExerciseProgramConfig();
  const currentBoard = getTestBoardV2();
  const now = new Date();
  const todayKey = _todayDateKey() || dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const result = upsertExerciseProgramBenchmark(currentBoard, record, config, {
    todayKey,
    movements: MOVEMENTS,
    source: 'exercise-editor',
  });
  if (result.action === 'skipped') return result;
  if (result.action === 'noop' && !currentBoard) return result;
  await saveTestBoardV2(result.board);
  const saved = getExerciseProgramSettings(getTestBoardV2(), record);
  if (config.program === 'none') {
    if (saved.program !== 'none') throw new Error('exercise program archive verification failed');
  } else if (saved.program === 'none') {
    throw new Error('exercise program save verification failed');
  }
  return result;
}

function _renderPickerExerciseThumb(ex) {
  const majorId = _exerciseMajorIds(ex)[0] || ex?.muscleId || '';
  const asset = PICKER_MUSCLE_ASSETS[majorId];
  if (asset) {
    return `
      <span class="ex-picker-thumb has-asset" aria-hidden="true">
        <img src="${_escPicker(asset)}" alt="" loading="lazy" decoding="async" draggable="false">
      </span>
    `;
  }
  return `<span class="ex-picker-thumb" aria-hidden="true">${_pickerMuscleFigureHtml(majorId)}</span>`;
}

function _pickerNameDensityClass(name) {
  const visualLength = Array.from(String(name || '')).reduce((sum, ch) => {
    return sum + (/^[\x00-\x7F]$/.test(ch) ? 0.55 : 1);
  }, 0);
  if (visualLength >= 17) return ' is-very-compact';
  if (visualLength >= 12) return ' is-compact';
  return '';
}

function _renderExercisePickerName(ex, alreadyAdded, stats) {
  const nameClass = `ex-picker-name${_pickerNameDensityClass(ex?.name)}`;
  return `
    ${_renderPickerExerciseThumb(ex)}
    <span class="ex-picker-main">
      <span class="${nameClass}">${_escPicker(ex.name)}${alreadyAdded ? ' ✓' : ''}</span>
      <span class="ex-picker-history-meta">${_escPicker(_pickerStatsMeta(stats))}</span>
    </span>
  `;
}

function _pickerExerciseById(exId) {
  const id = String(exId || '');
  if (!id) return null;
  return _getPickerExercisePool().find(ex => String(ex?.id || '') === id) || null;
}

function _hidePickerExercise(ex) {
  if (!ex?.id) return;
  if (!Array.isArray(S.workout.hiddenExercises)) S.workout.hiddenExercises = [];
  if (!S.workout.hiddenExercises.includes(ex.id)) S.workout.hiddenExercises.push(ex.id);
  _renderPickerList();
  showToast(`'${ex.name}'을(를) 목록에서 숨겼어요`, 3000, 'success', {
    action: '실행 취소',
    onAction: () => {
      const i = S.workout.hiddenExercises.indexOf(ex.id);
      if (i >= 0) S.workout.hiddenExercises.splice(i, 1);
      _renderPickerList();
    },
  });
}

async function _selectPickerExercise(ex) {
  if (!ex?.id) return;
  const afterSelect = _consumePickerAfterSelect();
  const selection = selectWorkoutExerciseEntry(S.workout.exercises, ex, (exercise) => {
    _ensureExpertManualSession();
    return _buildPickerExerciseEntry(exercise);
  });
  if (selection.existing) {
    wtCloseExercisePicker();
    if (afterSelect) {
      await _runPickerAfterSelect(afterSelect, workoutExerciseSelectionDetail(selection));
      return;
    }
    wtFocusWorkoutEntryCard(selection.entryIdx);
    return;
  }
  const entryIdx = selection.entryIdx;
  _renderExerciseList();
  _syncExpertTopArea();
  const timerBar = document.getElementById('wt-workout-timer-bar');
  if (timerBar && !timerBar.classList.contains('wt-open')) timerBar.classList.add('wt-open');
  _refreshWorkoutTimeline('exercise add');
  wtPersistActiveWorkoutDraft('exercise add');
  wtCloseExercisePicker();
  const savePromise = saveWorkoutDay({ silent: true, keepDraftExercises: !!afterSelect });
  if (afterSelect) {
    try {
      await savePromise;
      await _runPickerAfterSelect(afterSelect, workoutExerciseSelectionDetail(selection));
    } catch (e) {
      console.error('Save error:', e);
    }
    return;
  }
  wtFocusWorkoutEntryCard(entryIdx);
  savePromise.catch(e => console.error('Save error:', e));
}

function _runPickerRowAction(action, ex) {
  if (!ex?.id) {
    window.showToast?.('종목을 찾지 못했어요', 1800, 'warning');
    return false;
  }
  switch (action) {
    case 'edit':
    case 'delete-via-editor':
      wtOpenExerciseEditor(ex.id, null);
      return true;
    case 'delete':
      return _deletePickerExercise(ex);
    case 'hide':
      _hidePickerExercise(ex);
      return true;
    default:
      return false;
  }
}

function _handlePickerListClick(event) {
  const container = event.currentTarget;
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target || !container?.contains?.(target)) return;
  const source = target.closest?.('.ex-picker-source[data-gym-filter]');
  if (source && container.contains(source)) {
    event.preventDefault();
    event.stopPropagation();
    const filterId = source.getAttribute('data-gym-filter');
    if (filterId) window._wtSetPickerGymFilter?.(filterId);
    return;
  }
  const rowAction = target.closest?.('[data-picker-row-action]');
  if (rowAction && container.contains(rowAction)) {
    event.preventDefault();
    event.stopPropagation();
    const ex = _pickerExerciseById(rowAction.getAttribute('data-exid'));
    const action = rowAction.getAttribute('data-picker-row-action') || '';
    const result = _runPickerRowAction(action, ex);
    if (result === false) console.warn('[picker] unknown row action:', action);
    Promise.resolve(result).catch(err => console.error('[picker] row action failed:', err));
    return;
  }
  const item = target.closest?.('[data-picker-exercise-id]');
  if (!item || !container.contains(item)) return;
  event.preventDefault();
  const ex = _pickerExerciseById(item.getAttribute('data-picker-exercise-id'));
  _selectPickerExercise(ex).catch(err => console.error('Save error:', err));
}

function _handlePickerListKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target instanceof Element ? event.target : null;
  const actionTarget = target?.closest?.('[data-picker-row-action], .ex-picker-source[data-gym-filter]');
  if (!actionTarget) return;
  event.preventDefault();
  event.stopPropagation();
  actionTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function _bindPickerListActions(container) {
  if (!container || container.dataset.pickerListDelegated === '1') return;
  container.dataset.pickerListDelegated = '1';
  container.addEventListener('click', _handlePickerListClick);
  container.addEventListener('keydown', _handlePickerListKeydown);
}

function _escPicker(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// 부위 필터 상태 (null = 전체)
let _pickerMuscleFilter = null;
let _pickerGymFilter = null;
let _pickerView = 'category';
let _pickerListMode = 'all'; // all | custom
let _pickerSortMode = 'recent'; // recent | frequency | name
let _pickerSearchQuery = '';
let _pickerAfterSelect = null;
const PICKER_MANUAL_CARDIO_SESSION_INDEX = 2;
const PICKER_MUSCLE_ASSETS = {
  chest: './assets/workout/muscles/chest.png',
  shoulder: './assets/workout/muscles/shoulder.png',
  back: './assets/workout/muscles/back.png',
  lower: './assets/workout/muscles/lower.png',
  glute: './assets/workout/muscles/glute.png',
  bicep: './assets/workout/muscles/bicep.png',
  tricep: './assets/workout/muscles/tricep.png',
  abs: './assets/workout/muscles/abs.png',
};

function _pickerRunningFigureHtml() {
  return `
    <span class="ex-picker-activity-figure" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="15.5" cy="4.5" r="2.2"></circle>
        <path d="M11.7 8.2 8.8 11l3.1 2.8 1.9 5.2"></path>
        <path d="M12 8.1 16 10l2.5 2.6"></path>
        <path d="M9.4 12.2 6.5 15.6 3.8 19"></path>
        <path d="M13.5 18.7 17 20.5"></path>
      </svg>
    </span>
  `;
}

function _pickerManualCardioFigureHtml() {
  return `
    <span class="ex-picker-activity-figure" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M4 17.5h16"></path>
        <path d="M6.2 15.2 9 10.5l3.4 2.8 4.7-6.6"></path>
        <path d="M16.7 6.7h3.1v3.1"></path>
        <circle cx="6.2" cy="15.2" r="1.5"></circle>
      </svg>
    </span>
  `;
}

function _renderPickerActivityTiles() {
  const hasRunning = !!S?.workout?.running;
  return `
    <button type="button" class="ex-picker-muscle-tile ex-picker-activity-tile" data-picker-activity="running" style="--picker-muscle:#217cf9">
      ${_pickerRunningFigureHtml()}
      <span class="ex-picker-muscle-name">런닝/조깅</span>
      <span class="ex-picker-muscle-count">${hasRunning ? '기록' : '러닝'}</span>
    </button>
    <button type="button" class="ex-picker-muscle-tile ex-picker-activity-tile ex-picker-activity-tile--manual-cardio" data-picker-activity="manual-cardio" style="--picker-muscle:#0f8f6f">
      ${_pickerManualCardioFigureHtml()}
      <span class="ex-picker-muscle-name">유산소</span>
      <span class="ex-picker-muscle-count">${hasRunning ? '수정' : '수기'}</span>
    </button>
  `;
}

function _manualCardioModeLabel(mode) {
  return mode === 'walk' ? '걷기' : '뛰기';
}

function _manualCardioRound(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const unit = 10 ** digits;
  return Math.round(n * unit) / unit;
}

function _manualCardioInitialValues() {
  const run = S?.workout?.runData || {};
  const summary = run.routeSummary && typeof run.routeSummary === 'object' ? run.routeSummary : {};
  const isManualCardio = run.source === 'manual-cardio' || summary.source === 'manual-cardio';
  if (!isManualCardio) return { mode: 'walk', speedKmh: 5.5, minutes: 30 };
  const durationMin = (Number(run.durationMin) || 0) + ((Number(run.durationSec) || 0) / 60);
  const speedFromDistance = durationMin > 0 && Number(run.distance) > 0
    ? Number(run.distance) / (durationMin / 60)
    : 0;
  return {
    mode: summary.activityMode === 'walk' ? 'walk' : 'run',
    speedKmh: _manualCardioRound(Number(summary.speedKmh) || speedFromDistance || 5.5, 1),
    minutes: Math.max(1, Math.round(durationMin || 30)),
  };
}

function _manualCardioSummary({ mode, speedKmh, minutes }) {
  const durationSecTotal = Math.max(1, Math.round(minutes * 60));
  const distanceKm = _manualCardioRound(speedKmh * (durationSecTotal / 3600), 2);
  const avgPaceSecPerKm = speedKmh > 0 ? Math.round(3600 / speedKmh) : 0;
  return {
    mode,
    speedKmh: _manualCardioRound(speedKmh, 1),
    durationSec: durationSecTotal,
    durationMin: Math.floor(durationSecTotal / 60),
    durationSecRemainder: durationSecTotal % 60,
    distanceKm,
    avgPaceSecPerKm,
    calories: Math.round(distanceKm * 70),
  };
}

function _renderManualCardioSheet() {
  const initial = _manualCardioInitialValues();
  return `
    <div class="ex-picker-cardio-backdrop" data-picker-cardio-sheet>
      <form class="ex-picker-cardio-sheet" data-picker-cardio-form data-cardio-selected-mode="${_escPicker(initial.mode)}">
        <div class="ex-picker-cardio-head">
          <div>
            <span>유산소</span>
            <strong>수기 입력</strong>
          </div>
          <button type="button" class="ex-picker-cardio-close" data-cardio-close aria-label="닫기">×</button>
        </div>
        <div class="ex-picker-cardio-mode" aria-label="운동 방식">
          <button type="button" class="${initial.mode === 'walk' ? 'active' : ''}" data-cardio-mode="walk" aria-pressed="${initial.mode === 'walk' ? 'true' : 'false'}">걷기</button>
          <button type="button" class="${initial.mode === 'run' ? 'active' : ''}" data-cardio-mode="run" aria-pressed="${initial.mode === 'run' ? 'true' : 'false'}">뛰기</button>
        </div>
        <div class="ex-picker-cardio-fields">
          <label>
            <span>속도</span>
            <input id="ex-cardio-speed" type="number" inputmode="decimal" min="0.1" max="30" step="0.1" value="${_escPicker(initial.speedKmh)}">
            <em>km/h</em>
          </label>
          <label>
            <span>시간</span>
            <input id="ex-cardio-minutes" type="number" inputmode="numeric" min="1" max="600" step="1" value="${_escPicker(initial.minutes)}">
            <em>분</em>
          </label>
        </div>
        <div class="ex-picker-cardio-preview" data-cardio-preview></div>
        <div class="ex-picker-cardio-actions">
          <button type="button" class="ex-picker-cardio-secondary" data-cardio-close>취소</button>
          <button type="submit" class="ex-picker-cardio-primary" data-cardio-save>저장</button>
        </div>
      </form>
    </div>
  `;
}

function _closeManualCardioInput() {
  document.querySelector('[data-picker-cardio-sheet]')?.remove();
}

function _readManualCardioSheet(sheet) {
  const form = sheet?.querySelector?.('[data-picker-cardio-form]');
  const mode = form?.dataset.cardioSelectedMode === 'run' ? 'run' : 'walk';
  const speedKmh = Number(sheet?.querySelector?.('#ex-cardio-speed')?.value);
  const minutes = Number(sheet?.querySelector?.('#ex-cardio-minutes')?.value);
  if (!Number.isFinite(speedKmh) || speedKmh <= 0 || speedKmh > 30) return null;
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) return null;
  return _manualCardioSummary({ mode, speedKmh, minutes });
}

function _syncManualCardioPreview(sheet) {
  const preview = sheet?.querySelector?.('[data-cardio-preview]');
  if (!preview) return;
  const summary = _readManualCardioSheet(sheet);
  if (!summary) {
    preview.innerHTML = '<span>입력 확인</span><strong>속도와 시간을 확인해주세요</strong>';
    return;
  }
  const paceMin = Math.floor(summary.avgPaceSecPerKm / 60);
  const paceSec = summary.avgPaceSecPerKm % 60;
  preview.innerHTML = `
    <span>${_escPicker(_manualCardioModeLabel(summary.mode))} · ${_escPicker(summary.speedKmh)}km/h</span>
    <strong>${_escPicker(summary.distanceKm.toFixed(2))}km · ${_escPicker(summary.durationMin)}분 · ${paceMin}'${String(paceSec).padStart(2, '0')}''/km</strong>
  `;
}

function _workoutDateKeyFromPickerState() {
  const d = S.shared?.date;
  if (!d || !Number.isFinite(Number(d.y)) || !Number.isFinite(Number(d.m)) || !Number.isFinite(Number(d.d))) return null;
  return `${Number(d.y)}-${String(Number(d.m) + 1).padStart(2, '0')}-${String(Number(d.d)).padStart(2, '0')}`;
}

function _snapshotManualCardioPreviousWorkout() {
  return {
    exercises: S.workout.exercises,
    cf: S.workout.cf,
    stretching: S.workout.stretching,
    swimming: S.workout.swimming,
    running: S.workout.running,
    runData: S.workout.runData,
    cfData: S.workout.cfData,
    stretchData: S.workout.stretchData,
    swimData: S.workout.swimData,
    wineFree: S.workout.wineFree,
    workoutDuration: S.workout.workoutDuration,
    workoutTimeline: S.workout.workoutTimeline,
    sessionIndex: S.workout.sessionIndex,
    sessionId: S.workout.sessionId,
    currentGymId: S.workout.currentGymId,
    routineMeta: S.workout.routineMeta,
    maxMeta: S.workout.maxMeta,
  };
}

function _restoreManualCardioPreviousWorkout(snapshot) {
  if (!snapshot) return;
  Object.assign(S.workout, snapshot);
}

async function _saveManualCardioFromSheet(sheet) {
  const summary = _readManualCardioSheet(sheet);
  if (!summary) {
    window.showToast?.('속도와 시간을 확인해주세요', 2200, 'warning');
    return;
  }
  const saveBtn = sheet?.querySelector?.('[data-cardio-save]');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
  }
  const routeSummary = {
    source: 'manual-cardio',
    activityMode: summary.mode,
    speedKmh: summary.speedKmh,
    pointCount: 0,
    durationSec: summary.durationSec,
    distanceKm: summary.distanceKm,
    avgPaceSecPerKm: summary.avgPaceSecPerKm,
    calories: summary.calories,
    bbox: null,
    centroid: null,
    elevationGainM: null,
    avgHeartRateBpm: null,
    cadenceSpm: null,
    gpsAccuracySummary: null,
  };
  const previousWorkout = _snapshotManualCardioPreviousWorkout();
  const memoEl = document.getElementById('wt-workout-memo');
  const previousMemo = memoEl ? memoEl.value : null;
  S.workout.exercises = [];
  S.workout.cf = false;
  S.workout.stretching = false;
  S.workout.swimming = false;
  S.workout.running = true;
  S.workout.sessionIndex = PICKER_MANUAL_CARDIO_SESSION_INDEX;
  S.workout.sessionId = 'running-track';
  S.workout.runData = {
    ...(S.workout.runData || {}),
    distance: summary.distanceKm,
    durationMin: summary.durationMin,
    durationSec: summary.durationSecRemainder,
    memo: '',
    source: 'manual-cardio',
    startedAt: null,
    endedAt: null,
    route: [],
    routeSummary,
    placeSummary: null,
    avgPaceSecPerKm: summary.avgPaceSecPerKm,
    gpsAccuracySummary: null,
  };
  S.workout.cfData = { wod: '', durationMin: 0, durationSec: 0, memo: '' };
  S.workout.stretchData = { duration: 0, memo: '' };
  S.workout.swimData = { distance: 0, durationMin: 0, durationSec: 0, stroke: '', memo: '' };
  S.workout.wineFree = false;
  S.workout.workoutDuration = 0;
  S.workout.workoutTimeline = null;
  S.workout.currentGymId = null;
  S.workout.routineMeta = null;
  S.workout.maxMeta = null;
  if (memoEl) memoEl.value = '';
  const targetDateKey = _workoutDateKeyFromPickerState();
  try {
    await saveWorkoutDay({ silent: true });
    _restoreManualCardioPreviousWorkout(previousWorkout);
    if (memoEl && previousMemo != null) memoEl.value = previousMemo;
    _closeManualCardioInput();
    wtCloseExercisePicker();
    window.showToast?.('유산소 기록 저장 완료', 1800, 'success');
    if (targetDateKey && typeof window.wtOpenWorkoutDaySheet === 'function') {
      try {
        await window.wtOpenWorkoutDaySheet(targetDateKey, PICKER_MANUAL_CARDIO_SESSION_INDEX, {
          history: 'replace',
          action: 'manual-cardio:save-detail',
        });
      } catch (e) {
        console.warn('[manual-cardio.save-detail]:', e);
      }
    }
  } catch (e) {
    _restoreManualCardioPreviousWorkout(previousWorkout);
    if (memoEl && previousMemo != null) memoEl.value = previousMemo;
    console.error('[manual-cardio.save]:', e);
    window.showToast?.('유산소 기록 저장 실패', 2400, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  }
}

function _bindManualCardioSheet(sheet) {
  if (!sheet || sheet.dataset.cardioBound) return;
  sheet.dataset.cardioBound = '1';
  sheet.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (target === sheet || target?.closest?.('[data-cardio-close]')) {
      event.preventDefault();
      _closeManualCardioInput();
      return;
    }
    const modeBtn = target?.closest?.('[data-cardio-mode]');
    if (modeBtn) {
      const form = sheet.querySelector('[data-picker-cardio-form]');
      const mode = modeBtn.getAttribute('data-cardio-mode') === 'run' ? 'run' : 'walk';
      if (form) form.dataset.cardioSelectedMode = mode;
      sheet.querySelectorAll('[data-cardio-mode]').forEach(btn => {
        const active = btn === modeBtn;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      _syncManualCardioPreview(sheet);
    }
  });
  sheet.addEventListener('input', () => _syncManualCardioPreview(sheet));
  sheet.querySelector('[data-picker-cardio-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    _saveManualCardioFromSheet(sheet);
  });
}

function _openManualCardioInput() {
  const modal = document.getElementById('ex-picker-modal');
  const host = modal?.querySelector?.('.ex-picker-sheet');
  if (!host) return;
  _closeManualCardioInput();
  host.insertAdjacentHTML('beforeend', _renderManualCardioSheet());
  const sheet = host.querySelector('[data-picker-cardio-sheet]');
  _bindManualCardioSheet(sheet);
  _syncManualCardioPreview(sheet);
  sheet?.querySelector?.('#ex-cardio-speed')?.focus?.();
}

function _pickerMuscleFigureHtml(muscleId) {
  const safeId = _escPicker(muscleId);
  const asset = PICKER_MUSCLE_ASSETS[muscleId];
  if (!asset) {
    return `<span class="ex-picker-muscle-figure" data-muscle="${safeId}" aria-hidden="true"></span>`;
  }
  return `
    <span class="ex-picker-muscle-figure has-asset" data-muscle="${safeId}" aria-hidden="true">
      <img src="${_escPicker(asset)}" alt="" loading="eager" decoding="async" draggable="false">
    </span>
  `;
}

function _setPickerSearchUi(value = '') {
  const input = document.getElementById('ex-picker-search');
  if (input && input.value !== value) input.value = value;
  const clearBtn = document.getElementById('ex-picker-search-clear');
  if (clearBtn) clearBtn.style.display = value ? 'grid' : 'none';
}

function _setPickerAfterSelect(handler) {
  _pickerAfterSelect = typeof handler === 'function' ? handler : null;
}

function _consumePickerAfterSelect() {
  const handler = _pickerAfterSelect;
  _pickerAfterSelect = null;
  return handler;
}

async function _runPickerAfterSelect(handler, detail = {}) {
  if (typeof handler !== 'function') return false;
  try {
    await handler(detail);
    return true;
  } catch (e) {
    console.warn('[exercise-picker] afterSelect failed:', e);
    window.showToast?.('운동 추가 후 화면 갱신에 실패했어요', 2200, 'warning');
    return false;
  }
}

function _resetPickerGymScope() {
  _pickerGymFilter = 'all';
  if (S?.workout) S.workout.pickerGymFilter = _pickerGymFilter;
}

function _openPickerCategory(options = {}) {
  _pickerView = 'category';
  _pickerListMode = 'all';
  _pickerMuscleFilter = null;
  if (!options.preserveGymScope) _resetPickerGymScope();
  _pickerSearchQuery = '';
  _setPickerSearchUi('');
  _renderPickerList();
}

function _openPickerList(mode = 'all', muscleId = null, options = {}) {
  _pickerView = 'list';
  _pickerListMode = mode === 'custom' ? 'custom' : 'all';
  _pickerMuscleFilter = muscleId || null;
  if (!options.preserveGymScope) _resetPickerGymScope();
  _pickerSearchQuery = '';
  _setPickerSearchUi('');
  _renderPickerList();
}

function _handlePickerBack() {
  if (_pickerView !== 'category' || _pickerSearchQuery) {
    _openPickerCategory({ preserveGymScope: true });
    return;
  }
  wtCloseExercisePicker();
}

export function wtHandleExercisePickerBack() {
  const editor = document.getElementById('ex-editor-modal');
  if (editor?.classList.contains('open')) {
    wtCloseExerciseEditor();
    return true;
  }
  const picker = document.getElementById('ex-picker-modal');
  if (!picker?.classList.contains('open')) return false;
  _handlePickerBack();
  return true;
}

function _openPickerEditorFromHeader() {
  wtOpenExerciseEditor(null, _pickerMuscleFilter || null);
}

function _syncPickerDoneButton() {
  const done = document.getElementById('ex-picker-done');
  if (!done) return;
  const count = (Array.isArray(S?.workout?.exercises) ? S.workout.exercises : [])
    .filter(entry => entry?.exerciseId).length;
  done.disabled = count === 0;
  done.classList.toggle('active', count > 0);
}

function _bindPickerChrome() {
  const modal = document.getElementById('ex-picker-modal');
  if (!modal) return;
  if (!modal.dataset.pickerBackCaptureBound) {
    modal.dataset.pickerBackCaptureBound = '1';
    modal.addEventListener('click', (event) => {
      if (!event.target?.closest?.('#ex-picker-back')) return;
      event.preventDefault();
      event.stopPropagation();
      _handlePickerBack();
    }, true);
  }
  const back = modal.querySelector('#ex-picker-back');
  if (back) back.onclick = _handlePickerBack;
  const add = modal.querySelector('#ex-picker-add-top');
  if (add) add.onclick = _openPickerEditorFromHeader;
  const input = modal.querySelector('#ex-picker-search');
  if (input) input.oninput = () => window._wtOnPickerSearch(input.value);
  const clear = modal.querySelector('#ex-picker-search-clear');
  if (clear) clear.onclick = () => window._wtClearPickerSearch();
  const done = modal.querySelector('#ex-picker-done');
  if (done) done.onclick = () => wtCloseExercisePicker();
  _syncPickerDoneButton();
}

function _renderPickerTabs(ctx) {
  const modal = document.getElementById('ex-picker-modal');
  const tabs = modal?.querySelector?.('.ex-picker-tabs');
  if (!tabs) return;
  const listTabs = (_pickerView === 'list' || !!_pickerSearchQuery);
  const button = ({ key, label, active, muscleId = '' }) => `
    <button type="button"
      class="ex-picker-tab${active ? ' active' : ''}"
      data-picker-tab="${_escPicker(key)}"
      ${muscleId ? `data-picker-muscle-tab="${_escPicker(muscleId)}"` : ''}
      role="tab"
      aria-selected="${active ? 'true' : 'false'}">${_escPicker(label)}</button>
  `;
  const html = listTabs
    ? [
        button({ key: 'category', label: '분류', active: false }),
        ...ctx.visibleMuscles.map(m => button({
          key: 'muscle',
          label: m.name,
          muscleId: m.id,
          active: !_pickerSearchQuery && _pickerMuscleFilter === m.id,
        })),
      ].join('')
      : [
        button({ key: 'category', label: '분류', active: true }),
        button({ key: 'all', label: '전체', active: false }),
      ].join('');
  tabs.innerHTML = html;
  tabs.querySelectorAll('[data-picker-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-picker-tab');
      if (tab === 'category') {
        _openPickerCategory({ preserveGymScope: true });
        return;
      }
      if (tab === 'muscle') {
        _openPickerList(_pickerListMode, btn.getAttribute('data-picker-muscle-tab'), { preserveGymScope: true });
        return;
      }
      _openPickerList(tab === 'custom' ? 'custom' : 'all');
    });
  });
}

function _syncPickerChrome(ctx) {
  const modal = document.getElementById('ex-picker-modal');
  if (!modal) return;
  modal.dataset.pickerView = _pickerView;
  modal.dataset.pickerMode = _pickerListMode;
  if (ctx) _renderPickerTabs(ctx);
  _syncPickerDoneButton();
  const back = modal.querySelector('#ex-picker-back');
  if (back) back.setAttribute('aria-label', _pickerView === 'category' && !_pickerSearchQuery ? '닫기' : '분류로 돌아가기');
}

window._wtSetPickerMuscleFilter = (muscleId) => {
  _pickerView = 'list';
  _pickerMuscleFilter = muscleId || null;
  _renderPickerList();
};
window._wtSetPickerCategoryFilter = window._wtSetPickerMuscleFilter;
window._wtSetPickerGymFilter = (gymId) => {
  _pickerView = 'list';
  _pickerGymFilter = _normalizePickerGymFilter(gymId);
  if (S?.workout) S.workout.pickerGymFilter = _pickerGymFilter;
  saveWorkoutDay({ silent: true }).catch(e => console.warn('[pickerGymFilter.save]:', e));
  _renderPickerList();
};

function _wtSetPickerGymCategoryFilter(gymId) {
  _pickerView = 'category';
  _pickerListMode = 'all';
  _pickerMuscleFilter = null;
  _pickerGymFilter = _normalizePickerGymFilter(gymId);
  if (S?.workout) S.workout.pickerGymFilter = _pickerGymFilter;
  saveWorkoutDay({ silent: true }).catch(e => console.warn('[pickerGymFilter.save]:', e));
  _renderPickerList();
}

window._wtSetPickerSort = (mode) => {
  _pickerSortMode = ['recent', 'frequency', 'name'].includes(mode) ? mode : 'recent';
  _renderPickerList();
};

window._wtSetPickerScope = (mode) => {
  _pickerView = 'list';
  _pickerListMode = mode === 'custom' ? 'custom' : 'all';
  _renderPickerList();
};

// C-2: 종목명 검색 상태 (trim + lowercase)
window._wtOnPickerSearch = (q) => {
  _pickerSearchQuery = String(q || '').trim().toLowerCase();
  if (_pickerSearchQuery) {
    _pickerView = 'list';
    _pickerListMode = 'all';
    _pickerMuscleFilter = null;
  }
  _setPickerSearchUi(_pickerSearchQuery ? String(q || '') : '');
  _renderPickerList();
};
window._wtClearPickerSearch = () => {
  _pickerSearchQuery = '';
  _setPickerSearchUi('');
  _renderPickerList();
};
// C-4: 모든 필터 일괄 해제 ("필터 초기화" 버튼용)
window._wtResetAllPickerFilters = () => {
  _pickerView = 'list';
  _pickerListMode = 'all';
  _pickerMuscleFilter = null;
  _resetPickerGymScope();
  window._wtClearPickerSearch();
};

function _selectedPickerManagerGymId(gymId = null) {
  if (_isConcretePickerGymFilter(gymId)) return gymId;
  if (_isConcretePickerGymFilter(_pickerGymFilter)) return _pickerGymFilter;
  return _currentPickerGymId() || (getGyms?.() || [])[0]?.id || null;
}

async function _openPickerEquipmentManager(gymId = null) {
  try {
    const mod = await import('./expert/max.js');
    if (typeof mod.openMaxEquipmentPoolModal === 'function') {
      await mod.openMaxEquipmentPoolModal({ gymId: _selectedPickerManagerGymId(gymId) });
      return;
    }
  } catch (err) {
    console.warn('[picker.openEquipmentManager]:', err);
  }
  window.showToast?.('기구 관리 화면을 열 수 없어요', 2400, 'error');
}

function _normalizeMajorMuscleId(id) {
  if (!id) return null;
  return SUBPATTERN_TO_MAJOR[id] || id;
}

function _todayPickerMajorScope() {
  if (!_isMaxWorkoutMode() || !_isExpertSessionActive()) return [];
  const selected = Array.isArray(S?.workout?.maxMeta?.selectedMajors)
    ? S.workout.maxMeta.selectedMajors
    : [];
  return [...new Set(selected.map(_normalizeMajorMuscleId).filter(Boolean))];
}

// Exercise → 대분류 부위 역조회 (muscleId / muscleIds[] / movementId 기반)
function _exerciseMajorIds(ex) {
  const ids = new Set();
  const major = _normalizeMajorMuscleId(ex?.muscleId);
  if (major) ids.add(major);
  (Array.isArray(ex?.muscleIds) ? ex.muscleIds : []).forEach(id => {
    const normalized = _normalizeMajorMuscleId(id);
    if (normalized) ids.add(normalized);
  });
  const mv = MOVEMENTS.find(m => m.id === ex?.movementId);
  if (mv?.primary) ids.add(mv.primary);
  if (mv?.subPattern) {
    const normalized = _normalizeMajorMuscleId(mv.subPattern);
    if (normalized) ids.add(normalized);
  }
  return [...ids];
}

function _pickerEntryHasWork(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const sets = Array.isArray(entry.sets) ? entry.sets : [];
  if (sets.some(set => {
    if (!set || set.setType === 'warmup') return false;
    if (set.done === true) return true;
    if (set.done === false) return false;
    return (Number(set.kg) || 0) > 0 && (Number(set.reps) || 0) > 0;
  })) return true;
  return !!String(entry.note || '').trim();
}

function _dateKeyToUtcMs(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function _daysBetweenDateKeys(fromKey, toKey) {
  const fromMs = _dateKeyToUtcMs(fromKey);
  const toMs = _dateKeyToUtcMs(toKey);
  if (fromMs == null || toMs == null) return null;
  return Math.max(0, Math.round((toMs - fromMs) / 86400000));
}

function _buildPickerExerciseStats() {
  const stats = new Map();
  const cache = getCache?.() || {};
  const todayKey = _todayDateKey();
  Object.entries(cache).forEach(([key, day]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key === todayKey) return;
    getWorkoutSessions(day).forEach(session => {
      const seenInSession = new Set();
      (Array.isArray(session?.exercises) ? session.exercises : []).forEach(entry => {
        const exerciseId = entry?.exerciseId;
        if (!exerciseId || seenInSession.has(exerciseId) || !_pickerEntryHasWork(entry)) return;
        seenInSession.add(exerciseId);
        const prev = stats.get(exerciseId) || { count: 0, lastDate: null };
        prev.count += 1;
        if (!prev.lastDate || key > prev.lastDate) prev.lastDate = key;
        stats.set(exerciseId, prev);
      });
    });
  });
  return stats;
}

function _pickerStatsMeta(stats) {
  const count = Number(stats?.count) || 0;
  if (count <= 0 || !stats?.lastDate) return '-';
  const days = _daysBetweenDateKeys(stats.lastDate, _todayDateKey());
  const dayLabel = days == null
    ? '최근 기록'
    : (days === 0 ? '오늘' : `${days}일 전`);
  return `총 ${count}번, ${dayLabel}`;
}

function _sortPickerExercises(list, statsByExercise) {
  const collator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });
  const statOf = (ex) => statsByExercise.get(ex?.id) || { count: 0, lastDate: '' };
  return [...list].sort((a, b) => {
    const as = statOf(a);
    const bs = statOf(b);
    if (_pickerSortMode === 'frequency') {
      return (bs.count - as.count)
        || String(bs.lastDate || '').localeCompare(String(as.lastDate || ''))
        || collator.compare(a?.name || '', b?.name || '');
    }
    if (_pickerSortMode === 'name') {
      return collator.compare(a?.name || '', b?.name || '')
        || (bs.count - as.count)
        || String(bs.lastDate || '').localeCompare(String(as.lastDate || ''));
    }
    return String(bs.lastDate || '').localeCompare(String(as.lastDate || ''))
      || (bs.count - as.count)
      || collator.compare(a?.name || '', b?.name || '');
  });
}

function _isPickerCustomExercise(ex) {
  return /^custom_/.test(String(ex?.id || '')) || !ex?.movementId;
}

function _isPickerVisibleExercise(ex, isMaxBenchmarkPicker) {
  if (isMaxBenchmarkPicker) return true;
  const hidden = Array.isArray(S?.workout?.hiddenExercises) ? S.workout.hiddenExercises : [];
  return !hidden.includes(ex?.id);
}

function _safePickerColor(color) {
  const raw = String(color || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw) ? raw : '#64748b';
}

function _buildPickerContext() {
  const allMuscles = getMuscleParts();
  const rawPool = _getPickerExercisePool();
  const gyms = getGyms?.() || [];
  const currentGymId = _currentPickerGymId();
  const isExpert = _isExpertSessionActive();
  const isMaxBenchmarkPicker = rawPool.some(_isMaxBenchmarkPickerExercise);
  const todayMajorScope = isMaxBenchmarkPicker ? _todayPickerMajorScope() : [];
  const todayMajorSet = new Set(todayMajorScope);
  const basePool = todayMajorSet.size
    ? rawPool.filter(e => _exerciseMajorIds(e).some(id => todayMajorSet.has(id)))
    : rawPool;
  if (!_pickerGymFilter) _pickerGymFilter = 'all';
  const availableMuscles = new Set(basePool
    .flatMap(_exerciseMajorIds)
    .filter(id => id && (!todayMajorSet.size || todayMajorSet.has(id))));
  const availableGymIds = new Set(basePool.flatMap(_exerciseGymIds).filter(Boolean));
  const visibleMuscles = allMuscles.filter(m => availableMuscles.has(m.id));
  if (_pickerMuscleFilter && !availableMuscles.has(_pickerMuscleFilter)) {
    _pickerMuscleFilter = null;
  }
  return {
    allMuscles,
    rawPool,
    gyms,
    currentGymId,
    isExpert,
    isMaxBenchmarkPicker,
    todayMajorScope,
    todayMajorSet,
    basePool,
    availableMuscles,
    availableGymIds,
    visibleMuscles,
  };
}

function _pickerBaseVisiblePool(ctx) {
  return ctx.basePool.filter(ex => _isPickerVisibleExercise(ex, ctx.isMaxBenchmarkPicker));
}

function _applyPickerListMode(pool) {
  return _pickerListMode === 'custom'
    ? pool.filter(_isPickerCustomExercise)
    : pool;
}

function _renderPickerListToolbar(container) {
  const sortOptions = [
    { id: 'recent', label: '↑ 최근' },
    { id: 'frequency', label: '↑ 빈도' },
    { id: 'name', label: '↓ 이름' },
  ];
  const scope = _pickerListMode === 'custom' ? 'custom' : 'all';
  const toolbar = document.createElement('div');
  toolbar.className = 'ex-picker-list-toolbar';
  toolbar.innerHTML = `
    <div class="ex-picker-toolbar-row">
      <div class="ex-picker-sort-controls" aria-label="정렬">
        ${sortOptions.map(opt => `
          <button type="button"
            class="ex-picker-sort-btn${_pickerSortMode === opt.id ? ' active' : ''}"
            data-picker-sort="${_escPicker(opt.id)}">${_escPicker(opt.label)}</button>
        `).join('')}
      </div>
      <button type="button" class="ex-picker-create-btn" data-picker-create-exercise aria-label="운동 종목 새로 추가">+ 종목 추가</button>
    </div>
    <div class="ex-picker-scope-controls" aria-label="범위">
      <button type="button" class="ex-picker-scope-btn${scope === 'all' ? ' active' : ''}" data-picker-scope="all">전체</button>
      <button type="button" class="ex-picker-scope-btn is-disabled" disabled aria-label="즐겨찾기 준비 중">☆</button>
      <button type="button" class="ex-picker-scope-btn${scope === 'custom' ? ' active' : ''}" data-picker-scope="custom">커스텀</button>
    </div>
  `;
  toolbar.querySelectorAll('[data-picker-sort]').forEach(btn => {
    btn.addEventListener('click', () => window._wtSetPickerSort?.(btn.getAttribute('data-picker-sort')));
  });
  toolbar.querySelectorAll('[data-picker-scope]').forEach(btn => {
    btn.addEventListener('click', () => window._wtSetPickerScope?.(btn.getAttribute('data-picker-scope')));
  });
  toolbar.querySelector('[data-picker-create-exercise]')?.addEventListener('click', _openPickerEditorFromHeader);
  container.appendChild(toolbar);
}

function _renderPickerBenchmarkScope(ctx) {
  return '';
}

function _renderPickerCategory(container, ctx) {
  const visibleBase = _pickerBaseVisiblePool(ctx);
  const activeGymFilter = _normalizePickerGymFilter(_pickerGymFilter);
  const scopedBase = _applyPickerGymScope(visibleBase, activeGymFilter);
  const countsByMuscle = new Map(ctx.visibleMuscles.map(m => [m.id, 0]));
  scopedBase.forEach(ex => {
    _exerciseMajorIds(ex).forEach(id => {
      if (countsByMuscle.has(id)) countsByMuscle.set(id, countsByMuscle.get(id) + 1);
    });
  });
  const totalCount = visibleBase.length;
  const scopedMuscles = activeGymFilter === 'all'
    ? ctx.visibleMuscles
    : ctx.visibleMuscles.filter(m => (countsByMuscle.get(m.id) || 0) > 0);
  const gymRail = (ctx.gyms || []).map(gym => {
    const gymId = String(gym?.id || '');
    if (!gymId) return '';
    const label = gym?.name || '헬스장';
    const count = _applyPickerGymScope(visibleBase, gymId).length;
    const active = activeGymFilter === gymId ? ' active' : '';
    return `
        <button type="button" class="ex-picker-rail-chip${active}" data-picker-gym="${_escPicker(gymId)}" aria-pressed="${active ? 'true' : 'false'}">
          <span>${_escPicker(label)}</span><b>${count}</b>
        </button>
    `;
  }).join('');
  const manageGymId = _selectedPickerManagerGymId(activeGymFilter);
  const tiles = scopedMuscles
    .map(m => {
      const count = countsByMuscle.get(m.id) || 0;
      const color = _safePickerColor(m.color);
      return `
        <button type="button" class="ex-picker-muscle-tile" data-picker-muscle="${_escPicker(m.id)}" style="--picker-muscle:${color}">
          ${_pickerMuscleFigureHtml(m.id)}
          <span class="ex-picker-muscle-name">${_escPicker(m.name)}</span>
          <span class="ex-picker-muscle-count">${count}</span>
        </button>
      `;
    })
    .join('');
  container.innerHTML = `
    ${_renderPickerBenchmarkScope(ctx)}
    <div class="ex-picker-category-layout">
      <aside class="ex-picker-category-rail" aria-label="종목 범위">
        <button type="button" class="ex-picker-rail-chip${activeGymFilter === 'all' ? ' active' : ''}" data-picker-gym="all" aria-pressed="${activeGymFilter === 'all' ? 'true' : 'false'}">
          <span>전체</span><b>${totalCount}</b>
        </button>
        ${gymRail}
        <button type="button" class="ex-picker-rail-action" data-picker-action="manage-gyms" data-picker-gym-manage="${_escPicker(manageGymId || '')}">헬스장 관리</button>
      </aside>
      <section class="ex-picker-muscle-panel" aria-label="부위 분류">
        ${tiles}${_renderPickerActivityTiles()}
      </section>
    </div>
  `;
  container.querySelectorAll('[data-picker-gym]').forEach(btn => {
    btn.addEventListener('click', () => _wtSetPickerGymCategoryFilter(btn.getAttribute('data-picker-gym')));
  });
  container.querySelector('[data-picker-action="manage-gyms"]')?.addEventListener('click', event => {
    _openPickerEquipmentManager(event.currentTarget?.getAttribute('data-picker-gym-manage') || null);
  });
  container.querySelectorAll('[data-picker-muscle]').forEach(btn => {
    btn.addEventListener('click', () => _openPickerList('all', btn.getAttribute('data-picker-muscle'), { preserveGymScope: true }));
  });
  container.querySelectorAll('[data-picker-activity]').forEach(btn => {
    btn.addEventListener('click', () => {
      const activity = btn.getAttribute('data-picker-activity');
      if (activity === 'manual-cardio') {
        _openManualCardioInput();
        return;
      }
      if (activity !== 'running') return;
      wtCloseExercisePicker();
      if (typeof window.wtSwitchType === 'function') window.wtSwitchType('running');
      else window.wtOpenRunningSession?.();
    });
  });
}

export function _renderPickerList() {
  const container = document.getElementById('ex-picker-list');
  if (!container) return;
  _bindPickerListActions(container);
  container.innerHTML = '';
  const ctx = _buildPickerContext();
  const {
    isExpert,
    isMaxBenchmarkPicker,
    basePool,
    visibleMuscles,
  } = ctx;
  _syncPickerChrome(ctx);
  if (_pickerView === 'category' && !_pickerSearchQuery) {
    _renderPickerCategory(container, ctx);
    return;
  }
  const muscleFiltered = _pickerMuscleFilter
    ? basePool.filter(e => _exerciseMajorIds(e).includes(_pickerMuscleFilter))
    : basePool;
  const modeFiltered = _applyPickerListMode(muscleFiltered);
  const gymFiltered = (() => {
    return _applyPickerGymScope(modeFiltered, _pickerGymFilter);
  })();
  // C-2: 검색어 적용 (종목명 부분 일치, 대소문자 무시)
  const pool = _pickerSearchQuery
    ? gymFiltered.filter(e => String(e.name || '').toLowerCase().includes(_pickerSearchQuery))
    : gymFiltered;
  const statsByExercise = _buildPickerExerciseStats();
  if (isMaxBenchmarkPicker) {
    container.insertAdjacentHTML('beforeend', _renderPickerBenchmarkScope(ctx));
  }
  _renderPickerListToolbar(container);

  let renderedGroupCount = 0;
  visibleMuscles.forEach(muscle => {
    const list = _sortPickerExercises(pool
      .filter(e => _exerciseMajorIds(e).includes(muscle.id))
      .filter(e => _isPickerVisibleExercise(e, isMaxBenchmarkPicker)), statsByExercise);

    if (list.length === 0) return;
    renderedGroupCount++;

    const group = document.createElement('div');
    group.className = 'ex-picker-group';
    group.innerHTML = `<div class="ex-picker-group-label" style="color:${muscle.color}">${muscle.name}</div>`;
    list.forEach(ex => {
      const alreadyAdded = S.workout.exercises.some(e => e.exerciseId === ex.id);
      const pickerStats = statsByExercise.get(ex.id) || { count: 0, lastDate: null };
      const btn = document.createElement('button');
      btn.className = 'ex-picker-item' + (alreadyAdded ? ' already' : '');
      btn.dataset.pickerExerciseId = ex.id;
      const editable = _isExerciseEditable(ex);
      if (isMaxBenchmarkPicker) {
        btn.innerHTML = `${_renderExercisePickerName(ex, alreadyAdded, pickerStats)}
          <span class="ex-picker-row-side">
            <span class="ex-picker-actions">
              <span class="ex-picker-icon-btn ex-picker-edit" data-picker-row-action="edit" data-exid="${_escPicker(ex.id)}" role="button" tabindex="0" aria-label="종목 수정" title="종목 수정">${_pickerEditIconSvg()}</span>
              <span class="ex-picker-delete" data-picker-row-action="delete" data-exid="${_escPicker(ex.id)}" role="button" tabindex="0" title="종목 삭제">삭제</span>
            </span>
          </span>`;
      } else if (isExpert) {
        btn.innerHTML = `${_renderExercisePickerName(ex, alreadyAdded, pickerStats)}
          <div class="ex-picker-actions">
            <span class="ex-picker-icon-btn ex-picker-edit" data-picker-row-action="edit" data-exid="${_escPicker(ex.id)}" role="button" tabindex="0" aria-label="종목 수정" title="종목 수정">${_pickerEditIconSvg()}</span>
            ${editable ? `<span class="ex-picker-delete" data-picker-row-action="delete-via-editor" data-exid="${_escPicker(ex.id)}" role="button" tabindex="0" title="종목 삭제">삭제</span>` : ''}
          </div>`;
      } else {
        // C-3: ✕(삭제 연상) → 눈감김 아이콘 + "이 목록에서 숨기기" tooltip.
        //     실제로는 "이 헬스장에선 안 써요" 의미라 파괴적 삭제가 아님.
        btn.innerHTML = `${_renderExercisePickerName(ex, alreadyAdded, pickerStats)}
          <div class="ex-picker-actions">
            <span class="ex-picker-icon-btn ex-picker-edit" data-picker-row-action="edit" data-exid="${_escPicker(ex.id)}" role="button" tabindex="0" aria-label="종목 수정" title="종목 수정">${_pickerEditIconSvg()}</span>
            <span class="ex-picker-hide" data-picker-row-action="hide" data-exid="${_escPicker(ex.id)}" role="button" tabindex="0" title="이 헬스장 목록에서 숨기기" aria-label="이 헬스장 목록에서 숨기기">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </span>
          </div>`;
      }
      group.appendChild(btn);
    });
    if (!isExpert) {
      const addBtn = document.createElement('button');
      addBtn.className = 'ex-picker-add';
      addBtn.textContent = `+ ${muscle.name} 종목 추가(선택)`;
      addBtn.addEventListener('click', () => wtOpenExerciseEditor(null, muscle.id));
      group.appendChild(addBtn);
    }
    container.appendChild(group);
  });

  // C-4: 필터/검색 결과가 0건이면 명시적 empty-state (버튼 한 번에 초기화)
  if (renderedGroupCount === 0) {
    const empty = document.createElement('div');
    empty.className = 'ex-picker-empty';
    empty.style.cssText = 'padding:32px 16px; text-align:center; color:var(--text-secondary); font-size:14px; line-height:1.5;';
    const hasFilter = !!(_pickerMuscleFilter || _pickerSearchQuery || _pickerListMode === 'custom' || (_pickerGymFilter && _pickerGymFilter !== 'all'));
    const emptyMsg = _pickerListMode === 'custom'
      ? '등록된 커스텀 종목이 없어요'
      : '등록된 종목이 없어요';
    const createButton = '<button type="button" class="ex-picker-create-btn" data-picker-empty-create aria-label="운동 종목 새로 추가">+ 종목 추가</button>';
    empty.innerHTML = hasFilter
      ? `<div style="margin-bottom:12px;">조건에 맞는 종목이 없어요</div>
         <div class="ex-picker-empty-actions">
           <button type="button" class="tds-btn tonal sm" data-picker-reset-empty>필터 초기화</button>
           ${createButton}
         </div>`
      : `<div>${emptyMsg}</div>
         <div class="ex-picker-empty-actions">${createButton}</div>`;
    empty.querySelector('[data-picker-reset-empty]')?.addEventListener('click', () => window._wtResetAllPickerFilters?.());
    empty.querySelector('[data-picker-empty-create]')?.addEventListener('click', _openPickerEditorFromHeader);
    container.appendChild(empty);
  }
}

export async function wtOpenExercisePicker(options = {}) {
  if (Object.prototype.hasOwnProperty.call(options || {}, 'afterSelect')) {
    _setPickerAfterSelect(options.afterSelect);
  }
  let modal = document.getElementById('ex-picker-modal');
  if (!modal) {
    const { loadAndInjectModals } = await import('../modal-manager.js');
    await loadAndInjectModals();
    modal = document.getElementById('ex-picker-modal');
  }
  if (!modal) { console.error('[workout] ex-picker-modal not found'); return; }
  // 피커 열 때마다 부위/검색은 초기화하되, 헬스장 필터는 그날 세션 동안 유지한다.
  _bindPickerChrome();
  _pickerView = 'category';
  _pickerListMode = 'all';
  _pickerMuscleFilter = null;
  _resetPickerGymScope();
  _pickerSortMode = 'recent';
  _pickerSearchQuery = '';
  _setPickerSearchUi('');
  _renderPickerList();
  modal.classList.add('open');
  _setWorkoutModalLock(true);
}

export function wtOpenExerciseEditor(exId, defaultMuscleId) {
  const editor       = document.getElementById('ex-editor-modal');
  const nameInput    = document.getElementById('ex-editor-name');
  const muscleSelect = document.getElementById('ex-editor-muscle');
  const deleteBtn    = document.getElementById('ex-editor-delete') || document.getElementById('tds-btn danger sm');
  const titleEl      = document.getElementById('ex-editor-title');
  const allMuscles = getMuscleParts();
  let addMuscleWrap = document.getElementById('ex-editor-new-muscle-wrap');
  if (!addMuscleWrap) {
    addMuscleWrap = document.createElement('div');
    addMuscleWrap.id = 'ex-editor-new-muscle-wrap';
    addMuscleWrap.style.display = 'none';
    addMuscleWrap.style.marginTop = '8px';
    addMuscleWrap.innerHTML = '<input class="ex-editor-input" id="ex-editor-new-muscle-name" placeholder="새 부위 이름 입력">';
    muscleSelect.parentElement.appendChild(addMuscleWrap);
  }
  let gymWrap = document.getElementById('ex-editor-gym-wrap');
  if (!gymWrap) {
    gymWrap = document.createElement('div');
    gymWrap.id = 'ex-editor-gym-wrap';
    gymWrap.style.marginTop = '8px';
    gymWrap.innerHTML = `
      <div class="ex-editor-label">헬스장 범위</div>
      <select class="ex-editor-select" id="ex-editor-gym-scope"></select>
    `;
    muscleSelect.parentElement.parentElement.insertBefore(gymWrap, nameInput.parentElement);
  }
  const gymSelect = document.getElementById('ex-editor-gym-scope');
  const gyms = getGyms?.() || [];
  const currentGymId = _currentPickerGymId();
  gymSelect.innerHTML = [
    `<option value="">공통 · 모든 헬스장</option>`,
    ...gyms.map(g => `<option value="${_escPicker(g.id)}">${_escPicker(g.name || '이름 없는 헬스장')}</option>`),
  ].join('');

  muscleSelect.innerHTML = allMuscles.map(m =>
    `<option value="${m.id}">${m.name}</option>`).join('') +
    `<option value="${NEW_MUSCLE_OPTION}">＋ 새 부위 추가</option>`;
  muscleSelect.onchange = () => {
    addMuscleWrap.style.display = muscleSelect.value === NEW_MUSCLE_OPTION ? '' : 'none';
  };

  if (exId) {
    const ex = getExList().find(e => e.id === exId);
    titleEl.textContent      = '종목 수정';
    nameInput.value          = ex?.name || '';
    muscleSelect.value       = ex?.muscleId || '';
    gymSelect.value          = _exerciseGymKey(ex);
    if (deleteBtn) deleteBtn.style.display = _isExerciseEditable(ex) ? 'block' : 'none';
    editor.dataset.editingId = exId;
    _renderExerciseProgramEditor(ex || {});
  } else {
    titleEl.textContent      = '종목 추가';
    nameInput.value          = '';
    muscleSelect.value       = defaultMuscleId || allMuscles[0]?.id || '';
    gymSelect.value          = _pickerGymFilter && !['all', 'usable', 'global'].includes(_pickerGymFilter)
      ? _pickerGymFilter
      : (currentGymId && _isExpertSessionActive() ? currentGymId : '');
    if (deleteBtn) deleteBtn.style.display = 'none';
    editor.dataset.editingId = '';
    _renderExerciseProgramEditor({ muscleId: muscleSelect.value || defaultMuscleId || allMuscles[0]?.id || '' });
  }
  const customNameInput = document.getElementById('ex-editor-new-muscle-name');
  if (customNameInput) customNameInput.value = '';
  addMuscleWrap.style.display = muscleSelect.value === NEW_MUSCLE_OPTION ? '' : 'none';

  document.getElementById('ex-picker-modal').classList.remove('open');
  editor.classList.add('open');
  _setWorkoutModalLock(true);
}

export function wtCloseExercisePicker(e, options = {}) {
  if (e && e.target !== document.getElementById('ex-picker-modal')) return;
  document.getElementById('ex-picker-modal').classList.remove('open');
  _setWorkoutModalLock(false);
  if (!options?.preserveAfterSelect) _setPickerAfterSelect(null);
}

export function wtCloseExerciseEditor(e) {
  if (e && e.target !== document.getElementById('ex-editor-modal')) return;
  document.getElementById('ex-editor-modal').classList.remove('open');
  _setWorkoutModalLock(false);
  wtOpenExercisePicker();
}

export async function wtSaveExerciseFromEditor() {
  const editor   = document.getElementById('ex-editor-modal');
  const name     = document.getElementById('ex-editor-name').value.trim();
  const muscleSelect = document.getElementById('ex-editor-muscle');
  const gymId = document.getElementById('ex-editor-gym-scope')?.value || null;
  const saveBtn = editor?.querySelector('[data-action="save-exercise-editor"]');
  let muscleId = muscleSelect.value;
  if (!name) { window.showToast?.('종목 이름을 입력해주세요', 2500, 'warning'); return; }
  if (muscleId === NEW_MUSCLE_OPTION) {
    const newMuscleName = document.getElementById('ex-editor-new-muscle-name')?.value?.trim() || '';
    if (!newMuscleName) { window.showToast?.('새 부위 이름을 입력해주세요', 2500, 'warning'); return; }
    muscleId = customExerciseMuscleId();
    await saveCustomMuscle({ id: muscleId, name: newMuscleName, color: '#8b5cf6' });
  }
  const editingId = editor.dataset.editingId;
  const existing = editingId ? getExList().find(e => e.id === editingId) : null;
  const built = buildExerciseEditorRecord({
    existing,
    editingId,
    name,
    muscleId,
    gymId,
    id: editingId || exerciseEditorRecordId(),
  });
  if (!built.ok) {
    window.showToast?.('종목 저장 정보가 부족해요', 2500, 'warning');
    return;
  }
  const record = built.record;
  try {
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중...'; }
    await saveExercise(record);
    const saved = getExList().find(e => e.id === record.id);
    const verified = verifyExerciseEditorSavedRecord(record, saved);
    if (!verified.ok) {
      throw new Error('saveExercise verification failed');
    }
    const programRecord = verified.record;
    await _saveExerciseProgramFromEditor(programRecord);
  } catch (e) {
    console.warn('[wtSaveExerciseFromEditor]:', e);
    window.showToast?.('종목 저장 실패 — 다시 시도해주세요', 2800, 'error');
    return;
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
  }
  editor.classList.remove('open');
  _setWorkoutModalLock(false);
  wtOpenExercisePicker();
  window.showToast?.('종목 저장 완료', 1600, 'success');
}

export async function wtDeleteExerciseFromEditor() {
  const editor = document.getElementById('ex-editor-modal');
  const ok = await (window.confirmAction?.({
    title: '종목을 삭제할까요?',
    message: '이 종목으로 기록된 과거 세트 데이터는 유지되지만,\n앞으로는 선택할 수 없어요.',
    confirmLabel: '삭제',
    cancelLabel: '취소',
    destructive: true,
    longPress: 2000,
  }) || Promise.resolve(false));
  if (!ok) return;
  await deleteExercise(editor.dataset.editingId);
  editor.classList.remove('open');
  _setWorkoutModalLock(false);
  wtOpenExercisePicker();
  window.showToast?.('종목이 삭제됐어요', 2000, 'info');
}
