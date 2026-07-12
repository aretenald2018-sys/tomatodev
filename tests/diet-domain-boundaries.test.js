import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  addFoodToMeal,
  removeFoodFromMeal,
  restoreFoodToMeal,
} from '../diet/meal-model.js';
import { canonicalNutritionDisplay, serializeCanonicalNutritionItem, toCanonicalNutritionItem } from '../diet/nutrition-item.js';
import { applyDietEstimateCorrections, DIET_ESTIMATE_STATUS, runDietPhotoEstimatePipeline } from '../diet/photo-estimate-pipeline.js';
import { getDietPhoto, replaceDietPhotos, setDietPhoto } from '../diet/photo-store.js';

test('meal model merges, removes, restores, and recalculates macros without DOM', () => {
  const diet = { bFoods: [] };
  addFoodToMeal(diet, 'breakfast', { id: 'egg', name: '달걀', grams: 50, kcal: 75, protein: 6, carbs: 1, fat: 5 });
  const merged = addFoodToMeal(diet, 'breakfast', { id: 'egg', name: '달걀', grams: 50, kcal: 75, protein: 6, carbs: 1, fat: 5 });
  assert.equal(merged.merged, true);
  assert.equal(diet.bFoods.length, 1);
  assert.equal(diet.bFoods[0].grams, 100);
  assert.equal(diet.bKcal, 150);
  assert.equal(diet.bProtein, 12);

  const removed = removeFoodFromMeal(diet, 'breakfast', 0);
  assert.equal(diet.bFoods.length, 0);
  assert.equal(diet.bOk, null);
  assert.equal(diet.bKcal, 0);
  restoreFoodToMeal(diet, 'breakfast', 0, removed.removed);
  assert.equal(diet.bFoods.length, 1);
  assert.equal(diet.bKcal, 150);
});

test('canonical nutrition adapter preserves g, ml, serving, and legacy round trips', () => {
  const fixtures = [
    { id: 'solid', name: '현미', unit: '100g', servingSize: 100, servingUnit: 'g', nutrition: { kcal: 350, protein: 8, carbs: 75, fat: 3 } },
    { id: 'liquid', name: '우유', unit: '100ml', servingSize: 100, servingUnit: 'ml', nutrition: { kcal: 60, protein: 3, carbs: 5, fat: 3 } },
    { id: 'serving', name: '에너지바', unit: '1개', servingSize: 1, servingUnit: 'count', nutrition: { kcal: 210, protein: 10, carbs: 24, fat: 8 } },
  ];
  for (const fixture of fixtures) {
    const canonical = toCanonicalNutritionItem(fixture);
    const display = canonicalNutritionDisplay(canonical);
    const stored = serializeCanonicalNutritionItem(canonical);
    const reloaded = toCanonicalNutritionItem(stored);
    assert.ok(canonical.base?.type);
    assert.ok(display.serving?.label);
    assert.equal(reloaded.nutrition.kcal, canonical.nutrition.kcal);
    assert.equal(reloaded.base.type, canonical.base.type);
  }
});

test('photo estimate pipeline makes every stage and low confidence explicit', async () => {
  const result = await runDietPhotoEstimatePipeline('base64', {
    estimate: async () => ({ confidence: 0.4, detectedItems: [{ name: '접시' }, { name: '비빔밥' }] }),
    filterArtifacts: estimate => ({ ...estimate, detectedItems: estimate.detectedItems.filter(item => item.name !== '접시') }),
    normalize: estimate => ({ ...estimate, detectedItems: estimate.detectedItems.map(item => ({ ...item, name: item.name.trim() })) }),
    applyPrior: estimate => ({ ...estimate, priorApplied: true }),
    applyPortionGuard: estimate => ({ ...estimate, guardApplied: true }),
  });
  assert.deepEqual(result.pipeline, ['estimate', 'artifact-filter', 'normalize', 'prior', 'portion-guard']);
  assert.equal(result.detectedItems.length, 1);
  assert.equal(result.status, DIET_ESTIMATE_STATUS.LOW_CONFIDENCE);

  const corrected = applyDietEstimateCorrections(result, { portion: 'half', excludedNames: ['비빔밥'] }, {
    scalePortion: estimate => ({ ...estimate, scaled: true }),
    excludeItems: (estimate, predicate) => ({ ...estimate, detectedItems: estimate.detectedItems.filter(item => !predicate(item)) }),
  });
  assert.equal(corrected.scaled, true);
  assert.equal(corrected.detectedItems.length, 0);
  assert.equal(corrected.userCorrected, true);
});

test('diet photo store replaces day photos without leaking the previous day', () => {
  replaceDietPhotos({ breakfast: 'a', workout: 'w' });
  assert.equal(getDietPhoto('breakfast'), 'a');
  setDietPhoto('lunch', 'b');
  replaceDietPhotos({ dinner: 'c' });
  assert.equal(getDietPhoto('breakfast'), null);
  assert.equal(getDietPhoto('lunch'), null);
  assert.equal(getDietPhoto('dinner'), 'c');
});

test('nutrition views use diet APIs instead of importing the workout renderer', async () => {
  const [feature, weightModal, cooking, renderer, aiEstimate] = await Promise.all([
    readFile(new URL('../feature-nutrition.js', import.meta.url), 'utf8'),
    readFile(new URL('../modals/nutrition-weight-modal.js', import.meta.url), 'utf8'),
    readFile(new URL('../render-cooking.js', import.meta.url), 'utf8'),
    readFile(new URL('../workout/render.js', import.meta.url), 'utf8'),
    readFile(new URL('../workout/ai-estimate.js', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(feature, /render-workout\.js/);
  assert.doesNotMatch(weightModal, /render-workout\.js/);
  assert.match(feature, /canonicalNutritionDisplay/);
  assert.match(cooking, /setNutritionItemSavedHandler/);
  assert.match(renderer, /addMealFood/);
  assert.match(aiEstimate, /runDietPhotoEstimatePipeline/);
});
