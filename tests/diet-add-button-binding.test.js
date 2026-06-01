import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const appJs = readFileSync('app.js', 'utf8');

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
