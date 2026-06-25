// ================================================================
// render-workout.js — 심(shim): workout/ 디렉토리로 분할됨
// ================================================================
export {
  loadWorkoutDate, changeWorkoutDate, goToTodayWorkout,
  saveWorkoutDay,
  renderCalorieTracker, _renderMealPhotos, openNutritionPhotoUpload,
  wtAddFoodItem, wtRemoveFoodItem,
  wtToggleWineFree, wtToggleMealSkipped,
  wtAddSet, wtRemoveSet, wtUpdateSet,
  wtToggleSetDone, wtUpdateSetType, wtMoveSet,
  wtRemoveExerciseEntry,
  renderWorkoutExerciseDetail, clearWorkoutExerciseDetail,
  wtOpenExercisePicker, wtCloseExercisePicker,
  wtOpenExerciseEditor, wtCloseExerciseEditor,
  wtSaveExerciseFromEditor, wtDeleteExerciseFromEditor,
  wtStartWorkoutTimer, wtPauseWorkoutTimer,
  wtResetWorkoutTimer, wtTogglePauseWorkoutTimer,
  wtFinishWorkout, wtRecoverTimers,
  wtRestTimerStart, wtRestTimerSkip, wtRestTimerAdjust,
  wtRestTimerShowIdle, wtRestTimerHideIdle,
  wtOpenRestPresetSheet,
  tm2RenderEntry,
} from './workout/index.js?v=20260625z44-workout-nav-stack';
