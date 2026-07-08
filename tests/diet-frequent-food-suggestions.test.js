import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const renderJs = readFileSync('workout/render.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');

test('breakfast lunch and dinner have frequent food chip containers instead of visible memo inputs', () => {
  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    assert.match(indexHtml, new RegExp(`id="wt-frequent-${meal}"`), `${meal} should have a frequent food container`);
    assert.match(indexHtml, new RegExp(`<input(?=[^>]*id="wt-meal-${meal}")(?=[^>]*diet-meal-input-hidden)[^>]*>`), `${meal} memo input should stay in DOM but be hidden`);
  }

  assert.doesNotMatch(indexHtml, /id="wt-frequent-snack"/, 'snack should not get frequent food suggestions in this slice');
  assert.doesNotMatch(indexHtml, /<input(?=[^>]*id="wt-meal-snack")(?=[^>]*diet-meal-input-hidden)[^>]*>/, 'snack memo input should remain visible');
});

test('frequent food suggestions are rendered from cached meal history and add through a dedicated action', () => {
  assert.match(renderJs, /getCache/, 'suggestions should read from the existing workout cache');
  assert.match(renderJs, /export function wtAddFrequentFoodSuggestion/, 'chip click should have an exported add function');
  assert.match(renderJs, /data-action="addFrequentFood"/, 'rendered chips should use the delegated add action');
  assert.match(renderJs, /breakfastSkipped|lunchSkipped|dinnerSkipped/, 'adding a chip should clear skipped meal state');
  assert.match(styleCss, /\.diet-frequent-foods/, 'frequent chip container should have explicit styles');
  assert.match(styleCss, /\.diet-frequent-food-btn/, 'frequent food buttons should have explicit styles');
});
