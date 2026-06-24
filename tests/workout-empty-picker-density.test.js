import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const renderCalendar = await readFile(new URL('../render-calendar.js', import.meta.url), 'utf8');
const workoutExercises = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('empty workout view uses inline add button in the session bar, not a floating fab', () => {
  const start = renderCalendar.indexOf('function _renderWorkoutHomeDetail');
  const end = renderCalendar.indexOf('function _renderWorkoutDetailSummaryCard', start);
  assert.ok(start >= 0 && end > start, 'workout day detail renderer should exist');
  const detail = renderCalendar.slice(start, end);

  assert.match(detail, /class="wt-day-sessionbar"[\s\S]*class="wt-day-add-inline"/);
  assert.match(detail, /window\._wtCalAddSession/);
  assert.doesNotMatch(detail, /class="wt-day-fab"/);
  assert.doesNotMatch(renderCalendar, /우측 하단 \+ 버튼/);

  const bar = ruleBody('.wt-day-sessionbar');
  const add = ruleBody('.wt-day-add-inline');
  assert.match(bar, /gap:\s*8px/);
  assert.match(bar, /padding:\s*7px 18px/);
  assert.match(add, /width:\s*34px/);
  assert.match(add, /height:\s*34px/);
  assert.doesNotMatch(add, /position:\s*fixed/);
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

test('exercise picker removes benchmark banner and shows full exercise names', () => {
  const benchmarkScope = workoutExercises.slice(
    workoutExercises.indexOf('function _renderPickerBenchmarkScope'),
    workoutExercises.indexOf('function _renderPickerCategory'),
  );
  const name = ruleBody('.ex-picker-name');
  const modalName = ruleBody('#ex-picker-modal .ex-picker-name');
  const thumb = ruleBody('.ex-picker-thumb');
  const thumbImg = ruleBody('.ex-picker-thumb.has-asset img');
  const figureAsset = ruleBody('.ex-picker-muscle-figure.has-asset');

  assert.match(benchmarkScope, /return '';/);
  assert.doesNotMatch(workoutExercises, /오늘 벤치마크|같은 부위 추가 종목/);
  assert.match(name, /white-space:\s*normal/);
  assert.match(name, /overflow:\s*visible/);
  assert.match(name, /text-overflow:\s*clip/);
  assert.doesNotMatch(name, /ellipsis|nowrap/);
  assert.match(modalName, /font-size:\s*14px/);
  assert.match(thumb, /width:\s*58px/);
  assert.match(thumb, /height:\s*46px/);
  assert.match(thumbImg, /width:\s*58px/);
  assert.match(figureAsset, /width:\s*60px/);
});
