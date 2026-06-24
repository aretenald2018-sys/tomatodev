import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const styleCss = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('workout calendar keeps the month surface and renders the existing day bar as a sheet header', () => {
  const start = calendarJs.indexOf('export function renderWorkoutCalendarHome');
  const end = calendarJs.indexOf('function _renderWorkoutHomeDetail', start);
  assert.ok(start >= 0 && end > start, 'renderWorkoutCalendarHome source should be present');
  const homeRender = calendarJs.slice(start, end);

  assert.doesNotMatch(homeRender, /_renderWorkoutHomeDetail\(root/);
  assert.match(homeRender, /_renderWorkoutCalendar\(root/);
  assert.match(calendarJs, /function _renderWorkoutHomeBottomSheet/);
  assert.match(calendarJs, /class="cal-workout-day-sheet is-\$\{sheetState\}"[\s\S]*data-wt-day-sheet/);
  assert.match(calendarJs, /class="cal-workout-day-bar" data-wt-sheet-handle/);
});

test('date selection opens the bottom sheet to full with animation state', () => {
  assert.match(calendarJs, /let _workoutHomeSheetState = 'bar'/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_STATES = \['bar', 'mid', 'full'\]/);
  assert.match(calendarJs, /function _animateWorkoutHomeSheetTo/);
  assert.match(calendarJs, /_animateWorkoutHomeSheetTo\('full'\)/);
  assert.match(calendarJs, /window\.requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(apply\)\)/);
});

test('sheet drag handlers move between bar, mid, and full states', () => {
  assert.match(calendarJs, /function _startWorkoutHomeSheetDrag/);
  assert.match(calendarJs, /window\.addEventListener\('pointermove', onMove/);
  assert.match(calendarJs, /--wt-day-sheet-drag-height/);
  assert.match(calendarJs, /startHeight - dy/);
  assert.match(calendarJs, /_stepWorkoutHomeSheet\(dy < 0 \? 1 : -1, Math\.abs\(dy\) > 112\)/);
  assert.match(calendarJs, /window\._wtCalToggleSheet = _toggleWorkoutHomeSheet/);
});

test('bottom sheet css is fixed, animated, and contains the session bar inside the sheet', () => {
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*position:\s*fixed;[\s\S]*transition:[\s\S]*height 260ms/);
  assert.match(styleCss, /height:\s*var\(--wt-day-sheet-drag-height,\s*var\(--wt-day-sheet-height\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full\s*\{[\s\S]*100dvh/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.cal-workout-day-bar\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sessionbar\s*\{[\s\S]*position:\s*relative;/);
});

test('service worker cache version was bumped for workout calendar bottom sheet assets', () => {
  assert.match(swJs, /tomatofarm-v20260624z35-workout-day-sheet/);
});
