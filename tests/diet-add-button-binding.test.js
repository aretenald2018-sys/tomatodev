import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');

class FakeElement {
  constructor({ kind = 'generic', dataset = {}, documentRef = null } = {}) {
    this.kind = kind;
    this.dataset = dataset;
    this.documentRef = documentRef;
    this.listeners = new Map();
    this.clickCount = 0;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  remove() {
    if (this.documentRef?.quickAdd === this) {
      this.documentRef.quickAdd = null;
    }
  }

  click() {
    this.clickCount += 1;
  }

  closest(selector) {
    if (selector === '[data-action]' && this.dataset.action) return this;
    if (selector === '[data-meal]' && this.dataset.meal) return this;
    if (selector === '[data-meal-quick-action]' && this.dataset.mealQuickAction) return this;
    if (selector === '[data-meal-quick-close]' && this.kind === 'close') return this;
    return null;
  }

  getAttribute(name) {
    if (name === 'data-meal-quick-action') return this.dataset.mealQuickAction || null;
    if (name === 'data-meal') return this.dataset.meal || null;
    return null;
  }
}

function actionNamesFromHtml(html) {
  return [...html.matchAll(/data-meal-quick-action="([^"]+)"/g)].map(match => match[1]);
}

function createDietHarness() {
  const calls = [];
  const documentRef = {
    quickAdd: null,
    inputs: new Map(),
    dietGrid: new FakeElement({ kind: 'diet-grid' }),
  };
  const body = new FakeElement({ kind: 'body', documentRef });
  body.insertAdjacentHTML = (_position, html) => {
    const meal = html.match(/data-meal="([^"]+)"/)?.[1] || '';
    const quickAdd = new FakeElement({ kind: 'quick-add', dataset: { meal }, documentRef });
    quickAdd.html = html;
    quickAdd.actions = actionNamesFromHtml(html);
    documentRef.quickAdd = quickAdd;
  };

  const document = {
    body,
    querySelector(selector) {
      if (selector === '.diet-grid') return documentRef.dietGrid;
      if (selector === '[data-meal-quick-add]') return documentRef.quickAdd;
      if (selector === '.meal-quick-add-sheet') return documentRef.quickAdd ? new FakeElement({ kind: 'sheet' }) : null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.meal-quick-add-sheet [data-meal-quick-action]' && documentRef.quickAdd) {
        return documentRef.quickAdd.actions.map(action => new FakeElement({
          kind: 'quick-action',
          dataset: { mealQuickAction: action },
          documentRef,
        }));
      }
      return [];
    },
    getElementById(id) {
      if (!documentRef.inputs.has(id)) {
        documentRef.inputs.set(id, new FakeElement({ kind: 'input', documentRef }));
      }
      return documentRef.inputs.get(id);
    },
  };
  const window = {
    async openNutritionSearch(meal) {
      calls.push(`search:${meal}`);
    },
    closeNutritionSearch() {
      calls.push('close-search');
    },
    openNutritionDirectAdd() {
      calls.push('direct-add');
    },
    openNutritionItemEditor() {
      calls.push('item-editor');
    },
    wtSkipMeal(meal) {
      calls.push(`skip:${meal}`);
    },
  };
  const start = appJs.indexOf('const _MEAL_QUICK_LABELS =');
  const end = appJs.indexOf('_bindLifeZoneNpcQuestEvent();', start);
  assert.ok(start >= 0 && end > start, 'diet quick-add implementation should be extractable');
  const runnable = `${appJs.slice(start, end)}\nwindow.__initDietInputButtons = _initDietInputButtons;`;
  vm.runInNewContext(runnable, {
    window,
    document,
    Element: FakeElement,
    console,
    showToast: message => calls.push(`toast:${message}`),
    openNutritionPhotoUpload: () => calls.push('legacy-photo-upload'),
  }, { filename: 'app.js' });
  return { calls, documentRef, window };
}

async function clickDietAdd(harness, meal) {
  const handler = harness.documentRef.dietGrid.listeners.get('click');
  assert.equal(typeof handler, 'function', 'diet grid click handler should be bound');
  const target = new FakeElement({
    kind: 'diet-add',
    dataset: { action: 'openMealQuickAdd', meal },
  });
  await handler({
    target,
    preventDefault() {},
    stopPropagation() {},
  });
}

async function clickQuickAction(harness, action) {
  const handler = harness.documentRef.quickAdd?.listeners.get('click');
  assert.equal(typeof handler, 'function', 'quick-add click handler should be bound');
  const target = new FakeElement({
    kind: 'quick-action',
    dataset: { mealQuickAction: action },
  });
  await handler({
    target,
    preventDefault() {},
  });
}

test('diet add buttons open a meal quick-add sheet through delegated clicks', async () => {
  const harness = createDietHarness();
  harness.window.__initDietInputButtons();

  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    await clickDietAdd(harness, meal);
    assert.equal(harness.documentRef.quickAdd.dataset.meal, meal);
    assert.deepEqual(harness.documentRef.quickAdd.actions, [
      'search',
      'direct',
      'photo-ai',
      'photo-attach',
      'skip',
    ]);
  }

  await clickDietAdd(harness, 'snack');
  assert.equal(harness.documentRef.quickAdd.dataset.meal, 'snack');
  assert.deepEqual(harness.documentRef.quickAdd.actions, [
    'search',
    'direct',
    'photo-ai',
    'photo-attach',
  ]);
});

test('quick-add actions route to existing search direct photo and skip flows', async () => {
  const harness = createDietHarness();

  harness.window.openMealQuickAdd('breakfast');
  await clickQuickAction(harness, 'search');
  assert.deepEqual(harness.calls.splice(0), ['search:breakfast']);
  assert.equal(harness.documentRef.quickAdd, null);

  harness.window.openMealQuickAdd('breakfast');
  await clickQuickAction(harness, 'direct');
  assert.deepEqual(harness.calls.splice(0), ['search:breakfast', 'close-search', 'direct-add']);
  assert.equal(harness.documentRef.quickAdd, null);

  harness.window.openMealQuickAdd('breakfast');
  await clickQuickAction(harness, 'photo-ai');
  assert.equal(harness.documentRef.inputs.get('ai-photo-input-breakfast').clickCount, 1);
  assert.equal(harness.documentRef.quickAdd, null);

  harness.window.openMealQuickAdd('breakfast');
  await clickQuickAction(harness, 'photo-attach');
  assert.equal(harness.documentRef.inputs.get('photo-input-breakfast').clickCount, 1);
  assert.equal(harness.documentRef.quickAdd, null);

  harness.window.openMealQuickAdd('breakfast');
  await clickQuickAction(harness, 'skip');
  assert.deepEqual(harness.calls.splice(0), ['skip:breakfast']);
  assert.equal(harness.documentRef.quickAdd, null);
});
