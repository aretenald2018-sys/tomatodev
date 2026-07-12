import {
  normalizeFromCsv,
  normalizeFromLocalDB,
  normalizeFromTopLevel,
  serializeForStorage,
} from '../data/nutrition-normalize.js';

export function toCanonicalNutritionItem(item) {
  if (!item) return null;
  if (item.base?.type && Array.isArray(item.servings) && item.servings.length) return item;
  if (item.energy != null && item.nutrition == null) return normalizeFromCsv(item);
  if (item.nutrition == null && (item.kcal != null || item.protein != null || item.carbs != null)) {
    return normalizeFromTopLevel(item);
  }
  return normalizeFromLocalDB(item);
}

export function canonicalNutritionDisplay(item) {
  const canonical = toCanonicalNutritionItem(item);
  if (!canonical) return null;
  const serving = canonical.servings.find(option => option.id === canonical.defaultServingId)
    || canonical.servings[0]
    || { grams: canonical.base?.grams || canonical.base?.ml || 100, label: canonical.base?.label || '100g' };
  const baseAmount = canonical.base?.type === 'per_100ml'
    ? (Number(canonical.base.ml) || 100)
    : (Number(canonical.base?.grams) || 100);
  const ratio = baseAmount > 0 ? (Number(serving.grams) || baseAmount) / baseAmount : 1;
  const nutrition = Object.fromEntries(
    ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']
      .map(key => [key, Math.round((Number(canonical.nutrition?.[key]) || 0) * ratio * 10) / 10]),
  );
  return { canonical, serving, nutrition };
}

export function serializeCanonicalNutritionItem(item, extras = {}) {
  return serializeForStorage(toCanonicalNutritionItem(item), extras);
}
