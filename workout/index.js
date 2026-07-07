// ================================================================
// workout/index.js — 오케스트레이터: re-export + window.* 등록
// ================================================================

// ── 테스트모드 v2 성장 보드 진입 카드 (side-effect: #tm2-entry 렌더) ──
export { tm2RenderEntry } from './test-v2/entry.js?v=20260702z19-current-user-set-button';

// ── 서브모듈 import ─────────────────────────────────────────────
export { loadWorkoutDate, changeWorkoutDate, goToTodayWorkout }
  from './load.js?v=20260517v3';

export { saveWorkoutDay }
  from './save.js';

export { renderCalorieTracker, _renderMealPhotos,
         wtAddFoodItem, wtRemoveFoodItem,
         openNutritionPhotoUpload }
  from './render.js';

export { wtToggleWineFree, wtToggleMealSkipped }
  from './status.js';

export { wtAddSet, wtRemoveSet, wtUpdateSet,
         wtToggleSetDone, wtUpdateSetType, wtMoveSet,
         wtRemoveExerciseEntry,
         wtFocusWorkoutEntryCard,
         wtOpenExercisePicker, wtCloseExercisePicker,
         wtHandleExercisePickerBack,
         wtOpenExerciseEditor, wtCloseExerciseEditor,
         wtSaveExerciseFromEditor, wtDeleteExerciseFromEditor,
         wtOpenManualCardioInput }
  from './exercises.js?v=20260625z47-workout-record-card-standard';

export { wtStartWorkoutTimer, wtPauseWorkoutTimer,
         wtResetWorkoutTimer, wtTogglePauseWorkoutTimer,
         wtFinishWorkout, wtRecoverTimers,
         wtRestTimerStart, wtRestTimerSkip, wtRestTimerAdjust,
         wtRestTimerShowIdle, wtRestTimerHideIdle,
         wtOpenRestPresetSheet }
  from './timers.js';

export { initRunningSession, wtOpenRunningSession, wtHandleRunningSessionBack, wtRestoreRunningSessionIfActive }
  from './running-session.js';

// ── 내부 import (window 등록 + 초기화용) ─────────────────────────
import { saveWorkoutDay }                          from './save.js';
import { S }                                       from './state.js';
import { wtAddFoodItem, wtRemoveFoodItem }         from './render.js';
import { wtToggleMealSkipped }                     from './status.js';
import { wtOpenExercisePicker, wtCloseExercisePicker,
         wtHandleExercisePickerBack,
         wtOpenExerciseEditor, wtCloseExerciseEditor,
         wtSaveExerciseFromEditor,
         wtDeleteExerciseFromEditor,
         wtFocusWorkoutEntryCard,
         wtOpenManualCardioInput }                 from './exercises.js?v=20260625z47-workout-record-card-standard';
import { wtStartWorkoutTimer, wtTogglePauseWorkoutTimer,
         wtResetWorkoutTimer, wtFinishWorkout, wtRecoverTimers,
         wtRestTimerStart, wtRestTimerSkip,
         wtRestTimerAdjust, wtRestTimerShowIdle,
         wtRestTimerHideIdle, wtOpenRestPresetSheet } from './timers.js';
import { _initRestTimerPresets }                   from './timers.js';
import { _initRunningEvents }                      from './activity-forms.js';
import { _initTypeFormEvents }                     from './activity-forms.js';
import { initRunningSession, wtOpenRunningSession, wtHandleRunningSessionBack, wtRestoreRunningSessionIfActive } from './running-session.js';
import { configureWearWorkoutBridge, initWearWorkoutBridge } from './wear-bridge.js';
import { confirmAction }                           from '../utils/confirm-modal.js';

// ── window.* 등록 (HTML onclick 연결) ───────────────────────────
window.wtToggleMealSkipped = wtToggleMealSkipped;
window.saveWorkoutDay = saveWorkoutDay;
window.wtOpenExercisePicker = wtOpenExercisePicker;
window.wtCloseExercisePicker = wtCloseExercisePicker;
window.wtHandleExercisePickerBack = wtHandleExercisePickerBack;
window.wtOpenExerciseEditor = wtOpenExerciseEditor;
window.wtCloseExerciseEditor = wtCloseExerciseEditor;
window.wtSaveExerciseFromEditor = wtSaveExerciseFromEditor;
window.wtDeleteExerciseFromEditor = wtDeleteExerciseFromEditor;
window.wtFocusWorkoutEntryCard = wtFocusWorkoutEntryCard;
window.wtOpenManualCardioInput = wtOpenManualCardioInput;
window.wtStartWorkoutTimer = wtStartWorkoutTimer;
window.wtTogglePauseWorkoutTimer = wtTogglePauseWorkoutTimer;
window.wtResetWorkoutTimer = wtResetWorkoutTimer;
window.wtFinishWorkout = wtFinishWorkout;
window.wtRecoverTimers = wtRecoverTimers;
window.wtOpenRunningSession = wtOpenRunningSession;
window.wtHandleRunningSessionBack = wtHandleRunningSessionBack;
window.wtRestoreRunningSessionIfActive = wtRestoreRunningSessionIfActive;
configureWearWorkoutBridge({
  state: S,
  loadWorkoutDate,
  saveWorkoutDay,
  focusEntry: wtFocusWorkoutEntryCard,
});

// 운동종료 → 확인 모달 → 실제 타이머 정지/저장.
// 실수 방지를 위해 confirm 모달을 먼저 띄우고, 승인 시에만 종료 흐름을 실행.
// 통계성 완료 인사이트는 전체통계의 기간별 운동 분석으로 통합한다.
window.wtEndAndShowInsights = async () => {
  const ok = await confirmAction({
    title: '운동을 종료할까요?',
    message: '타이머가 정지되고 오늘 기록이 저장돼요.\n운동 분석은 통계 탭에서 기간별로 확인할 수 있어요.',
    confirmLabel: '종료',
    cancelLabel: '취소',
  });
  if (!ok) return;
  try {
    const savePromise = wtFinishWorkout();
    if (savePromise && typeof savePromise.then === 'function') {
      await savePromise;
    }
  } catch (e) {
    console.warn('[wtEndAndShowInsights.finish] 저장 실패:', e);
    return;
  }
  if (typeof window.showToast === 'function') {
    window.showToast('운동 기록 저장 완료. 통계 탭에서 기간별로 확인하세요.', 2200, 'success');
  }
};
window.wtRestTimerStart = wtRestTimerStart;
window.wtRestTimerSkip = wtRestTimerSkip;
window.wtRestTimerAdjust = wtRestTimerAdjust;
window.wtRestTimerShowIdle = wtRestTimerShowIdle;
window.wtRestTimerHideIdle = wtRestTimerHideIdle;
window.wtOpenRestPresetSheet = wtOpenRestPresetSheet;
window.wtAddFoodItem = wtAddFoodItem;
window.wtRemoveFoodItem = wtRemoveFoodItem;

// ── 초기화 (모듈 로드 시 이벤트 바인딩) ─────────────────────────
setTimeout(_initRestTimerPresets, 0);
setTimeout(_initRunningEvents, 0);
setTimeout(_initTypeFormEvents, 0);
setTimeout(initRunningSession, 0);
setTimeout(initWearWorkoutBridge, 0);
