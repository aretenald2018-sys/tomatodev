import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const designMd = readFileSync('DESIGN.md', 'utf8');
const finalPlan = readFileSync('.omo/plans/2026-07-03-input-ux-commercial-completion.md', 'utf8');
const projectPlan = readFileSync('docs/ai/features/2026-07-03-input-ux-commercial-completion.md', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const workoutUiJs = readFileSync('workout-ui.js', 'utf8');
const exercisesJs = readFileSync('workout/exercises.js', 'utf8');
const workoutIndexJs = readFileSync('workout/index.js', 'utf8');
const renderWorkoutJs = readFileSync('render-workout.js', 'utf8');
const appJs = readFileSync('app.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('final plan and design system define the approved input UX slice', () => {
  assert.match(designMd, /Meal Quick Add Sheet/);
  assert.match(designMd, /Manual Cardio Sheet/);
  assert.match(finalPlan, /상태: approved_for_execution/);
  assert.match(finalPlan, /운동 탭의 활동 선택/);
  assert.match(finalPlan, /식단 `\+ 음식 추가`/);
  assert.match(projectPlan, /상태: `approved_for_execution`/);
});

test('workout shell exposes first-class activity type entries and forms', () => {
  for (const [id, type, label] of [
    ['wt-chip-gym', 'gym', '헬스'],
    ['wt-chip-running', 'running', '런닝'],
    ['wt-chip-cardio', 'manual-cardio', '유산소'],
    ['wt-chip-cf', 'cf', '크로스핏'],
    ['wt-chip-stretch', 'stretch', '스트레칭'],
    ['wt-chip-swimming', 'swimming', '수영'],
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"[\\s\\S]{0,120}wtSwitchType\\('${type}'\\)[\\s\\S]{0,80}${label}`));
  }

  for (const id of [
    'wt-cf-section',
    'wt-cf-last-copy',
    'wt-cf-wod',
    'wt-cf-duration-min',
    'wt-cf-duration-sec',
    'wt-cf-memo',
    'wt-stretch-section',
    'wt-stretch-last-copy',
    'wt-stretch-duration',
    'wt-stretch-memo',
    'wt-swim-section',
    'wt-swim-last-copy',
    'wt-swim-distance',
    'wt-swim-duration-min',
    'wt-swim-duration-sec',
    'wt-swim-stroke',
    'wt-swim-memo',
  ]) {
    assert.match(indexHtml, new RegExp(`id="${id}"`), `${id} should exist in workout shell`);
  }
});

test('workout type state machine recognizes manual cardio and hidden activity sections', () => {
  assert.match(workoutUiJs, /cf:\s*'wt-cf-section'/);
  assert.match(workoutUiJs, /stretch:\s*'wt-stretch-section'/);
  assert.match(workoutUiJs, /swimming:\s*'wt-swim-section'/);
  assert.match(workoutUiJs, /type === 'manual-cardio'/);
  assert.match(workoutUiJs, /wtOpenManualCardioInput/);
  assert.match(workoutUiJs, /'manual-cardio'/);
});

test('manual cardio can open from the workout tab without the exercise picker host', () => {
  assert.match(exercisesJs, /export function wtOpenManualCardioInput/);
  assert.match(exercisesJs, /standalone/);
  assert.match(exercisesJs, /ex-picker-cardio-backdrop--standalone/);
  assert.match(workoutIndexJs, /wtOpenManualCardioInput/);
  assert.match(renderWorkoutJs, /wtOpenManualCardioInput/);
});

test('diet add action opens a meal quick-add sheet before branching to existing flows', () => {
  assert.match(indexHtml, /data-action="openMealQuickAdd"/);
  assert.match(appJs, /action === 'openMealQuickAdd'/);
  assert.match(appJs, /openMealQuickAdd/);
  assert.match(appJs, /data-meal-quick-add/);
  for (const action of [
    'search',
    'direct',
    'photo-ai',
    'photo-attach',
    'skip',
  ]) {
    assert.match(appJs, new RegExp(`data-meal-quick-action="${action}"`));
  }
  assert.match(appJs, /openNutritionSearch\(meal\)/);
  assert.match(appJs, /openNutritionItemEditor\(null\)/);
  assert.match(appJs, /ai-photo-input-\$\{meal\}/);
  assert.match(appJs, /photo-input-\$\{meal\}/);
  assert.match(appJs, /wtSkipMeal\(meal\)/);
});

test('new input UX styles and service worker cache marker are present', () => {
  assert.match(styleCss, /\.wt-activity-fields/);
  assert.match(styleCss, /\.meal-quick-add-backdrop/);
  assert.match(styleCss, /\.meal-quick-add-sheet/);
  assert.match(styleCss, /\.ex-picker-cardio-backdrop--standalone/);
  assert.match(swJs, /tomatofarm-v20260703z22-input-ux-timer-guard/);
});
