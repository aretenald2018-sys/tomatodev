import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const renderJs = readFileSync('workout/render.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');

test('breakfast lunch and dinner have frequent food chip containers instead of visible memo inputs', () => {
  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    assert.match(indexHtml, new RegExp(`id=\"wt-frequent-${meal}\"`), `${meal} should have a frequent food container`);
    assert.match(indexHtml, new RegExp(`<input(?=[^>]*id=\"wt-meal-${meal}\")(?=[^>]*diet-meal-input-hidden)[^>]*>`), `${meal} memo input should stay in DOM but be hidden`);
  }

  assert.doesNotMatch(indexHtml, /id=\"wt-frequent-snack\"/, 'snack should not get frequent food suggestions in this slice');
  assert.doesNotMatch(indexHtml, /<input(?=[^>]*id=\"wt-meal-snack\")(?=[^>]*diet-meal-input-hidden)[^>]*>/, 'snack memo input should remain visible');
});

test('frequent food suggestions are rendered from cached meal history and add through a dedicated action', () => {
  assert.match(renderJs, /getCache/, 'suggestions should read from the existing workout cache');
  assert.match(renderJs, /export function wtAddFrequentFoodSuggestion/, 'chip click should have an exported add function');
  assert.match(renderJs, /data-action=.*addFrequentFood/, 'rendered options should use the delegated add action');
  assert.match(renderJs, /diet-frequent-food-card/, 'suggestions should render as one wide recommendation group');
  assert.match(renderJs, /이때 자주 먹었던 것/, 'recommendation group should explain that these are frequent past foods');
  assert.match(renderJs, /diet-frequent-food-option/, 'individual suggestions should be inline text options, not separate chips');
  assert.match(renderJs, /diet-frequent-food-add/, 'each inline suggestion should expose a plus affordance');
  assert.match(renderJs, /breakfastSkipped|lunchSkipped|dinnerSkipped/, 'adding an option should clear skipped meal state');
  assert.match(styleCss, /.diet-frequent-foods/, 'frequent chip container should have explicit styles');
  assert.match(styleCss, /.diet-frequent-food-card/, 'frequent food group should have explicit card styles');
  assert.match(styleCss, /.diet-frequent-food-option/, 'frequent food options should have text-button styles');
  assert.match(styleCss, /#tab-diet .meal-food-chip-name {[^}]*font-weight: 700/, 'actual consumed food chips should read stronger than recommendations');
  assert.match(styleCss, /#tab-diet .diet-frequent-food-option {[^}]*font-weight: 500/, 'recommendation options should not be bold like consumed chips');
});
