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
  assert.match(calendarJs, /class="cal-workout-day-grip" aria-hidden="true"/);
});

test('date selection opens the bottom sheet to full with animation state', () => {
  assert.match(calendarJs, /let _workoutHomeSheetState = 'bar'/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_STATES = \['bar', 'full'\]/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_CLASS_STATES = \['bar', 'mid', 'full'\]/);
  assert.match(calendarJs, /function _animateWorkoutHomeSheetTo/);
  assert.match(calendarJs, /_animateWorkoutHomeSheetTo\('full'\)/);
  assert.match(calendarJs, /window\.requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(apply\)\)/);
});

test('sheet drag handlers open directly to full and collapse to bar', () => {
  const dragStart = calendarJs.indexOf('function _startWorkoutHomeSheetDrag');
  const dragEnd = calendarJs.indexOf('function _openWorkoutHomeDay', dragStart);
  assert.ok(dragStart >= 0 && dragEnd > dragStart, 'drag handler source should be present');
  const dragFn = calendarJs.slice(dragStart, dragEnd);

  assert.match(calendarJs, /function _stepWorkoutHomeSheet\(direction\)[\s\S]*direction > 0 \? 'full' : 'bar'/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX = 10/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_OPEN_BAR_RATIO = 0\.1/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX = 220/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO = 0\.35/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY = 0\.55/);
  assert.match(calendarJs, /collapseThresholdPx = WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX/);
  assert.match(calendarJs, /const openDistance = Math\.max\(WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX, Number\(openThresholdPx\) \|\| 0\)/);
  assert.match(calendarJs, /const collapseDistance = Math\.max\(WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX, Number\(collapseThresholdPx\) \|\| 0\)/);
  assert.match(calendarJs, /dy <= -openDistance/);
  assert.match(calendarJs, /const isIntentionalDown = dy >= collapseDistance/);
  assert.doesNotMatch(calendarJs, /velocityY > WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY/);
  assert.match(calendarJs, /current === 'bar'[\s\S]*isUp \? 'full' : 'bar'/);
  assert.match(calendarJs, /if \(isIntentionalDown\) return 'bar'/);
  assert.match(calendarJs, /return 'full'/);
  assert.match(calendarJs, /function _startWorkoutHomeSheetDrag/);
  assert.match(calendarJs, /window\.addEventListener\('pointermove', onMove/);
  assert.match(dragFn, /data-wt-sheet-action/);
  assert.doesNotMatch(dragFn, /closest\?\('button'\)/);
  assert.match(calendarJs, /function _consumeWorkoutHomeSuppressedClick/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_POST_DRAG_CLICK_SUPPRESS_MS = 900/);
  assert.match(calendarJs, /function _suppressWorkoutHomeSheetClick/);
  assert.match(calendarJs, /Date\.now\(\) \+ ms/);
  assert.match(calendarJs, /now < _workoutHomeSuppressSheetClickUntil/);
  assert.doesNotMatch(calendarJs, /_workoutHomeSuppressNextSheetClick/);
  assert.doesNotMatch(calendarJs, /setTimeout\(\(\) => \{ _workoutHomeSuppress/);
  assert.match(calendarJs, /--wt-day-sheet-drag-height/);
  assert.match(calendarJs, /const minDragY = startHeight - maxHeight/);
  assert.match(calendarJs, /const dragTravel = Math\.max\(0, maxHeight - minHeight\)/);
  assert.match(calendarJs, /minHeight \* WORKOUT_HOME_SHEET_DRAG_OPEN_BAR_RATIO/);
  assert.match(calendarJs, /dragTravel \* WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO/);
  assert.match(calendarJs, /let hasMoved = false/);
  assert.match(calendarJs, /hasMoved = true/);
  assert.match(calendarJs, /let openLatched = false/);
  assert.match(calendarJs, /if \(startState === 'bar' && dy <= -openThresholdPx\) openLatched = true/);
  assert.match(calendarJs, /const nextHeight = openLatched \? maxHeight : Math\.max/);
  assert.match(calendarJs, /velocityY = \(lastY - lastMoveY\) \/ elapsed/);
  assert.match(calendarJs, /startHeight - dy/);
  assert.match(calendarJs, /Math\.abs\(dy\) < WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX/);
  assert.match(calendarJs, /if \(hasMoved\) _suppressWorkoutHomeSheetClick\(\)/);
  assert.match(calendarJs, /_suppressWorkoutHomeSheetClick\(\)/);
  assert.match(calendarJs, /_setWorkoutHomeSheetState\(openLatched \? 'full' : _resolveWorkoutHomeSheetDragTarget\(dy, velocityY, openThresholdPx, collapseThresholdPx\)\)/);
  assert.doesNotMatch(calendarJs, /Math\.abs\(dy\) > 112/);
  assert.match(calendarJs, /window\._wtCalToggleSheet = _toggleWorkoutHomeSheet/);
});

test('open day tap does not re-render an already full selected sheet', () => {
  assert.match(calendarJs, /const nextKey = _parseDateKey\(key\) \? key : _workoutHomeSelectedKey/);
  assert.match(calendarJs, /_workoutHomeSelectedKey === nextKey && _currentWorkoutHomeSheetState\(\) === 'full'[\s\S]*return/);
});

test('bottom sheet css is fixed, animated, and contains the session bar inside the sheet', () => {
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*position:\s*fixed;[\s\S]*transition:[\s\S]*height 260ms/);
  assert.match(styleCss, /height:\s*var\(--wt-day-sheet-drag-height,\s*var\(--wt-day-sheet-height\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*--wt-day-sheet-height:\s*clamp\(72px,\s*10dvh,\s*96px\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full\s*\{[\s\S]*100dvh/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.cal-workout-day-bar\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sessionbar\s*\{[\s\S]*position:\s*relative;/);
});

test('collapsed day sheet bar is a compact one-row affordance', () => {
  assert.match(styleCss, /\.workout-calendar-root\s*\{[\s\S]*padding:\s*0 0 124px/);
  assert.match(styleCss, /\.cal-workout-day-bar\s*\{[\s\S]*grid-template-columns:\s*30px minmax\(0,\s*1fr\) auto/);
  assert.match(styleCss, /\.cal-workout-day-bar\s*\{[\s\S]*min-height:\s*64px/);
  assert.match(styleCss, /\.cal-workout-day-main\s*\{[\s\S]*flex-direction:\s*row/);
  assert.match(styleCss, /\.cal-workout-day-expand\s*\{[\s\S]*animation:\s*wt-sheet-arrow-pulse/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.cal-workout-day-grip\s*\{[\s\S]*width:\s*42px;[\s\S]*height:\s*4px/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full \.cal-workout-day-expand\s*\{[\s\S]*animation:\s*none;/);
  assert.match(styleCss, /@keyframes wt-sheet-arrow-pulse/);
});

test('service worker cache version was bumped for workout calendar bottom sheet assets', () => {
  assert.match(swJs, /tomatofarm-v20260625z41-workout-day-sheet-open-latch/);
});
