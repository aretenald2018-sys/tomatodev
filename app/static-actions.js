import { registerActions } from '../utils/action-router.js';
import { editSectionTitle, addMiniMemoItem } from '../feature-misc.js';
import { openDietPlanModal } from '../feature-diet-plan.js';
import { openUnitGoalDatePicker } from '../home/unit-goal.js';
import { switchLeaderboardTab } from '../home/hero.js';
import { openFriendManager } from '../home/friend-feed.js';
import { openQuestModal } from '../app-modal-quests.js';
import {
  changeWorkoutDate,
  goToTodayWorkout,
  saveWorkoutDay,
  wtOpenExercisePicker,
  wtOpenRestPresetSheet,
  wtRestTimerAdjust,
  wtRestTimerSkip,
  wtTogglePauseWorkoutTimer,
  wtResetWorkoutTimer,
  wtEndAndShowInsights,
} from '../render-workout.js?v=20260708a-diet-frequent-foods';
import {
  wtSwitchType,
  uploadMealPhoto,
  uploadMealPhotoAI,
  openBulkMealAI,
  toggleBulkMealAIChip,
  runBulkMealAIUpload,
  toggleDietMealRow,
  wtSkipMeal,
} from '../workout-ui.js';
import { loadLazyModule } from './lazy-loader.js';
import { getTabDefinition } from './tab-registry.js';

let registered = false;

function clickInput(id) {
  if (id) document.getElementById(id)?.click();
}

async function openCooking() {
  const config = getTabDefinition('cooking');
  const module = await loadLazyModule(config.id, config.module);
  return module.openCookingModal();
}

export function registerStaticActions() {
  if (registered) return;
  registered = true;
  registerActions({
    'home:open-unit-goal-date': () => openUnitGoalDatePicker(),
    'home:edit-section-title': (_control, _event, key) => editSectionTitle(key),
    'home:add-mini-memo': () => addMiniMemoItem(),
    'home:add-mini-memo-key': (_control, event) => {
      if (event.key === 'Enter') return addMiniMemoItem();
      return undefined;
    },
    'home:open-quest': (_control, _event, period) => openQuestModal(period),
    'home:switch-leaderboard': (control, _event, period) => switchLeaderboardTab(period || control.dataset.period),
    'social:open-friend-manager': () => openFriendManager(),
    'diet:open-plan': () => openDietPlanModal(),
    'workout:switch-type': (control, _event, type) => wtSwitchType(type || control.dataset.type),
    'workout:open-rest-preset': () => wtOpenRestPresetSheet(),
    'workout:adjust-rest': (_control, _event, delta) => wtRestTimerAdjust(Number(delta) || 0),
    'workout:skip-rest': () => wtRestTimerSkip(),
    'workout:toggle-pause': () => wtTogglePauseWorkoutTimer(),
    'workout:reset-timer': () => wtResetWorkoutTimer(),
    'workout:finish': () => wtEndAndShowInsights(),
    'workout:open-picker': () => wtOpenExercisePicker(),
    'workout:click-input': (_control, event, id) => { event.stopPropagation(); clickInput(id); },
    'workout:upload-photo': (control, _event, meal) => uploadMealPhoto(meal, control),
    'workout:save': () => saveWorkoutDay(),
    'workout:change-date': (_control, _event, delta) => changeWorkoutDate(Number(delta) || 0),
    'workout:today': () => goToTodayWorkout(),
    'diet:submit-setup': () => window.submitDietSetup?.(),
    'diet:toggle-row': (control) => toggleDietMealRow(control),
    'diet:click-input': (_control, event, id) => { event.stopPropagation(); clickInput(id); },
    'diet:skip-meal': (_control, _event, meal) => wtSkipMeal(meal),
    'diet:upload-photo': (control, _event, meal) => uploadMealPhoto(meal, control),
    'diet:upload-photo-ai': (control, _event, meal) => uploadMealPhotoAI(meal, control),
    'diet:open-bulk-ai': () => openBulkMealAI(),
    'diet:toggle-bulk-chip': (control) => toggleBulkMealAIChip(control),
    'diet:run-bulk-upload': (control) => runBulkMealAIUpload(control),
    'cooking:open': () => openCooking(),
  });
}
