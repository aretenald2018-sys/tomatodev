import { readAppCssSync } from './helpers/css-source.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const styleCss = readAppCssSync();

class FakeElement {
  constructor({ dataset = {} } = {}) {
    this.dataset = dataset;
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  closest(selector) {
    if (selector === '[data-action]' && this.dataset.action) return this;
    if (selector === '[data-meal]' && this.dataset.meal) return this;
    return null;
  }
}

function createDietHarness() {
  const calls = [];
  const dietGrid = new FakeElement();
  const document = {
    querySelector(selector) {
      return selector === '.diet-grid' ? dietGrid : null;
    },
  };
  const window = {
    wtAddFrequentFoodSuggestion(meal, key) {
      calls.push(`frequent:${meal}:${key}`);
    },
  };
  const start = appJs.indexOf('function _initDietInputButtons()');
  const end = appJs.indexOf('_bindLifeZoneNpcQuestEvent();', start);
  assert.ok(start >= 0 && end > start, 'diet add handler should be extractable');
  const runnable = `${appJs.slice(start, end)}\nwindow.__initDietInputButtons = _initDietInputButtons;`;
  vm.runInNewContext(runnable, {
    window,
    document,
    console,
    wtAddFrequentFoodSuggestion: window.wtAddFrequentFoodSuggestion,
    openNutritionSearch: async meal => calls.push(`search:${meal}`),
    showToast: message => calls.push(`toast:${message}`),
  }, { filename: 'app.js' });
  return { calls, dietGrid, window };
}

async function clickDietAction(harness, dataset) {
  const handler = harness.dietGrid.listeners.get('click');
  assert.equal(typeof handler, 'function', 'diet grid click handler should be bound');
  await handler({
    target: new FakeElement({ dataset }),
    preventDefault() {},
    stopPropagation() {},
  });
}

test('all meal add buttons open the search UI directly through delegated clicks', async () => {
  const harness = createDietHarness();
  harness.window.__initDietInputButtons();

  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    await clickDietAction(harness, { action: 'addFood', meal });
  }

  assert.deepEqual(harness.calls, [
    'search:breakfast',
    'search:lunch',
    'search:dinner',
    'search:snack',
  ]);
  assert.equal((indexHtml.match(/data-action="addFood"/g) || []).length, 4, 'all four meal buttons should use the direct search action');
});

test('the retired quick-choice sheet and its crossed-out actions are not shipped', () => {
  assert.doesNotMatch(appJs, /openMealQuickAdd|meal-quick-add|AI 사진 분석|사진만 첨부/, 'quick-choice actions should be removed from the diet add flow');
  assert.doesNotMatch(styleCss, /meal-quick-add/, 'unused quick-choice sheet styles should be removed');
  assert.doesNotMatch(indexHtml, /openMealQuickAdd/, 'meal buttons should not point at the retired action');
});

test('frequent food cards continue to use the diet grid delegated handler', async () => {
  const harness = createDietHarness();
  harness.window.__initDietInputButtons();

  await clickDietAction(harness, {
    action: 'addFrequentFood',
    meal: 'lunch',
    suggestionKey: 'lunch-rice-120',
  });

  assert.deepEqual(harness.calls, ['frequent:lunch:lunch-rice-120']);
});
