import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countRecordedNutrientMeals,
  hasPositiveDayNutrient,
  sumDayNutrient,
} from '../diet/day-nutrition.js';
import { NUTRITION_FIELDS } from '../diet/nutrition-fields.js';
import { calcPerServing } from '../diet/recipe-nutrition.js';
import { dateFromKey, parseDateKey } from '../utils/date-key.js';
import { escapeHtml } from '../utils/escape-html.js';
import { toFiniteNumber } from '../utils/number.js';
import { KOREAN_WEEKDAYS } from '../utils/weekdays.js';
import {
  formatRunningDuration,
  formatRunningPace,
} from '../workout/running-presentation.js';

test('shared HTML escaping covers text and attribute metacharacters', () => {
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml(null), '');
});

test('shared numeric coercion preserves explicit fallbacks', () => {
  assert.equal(toFiniteNumber('12.5'), 12.5);
  assert.equal(toFiniteNumber('invalid', null), null);
  assert.ok(Number.isNaN(toFiniteNumber(undefined, NaN)));
});

test('date-key parser rejects normalized overflow dates', () => {
  assert.deepEqual(
    (({ y, m, d }) => ({ y, m, d }))(parseDateKey('2026-07-26')),
    { y: 2026, m: 6, d: 26 },
  );
  assert.equal(parseDateKey('2026-02-30'), null);
  assert.equal(dateFromKey('not-a-date'), null);
});

test('day nutrition aggregation includes snack and numeric strings', () => {
  const day = { bKcal: 400, lKcal: '500', dKcal: 600, sKcal: 150 };
  assert.equal(sumDayNutrient(day, 'kcal'), 1650);
  assert.equal(hasPositiveDayNutrient({ sKcal: 20 }, 'kcal'), true);
  assert.equal(countRecordedNutrientMeals(day, 'kcal'), 4);
});

test('canonical nutrition fields and recipe totals share one contract', () => {
  assert.deepEqual(
    [...NUTRITION_FIELDS],
    ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'],
  );
  assert.deepEqual(calcPerServing({
    servings: 2,
    ingredients: [
      { grams: 100, kcal: 200, protein: 10, carbs: 20, fat: 5 },
      { grams: 50, kcal: 100, protein: 4, carbs: 10, fat: 3 },
    ],
  }), { grams: 75, kcal: 150, protein: 7, carbs: 15, fat: 4 });
});

test('weekday and running formatters remain stable', () => {
  assert.deepEqual([...KOREAN_WEEKDAYS], ['일', '월', '화', '수', '목', '금', '토']);
  assert.equal(formatRunningDuration(1048), '17:28');
  assert.equal(formatRunningDuration(2, { padMinutes: false }), '0:02');
  assert.equal(formatRunningPace(403), "6'43''");
  assert.equal(formatRunningPace(0, { empty: '—' }), '—');
});
