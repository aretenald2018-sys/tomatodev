export const APP_COMPATIBILITY_KEYS = Object.freeze([
  '_openModal', '_closeModal', '_getCurrentTab',
  'wtOpenWorkoutDaySheet', 'wtHandleWorkoutBack',
  'renderAll', '__startTomatoUserSession', 'renderHome', 'switchTab', 'showToast',
  'getDietRec', 'getWorkoutRec',
  'openWorkoutTab', 'openSheet', 'changeWorkoutDate', 'goToTodayWorkout', 'saveWorkoutDay', '_wtExports',
  'openCookingModal', 'closeCookingModal', 'saveCookingFromModal', 'deleteCookingFromModal', 'onCookingPhotoInput',
  'openGoalModal', 'closeGoalModal', 'saveGoalFromModal', 'deleteGoalItem', 'analyzeGoalFeasibility', 'toggleGoalCondition',
  'openQuestModal', 'closeQuestModal', 'saveQuestFromModal', 'openQuestEditModal', 'closeQuestEditModal',
  'saveQuestEdit', 'deleteQuestItem', 'toggleQuestCheck', 'onQuestAutoChange',
]);

export function installAppCompatibilityBridge(actions) {
  const source = actions || {};
  const unknown = Object.keys(source).filter((key) => !APP_COMPATIBILITY_KEYS.includes(key));
  if (unknown.length) throw new Error(`Unknown app compatibility keys: ${unknown.join(', ')}`);
  for (const key of APP_COMPATIBILITY_KEYS) {
    if (source[key] !== undefined) window[key] = source[key];
  }
}
