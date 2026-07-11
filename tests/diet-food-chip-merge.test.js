import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderJs = readFileSync('workout/render.js', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`) >= 0
    ? source.indexOf(`function ${name}`)
    : source.indexOf(`export function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1).replace(/^export\s+/, '');
  }
  throw new Error(`${name} body not closed`);
}

function makeHarness() {
  const code = [
    'const S = { diet: {}, workout: {}, shared: {} };',
    'const nodes = new Map([["wt-foods-breakfast", { innerHTML: "" }]]);',
    'const document = { getElementById(id) { return nodes.get(id) || null; } };',
    'let renderResults = 0;',
    'const saveCalls = [];',
    'function _renderDietResults() { renderResults += 1; }',
    'function _autoSaveDiet(options) { saveCalls.push(options); }',
    extractFunction(renderJs, '_normalizeFoodName'),
    extractFunction(renderJs, '_foodMergeKey'),
    extractFunction(renderJs, '_sumFoodNumber'),
    extractFunction(renderJs, '_mergeFoodItem'),
    extractFunction(renderJs, '_mealKey'),
    extractFunction(renderJs, '_renderMealFoodItems'),
    extractFunction(renderJs, '_recalcMealMacros'),
    extractFunction(renderJs, 'wtAddFoodItem'),
    'return { S, nodes, saveCalls, get renderResults() { return renderResults; }, wtAddFoodItem };',
  ].join('\n');
  return Function(code)();
}

test('adding the same food again updates one consumed food chip', () => {
  const h = makeHarness();
  const item = { id: 'food-rice', name: '현미밥', grams: 100, kcal: 150, protein: 3.2, carbs: 32.4, fat: 1.1, source: 'manual' };

  h.wtAddFoodItem('breakfast', item);
  h.wtAddFoodItem('breakfast', { ...item });

  assert.equal(h.S.diet.bFoods.length, 1);
  assert.equal(h.S.diet.bFoods[0].grams, 200);
  assert.equal(h.S.diet.bFoods[0].kcal, 300);
  assert.equal(h.S.diet.bFoods[0].protein, 6.4);
  assert.equal(h.S.diet.bFoods[0].carbs, 64.8);
  assert.equal(h.S.diet.bFoods[0].fat, 2.2);
  assert.equal(h.S.diet.bKcal, 300);
  assert.equal(h.nodes.get('wt-foods-breakfast').innerHTML.match(/class="meal-food-chip"/g)?.length, 1);
  assert.match(h.nodes.get('wt-foods-breakfast').innerHTML, /200g/);
  assert.match(h.nodes.get('wt-foods-breakfast').innerHTML, /300kcal/);
  assert.deepEqual(h.saveCalls, [{ meal: 'breakfast' }, { meal: 'breakfast' }]);
});
