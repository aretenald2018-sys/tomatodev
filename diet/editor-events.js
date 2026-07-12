let _savedHandler = null;

export function setNutritionItemSavedHandler(handler) {
  _savedHandler = typeof handler === 'function' ? handler : null;
}

export function notifyNutritionItemSaved(item) {
  const handler = _savedHandler;
  _savedHandler = null;
  handler?.(item);
  if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('nutrition:item-saved', { detail: { item } }));
  }
}
