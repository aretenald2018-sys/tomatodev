import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const workoutExercises = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(css);
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('test-mode exercise card keeps title from being squeezed by trend graph', () => {
  const titleRow = ruleBody('.ex-max-v2-title-row');
  const plan = ruleBody('.ex-max-v2-plan');
  const goal = ruleBody('.ex-max-v2-plan-goal');
  const trend = ruleBody('.ex-max-v2-trend');

  assert.match(titleRow, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(plan, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(112px,\s*\.72fr\)/);
  assert.match(goal, /min-width:\s*0/);
  assert.match(trend, /min-width:\s*0/);
  assert.doesNotMatch(css, /#tab-workout\s+\.ex-block-header\s+\.ex-sparkline-wrap/);
});

test('workout exercise card DOM renders test-mode trend graph inside plan area only', () => {
  const start = workoutExercises.indexOf('function _buildMaxExerciseCardHeader');
  const end = workoutExercises.indexOf('function _maxSetTypeLabel', start);
  assert.ok(start >= 0 && end > start, 'test-mode card header function should exist');
  const headerFn = workoutExercises.slice(start, end);
  const beforePlan = headerFn.slice(0, headerFn.indexOf('<div class="ex-max-v2-plan">'));

  assert.match(headerFn, /<div class="ex-max-v2-title-row">/);
  assert.match(headerFn, /<div class="ex-max-v2-plan">/);
  assert.match(headerFn, /\$\{sparkline[\s\S]*<div class="ex-max-v2-trend">\$\{sparkline\}<\/div>/);
  assert.doesNotMatch(beforePlan, /\$\{sparkline\}/);
  assert.doesNotMatch(workoutExercises, /<div class="ex-block-header">/);
});

test('test-mode previous volume stays in a single compact row', () => {
  const last = ruleBody('.ex-max-v2-last');
  const text = ruleBody('.ex-max-v2-last-text');
  const start = workoutExercises.indexOf('function _buildMaxLastSessionSummary');
  const end = workoutExercises.indexOf('function _buildMaxExerciseCardHeader', start);
  assert.ok(start >= 0 && end > start, 'last session summary function should exist');
  const fn = workoutExercises.slice(start, end);

  assert.match(last, /white-space:\s*nowrap/);
  assert.match(last, /overflow-x:\s*auto/);
  assert.match(text, /white-space:\s*nowrap/);
  assert.match(fn, /ex-max-v2-last-text/);
  assert.match(fn, /직전 \$\{trackLabel\} \$\{dateLabel\} · \$\{setSummary\}/);
  assert.doesNotMatch(fn, /ex-max-v2-last-label|ex-max-v2-last-sets/);
});

test('test-mode set row is one-line compact and does not render ROM slider', () => {
  const row = ruleBody('.ex-max-v2-main-row');
  const set = ruleBody('.ex-max-v2-set');
  const rom = ruleBody('.ex-max-v2-rom-field');
  const start = workoutExercises.indexOf('function _renderSets');
  const end = workoutExercises.indexOf('if (typeof Sortable', start);
  assert.ok(start >= 0 && end > start, 'set render function should exist');
  const fn = workoutExercises.slice(start, end);

  assert.match(row, /grid-template-columns:\s*28px\s+minmax\(42px,\s*\.9fr\)\s+minmax\(42px,\s*\.9fr\)\s+minmax\(38px,\s*\.75fr\)\s+minmax\(42px,\s*\.8fr\)\s+24px\s+16px\s+12px/);
  assert.match(set, /min-height:\s*30px/);
  assert.match(rom, /grid-template-columns:\s*18px\s+minmax\(0,\s*1fr\)\s+14px/);
  assert.match(fn, /ex-max-v2-rom-field/);
  assert.match(fn, /set-rom-input/);
  assert.match(fn, /_romPctToScoreInput\(romValue\)/);
  assert.match(fn, /inputmode="decimal"\s+min="0"\s+max="10"\s+step="0\.5"/);
  assert.match(fn, /aria-label="가동범위 10점 입력"/);
  assert.match(fn, /<em>\/10<\/em>/);
  assert.match(fn, /_romScoreInputToPct\(e\.target\.value\)/);
  assert.match(workoutExercises, /function _romScoreInputToPct\(val\)[\s\S]*n \* 10/);
  assert.match(workoutExercises, /function _romPctToScoreInput\(val\)[\s\S]*\/ 10/);
  assert.doesNotMatch(fn, /set-rom-range/);
  assert.doesNotMatch(fn, /가동범위 퍼센트 직접 입력|<em>%<\/em>|max="100"/);
});
