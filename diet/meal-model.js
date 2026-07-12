export const MEAL_CONFIG = Object.freeze({
  breakfast: { key: 'bFoods', prefix: 'b', skipKey: 'breakfastSkipped' },
  lunch: { key: 'lFoods', prefix: 'l', skipKey: 'lunchSkipped' },
  dinner: { key: 'dFoods', prefix: 'd', skipKey: 'dinnerSkipped' },
  snack: { key: 'sFoods', prefix: 's', skipKey: null },
});

export function mealConfig(meal) {
  return MEAL_CONFIG[meal] || MEAL_CONFIG.snack;
}

export function foodAmountLabel(food = {}) {
  const grams = Number(food?.grams);
  if (Number.isFinite(grams) && grams > 0) return `${Math.round(grams)}g`;
  return String(food?.servingRef?.label || food?.unit || food?.base?.label || '').trim();
}

export function foodGroupKey(food = {}) {
  const name = String(food.name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
  const amount = foodAmountLabel(food).toLocaleLowerCase('ko-KR');
  return `${name}|${amount}`;
}

export function foodMergeKey(food = {}) {
  const id = String(food?.recipeId || food?.id || '').trim();
  if (id) return `id:${id}`;
  const name = String(food?.name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
  return name ? `name:${name}|source:${String(food?.source || '').trim().toLocaleLowerCase('ko-KR')}` : '';
}

function _number(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function mergeFoodItem(existing = {}, incoming = {}) {
  const merged = { ...existing };
  for (const key of ['grams', 'kcal', 'protein', 'carbs', 'fat']) {
    const precision = key === 'kcal' ? 100 : 10;
    merged[key] = Math.round((_number(existing[key]) + _number(incoming[key])) * precision) / precision;
  }
  if (existing?.source !== 'ai' && incoming?.source === 'ai') merged.source = 'ai';
  return merged;
}

export function cloneFoodItem(food = {}) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(food);
  } catch {}
  return JSON.parse(JSON.stringify(food));
}

export function mealMacros(foods = []) {
  const sum = key => foods.reduce((total, food) => total + _number(food?.[key]), 0);
  return {
    kcal: Math.round(sum('kcal')),
    protein: Math.round(sum('protein') * 10) / 10,
    carbs: Math.round(sum('carbs') * 10) / 10,
    fat: Math.round(sum('fat') * 10) / 10,
  };
}

export function syncMealMacros(diet, meal) {
  const config = mealConfig(meal);
  const foods = Array.isArray(diet?.[config.key]) ? diet[config.key] : [];
  const macros = mealMacros(foods);
  diet[`${config.prefix}Kcal`] = macros.kcal;
  diet[`${config.prefix}Protein`] = macros.protein;
  diet[`${config.prefix}Carbs`] = macros.carbs;
  diet[`${config.prefix}Fat`] = macros.fat;
  diet[`${config.prefix}Ok`] = foods.length ? true : null;
  diet[`${config.prefix}Reason`] = foods.length
    ? `DB: ${macros.kcal}kcal (단${Math.round(macros.protein)}g 탄${Math.round(macros.carbs)}g 지${Math.round(macros.fat)}g)`
    : '';
  return macros;
}

export function addFoodToMeal(diet, meal, item) {
  const config = mealConfig(meal);
  const foods = [...(Array.isArray(diet?.[config.key]) ? diet[config.key] : [])];
  const key = foodMergeKey(item);
  const existingIndex = key ? foods.findIndex(food => foodMergeKey(food) === key) : -1;
  if (existingIndex >= 0) foods[existingIndex] = mergeFoodItem(foods[existingIndex], item);
  else foods.push(cloneFoodItem(item));
  diet[config.key] = foods;
  if (config.skipKey) diet[config.skipKey] = false;
  const macros = syncMealMacros(diet, meal);
  return { meal, item: foods[existingIndex >= 0 ? existingIndex : foods.length - 1], merged: existingIndex >= 0, macros };
}

export function removeFoodFromMeal(diet, meal, index) {
  const config = mealConfig(meal);
  const foods = Array.isArray(diet?.[config.key]) ? diet[config.key] : [];
  const target = Math.max(0, Math.floor(Number(index) || 0));
  const removed = foods[target] || null;
  if (!removed) return { meal, index: target, removed: null, changed: false };
  diet[config.key] = foods.filter((_, itemIndex) => itemIndex !== target);
  const macros = syncMealMacros(diet, meal);
  return { meal, index: target, removed, changed: true, macros };
}

export function restoreFoodToMeal(diet, meal, index, item) {
  const config = mealConfig(meal);
  const foods = [...(Array.isArray(diet?.[config.key]) ? diet[config.key] : [])];
  const target = Math.min(Math.max(0, Math.floor(Number(index) || 0)), foods.length);
  foods.splice(target, 0, cloneFoodItem(item));
  diet[config.key] = foods;
  const macros = syncMealMacros(diet, meal);
  return { meal, index: target, item, changed: true, macros };
}
