import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { addFoodToMeal } from '../diet/meal-model.js';

const renderJs = readFileSync(new URL('../workout/render.js', import.meta.url), 'utf8');

test('adding the same food again updates one consumed food chip', () => {
  const diet = { bFoods: [] };
  const item = { id: 'food-rice', name: '현미밥', grams: 100, kcal: 150, protein: 3.2, carbs: 32.4, fat: 1.1, source: 'manual' };

  addFoodToMeal(diet, 'breakfast', item);
  addFoodToMeal(diet, 'breakfast', { ...item });

  assert.equal(diet.bFoods.length, 1);
  assert.equal(diet.bFoods[0].grams, 200);
  assert.equal(diet.bFoods[0].kcal, 300);
  assert.equal(diet.bFoods[0].protein, 6.4);
  assert.equal(diet.bFoods[0].carbs, 64.8);
  assert.equal(diet.bFoods[0].fat, 2.2);
  assert.equal(diet.bKcal, 300);
  assert.match(renderJs, /class="meal-food-chip"/);
  assert.match(renderJs, /addMealFood\(meal, item\)/);
  assert.match(renderJs, /diet:meal-changed/);
});
