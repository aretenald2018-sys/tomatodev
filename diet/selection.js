let _searchMeal = null;

export function setNutritionSearchMeal(meal) {
  _searchMeal = meal || null;
  return _searchMeal;
}

export function getNutritionSearchMeal() {
  return _searchMeal;
}

export function clearNutritionSearchMeal() {
  _searchMeal = null;
}
