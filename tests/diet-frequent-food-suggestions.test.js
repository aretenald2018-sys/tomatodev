import { readAppCssSync } from './helpers/css-source.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const renderJs = readFileSync('workout/render.js', 'utf8');
const styleCss = readAppCssSync();
const navigationJs = readFileSync('navigation.js', 'utf8');

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
  assert.match(renderJs, /data-action="diet:add-frequent-food"/, 'rendered options should use the namespaced delegated add action');
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

test('frequent and recent suggestions persist after adding, support ten entries, and render as carousels', () => {
  assert.match(renderJs, /const _FREQUENT_SUGGESTION_LIMIT = 10/, 'frequent suggestions should support ten entries');
  assert.match(renderJs, /const _RECENT_SUGGESTION_LIMIT = 10/, 'recent suggestions should support ten entries');
  assert.match(renderJs, /\.slice\(0, _FREQUENT_SUGGESTION_LIMIT\)/, 'frequent suggestions should use the shared ten-entry cap');
  assert.match(renderJs, /\.slice\(0, _RECENT_SUGGESTION_LIMIT\)/, 'recent suggestions should use the shared ten-entry cap');
  assert.doesNotMatch(renderJs, /currentGroups\.has\(groupKey\)/, 'suggestions must not disappear after the same food is added to the current meal');
  assert.match(renderJs, /function _collectRecentFoodSuggestions\(meal, excludedGroupKeys = new Set\(\)\)/, 'recent suggestions should have a dedicated collector');
  assert.match(renderJs, /excludedGroupKeys\.has\(groupKey\)/, 'recent suggestions should exclude frequent row group keys');
  assert.match(renderJs, /최근에 먹은 것/, 'recent suggestions should render with a visible section label');
  assert.match(renderJs, /diet-frequent-food-carousel/, 'both suggestion lists should render as horizontal carousels');
  assert.match(renderJs, /data-swipe-nav-lock/, 'food suggestion carousels should not trigger global tab swipes');
  assert.match(navigationJs, /function isSwipeNavigationLocked\(target = null\)/, 'global swipe navigation should have a carousel lock guard');
  assert.match(navigationJs, /data-swipe-nav-lock[\s\S]*diet-frequent-food-carousel[\s\S]*diet-frequent-food-options/, 'diet carousels should be excluded from tab swipe navigation');
  assert.match(styleCss, /\.diet-frequent-food-options {[^}]*overflow-x: auto/, 'suggestion rows should scroll horizontally');
  assert.match(styleCss, /\.diet-frequent-food-option {[^}]*flex: 0 0 min\(132px, 34vw\)/, 'each carousel entry should keep a readable fixed card width');
  assert.match(styleCss, /#tab-diet \.diet-frequent-food-option {[^}]*font-size: var\(--seed-t1\)/, 'suggestion option font should be smaller than the previous compact text style');
});
