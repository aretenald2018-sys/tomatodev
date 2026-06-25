import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
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
  assert.match(calendarJs, /class="cal-workout-day-bar" data-wt-sheet-bar aria-expanded/);
  assert.match(calendarJs, /class="cal-workout-day-expand" data-wt-sheet-handle data-wt-sheet-toggle/);
  assert.doesNotMatch(calendarJs, /data-wt-sheet-grip/);
});

test('date selection opens the bottom sheet to full with animation state', () => {
  assert.match(calendarJs, /let _workoutHomeSheetState = 'bar'/);
  assert.doesNotMatch(calendarJs, /_workoutHomeSheetSettleTimer/);
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
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX = 8/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_OPEN_BAR_RATIO = 0\.1/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX = 14/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO = 0\.2/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY = 0\.55/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_FLING_SAMPLE_MAX_MS = 80/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX = 112/);
  assert.doesNotMatch(calendarJs, /WORKOUT_HOME_SHEET_SETTLE_CLEANUP_MS/);
  assert.match(calendarJs, /collapseThresholdPx = WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX/);
  assert.match(calendarJs, /const openDistance = Math\.max\(WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX, Number\(openThresholdPx\) \|\| 0\)/);
  assert.match(calendarJs, /const collapseDistance = Math\.max\(WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX, Number\(collapseThresholdPx\) \|\| 0\)/);
  assert.match(calendarJs, /dy <= -openDistance/);
  assert.match(calendarJs, /const isIntentionalDown = dy >= collapseDistance \|\| velocityY > WORKOUT_HOME_SHEET_DRAG_FLING_VELOCITY/);
  assert.match(calendarJs, /current === 'bar'[\s\S]*isUp \? 'full' : 'bar'/);
  assert.match(calendarJs, /if \(isIntentionalDown\) return 'bar'/);
  assert.match(calendarJs, /return 'full'/);
  assert.match(calendarJs, /function _startWorkoutHomeSheetDrag/);
  assert.match(calendarJs, /const bar = root\?\.querySelector\?\.\('\[data-wt-sheet-bar\]'\)/);
  assert.match(calendarJs, /\(bar \|\| handle\)\.addEventListener\('pointerdown', _startWorkoutHomeSheetDrag\)/);
  assert.match(calendarJs, /handle\?\.addEventListener\('keydown', _handleWorkoutHomeSheetKey\)/);
  assert.match(calendarJs, /window\.addEventListener\('pointermove', onMove, \{ passive: false \}\)/);
  assert.doesNotMatch(calendarJs, /_handleWorkoutHomeSheetHandleClick/);
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
  assert.match(calendarJs, /\(window\.innerHeight \|\| startHeight\) - WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX/);
  assert.match(calendarJs, /const minDragY = startHeight - maxHeight/);
  assert.match(calendarJs, /const dragTravel = Math\.max\(0, maxHeight - minHeight\)/);
  assert.match(calendarJs, /minHeight \* WORKOUT_HOME_SHEET_DRAG_OPEN_BAR_RATIO/);
  assert.match(calendarJs, /minHeight \* WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO/);
  assert.match(calendarJs, /let hasMoved = false/);
  assert.match(calendarJs, /hasMoved = true/);
  assert.match(calendarJs, /let openLatched = false/);
  assert.match(calendarJs, /let closeLatched = false/);
  assert.match(calendarJs, /let lastDragY = 0/);
  assert.match(calendarJs, /const clampDragY = \(rawDy\) => Math\.max\(minDragY, Math\.min\(maxDragY, rawDy\)\)/);
  assert.match(calendarJs, /const updateDragLatches = \(dy\) =>/);
  assert.match(calendarJs, /const previewDragY = \(rawDy\) =>/);
  assert.match(calendarJs, /lastDragY = dy/);
  assert.match(calendarJs, /if \(startState === 'bar' && dy <= -openThresholdPx\) openLatched = true/);
  assert.match(calendarJs, /if \(startState === 'full' && dy >= WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX\) closeLatched = true/);
  assert.match(calendarJs, /if \(startState === 'full' && dy >= collapseThresholdPx\) closeLatched = true/);
  assert.match(calendarJs, /const nextHeight = openLatched \? maxHeight : closeLatched \? minHeight : Math\.max/);
  assert.doesNotMatch(dragFn, /event\.preventDefault\?\.\(\)/);
  assert.match(calendarJs, /if \(moveEvent\.cancelable\) moveEvent\.preventDefault\(\)/);
  assert.match(calendarJs, /velocityY = \(lastY - lastMoveY\) \/ elapsed/);
  assert.match(calendarJs, /startHeight - dy/);
  assert.match(calendarJs, /const finalY = Number\.isFinite\(Number\(upEvent\.clientY\)\) \? Number\(upEvent\.clientY\) : lastY/);
  assert.match(calendarJs, /if \(elapsed <= WORKOUT_HOME_SHEET_FLING_SAMPLE_MAX_MS && finalY !== lastMoveY\) velocityY = \(finalY - lastMoveY\) \/ elapsed/);
  assert.match(calendarJs, /const finalDy = clampDragY\(finalY - startY\)/);
  assert.match(calendarJs, /lastDragY = finalDy/);
  assert.match(calendarJs, /updateDragLatches\(finalDy\)/);
  assert.match(calendarJs, /const clearDragPreview = \(\) =>/);
  assert.match(calendarJs, /sheet\.style\.removeProperty\('--wt-day-sheet-drag-height'\)/);
  assert.doesNotMatch(calendarJs, /const settleDragPreview =/);
  assert.doesNotMatch(calendarJs, /setTimeout\(clearDragPreview/);
  assert.doesNotMatch(calendarJs, /requestAnimationFrame\(applyTarget\)/);
  assert.match(calendarJs, /const dy = lastDragY/);
  assert.match(calendarJs, /Math\.abs\(dy\) < WORKOUT_HOME_SHEET_DRAG_OPEN_DEADZONE_PX/);
  assert.match(calendarJs, /if \(hasMoved\) _suppressWorkoutHomeSheetClick\(\)/);
  assert.match(calendarJs, /const targetState = openLatched \? 'full' : closeLatched \? 'bar' : _resolveWorkoutHomeSheetDragTarget\(dy, velocityY, openThresholdPx, collapseThresholdPx\)/);
  assert.match(calendarJs, /_suppressWorkoutHomeSheetClick\(\)/);
  assert.match(calendarJs, /sheet\.classList\.remove\('is-dragging'\);\s*clearDragPreview\(\);\s*_setWorkoutHomeSheetState\(targetState\);\s*_suppressWorkoutHomeSheetClick\(\)/);
  assert.doesNotMatch(calendarJs, /Math\.abs\(dy\) > 112/);
  assert.match(calendarJs, /window\._wtCalToggleSheet = _toggleWorkoutHomeSheet/);
});

test('full day sheet owns vertical scroll and blocks background scroll chaining', () => {
  assert.match(calendarJs, /_bindWorkoutHomeSheetScrollGuard\(root\)/);
  assert.match(calendarJs, /_syncWorkoutHomeSheetScrollLock\(\)/);
  assert.match(calendarJs, /function _syncWorkoutHomeSheetScrollLock\(\)/);
  assert.match(calendarJs, /_currentWorkoutHomeSheetState\(\) === 'full'/);
  assert.match(calendarJs, /body\.classList\.contains\('wt-workout-tab-active'\)/);
  assert.match(calendarJs, /panel\?\.classList\.contains\('active'\)/);
  assert.match(calendarJs, /body\.classList\.toggle\('wt-workout-sheet-scroll-lock', shouldLock\)/);
  assert.match(calendarJs, /function _bindWorkoutHomeSheetScrollGuard\(root\)/);
  assert.match(calendarJs, /const scroller = root\?\.querySelector\?\.\('\[data-wt-day-sheet\] \.wt-day-sheet-scroll'\)/);
  assert.match(calendarJs, /scroller\.addEventListener\('touchmove'[\s\S]*\{ passive: false \}\)/);
  assert.match(calendarJs, /const wouldChainToBackground = maxScrollTop <= 0 \|\| \(dy > 0 && atTop\) \|\| \(dy < 0 && atBottom\)/);
  assert.match(calendarJs, /if \(wouldChainToBackground && event\.cancelable\) event\.preventDefault\(\)/);
  assert.match(calendarJs, /event\.stopPropagation\(\)/);
  assert.match(appJs, /\[data-wt-day-sheet\]/);
});

test('open day tap does not re-render an already full selected sheet', () => {
  assert.match(calendarJs, /const nextKey = _parseDateKey\(key\) \? key : _workoutHomeSelectedKey/);
  assert.match(calendarJs, /_workoutHomeSelectedKey === nextKey && _currentWorkoutHomeSheetState\(\) === 'full'[\s\S]*return/);
});

test('floating add button uses direct sheet action binding', () => {
  const detailStart = calendarJs.indexOf('function _renderWorkoutHomeDetail');
  const detailEnd = calendarJs.indexOf('function _renderWorkoutDetailSummaryCard', detailStart);
  assert.ok(detailStart >= 0 && detailEnd > detailStart, 'workout detail renderer should be present');
  const detail = calendarJs.slice(detailStart, detailEnd);
  assert.match(detail, /class="wt-day-fab"[\s\S]*data-wt-day-add-session[\s\S]*data-date-key="\$\{_esc\(key\)\}"/);
  assert.doesNotMatch(detail, /class="wt-day-fab"[^>]*onclick=/);
  assert.match(calendarJs, /_bindWorkoutHomeSheetActions\(root\)/);
  assert.match(calendarJs, /function _bindWorkoutHomeSheetActions\(root\)/);
  assert.match(calendarJs, /sheet\.addEventListener\('click', \([\s\S]*\}, true\)/);
  assert.match(calendarJs, /event\.target instanceof Element \? event\.target : event\.target\?\.parentElement/);
  assert.match(calendarJs, /target\?\.closest\?\.\('\[data-wt-day-add-session\]'\)/);
  assert.match(calendarJs, /event\.stopPropagation\(\)/);
  assert.match(calendarJs, /Promise\.resolve\(_addWorkoutHomeSession\(key\)\)/);
});

test('bottom sheet css is fixed, animated, and contains the session bar inside the sheet', () => {
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*position:\s*fixed;[\s\S]*transition:[\s\S]*height 260ms/);
  assert.match(styleCss, /height:\s*var\(--wt-day-sheet-drag-height,\s*var\(--wt-day-sheet-height\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*--wt-day-sheet-height:\s*clamp\(72px,\s*10dvh,\s*96px\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*--wt-day-sheet-full-clearance:\s*112px/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full\s*\{[\s\S]*100dvh - var\(--wt-day-sheet-full-clearance\)/);
  assert.match(styleCss, /\.cal-workout-day-expand\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.cal-workout-day-bar\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sessionbar\s*\{[\s\S]*position:\s*relative;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sessionbar\s*\{[\s\S]*padding:\s*7px 82px/);
  assert.match(styleCss, /body\.wt-workout-tab-active\.wt-workout-sheet-scroll-lock\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(styleCss, /body\.wt-workout-tab-active\.wt-workout-sheet-scroll-lock #tab-workout\.active\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*touch-action:\s*pan-y;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-fab\s*\{[\s\S]*bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom,\s*0px\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-fab\s*\{[\s\S]*pointer-events:\s*auto;[\s\S]*touch-action:\s*manipulation;/);
});

test('collapsed day sheet bar is a compact one-row affordance', () => {
  assert.match(styleCss, /\.workout-calendar-root\s*\{[\s\S]*padding:\s*0 0 124px/);
  assert.match(styleCss, /\.cal-workout-day-bar\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(styleCss, /\.cal-workout-day-bar\s*\{[\s\S]*min-height:\s*64px/);
  assert.match(styleCss, /\.cal-workout-day-main\s*\{[\s\S]*flex-direction:\s*row/);
  assert.match(styleCss, /\.cal-workout-day-expand\s*\{[\s\S]*position:\s*absolute;[\s\S]*left:\s*50%;[\s\S]*translate:\s*-50% 0;[\s\S]*touch-action:\s*none;[\s\S]*animation:\s*wt-sheet-arrow-pulse/);
  assert.doesNotMatch(styleCss, /cal-workout-day-grip/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full \.cal-workout-day-expand\s*\{[\s\S]*animation:\s*wt-sheet-arrow-pulse-down/);
  assert.match(styleCss, /@keyframes wt-sheet-arrow-pulse/);
  assert.match(styleCss, /@keyframes wt-sheet-arrow-pulse-down/);
});

test('service worker cache version was bumped for workout calendar bottom sheet assets', () => {
  assert.match(swJs, /tomatofarm-v20260625z62-exercise-program-editor/);
});
