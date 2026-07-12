export const HOME_CARD_IDS = Object.freeze({
  unit_goal: 'card-unit-goal',
  mini_memo: 'card-mini-memo',
  goals: 'card-goals',
  quests: 'card-quests',
  diet_goal: 'card-diet-goal',
  tomato_basket: 'card-tomato-basket',
});

export function homeCardVisibility(shouldShowCard) {
  const predicate = typeof shouldShowCard === 'function' ? shouldShowCard : () => true;
  return Object.entries(HOME_CARD_IDS).map(([key, id]) => ({
    key,
    id,
    visible: Boolean(predicate(key)),
  }));
}

export function cheerSignature(cheers = []) {
  return cheers.map(cheer => cheer?.id || `${cheer?.from || ''}_${cheer?.createdAt || ''}`).join('|');
}

export function hasPriorityHomeOverlay(root = globalThis.document) {
  if (!root) return false;
  return Boolean(root.getElementById?.('tutorial-overlay') || root.querySelector?.('#dynamic-modal .wb-overlay'));
}
