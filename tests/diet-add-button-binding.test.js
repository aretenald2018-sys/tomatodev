import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const appJs = readFileSync('app.js', 'utf8');
const featureNutritionJs = readFileSync('feature-nutrition.js', 'utf8');
const modalManagerJs = readFileSync('modal-manager.js', 'utf8');

test('diet add buttons use delegated addFood actions for every meal', () => {
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'];

  for (const meal of meals) {
    const buttonPattern = new RegExp(
      `<button[^>]+class="diet-add-btn"[^>]+data-action="addFood"[^>]+data-meal="${meal}"[^>]*>\\+ 음식 추가</button>`
    );
    assert.match(indexHtml, buttonPattern, `${meal} add button should be delegated`);
  }

  assert.doesNotMatch(
    indexHtml,
    /class="diet-add-btn"[^>]+onclick="openNutritionSearch/,
    'diet add buttons should not depend on inline openNutritionSearch handlers'
  );
});

test('addFood delegated handler opens the nutrition search modal for the selected meal', () => {
  assert.match(appJs, /action === 'addFood'/);
  assert.match(appJs, /await window\.openNutritionSearch\(meal\)/);
  assert.doesNotMatch(
    appJs,
    /action === 'addFood'[\s\S]{0,240}openNutritionItemEditor/,
    'addFood action should not bypass search with the direct item editor'
  );
});

test('nutrition search opener waits for modal injection before touching modal DOM', () => {
  assert.match(featureNutritionJs, /import \{ loadAndInjectModals \} from '\.\/modal-manager\.js';/);
  assert.match(featureNutritionJs, /await loadAndInjectModals\(\);/);
  assert.match(featureNutritionJs, /document\.getElementById\('nutrition-search-input'\)/);
  assert.match(featureNutritionJs, /throw new Error\('nutrition-search-modal is not ready'\)/);

  const loadCallIndex = featureNutritionJs.indexOf('await loadAndInjectModals();');
  const inputReadIndex = featureNutritionJs.indexOf("document.getElementById('nutrition-search-input')");
  assert.ok(loadCallIndex >= 0 && inputReadIndex > loadCallIndex, 'modal injection should happen before input access');
});

test('modal manager shares an in-flight modal injection promise', () => {
  assert.match(modalManagerJs, /let _modalsLoadPromise = null;/);
  assert.match(modalManagerJs, /if \(_modalsLoadPromise\) return _modalsLoadPromise;/);
  assert.match(modalManagerJs, /_modalsLoadPromise = \(async \(\) =>/);
});
