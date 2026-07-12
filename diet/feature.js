import { S } from '../workout/state.js';
import { _autoSaveDiet } from '../workout/save.js';
import {
  addFoodToMeal,
  mealConfig,
  removeFoodFromMeal,
  restoreFoodToMeal,
  syncMealMacros,
} from './meal-model.js';

function _emitMealChanged(detail) {
  if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
  document.dispatchEvent(new CustomEvent('diet:meal-changed', { detail }));
}

function _persist(meal) {
  return Promise.resolve(_autoSaveDiet({ meal })).catch(error => {
    console.error('[diet/feature] auto save failed:', error);
    throw error;
  });
}

export function getMealFoods(meal) {
  const { key } = mealConfig(meal);
  return Array.isArray(S.diet[key]) ? S.diet[key] : [];
}

export function recalculateMeal(meal) {
  return syncMealMacros(S.diet, meal);
}

export function addMealFood(meal, item, options = {}) {
  const result = addFoodToMeal(S.diet, meal, item);
  _emitMealChanged({ type: 'add', ...result });
  if (options.persist !== false) void _persist(meal);
  return result;
}

export function removeMealFood(meal, index, options = {}) {
  const result = removeFoodFromMeal(S.diet, meal, index);
  if (!result.changed) return result;
  _emitMealChanged({ type: 'remove', ...result });
  if (options.persist !== false) void _persist(meal);
  return result;
}

export function restoreMealFood(meal, index, item, options = {}) {
  const result = restoreFoodToMeal(S.diet, meal, index, item);
  _emitMealChanged({ type: 'restore', ...result });
  if (options.persist !== false) void _persist(meal);
  return result;
}
