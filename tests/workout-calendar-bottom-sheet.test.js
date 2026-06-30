import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const styleCss = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const tm2Css = readFileSync(new URL('../test-mode-v2.css', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const tm2EntryJs = readFileSync(new URL('../workout/test-v2/entry.js', import.meta.url), 'utf8');
const tm2BoardJs = readFileSync(new URL('../workout/test-v2/board-render.js', import.meta.url), 'utf8');

test('workout calendar keeps the month surface and renders the existing day bar as a sheet header', () => {
  const start = calendarJs.indexOf('export function renderWorkoutCalendarHome');
  const end = calendarJs.indexOf('function _renderWorkoutHomeDetail', start);
  assert.ok(start >= 0 && end > start, 'renderWorkoutCalendarHome source should be present');
  const homeRender = calendarJs.slice(start, end);

  assert.doesNotMatch(homeRender, /_renderWorkoutHomeDetail\(root/);
  assert.match(homeRender, /_renderWorkoutCalendar\(root/);
  assert.match(calendarJs, /function _renderWorkoutHomeBottomSheet/);
  assert.match(calendarJs, /const backdropHiddenAttr = sheetState === 'full' \? '' : ' hidden'/);
  assert.match(calendarJs, /const backdropAriaHidden = sheetState === 'full' \? 'false' : 'true'/);
  assert.match(calendarJs, /class="cal-workout-day-backdrop is-\$\{sheetState\}"[\s\S]*data-wt-sheet-backdrop[\s\S]*aria-hidden="\$\{backdropAriaHidden\}"\$\{backdropHiddenAttr\}/);
  assert.match(calendarJs, /class="cal-workout-day-sheet is-\$\{sheetState\}"[\s\S]*data-wt-day-sheet/);
  assert.match(calendarJs, /class="cal-workout-day-bar" data-wt-sheet-bar aria-expanded/);
  assert.match(calendarJs, /class="cal-workout-day-expand" data-wt-sheet-toggle/);
  assert.doesNotMatch(calendarJs, /data-wt-sheet-handle/);
  assert.doesNotMatch(calendarJs, /data-wt-sheet-grip/);
});

test('date selection opens the bottom sheet directly to full state', () => {
  assert.match(calendarJs, /let _workoutHomeSheetState = 'bar'/);
  assert.doesNotMatch(calendarJs, /_workoutHomeSheetSettleTimer/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_STATES = \['bar', 'full'\]/);
  assert.match(calendarJs, /const WORKOUT_HOME_SHEET_CLASS_STATES = \['bar', 'full'\]/);
  assert.doesNotMatch(calendarJs, /_animateWorkoutHomeSheetTo/);
  assert.doesNotMatch(calendarJs, /requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(apply\)\)/);
  assert.match(calendarJs, /_workoutHomeSheetState = 'full'[\s\S]*sheetState: 'full'/);
});

test('sheet tap toggles directly between bar and full without drag or suppression code', () => {
  const toggleStart = calendarJs.indexOf('function _toggleWorkoutHomeSheet');
  const toggleEnd = calendarJs.indexOf('function _bindWorkoutHomeSheetActions', toggleStart);
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'toggle source should be present');
  const toggleFn = calendarJs.slice(toggleStart, toggleEnd);

  assert.match(toggleFn, /_currentWorkoutHomeSheetState\(\) === 'bar'/);
  assert.match(toggleFn, /_workoutHomeSheetState = 'full'/);
  assert.match(toggleFn, /sheetState: 'full'/);
  assert.match(toggleFn, /renderWorkoutCalendarHome\(\)/);
  assert.match(toggleFn, /_setWorkoutHomeSheetState\('bar'\)/);
  assert.match(calendarJs, /window\._wtCalToggleSheet = _toggleWorkoutHomeSheet/);
  assert.doesNotMatch(calendarJs, /function _stepWorkoutHomeSheet/);
  assert.doesNotMatch(calendarJs, /function _resolveWorkoutHomeSheetDragTarget/);
  assert.doesNotMatch(calendarJs, /function _startWorkoutHomeSheetDrag/);
  assert.doesNotMatch(calendarJs, /_handleWorkoutHomeSheetHandleClick/);
  assert.doesNotMatch(calendarJs, /function _handleWorkoutHomeSheetKey/);
  assert.doesNotMatch(calendarJs, /pointerdown|pointermove|pointerup|pointercancel/);
  assert.doesNotMatch(calendarJs, /_consumeWorkoutHomeSuppressedClick/);
  assert.doesNotMatch(calendarJs, /_suppressWorkoutHomeSheetClick/);
  assert.doesNotMatch(calendarJs, /SuppressSheetClick|suppressNextSheetClick/);
  assert.doesNotMatch(calendarJs, /DEADZONE|FLING|velocityY|hasMoved|openLatched|closeLatched/);
  assert.doesNotMatch(calendarJs, /wt-day-sheet-drag|is-dragging/);
});

test('full sheet isolates background calendar input without restoring sheet drag', () => {
  const bindStart = calendarJs.indexOf('function _bindWorkoutHomeSheetInputIsolation');
  const bindEnd = calendarJs.indexOf('function _workoutHomeSheetTouchWouldChain', bindStart);
  assert.ok(bindStart >= 0 && bindEnd > bindStart, 'input isolation source should be present');
  const bindFn = calendarJs.slice(bindStart, bindEnd);

  assert.match(calendarJs, /_bindWorkoutHomeSheetInputIsolation\(root\)/);
  assert.match(bindFn, /root\?\.querySelector\?\.\('\[data-wt-sheet-backdrop\]'\)/);
  assert.match(bindFn, /backdrop\?\.addEventListener\('touchmove', blockBackgroundInput, \{ passive: false \}\)/);
  assert.match(bindFn, /backdrop\?\.addEventListener\('wheel', blockBackgroundInput, \{ passive: false \}\)/);
  assert.match(bindFn, /event\.target\?\.closest\?\.\('\.wt-day-sheet-scroll'\)/);
  assert.match(bindFn, /if \(event\.cancelable\) event\.preventDefault\(\)/);
  assert.match(bindFn, /event\.stopPropagation\(\)/);
  assert.match(bindFn, /scroller\.addEventListener\('touchmove'[\s\S]*\{ passive: false \}\)/);
  assert.match(bindFn, /scroller\.addEventListener\('wheel'[\s\S]*\{ passive: false \}\)/);
  assert.match(calendarJs, /function _workoutHomeSheetTouchWouldChain/);
  assert.match(calendarJs, /dy > 0 && scrollTop <= 0/);
  assert.match(calendarJs, /dy < 0 && scrollTop >= maxScrollTop - 1/);
  assert.match(calendarJs, /function _workoutHomeSheetWheelWouldChain/);
  assert.match(calendarJs, /deltaY < 0 && scrollTop <= 0/);
  assert.match(calendarJs, /deltaY > 0 && scrollTop >= maxScrollTop - 1/);
  assert.doesNotMatch(bindFn, /pointerdown|pointermove|pointerup|pointercancel/);
  assert.doesNotMatch(bindFn, /_suppressWorkoutHomeSheetClick|_consumeWorkoutHomeSuppressedClick|_resolveWorkoutHomeSheetDragTarget/);
});

test('full sheet header tap collapses through the sheet toggle path', () => {
  const barStart = calendarJs.indexOf('function _renderWorkoutHomeDayBar');
  const barEnd = calendarJs.indexOf('function _renderWorkoutHomeBottomSheet', barStart);
  const barFn = calendarJs.slice(barStart, barEnd);
  const bindStart = calendarJs.indexOf('function _bindWorkoutHomeSheetActions');
  const bindEnd = calendarJs.indexOf('function _bindWorkoutCycleRailActions', bindStart);
  const bindFn = calendarJs.slice(bindStart, bindEnd);
  const applyStart = calendarJs.indexOf('function _applyWorkoutHomeSheetState');
  const applyEnd = calendarJs.indexOf('function _setWorkoutHomeSheetState', applyStart);
  const applyFn = calendarJs.slice(applyStart, applyEnd);

  assert.match(barFn, /class="cal-workout-day-main" data-wt-sheet-main data-wt-sheet-toggle data-date-key=/);
  assert.match(barFn, /data-wt-sheet-main data-wt-sheet-toggle data-date-key="\$\{selected\}" aria-expanded="\$\{expanded \? 'true' : 'false'\}" aria-label="\$\{expanded \? '날짜 상세 접기' : '선택한 날짜 열기'\}"/);
  assert.match(barFn, /onclick="window\._wtCalGoToday\(\)">오늘<\/button>/);
  assert.doesNotMatch(barFn, />루틴<\/button>/);
  assert.doesNotMatch(barFn, /window\._wtCalOpenRoutine\('\$\{selected\}'\)/);
  assert.doesNotMatch(barFn, /cal-workout-day-main" onclick="window\._wtCalOpenDay/);
  assert.doesNotMatch(barFn, /data-wt-sheet-toggle onclick="window\._wtCalToggleSheet/);
  assert.match(bindFn, /target\?\.closest\?\.\('\[data-wt-sheet-action\]'\)[\s\S]*return/);
  assert.match(bindFn, /target\?\.closest\?\.\('\[data-wt-sheet-toggle\]'\)/);
  assert.match(bindFn, /_toggleWorkoutHomeSheet\(toggle\.getAttribute\('data-date-key'\) \|\| _workoutHomeSelectedKey\)/);
  assert.match(applyFn, /querySelectorAll\('\[data-wt-sheet-toggle\]'\)\.forEach/);
  assert.match(applyFn, /toggle\.setAttribute\('aria-expanded', expandedText\)/);
  assert.match(applyFn, /toggle\.setAttribute\('aria-label', toggleLabel\)/);
  assert.match(applyFn, /const arrow = sheet\.querySelector\('\.cal-workout-day-expand\[data-wt-sheet-toggle\]'\)/);
  assert.match(applyFn, /arrow\.textContent = expanded \? '⌄' : '⌃'/);
  assert.match(applyFn, /backdrop\.setAttribute\('aria-hidden', expanded \? 'false' : 'true'\)/);
  assert.match(applyFn, /backdrop\.toggleAttribute\('hidden', !expanded\)/);
  assert.doesNotMatch(applyFn, /const toggle = sheet\.querySelector\('\[data-wt-sheet-toggle\]'\)/);
  assert.doesNotMatch(applyFn, /toggle\.textContent =/);
  assert.doesNotMatch(applyFn, /data-wt-sheet-handle/);
});

test('floating add button uses direct sheet action binding', () => {
  const detailStart = calendarJs.indexOf('function _renderWorkoutHomeDetail');
  const detailEnd = calendarJs.indexOf('function _renderWorkoutDetailSummaryCard', detailStart);
  assert.ok(detailStart >= 0 && detailEnd > detailStart, 'workout detail renderer should be present');
  const detail = calendarJs.slice(detailStart, detailEnd);
  assert.match(detail, /const fabAttrs = runningActive[\s\S]*data-wt-day-add-running[\s\S]*data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(detail, /:\s*`data-wt-day-add-session data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(detail, /class="wt-day-fab \$\{runningActive \? 'wt-day-fab--running' : ''\}"/);
  assert.doesNotMatch(detail, /class="wt-day-fab"[^>]*onclick=/);
  assert.match(calendarJs, /_bindWorkoutHomeSheetActions\(root\)/);
  assert.match(calendarJs, /function _bindWorkoutHomeSheetActions\(root\)/);
  assert.match(calendarJs, /sheet\.addEventListener\('click', \([\s\S]*\}, true\)/);
  assert.match(calendarJs, /event\.target instanceof Element \? event\.target : event\.target\?\.parentElement/);
  assert.match(calendarJs, /const addRunning = target\?\.closest\?\.\('\[data-wt-day-add-running\]'\)/);
  assert.match(calendarJs, /Promise\.resolve\(_openWorkoutHomeRunning\(key\)\)/);
  assert.match(calendarJs, /target\?\.closest\?\.\('\[data-wt-day-add-session\]'\)/);
  assert.match(calendarJs, /event\.stopPropagation\(\)/);
  assert.match(calendarJs, /Promise\.resolve\(_addWorkoutHomeSession\(key\)\)/);
});

test('day sheet add picker stays on the current sheet session', () => {
  const loadStart = calendarJs.indexOf('async function _loadWorkoutStateForSheetSession');
  const loadEnd = calendarJs.indexOf('async function _refreshWorkoutHomeAfterPickerSelect', loadStart);
  const refreshStart = loadEnd;
  const refreshEnd = calendarJs.indexOf('function _sortedCheckins', refreshStart);
  const addStart = calendarJs.indexOf('async function _addWorkoutHomeSession');
  const addEnd = calendarJs.indexOf('async function _openWorkoutHomeRunning', addStart);
  assert.ok(loadStart >= 0 && loadEnd > loadStart, 'sheet state loader should exist');
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart, 'sheet refresh callback should exist');
  assert.ok(addStart >= 0 && addEnd > addStart, 'sheet add action should exist');
  const loader = calendarJs.slice(loadStart, loadEnd);
  const refresh = calendarJs.slice(refreshStart, refreshEnd);
  const addFn = calendarJs.slice(addStart, addEnd);

  assert.match(loader, /window\.__wtTargetSessionIndex = Math\.max\(0, Math\.floor\(Number\(sessionIndex\) \|\| 0\)\)/);
  assert.match(loader, /const loader = window\._wtExports\?\.loadWorkoutDate \|\| window\.loadWorkoutDate/);
  assert.doesNotMatch(loader, /wtOpenWorkoutRecord|pushWorkoutRecord|switchTab\('workout'/);
  assert.match(refresh, /openWorkoutDaySheet\(key,[\s\S]*sheetState:\s*'full'[\s\S]*action:\s*'sheet:add-exercise'/);
  assert.match(refresh, /timerBar\.classList\.add\('wt-open'\)/);
  assert.match(refresh, /renderWorkoutCalendarHome\(\)/);
  assert.match(addFn, /const targetKey = _parseDateKey\(key\) \? key : _workoutHomeSelectedKey/);
  assert.match(addFn, /const targetIndex = Math\.max\(0, Math\.min\(_workoutHomeSessionIndex, WORKOUT_GYM_SESSION_COUNT - 1\)\)/);
  assert.doesNotMatch(addFn, /findIndex\(session => !hasWorkoutSessionData\(session\)\)/);
  assert.doesNotMatch(addFn, /_loadWorkoutEditorForSession\(key, targetIndex\)/);
  assert.match(addFn, /_loadWorkoutStateForSheetSession\(targetKey, targetIndex\)/);
  assert.match(addFn, /window\.wtOpenExercisePicker\(\{[\s\S]*source:\s*'workout-day-sheet'[\s\S]*afterSelect: detail => _refreshWorkoutHomeAfterPickerSelect\(targetKey, targetIndex, detail\)/);
  assert.doesNotMatch(calendarJs, /function _openWorkoutEditorForSession|function _loadWorkoutEditorForSession|window\.wtOpenWorkoutRecord/);
});

test('day sheet detail renders picker-added draft exercise rows', () => {
  const rowStart = calendarJs.indexOf('function _exerciseRows');
  const rowEnd = calendarJs.indexOf('function _workoutMetrics', rowStart);
  const metricsEnd = calendarJs.indexOf('function _renderWorkoutHomeDayBar');
  const detailStart = calendarJs.indexOf('function _renderWorkoutHomeDetailHtml');
  const detailEnd = calendarJs.indexOf('function _renderWorkoutDetailSummaryCard', detailStart);
  const tabStart = calendarJs.indexOf('function _renderWorkoutDetailSessionTabs');
  const tabEnd = calendarJs.indexOf('function _renderWorkoutDetailRecorded', tabStart);
  assert.ok(rowStart >= 0 && rowEnd > rowStart, 'exercise row mapper should exist');
  assert.ok(detailStart >= 0 && detailEnd > detailStart, 'day sheet detail renderer should exist');
  assert.ok(tabStart >= 0 && tabEnd > tabStart, 'session tab renderer should exist');
  const rows = calendarJs.slice(rowStart, rowEnd);
  const metrics = calendarJs.slice(rowEnd, metricsEnd);
  const detail = calendarJs.slice(detailStart, detailEnd);
  const tabs = calendarJs.slice(tabStart, tabEnd);

  assert.match(calendarJs, /function _hasDraftWorkoutEntry/);
  assert.match(rows, /includeDraftExercises/);
  assert.match(rows, /rawSetDetails/);
  assert.match(rows, /const hasDraftExercise = includeDraftExercises && _hasDraftWorkoutEntry\(entry\)/);
  assert.match(rows, /if \(!sets\.length && !note && !hasDraftExercise\) return null/);
  assert.match(metrics, /_exerciseRows\(d, lookup, key, options\)/);
  assert.match(detail, /_workoutMetrics\(key, session, bodyWeight, lookup, \{ includeDraftExercises: true \}\)/);
  assert.match(tabs, /_hasWorkoutHomeSessionRecord\(session\)/);
});

test('day sheet exercise card edit stays inline instead of opening the record route', () => {
  const cardStart = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard');
  const cardEnd = calendarJs.indexOf('function _renderWorkoutRunningDetailCard', cardStart);
  const rowsStart = calendarJs.indexOf('function _renderWorkoutSetInput');
  const rowsEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', rowsStart);
  const oldEditStart = calendarJs.indexOf('function _editWorkoutHomeSession');
  const oldEditEnd = calendarJs.indexOf('async function _addWorkoutHomeSession', oldEditStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'exercise detail card renderer should exist');
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'set row renderer should exist');
  assert.ok(oldEditStart >= 0 && oldEditEnd > oldEditStart, 'legacy edit session function should exist');
  const card = calendarJs.slice(cardStart, cardEnd);
  const setRows = calendarJs.slice(rowsStart, rowsEnd);
  const oldEditFn = calendarJs.slice(oldEditStart, oldEditEnd);

  assert.match(card, /const editing = _workoutEditingCardId === cardId && !collapsed/);
  assert.match(card, /window\._wtCalEditExerciseCard\('\$\{cardId\}'\)/);
  assert.match(card, /window\._wtCalFinishExerciseEdit\('\$\{cardId\}'\)/);
  assert.match(card, /window\._wtCalAddExerciseSet\('\$\{key\}', \$\{sessionIndex\}, \$\{originalIndex\}\)/);
  assert.doesNotMatch(card, /window\._wtCalEditSession\('\$\{key\}', \$\{sessionIndex\}\)/);
  assert.match(setRows, /window\._wtCalUpdateExerciseSet/);
  assert.match(setRows, /window\._wtCalToggleExerciseSetDone/);
  assert.match(setRows, /window\._wtCalRemoveExerciseSet/);
  assert.doesNotMatch(oldEditFn, /_openWorkoutEditorForSession/);
  assert.match(oldEditFn, /action:\s*'sheet:edit-inline'/);
  assert.match(calendarJs, /window\._wtCalEditExerciseCard = _editWorkoutExerciseCard/);
  assert.match(calendarJs, /window\._wtCalUpdateExerciseSet = _updateWorkoutExerciseSetFromSheet/);
  assert.match(calendarJs, /upsertWorkoutSession\(day, nextSession, index, \{ now: Date\.now\(\) \}\)/);
  assert.match(styleCss, /\.wt-max-set-main label input\s*\{/);
  assert.match(styleCss, /\.wt-max-rom-inline\.is-editing input\s*\{/);
  assert.match(styleCss, /\.wt-max-set-toggle,\s*\n\.wt-max-set-remove-btn\s*\{/);
});

test('workout bottom sheet replaces the third gym session with a dedicated running tab', () => {
  const tabStart = calendarJs.indexOf('function _renderWorkoutDetailSessionTabs');
  const tabEnd = calendarJs.indexOf('function _renderWorkoutDetailRecorded', tabStart);
  const openStart = calendarJs.indexOf('async function _openWorkoutHomeRunning');
  const openEnd = calendarJs.indexOf('function _formatWorkoutExportText', openStart);
  assert.ok(tabStart >= 0 && tabEnd > tabStart, 'session tab renderer should be present');
  assert.ok(openStart >= 0 && openEnd > openStart, 'running opener should be present');
  const tabs = calendarJs.slice(tabStart, tabEnd);
  const opener = calendarJs.slice(openStart, openEnd);

  assert.match(calendarJs, /const WORKOUT_GYM_SESSION_COUNT = 2/);
  assert.match(calendarJs, /const WORKOUT_RUNNING_SESSION_INDEX = 2/);
  assert.match(tabs, /\.slice\(0, WORKOUT_GYM_SESSION_COUNT\)/);
  assert.match(tabs, /window\._wtCalSelectRunning\(\)/);
  assert.match(tabs, />\s*러닝\$\{hasRunning \? '<b><\/b>' : ''\}\s*<\/button>/);
  assert.doesNotMatch(tabs, /3회차/);
  assert.match(calendarJs, /function _selectWorkoutHomeRunning\(\)[\s\S]*_workoutHomeSessionIndex = WORKOUT_RUNNING_SESSION_INDEX/);
  assert.match(calendarJs, /window\._wtCalSelectRunning = _selectWorkoutHomeRunning/);
  assert.match(calendarJs, /window\._wtCalAddRunning = _openWorkoutHomeRunning/);
  assert.match(opener, /_loadWorkoutStateForSheetSession\(targetKey, WORKOUT_RUNNING_SESSION_INDEX\)/);
  assert.doesNotMatch(opener, /_loadWorkoutEditorForSession|wtOpenWorkoutRecord/);
  assert.match(opener, /await import\('\.\/workout\/running-session\.js'\)/);
  assert.match(opener, /window\.wtOpenRunningSession\(\)/);
  assert.match(styleCss, /\.wt-day-fab--running/);
  assert.match(styleCss, /\.wt-running-empty \.wt-empty-center/);
});

test('running detail card uses the workout read-card shell with running metrics only', () => {
  const metricStart = calendarJs.indexOf('function _runningMetricItems');
  const mapStart = calendarJs.indexOf('function _renderRunningRouteMap');
  const cardStart = calendarJs.indexOf('function _renderWorkoutRunningDetailCard');
  const cardEnd = calendarJs.indexOf('function _renderWorkoutActivityDetailCard', cardStart);
  assert.ok(metricStart >= 0 && metricStart < cardStart, 'running metric builder should exist before the card');
  assert.ok(mapStart >= 0 && mapStart < cardStart, 'running map renderer should exist before the card');
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'running detail card renderer should exist');
  const metricBuilder = calendarJs.slice(metricStart, cardStart);
  const mapRenderer = calendarJs.slice(mapStart, cardStart);
  const card = calendarJs.slice(cardStart, cardEnd);

  assert.match(calendarJs, /import \{ destroyRunningMaps, renderRunningMap \} from '\.\/workout\/running-map\.js'/);
  assert.match(calendarJs, /function _mountWorkoutRunningMaps/);
  assert.match(calendarJs, /renderRunningMap\(shell, \{ points: payload\.points, phase: 'detail' \}\)/);
  assert.match(calendarJs, /runRouteSummary && typeof d\.runRouteSummary === 'object'/);
  assert.match(calendarJs, /distanceKm:\s*runDistance/);
  assert.match(calendarJs, /avgPaceSecPerKm:\s*_num\(d\.runAvgPaceSecPerKm\)/);
  assert.match(calendarJs, /placeSummary:\s*d\.runPlaceSummary \|\| null/);
  assert.match(calendarJs, /avgHeartRateBpm:\s*Number\(runSummary\.avgHeartRateBpm\) > 0/);
  assert.match(calendarJs, /if \(row\?\.key === 'running'\) return _renderWorkoutRunningDetailCard/);
  assert.match(card, /wt-day-ex-card wt-max-read-card wt-running-read-card/);
  assert.match(card, /wt-running-headline/);
  assert.match(card, /_renderRunningRouteMap\(row\)/);
  assert.match(mapRenderer, /wt-running-route-map wt-run-real-map/);
  assert.match(mapRenderer, /data-wt-running-route-map/);
  assert.match(mapRenderer, /wt-running-route-place/);
  assert.match(mapRenderer, /실제 지도 준비 중/);
  assert.match(card, /wt-running-metric-grid/);
  assert.match(metricBuilder, /거리/);
  assert.match(metricBuilder, /시간/);
  assert.match(metricBuilder, /평균 페이스/);
  assert.match(metricBuilder, /칼로리/);
  assert.match(metricBuilder, /고도 상승/);
  assert.match(metricBuilder, /평균 심박수/);
  assert.match(metricBuilder, /케이던스/);
  assert.match(metricBuilder, /row\.elevationGainM == null \? '--'/);
  assert.match(metricBuilder, /row\.avgHeartRateBpm == null \? '--'/);
  assert.match(metricBuilder, /row\.cadenceSpm == null \? '--'/);
  assert.doesNotMatch(card, /REP|RIR|KG|_renderWorkoutSetRows|wt-max-set-row/);
  assert.doesNotMatch(card, /wt-max-plan wt-running-plan|wt-running-route-mini|경로 포인트|GPS 평균 정확도|대한민국 위치 기록|오늘 러닝|row\.detail/);
  assert.match(calendarJs, /function _renderRunningRouteDetail\(row\) \{\s*return '';\s*\}/);
  assert.match(styleCss, /\.wt-running-read-card/);
  assert.match(styleCss, /\.wt-running-route-map/);
  assert.match(styleCss, /\.wt-running-route-place/);
  assert.doesNotMatch(styleCss, /wt-running-route-mini/);
  assert.match(styleCss, /\.wt-running-metric-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styleCss, /\.wt-running-read-card\.is-collapsed \.wt-running-metric-grid/);
});

test('bottom sheet css is fixed, animated, and contains the session bar inside the sheet', () => {
  assert.match(styleCss, /\.cal-workout-day-backdrop\s*\{[\s\S]*position:\s*fixed;[\s\S]*z-index:\s*42;[\s\S]*display:\s*none;[\s\S]*pointer-events:\s*none;[\s\S]*touch-action:\s*auto;[\s\S]*overscroll-behavior:\s*auto;/);
  assert.match(styleCss, /\.cal-workout-day-backdrop\.is-full\s*\{[\s\S]*display:\s*block;[\s\S]*pointer-events:\s*auto;[\s\S]*touch-action:\s*none;[\s\S]*overscroll-behavior:\s*none;/);
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*position:\s*fixed;[\s\S]*transition:[\s\S]*height 260ms/);
  assert.match(styleCss, /height:\s*var\(--wt-day-sheet-height\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*--wt-day-sheet-height:\s*clamp\(72px,\s*10dvh,\s*96px\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet\s*\{[\s\S]*--wt-day-sheet-full-clearance:\s*112px/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full\s*\{[\s\S]*100dvh - var\(--wt-day-sheet-full-clearance\)[\s\S]*overscroll-behavior:\s*contain;/);
  assert.match(styleCss, /\.cal-workout-day-expand\s*\{[\s\S]*touch-action:\s*manipulation;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.cal-workout-day-bar\s*\{[\s\S]*touch-action:\s*manipulation;/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full \.cal-workout-day-bar\s*\{[\s\S]*touch-action:\s*none;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sessionbar\s*\{[\s\S]*position:\s*relative;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sessionbar\s*\{[\s\S]*padding:\s*7px 82px/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch;/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*touch-action:\s*pan-y;/);
  assert.match(styleCss, /#tab-workout\.wt-calendar-home-mode:has\(#wt-workout-timer-bar\.wt-open\) \.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*padding-bottom:\s*calc\(86px \+ env\(safe-area-inset-bottom,\s*0px\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-fab\s*\{[\s\S]*bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom,\s*0px\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-fab\s*\{[\s\S]*pointer-events:\s*auto;[\s\S]*touch-action:\s*manipulation;/);
  assert.doesNotMatch(styleCss, /wt-workout-sheet-scroll-lock|wt-day-sheet-drag|is-dragging|is-mid/);
});

test('collapsed day sheet bar is a compact one-row affordance', () => {
  assert.match(styleCss, /\.workout-calendar-root\s*\{[\s\S]*padding:\s*0 var\(--wt-calendar-scroll-gutter,\s*0px\) 124px 0/);
  assert.match(styleCss, /\.workout-calendar-root\s*\{[\s\S]*scrollbar-gutter:\s*stable;/);
  assert.match(styleCss, /\.cal-workout-day-bar\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(styleCss, /\.cal-workout-day-bar\s*\{[\s\S]*min-height:\s*64px/);
  assert.match(styleCss, /\.cal-workout-day-main\s*\{[\s\S]*flex-direction:\s*row/);
  assert.match(styleCss, /\.cal-workout-day-expand\s*\{[\s\S]*position:\s*absolute;[\s\S]*left:\s*50%;[\s\S]*translate:\s*-50% 0;[\s\S]*touch-action:\s*manipulation;[\s\S]*animation:\s*wt-sheet-arrow-pulse/);
  assert.doesNotMatch(styleCss, /cal-workout-day-grip/);
  assert.match(styleCss, /\.cal-workout-day-sheet\.is-full \.cal-workout-day-expand\s*\{[\s\S]*animation:\s*wt-sheet-arrow-pulse-down/);
  assert.match(styleCss, /@keyframes wt-sheet-arrow-pulse/);
  assert.match(styleCss, /@keyframes wt-sheet-arrow-pulse-down/);
});

test('workout calendar mobile grid reserves a wider week rail', () => {
  const start = styleCss.indexOf('@media (max-width: 430px)');
  const end = styleCss.indexOf('.cal-workout-day-sheet', start);
  assert.ok(start >= 0 && end > start, 'mobile calendar css block should be present');
  const mobileCss = styleCss.slice(start, end);

  assert.match(styleCss, /--cal-cycle-rail-width:\s*94px/);
  assert.match(styleCss, /--wt-calendar-scroll-gutter:\s*max\(14px,\s*env\(safe-area-inset-right,\s*0px\)\)/);
  assert.match(mobileCss, /--wt-calendar-scroll-gutter:\s*max\(18px,\s*env\(safe-area-inset-right,\s*0px\)\)/);
  assert.match(mobileCss, /\.cal-workout-surface-home \.cal-weekdays\s*\{[\s\S]*grid-template-columns:\s*var\(--cal-cycle-rail-width\) repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(mobileCss, /\.cal-workout-week-row\s*\{[\s\S]*grid-template-columns:\s*var\(--cal-cycle-rail-width\) minmax\(0,\s*1fr\)/);
  assert.match(mobileCss, /\.cal-workout-surface-home \.cal-workout-cell\s*\{[\s\S]*padding:\s*7px 1px 4px/);
  assert.match(mobileCss, /\.cal-workout-surface-home \.cal-workout-bar\s*\{[\s\S]*padding:\s*1px 2px;[\s\S]*font-size:\s*9\.5px/);
});

test('workout calendar week rail renders cycle prescriptions instead of weekly aggregates', () => {
  assert.match(calendarJs, /const scrollSurfaceAttr = isWorkoutHome \? ' data-wt-calendar-scroll-surface' : ''/);
  assert.match(calendarJs, /<div class="cal-workout-surface \$\{surfaceClass\}"\$\{scrollSurfaceAttr\}>/);
  const gridStart = calendarJs.indexOf('function _renderWorkoutHomeMonthGrid');
  const gridEnd = calendarJs.indexOf('function _renderWorkoutHomeDayBar', gridStart);
  assert.ok(gridStart >= 0 && gridEnd > gridStart, 'workout month grid renderer should exist');
  const grid = calendarJs.slice(gridStart, gridEnd);
  const weekRowStart = styleCss.indexOf('.cal-workout-week-row {');
  const weekRowEnd = styleCss.indexOf('.cal-workout-week-row:last-child', weekRowStart);
  assert.ok(weekRowStart >= 0 && weekRowEnd > weekRowStart, 'week row css rule should exist');
  const weekRowRule = styleCss.slice(weekRowStart, weekRowEnd);

  assert.match(calendarJs, /getTestBoardV2/);
  assert.match(grid, /class="cal-workout-month-grid" data-wt-calendar-scroll-surface/);
  assert.match(styleCss, /\.cal-workout-surface-home\s*\{[\s\S]*touch-action:\s*pan-y/);
  assert.match(styleCss, /\.cal-workout-month-grid\s*\{[\s\S]*touch-action:\s*pan-y/);
  assert.match(calendarJs, /activeBenchmarks/);
  assert.match(calendarJs, /buildExerciseProgramWorkoutPrescription/);
  assert.match(calendarJs, /const plan = rx\?\.plan \|\| \{\}/);
  assert.match(calendarJs, /const displayWeek = Number\(isWendler \? \(plan\.cycleWeek \|\| plan\.week \|\| cycleWeek\) : cycleWeek\) \|\| cycleWeek/);
  assert.match(calendarJs, /programWeekText/);
  assert.match(calendarJs, /function _cycleRailExerciseLabel\(benchmark = \{\}\)/);
  assert.match(calendarJs, /return String\(benchmark\.short \|\| benchmark\.label \|\| '종목'\)\.trim\(\) \|\| '종목'/);
  assert.match(calendarJs, /weekLabel:\s*`W\$\{_fmtNum\(displayWeek, 0\)\}`/);
  assert.match(calendarJs, /exerciseLabel:\s*_cycleRailExerciseLabel\(bm\)/);
  assert.match(calendarJs, /targetLabel:\s*`목표 \$\{kgText\}`/);
  assert.match(calendarJs, /function _buildWorkoutCycleRailItems/);
  assert.match(calendarJs, /function _renderWorkoutCycleRail/);
  assert.match(calendarJs, /benchmarkId:\s*bm\.id/);
  assert.match(calendarJs, /data-cal-cycle-target="\$\{_esc\(item\.benchmarkId\)\}"/);
  assert.match(calendarJs, /cal-cycle-branch-head/);
  assert.match(calendarJs, /cal-cycle-branch-week/);
  assert.match(calendarJs, /cal-cycle-branch-name/);
  assert.match(calendarJs, /cal-cycle-branch-target/);
  assert.match(calendarJs, /function _bindWorkoutCycleRailActions\(root\)/);
  assert.match(calendarJs, /target\?\.closest\?\.\('\[data-cal-cycle-target\]'\)/);
  assert.match(calendarJs, /event\.stopPropagation\(\)/);
  assert.match(calendarJs, /function _openWorkoutCycleTargetSettings/);
  assert.match(calendarJs, /window\.tm2OpenBenchmarkSettings/);
  assert.match(calendarJs, /function _workoutCalendarRowWeekStart/);
  assert.match(calendarJs, /const rowMonday = new Date\(y, m, \(row \* 7\) - firstDow \+ 2\)/);
  assert.match(grid, /const weekStart = _workoutCalendarRowWeekStart\(y, m, row, firstDow\)/);
  assert.match(grid, /const cycleItems = _buildWorkoutCycleRailItems\(cycleBoard, weekStart\)/);
  assert.match(grid, /_renderWorkoutCycleRail\(weekStart, cycleItems\)/);
  assert.doesNotMatch(grid, /weekDurationSec|weekSets|weekNo|_formatWorkoutWeekHours/);
  assert.doesNotMatch(calendarJs, />\$\{weekNo\}주<\/strong>/);
  assert.match(calendarJs, /cal-cycle-branch-text/);
  assert.match(styleCss, /\.cal-cycle-rail-line/);
  assert.match(styleCss, /\.cal-cycle-rail-line\s*\{[\s\S]*top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*border-left:\s*2px solid var\(--cal-cycle-rail-color,\s*#aeb9c5\)/);
  assert.match(styleCss, /\.cal-workout-week-row:nth-child\(6n \+ 2\)\s*\{\s*--cal-cycle-rail-color:\s*#b3bdc8;\s*\}/);
  assert.match(styleCss, /\.cal-workout-week-row:nth-child\(6n \+ 6\)\s*\{\s*--cal-cycle-rail-color:\s*#b5bec9;\s*\}/);
  assert.match(styleCss, /\.cal-cycle-branch::before/);
  assert.match(styleCss, /\.cal-cycle-branch::before\s*\{[\s\S]*border-top:\s*2px solid var\(--cal-cycle-rail-color,\s*#aeb9c5\)/);
  assert.match(styleCss, /\.cal-cycle-branch-text/);
  assert.match(styleCss, /\.cal-cycle-branch-text\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(styleCss, /\.cal-cycle-branch-head\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow:\s*hidden;[\s\S]*white-space:\s*nowrap/);
  assert.match(styleCss, /\.cal-cycle-branch-week/);
  assert.match(styleCss, /\.cal-cycle-branch-name\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-width:\s*0;[\s\S]*font-size:\s*8px/);
  assert.match(styleCss, /\.cal-cycle-branch-target/);
  assert.match(styleCss, /\.cal-cycle-branch\s*\{[\s\S]*min-height:\s*23px;[\s\S]*font-size:\s*8\.5px;[\s\S]*line-height:\s*10px/);
  assert.match(styleCss, /\.cal-cycle-branch\.is-wendler/);
  assert.match(styleCss, /\.cal-cycle-branch\.is-intensity/);
  assert.match(weekRowRule, /grid-template-columns:\s*var\(--cal-cycle-rail-width\) minmax\(0,\s*1fr\)/);
  assert.match(weekRowRule, /min-height:\s*144px/);
  assert.doesNotMatch(weekRowRule, /border-bottom:/);
  assert.match(styleCss, /\.cal-workout-week-cells\s*\{[\s\S]*border-bottom:\s*1px solid #dfe1e8/);
  assert.match(styleCss, /\.cal-workout-week-row:last-child \.cal-workout-week-cells\s*\{[\s\S]*border-bottom:\s*0/);
  assert.match(styleCss, /\.cal-cycle-branch\s*\{[\s\S]*background:\s*#d7e4ed;[\s\S]*color:\s*#33404a/);
  assert.match(styleCss, /\.cal-cycle-branch\.is-wendler\s*\{[\s\S]*background:\s*#d7e4ed;[\s\S]*color:\s*#33404a/);
  assert.match(styleCss, /\.cal-cycle-branch\.is-intensity\s*\{[\s\S]*background:\s*#d7e4ed;[\s\S]*color:\s*#33404a/);
});

test('cycle rail target cards open the existing growth-board benchmark settings sheet', () => {
  const rootsStart = tm2BoardJs.indexOf('function _ensureRoots');
  const rootsEnd = tm2BoardJs.indexOf('export function closeSheet', rootsStart);
  assert.ok(rootsStart >= 0 && rootsEnd > rootsStart, 'sheet root setup should exist');
  const rootsFn = tm2BoardJs.slice(rootsStart, rootsEnd);
  const settingsStart = tm2BoardJs.indexOf('export async function tm2OpenBenchmarkSettings');
  const settingsEnd = tm2BoardJs.indexOf('function _afterBoardReady', settingsStart);
  assert.ok(settingsStart >= 0 && settingsEnd > settingsStart, 'benchmark settings opener should exist');
  const settingsFn = tm2BoardJs.slice(settingsStart, settingsEnd);
  const openSheetStart = tm2BoardJs.indexOf('function _openSheet');
  const openSheetEnd = tm2BoardJs.indexOf('export async function tm2OpenBoard', openSheetStart);
  assert.ok(openSheetStart >= 0 && openSheetEnd > openSheetStart, 'sheet opener should exist');
  const openSheetFn = tm2BoardJs.slice(openSheetStart, openSheetEnd);

  assert.match(tm2BoardJs, /export async function tm2OpenBenchmarkSettings\(benchmarkId\)/);
  assert.match(tm2BoardJs, /S\.groupId = bm\.groupId \|\| S\.groupId/);
  assert.match(tm2BoardJs, /openColumnSheet\(bmId\)/);
  assert.match(settingsFn, /S\.settingsOnly = true/);
  assert.match(settingsFn, /classList\.remove\('tm2-open'\)/);
  assert.doesNotMatch(settingsFn, /renderBoard\(\)/);
  assert.doesNotMatch(settingsFn, /await tm2OpenBoard\(\)/);
  assert.match(rootsFn, /if \(e\.target\.closest\('\.tm2-sheet'\)\) return/);
  assert.match(openSheetFn, /querySelector\('\.tm2-sheet'\)\?\.addEventListener\('click'/);
  assert.match(openSheetFn, /\[data-tm2-col-cycle\]/);
  assert.match(openSheetFn, /event\.preventDefault\(\)/);
  assert.match(openSheetFn, /event\.stopImmediatePropagation\(\)/);
  assert.match(openSheetFn, /_onAction\(event\)/);
  assert.match(openSheetFn, /event\.stopPropagation\(\)/);
  assert.match(tm2EntryJs, /async function _openBenchmarkSettings\(benchmarkId\)/);
  assert.match(tm2EntryJs, /mod\.tm2OpenBenchmarkSettings\(benchmarkId\)/);
  assert.match(tm2EntryJs, /window\.tm2OpenBenchmarkSettings = _openBenchmarkSettings/);
});

test('growth-board benchmark settings sheet merges program choice and horizontal cycle rail', () => {
  const sheetStart = tm2BoardJs.indexOf('function _renderColumnSheet');
  const sheetEnd = tm2BoardJs.indexOf('async function _saveColumnSheet', sheetStart);
  assert.ok(sheetStart >= 0 && sheetEnd > sheetStart, 'column settings sheet renderer should exist');
  const sheetFn = tm2BoardJs.slice(sheetStart, sheetEnd);
  const wendlerStart = sheetFn.indexOf('${isWnd ? `');
  const wendlerEnd = sheetFn.indexOf('<div class="tm2-fld"><span class="tm2-lb">여유 횟수', wendlerStart);
  assert.ok(wendlerStart >= 0 && wendlerEnd > wendlerStart, 'wendler block should be isolated');
  const wendlerBlock = sheetFn.slice(wendlerStart, wendlerEnd);

  assert.match(sheetFn, /tm2-track-program-row/);
  assert.match(sheetFn, /data-action="tm2:col-program" data-program="wendler">웬들러<\/button>/);
  assert.match(sheetFn, /볼륨\/강도는 기본 계단/);
  assert.doesNotMatch(sheetFn, /운동 방식/);
  assert.match(sheetFn, /\$\{!isWnd \? `[\s\S]*세트 수/);
  assert.match(sheetFn, /\$\{!isWnd \? `[\s\S]*6주 성공 시 증량/);
  assert.doesNotMatch(wendlerBlock, /세트 수|6주 성공 시 증량|자세 메모|헬스장별 기구|보드 칸은 톱세트|메인 \+ \$/);
  assert.match(tm2BoardJs, /function _renderColumnCycleRail/);
  assert.match(tm2BoardJs, /function _cycleRailTracksForBenchmark/);
  assert.match(tm2BoardJs, /kind:\s*'wendler'/);
  assert.match(tm2BoardJs, /for \(const track of _cycleRailTracksForBenchmark\(bm, ctx\)\)/);
  assert.match(tm2BoardJs, /data-tm2-col-cycle/);
  assert.match(tm2BoardJs, /tm2-col-cycle-line/);
  assert.match(tm2BoardJs, /S\.sheet\.ctx\.program = 'stair'/);
  assert.match(tm2BoardJs, /document\.dispatchEvent\(new CustomEvent\('sheet:saved'\)\)/);
  assert.match(tm2Css, /\.tm2-col-cycle-track\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow-x:\s*auto/);
  assert.match(tm2Css, /\.tm2-col-cycle-track\s*\{[\s\S]*touch-action:\s*pan-x/);
  assert.match(tm2Css, /\.tm2-col-cycle-point,\s*\n\.tm2-col-cycle-line,\s*\n\.tm2-col-cycle-point \*,\s*\n\.tm2-col-cycle-line \*\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(tm2Css, /\.tm2-col-cycle-point,\s*\n\.tm2-col-cycle-line,\s*\n\.tm2-col-cycle-point \*,\s*\n\.tm2-col-cycle-line \*\s*\{[\s\S]*user-select:\s*none/);
  assert.match(tm2Css, /\.tm2-col-cycle-line\s*\{[\s\S]*border-top:\s*2px solid #d9dee5/);
  assert.match(tm2Css, /\.tm2-col-cycle-line::after/);
  assert.match(tm2Css, /\.tm2-track-toggle button\.tm2-program-wendler\.tm2-on/);
  assert.match(tm2Css, /\.tm2-wbox\s*\{[\s\S]*border:\s*0;[\s\S]*background:\s*transparent/);
  assert.doesNotMatch(tm2Css, /tm2-wendler-callout/);
});

test('workout calendar home header and monthly workout card stay compact', () => {
  assert.match(styleCss, /\.cal-workout-surface-home \.cal-header\s*\{[\s\S]*padding:\s*10px 16px 8px/);
  assert.match(styleCss, /\.cal-workout-surface-home \.cal-workout-summary\s*\{[\s\S]*margin:\s*6px 12px 7px;[\s\S]*padding:\s*6px 10px/);
  assert.match(styleCss, /\.cal-workout-surface-home \.cal-month-avg\s*\{[\s\S]*flex-direction:\s*row/);
  assert.match(styleCss, /\.cal-workout-surface-home \.cal-month-side\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*max-content\)/);
});

test('service worker cache version was bumped for workout calendar bottom sheet assets', () => {
  assert.match(swJs, /tomatofarm-v20260630z15-pwa-backdrop-touch/);
});
