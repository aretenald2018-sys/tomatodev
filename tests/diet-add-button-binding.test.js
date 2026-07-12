import { readAppCssSync } from './helpers/css-source.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const staticActionsJs = readFileSync('app/static-actions.js', 'utf8');
const workoutUiJs = readFileSync('workout-ui.js', 'utf8');
const styleCss = readAppCssSync();

class FakeElement {
  constructor({ dataset = {}, dietGrid = null } = {}) {
    this.dataset = dataset;
    this.listeners = new Map();
    this.dietGrid = dietGrid;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  closest(selector) {
    if (selector === '[data-action]' && this.dataset.action) return this;
    if (selector === '[data-meal]' && this.dataset.meal) return this;
    if (selector === '.diet-grid') return this.dietGrid;
    return null;
  }
}

function createDietHarness() {
  const calls = [];
  const dietGrid = new FakeElement();
  const listeners = new Map();
  const document = {
    documentElement: { dataset: {} },
    addEventListener(type, handler, capture) {
      listeners.set(type, { handler, capture });
    },
  };
  const window = {
    wtAddFrequentFoodSuggestion(meal, key) {
      calls.push(`frequent:${meal}:${key}`);
    },
    wtSkipMeal(meal) {
      calls.push(`skip:${meal}`);
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
    wtSkipMeal: window.wtSkipMeal,
    openNutritionSearch: async meal => calls.push(`search:${meal}`),
    showToast: message => calls.push(`toast:${message}`),
  }, { filename: 'app.js' });
  return { calls, dietGrid, document, listeners, window };
}

function createMealSkipHarness() {
  let active = false;
  const calls = [];
  const button = {
    classList: {
      contains(name) { return name === 'active' && active; },
    },
  };
  const foodList = { innerHTML: 'existing food' };
  const mealInput = { value: 'existing memo' };
  const document = {
    getElementById(id) {
      if (id === 'wt-breakfast-skipped') return button;
      if (id === 'wt-foods-breakfast') return foodList;
      if (id === 'wt-meal-breakfast') return mealInput;
      return null;
    },
  };
  const start = workoutUiJs.indexOf('const _mealSkipDispatches = new Set();');
  const end = workoutUiJs.indexOf('\n};', start) + 3;
  assert.ok(start >= 0 && end > start, 'meal skip function should be extractable');
  const runnable = `${workoutUiJs.slice(start, end)}`
    .replace('export function wtSkipMeal', 'function wtSkipMeal')
    + '\nglobalThis.__wtSkipMeal = wtSkipMeal;';
  const context = {
    document,
    Promise,
    wtToggleMealSkipped() {
      calls.push('toggle');
      active = !active;
    },
  };
  vm.runInNewContext(runnable, context, { filename: 'workout-ui.js' });
  return { calls, run: context.__wtSkipMeal, getActive: () => active, foodList, mealInput };
}

async function clickDietAction(harness, dataset, { dietGrid = new FakeElement() } = {}) {
  const binding = harness.listeners.get('click');
  assert.equal(typeof binding?.handler, 'function', 'document diet click handler should be bound');
  const event = {
    target: new FakeElement({ dataset, dietGrid }),
    prevented: 0,
    immediatelyStopped: 0,
    stopped: 0,
    preventDefault() { this.prevented += 1; },
    stopImmediatePropagation() { this.immediatelyStopped += 1; },
    stopPropagation() { this.stopped += 1; },
  };
  await binding.handler(event);
  return event;
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

test('document-captured diet actions survive a replaced diet grid and leave unrelated namespaced actions for the global router', async () => {
  const harness = createDietHarness();
  harness.window.__initDietInputButtons();
  harness.window.__initDietInputButtons();
  assert.equal(harness.listeners.size, 1, 'diet action listener should bind once on the stable document');
  assert.equal(harness.listeners.get('click').capture, true, 'diet action listener should run before document-level action routing');

  const skipEvent = await clickDietAction(
    harness,
    { action: 'diet:skip-meal', actionArg: 'breakfast' },
    { dietGrid: new FakeElement() }
  );
  assert.deepEqual(harness.calls, ['skip:breakfast']);
  assert.equal(skipEvent.prevented, 1);
  assert.equal(skipEvent.immediatelyStopped, 1);
  assert.equal(skipEvent.stopped, 1);

  const event = await clickDietAction(harness, { action: 'diet:toggle-row', meal: 'breakfast' });

  assert.deepEqual(harness.calls, ['skip:breakfast']);
  assert.equal(event.prevented, 0);
  assert.equal(event.immediatelyStopped, 0);
  assert.equal(event.stopped, 0);

  assert.doesNotMatch(
    staticActionsJs,
    /^\s*'diet:skip-meal':/m,
    'meal skip must have one owner: the diet grid handler'
  );
  assert.match(
    workoutUiJs,
    /const _mealSkipDispatches = new Set\(\);[\s\S]*?if \(_mealSkipDispatches\.has\(meal\)\) return;[\s\S]*?Promise\.resolve\(\)\.then\(\(\) => _mealSkipDispatches\.delete\(meal\)\);/,
    'same-turn duplicate delivery must be ignored while later meal taps still toggle'
  );
});

test('meal skip treats duplicate delivery from one click as one toggle', async () => {
  const harness = createMealSkipHarness();

  harness.run('breakfast');
  harness.run('breakfast');
  assert.deepEqual(harness.calls, ['toggle']);
  assert.equal(harness.getActive(), true);
  assert.equal(harness.foodList.innerHTML, '');
  assert.equal(harness.mealInput.value, '');

  await Promise.resolve();
  harness.run('breakfast');
  assert.deepEqual(harness.calls, ['toggle', 'toggle']);
  assert.equal(harness.getActive(), false, 'a later deliberate tap should still unskip the meal');
});
