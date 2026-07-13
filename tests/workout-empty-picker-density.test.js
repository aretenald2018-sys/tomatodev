import { readAppCssSync } from './helpers/css-source.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = readAppCssSync();
const renderCalendar = await readFile(new URL('../render-calendar.js', import.meta.url), 'utf8');
const workoutExercises = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('empty workout view keeps the gym add button and adds a compact running action dock', () => {
  const start = renderCalendar.indexOf('function _renderWorkoutHomeDetail');
  const end = renderCalendar.indexOf('function _renderWorkoutDetailSummaryCard', start);
  assert.ok(start >= 0 && end > start, 'workout day detail renderer should exist');
  const detail = renderCalendar.slice(start, end);

  assert.match(detail, /class="wt-day-sessionbar"[\s\S]*class="wt-day-session-tabs"/);
  assert.match(detail, /data-wt-day-add-running data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(detail, /data-wt-day-upload-running data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(detail, /class="wt-day-fab wt-day-fab--running"/);
  assert.match(detail, /class="wt-running-upload-action"/);
  assert.doesNotMatch(detail, /class="wt-day-fab"[^>]*onclick=/);
  assert.doesNotMatch(detail, /class="wt-day-add-inline"/);
  assert.doesNotMatch(detail, /class="wt-day-edit"/);

  const bar = ruleBody('.wt-day-sessionbar');
  const fab = ruleBody('.wt-day-fab');
  assert.match(bar, /gap:\s*8px/);
  assert.match(bar, /padding:\s*7px 18px/);
  assert.match(fab, /position:\s*absolute/);
  assert.match(fab, /right:\s*18px/);
  assert.match(fab, /width:\s*48px/);
  assert.match(fab, /height:\s*48px/);
  assert.match(ruleBody('.cal-workout-day-sheet .wt-day-fab'), /touch-action:\s*manipulation/);
  assert.match(ruleBody('.wt-day-running-actions'), /display:\s*flex/);
  assert.match(ruleBody('.wt-running-upload-action'), /min-height:\s*48px/);
});

test('empty workout guidance is compact enough for one screen', () => {
  const center = ruleBody('.wt-empty-center');
  const dumbbell = ruleBody('.wt-empty-dumbbell');
  const title = ruleBody('.wt-empty-center p');
  const sub = ruleBody('.wt-empty-center span');
  const help = ruleBody('.wt-empty-help');

  assert.match(center, /padding:\s*28px 0 22px/);
  assert.match(dumbbell, /width:\s*88px/);
  assert.match(dumbbell, /height:\s*88px/);
  assert.match(title, /font-size:\s*17px/);
  assert.match(sub, /font-size:\s*15px/);
  assert.match(help, /font-size:\s*14px/);
  assert.match(help, /margin-top:\s*16px/);
});

test('exercise picker removes benchmark banner and fits names into dense rows', () => {
  const benchmarkScope = workoutExercises.slice(
    workoutExercises.indexOf('function _renderPickerBenchmarkScope'),
    workoutExercises.indexOf('function _renderPickerCategory'),
  );
  const maxPickerRow = workoutExercises.slice(
    workoutExercises.indexOf('if (isMaxBenchmarkPicker) {'),
    workoutExercises.indexOf('} else if (isExpert) {', workoutExercises.indexOf('if (isMaxBenchmarkPicker) {')),
  );
  const content = ruleBody('#ex-picker-list.ex-picker-content');
  const modalItem = ruleBody('#ex-picker-modal .ex-picker-item');
  const modalName = ruleBody('#ex-picker-modal .ex-picker-name');
  const compactName = ruleBody('#ex-picker-modal .ex-picker-name.is-compact');
  const veryCompactName = ruleBody('#ex-picker-modal .ex-picker-name.is-very-compact');
  const historyMeta = ruleBody('.ex-picker-history-meta');
  const modalActions = ruleBody('#ex-picker-modal .ex-picker-actions');
  const modalRowSide = ruleBody('#ex-picker-modal .ex-picker-row-side');
  const thumb = ruleBody('.ex-picker-thumb');
  const thumbImg = ruleBody('.ex-picker-thumb.has-asset img');
  const figureAsset = ruleBody('.ex-picker-muscle-figure.has-asset');

  assert.match(benchmarkScope, /return '';/);
  assert.doesNotMatch(workoutExercises, /오늘 벤치마크|같은 부위 추가 종목/);
  assert.match(workoutExercises, /function _pickerNameDensityClass/);
  assert.match(workoutExercises, /class="\$\{nameClass\}"/);
  assert.doesNotMatch(maxPickerRow, /_renderMaxBenchmarkPickerMeta\(ex\)/);
  assert.doesNotMatch(maxPickerRow, /ex-picker-benchmark-meta/);
  assert.match(content, /padding:\s*16px max\(4px,\s*env\(safe-area-inset-right\)\) max\(28px,\s*env\(safe-area-inset-bottom\)\) 14px/);
  assert.match(modalItem, /grid-template-columns:\s*58px minmax\(0,\s*1fr\) max-content/);
  assert.match(modalItem, /gap:\s*8px/);
  assert.match(modalName, /font-size:\s*13px/);
  assert.match(modalName, /white-space:\s*nowrap/);
  assert.match(modalName, /overflow:\s*hidden/);
  assert.match(modalName, /text-overflow:\s*ellipsis/);
  assert.match(modalName, /word-break:\s*keep-all/);
  assert.match(compactName, /font-size:\s*12px/);
  assert.match(veryCompactName, /font-size:\s*11px/);
  assert.match(historyMeta, /font-size:\s*10px/);
  assert.match(historyMeta, /white-space:\s*nowrap/);
  assert.match(modalActions, /justify-self:\s*end/);
  assert.match(modalRowSide, /width:\s*74px/);
  assert.match(modalRowSide, /justify-self:\s*end/);
  assert.match(modalRowSide, /max-width:\s*74px/);
  assert.match(modalRowSide, /align-items:\s*center/);
  assert.match(thumb, /width:\s*58px/);
  assert.match(thumb, /height:\s*46px/);
  assert.match(thumbImg, /width:\s*58px/);
  assert.match(figureAsset, /width:\s*60px/);
});
