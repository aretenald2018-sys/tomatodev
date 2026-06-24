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
  assert.match(plan, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(132px,\s*\.82fr\)/);
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
