import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const styleCss = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const tm2Css = readFileSync(new URL('../test-mode-v2.css', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const tm2EntryJs = readFileSync(new URL('../workout/test-v2/entry.js', import.meta.url), 'utf8');
const tm2BoardJs = readFileSync(new URL('../workout/test-v2/board-render.js', import.meta.url), 'utf8');

function extractFunctionSource(source, name) {
  const asyncStart = source.indexOf(`async function ${name}`);
  const normalStart = source.indexOf(`function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : normalStart;
  assert.ok(start >= 0, `${name} should exist`);
  const signatureEnd = source.indexOf(') {', start);
  const braceStart = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
  assert.ok(braceStart > start, `${name} body should start`);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body should end`);
}

function buildAddCarouselFocusHarnessScript() {
  const sourceBundle = [
    '_workoutHomeScrollRoot',
    '_restoreWorkoutSheetCarouselState',
    '_restoreWorkoutSheetCarouselToSlide',
    '_workoutSheetCarouselSnapshotKey',
    '_rememberWorkoutSheetCarouselSlide',
    '_requestWorkoutSheetPendingCarouselFocus',
    '_tryRestorePendingWorkoutSheetCarouselFocus',
    '_refreshWorkoutHomeAfterPickerSelect',
  ].map(name => extractFunctionSource(calendarJs, name)).join('\n\n');

  return `
    const WORKOUT_GYM_SESSION_COUNT = 2;
    const _workoutSheetCarouselSnapshots = new Map();
    const _workoutSheetPendingCarouselFocus = new Map();
    let _viewYear = 2026;
    let _viewMonth = 6;
    let _workoutHomeSelectedKey = '2026-07-06';
    let _workoutHomeSessionIndex = 0;
    let _workoutHomeView = 'detail';
    let _workoutHomeSheetState = 'full';
    window.__renderCalls = 0;
    window.__openCalls = [];
    window.__toastCalls = [];
    window.__exercises = ['인클라인 바벨 벤치프레스', '랫풀다운', '새로 추가한 덤벨 숄더프레스'];
    window.__allowAddedSlide = false;

    function _parseDateKey(key) {
      const match = String(key || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
      if (!match) return null;
      return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
    }
    function normalizeWorkoutExerciseSelectionDetail(detail = {}) {
      return { entryIdx: detail.entryIdx, existing: detail.existing === true };
    }
    function _workoutHomeScrollTop() { return 0; }
    function openWorkoutDaySheet(key, options = {}) {
      window.__openCalls.push({ key, options });
    }
    function renderWorkoutCalendarHome() {
      window.__renderCalls += 1;
      const root = document.getElementById('workout-calendar-root');
      const visibleExercises = window.__allowAddedSlide ? window.__exercises : window.__exercises.slice(0, 2);
      root.innerHTML = '<section data-wt-day-sheet><div class="wt-day-exercise-carousel-track" data-wt-day-exercise-carousel-track>' +
        visibleExercises.map((name, index) => (
          '<article class="wt-day-exercise-slide" data-wt-day-exercise-slide="' + index + '">' +
          '<h2>' + name + '</h2>' +
          '</article>'
        )).join('') +
        '</div></section>';
      _tryRestorePendingWorkoutSheetCarouselFocus(_workoutHomeSelectedKey, _workoutHomeSessionIndex);
    }
    window.showToast = (message, duration, type) => {
      window.__toastCalls.push({ message, duration, type });
      document.getElementById('qa-toast').textContent = message;
    };

    ${sourceBundle}

    window.__runAddCarouselFocusScenario = async () => {
      renderWorkoutCalendarHome();
      await _refreshWorkoutHomeAfterPickerSelect('2026-07-06', 0, { entryIdx: 2, existing: false });
      const afterImmediate = {
        slideCount: document.querySelectorAll('[data-wt-day-exercise-slide]').length,
        scrollLeft: document.querySelector('[data-wt-day-exercise-carousel-track]')?.scrollLeft ?? null,
        pendingSize: _workoutSheetPendingCarouselFocus.size,
        toastText: document.getElementById('qa-toast').textContent,
      };
      window.__allowAddedSlide = true;
      renderWorkoutCalendarHome();
      await new Promise(resolve => setTimeout(resolve, 260));
      const track = document.querySelector('[data-wt-day-exercise-carousel-track]');
      const slide = document.querySelector('[data-wt-day-exercise-slide="2"]');
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      const expectedScrollLeft = Math.min(slide.offsetLeft, maxScrollLeft);
      const trackRect = track.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();
      return {
        afterImmediate,
        afterDelayedRender: {
          slideCount: document.querySelectorAll('[data-wt-day-exercise-slide]').length,
          scrollLeft: track.scrollLeft,
          expectedScrollLeft,
          scrollDelta: Math.abs(track.scrollLeft - expectedScrollLeft),
          pendingSize: _workoutSheetPendingCarouselFocus.size,
          toastText: document.getElementById('qa-toast').textContent,
          visibleSlideTitle: slide.querySelector('h2')?.textContent || '',
          slideLeftWithinTrack: Math.round(slideRect.left - trackRect.left),
          slideRightWithinTrack: Math.round(slideRect.right - trackRect.left),
          trackWidth: Math.round(trackRect.width),
        },
        openCalls: window.__openCalls,
        toastCalls: window.__toastCalls,
        renderCalls: window.__renderCalls,
      };
    };
  `;
}

async function runAddCarouselFocusHarness() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.setContent(`<!doctype html>
      <html lang="ko">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #f7f7fb; }
            #workout-calendar-root { width: 390px; padding: 24px 18px; }
            .wt-day-exercise-carousel-track {
              width: 354px;
              display: flex;
              gap: 14px;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              padding: 0;
            }
            .wt-day-exercise-slide {
              flex: 0 0 354px;
              min-width: 0;
              height: 220px;
              scroll-snap-align: start;
            }
          </style>
        </head>
        <body>
          <main id="workout-calendar-root"></main>
          <div id="wt-workout-timer-bar"></div>
          <div id="qa-toast"></div>
        </body>
      </html>`);
    await page.addScriptTag({ content: buildAddCarouselFocusHarnessScript() });
    assert.deepEqual(pageErrors, []);
    const result = await page.evaluate(() => window.__runAddCarouselFocusScenario());
    assert.deepEqual(pageErrors, []);
    return result;
  } finally {
    await browser.close();
  }
}

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
  assert.match(bindFn, /let lastTouchX = 0/);
  assert.match(bindFn, /const dx = x - lastTouchX/);
  assert.match(bindFn, /_workoutHomeSheetCarouselShouldOwnTouch\(event, dx, dy\)[\s\S]*event\.stopPropagation\(\)[\s\S]*return/);
  assert.match(bindFn, /_workoutHomeSheetCarouselShouldOwnWheel\(event\)[\s\S]*event\.stopPropagation\(\)[\s\S]*return/);
  assert.match(calendarJs, /function _workoutHomeSheetCarouselShouldOwnTouch\(event, dx, dy\)/);
  assert.match(calendarJs, /function _workoutHomeSheetCarouselShouldOwnWheel\(event\)/);
  assert.match(calendarJs, /closest\?\.\('\[data-wt-day-exercise-carousel-track\]'\)/);
  assert.match(calendarJs, /return ax >= 4 && ax > ay/);
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
  assert.match(calendarJs, /import \{ normalizeWorkoutExerciseSelectionDetail \} from '\.\/workout\/exercise-entry-actions\.js'/);
  assert.match(refresh, /const selectionDetail = normalizeWorkoutExerciseSelectionDetail\(detail\)/);
  assert.match(refresh, /const entryIndex = selectionDetail\.entryIdx/);
  assert.match(refresh, /openWorkoutDaySheet\(key,[\s\S]*sheetState:\s*'full'[\s\S]*action:\s*'sheet:add-exercise'/);
  assert.match(refresh, /timerBar\.classList\.add\('wt-open'\)/);
  assert.match(refresh, /if \(entryIndex != null\) _requestWorkoutSheetPendingCarouselFocus\(key, targetIndex, entryIndex\)/);
  assert.match(refresh, /renderWorkoutCalendarHome\(\)/);
  assert.match(refresh, /if \(entryIndex != null\) _tryRestorePendingWorkoutSheetCarouselFocus\(key, targetIndex\)/);
  assert.match(refresh, /if \(!selectionDetail\.existing\) window\.showToast\?\.\('종목을 추가했어요'/);
  assert.match(addFn, /const targetKey = _parseDateKey\(key\) \? key : _workoutHomeSelectedKey/);
  assert.match(addFn, /const targetIndex = Math\.max\(0, Math\.min\(_workoutHomeSessionIndex, WORKOUT_GYM_SESSION_COUNT - 1\)\)/);
  assert.doesNotMatch(addFn, /findIndex\(session => !hasWorkoutSessionData\(session\)\)/);
  assert.doesNotMatch(addFn, /_loadWorkoutEditorForSession\(key, targetIndex\)/);
  assert.match(addFn, /_loadWorkoutStateForSheetSession\(targetKey, targetIndex\)/);
  assert.match(addFn, /window\.wtOpenExercisePicker\(\{[\s\S]*source:\s*'workout-day-sheet'[\s\S]*afterSelect: detail => _refreshWorkoutHomeAfterPickerSelect\(targetKey, targetIndex, detail\)/);
  assert.doesNotMatch(calendarJs, /function _openWorkoutEditorForSession|function _loadWorkoutEditorForSession|window\.wtOpenWorkoutRecord/);
});

test('day sheet add picker focuses the selected exercise carousel slide', () => {
  const pendingState = calendarJs.indexOf('const _workoutSheetPendingCarouselFocus = new Map()');
  const helperStart = calendarJs.indexOf('function _restoreWorkoutSheetCarouselToSlide');
  const helperEnd = calendarJs.indexOf('function _requestWorkoutSheetPendingCarouselFocus', helperStart);
  const pendingStart = helperEnd;
  const pendingEnd = calendarJs.indexOf('function _workoutSheetInputSelection', pendingStart);
  const refreshStart = calendarJs.indexOf('async function _refreshWorkoutHomeAfterPickerSelect');
  const refreshEnd = calendarJs.indexOf('function _sortedCheckins', refreshStart);
  const renderStart = calendarJs.indexOf('export function renderWorkoutCalendarHome');
  const renderEnd = calendarJs.indexOf('function _renderWorkoutHomeDetail', renderStart);
  assert.ok(pendingState >= 0, 'pending carousel focus request map should exist');
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'selected slide restore helper should exist');
  assert.ok(pendingStart >= 0 && pendingEnd > pendingStart, 'pending carousel focus helpers should exist');
  assert.ok(refreshStart >= 0 && refreshEnd > refreshStart, 'sheet refresh callback should exist');
  assert.ok(renderStart >= 0 && renderEnd > renderStart, 'workout home render should exist');
  const helper = calendarJs.slice(helperStart, helperEnd);
  const pending = calendarJs.slice(pendingStart, pendingEnd);
  const refresh = calendarJs.slice(refreshStart, refreshEnd);
  const render = calendarJs.slice(renderStart, renderEnd);

  assert.match(refresh, /const selectionDetail = normalizeWorkoutExerciseSelectionDetail\(detail\)/);
  assert.match(refresh, /const entryIndex = selectionDetail\.entryIdx/);
  assert.match(refresh, /if \(entryIndex != null\) _requestWorkoutSheetPendingCarouselFocus\(key, targetIndex, entryIndex\)/);
  assert.match(refresh, /renderWorkoutCalendarHome\(\);[\s\S]*if \(entryIndex != null\) _tryRestorePendingWorkoutSheetCarouselFocus\(key, targetIndex\)/);
  assert.match(helper, /const index = Math\.max\(0, Math\.floor\(Number\(slideIndex\)\)\)/);
  assert.match(helper, /_rememberWorkoutSheetCarouselSlide\(options\?\.key \?\? _workoutHomeSelectedKey, options\?\.sessionIndex \?\? _workoutHomeSessionIndex, index\)/);
  assert.match(helper, /const slide = track\?\.querySelector\?\.\(`\[data-wt-day-exercise-slide="\$\{index\}"\]`\)/);
  assert.match(helper, /if \(!slide\) return false/);
  assert.match(helper, /carouselSlideIndex: index/);
  assert.match(helper, /carouselScrollLeft: null/);
  assert.match(helper, /_restoreWorkoutSheetCarouselState\(sheet, state\)/);
  assert.match(helper, /window\.requestAnimationFrame\(restore\)/);
  assert.match(helper, /window\.setTimeout\(restore, 80\)/);
  assert.match(helper, /window\.setTimeout\(restore, 220\)/);
  assert.match(helper, /return true/);
  assert.match(pending, /_workoutSheetPendingCarouselFocus\.set\(_workoutSheetCarouselSnapshotKey\(key, sessionIndex\)/);
  assert.match(pending, /_workoutSheetPendingCarouselFocus\.get\(_workoutSheetCarouselSnapshotKey\(key, sessionIndex\)\)/);
  assert.match(pending, /_restoreWorkoutSheetCarouselToSlide\(pending\.slideIndex, \{ key, sessionIndex \}\)/);
  assert.match(pending, /_workoutSheetPendingCarouselFocus\.delete\(_workoutSheetCarouselSnapshotKey\(key, sessionIndex\)\)/);
  assert.match(render, /_tryRestorePendingWorkoutSheetCarouselFocus\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\)/);
});

test('day sheet add picker pending focus survives until the selected slide exists in the browser DOM', { timeout: 30000 }, async () => {
  const result = await runAddCarouselFocusHarness();

  assert.equal(result.afterImmediate.slideCount, 2);
  assert.equal(result.afterImmediate.scrollLeft, 0);
  assert.equal(result.afterImmediate.pendingSize, 1);
  assert.equal(result.afterImmediate.toastText, '종목을 추가했어요');
  assert.equal(result.afterDelayedRender.slideCount, 3);
  assert.equal(result.afterDelayedRender.pendingSize, 0);
  assert.equal(result.afterDelayedRender.toastText, '종목을 추가했어요');
  assert.equal(result.afterDelayedRender.visibleSlideTitle, '새로 추가한 덤벨 숄더프레스');
  assert.equal(result.afterDelayedRender.scrollDelta, 0);
  assert.equal(result.afterDelayedRender.scrollLeft, result.afterDelayedRender.expectedScrollLeft);
  assert.equal(result.afterDelayedRender.slideLeftWithinTrack, 0);
  assert.equal(result.afterDelayedRender.slideRightWithinTrack, result.afterDelayedRender.trackWidth);
  assert.equal(result.toastCalls.length, 1);
  assert.equal(result.toastCalls[0].type, 'success');
  assert.equal(result.openCalls[0].options.action, 'sheet:add-exercise');
});

test('day sheet set rows support mobile value editing, clear-on-focus, and swipe delete', () => {
  const inputStart = calendarJs.indexOf('function _renderWorkoutSetInput');
  const rowsStart = calendarJs.indexOf('function _renderWorkoutSetRows');
  const rowsEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', rowsStart);
  const bindStart = calendarJs.indexOf('function _bindWorkoutHomeSheetActions');
  const bindEnd = calendarJs.indexOf('function _bindWorkoutHomeSheetInputIsolation', bindStart);
  assert.ok(inputStart >= 0 && rowsStart > inputStart, 'set input renderer should exist');
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'set row renderer should exist');
  assert.ok(bindStart >= 0 && bindEnd > bindStart, 'sheet action binder should exist');
  const inputFn = calendarJs.slice(inputStart, rowsStart);
  const rows = calendarJs.slice(rowsStart, rowsEnd);
  const binder = calendarJs.slice(bindStart, bindEnd);

  assert.match(inputFn, /data-wt-set-clear-on-focus/);
  assert.match(calendarJs, /function _focusWorkoutSetInlineFieldFromSheet/);
  assert.match(calendarJs, /function _renderWorkoutSetInlineInput/);
  assert.match(calendarJs, /function _focusWorkoutSetEditorFieldFromSheet/);
  assert.match(rows, /data-wt-set-swipe-row/);
  assert.match(rows, /data-wt-set-edit-field="kg"/);
  assert.match(rows, /data-wt-set-edit-field="reps"/);
  assert.doesNotMatch(rows, /data-wt-sheet-card-action="edit-set-field" data-date-key/);
  assert.match(rows, /_renderWorkoutSetInlineInput/);
  assert.match(binder, /const editField = target\?\.closest\?\.\('\[data-wt-set-edit-field\]'\)/);
  assert.match(binder, /_focusWorkoutSetInlineFieldFromSheet/);
  assert.match(calendarJs, /function _bindWorkoutSetSwipeDelete/);
  assert.match(calendarJs, /_bindWorkoutSetSwipeDelete\(sheet\)/);
  assert.match(calendarJs, /Math\.abs\(current\.dx\) >= 64/);
  assert.doesNotMatch(calendarJs, /if \(dx >= 0\) \{\s*resetRow/);
  assert.match(calendarJs, /focusin[\s\S]*data-wt-set-clear-on-focus/);
  assert.match(styleCss, /\.wt-max-set-main\s*\{[\s\S]*grid-template-columns:\s*30px 44px minmax\(52px,\s*1fr\) minmax\(46px,\s*\.84fr\) 44px 36px/);
  assert.match(styleCss, /\.wt-max-set-value-input\s*\{/);
  assert.match(styleCss, /\.wt-max-set-remove-btn\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*38px;/);
  assert.match(styleCss, /\.wt-max-set-row\.is-swiping/);
  assert.match(styleCss, /\.wt-max-set-row\.is-swipe-delete-right/);
  assert.match(styleCss, /\.wt-max-set-row\s*\{[\s\S]*touch-action:\s*pan-y;/);
});

test('day sheet remembers exercise carousel slide across close and reopen', () => {
  const stateStart = calendarJs.indexOf('const _workoutSheetCarouselSnapshots = new Map()');
  const helperStart = calendarJs.indexOf('function _workoutSheetCarouselSnapshotKey');
  const helperEnd = calendarJs.indexOf('function _workoutSheetInputSelection', helperStart);
  const snapshotStart = calendarJs.indexOf('export function applyWorkoutCalendarNavSnapshot');
  const snapshotEnd = calendarJs.indexOf('function _isTodayKey', snapshotStart);
  const setStateStart = calendarJs.indexOf('function _setWorkoutHomeSheetState');
  const setStateEnd = calendarJs.indexOf('function _toggleWorkoutHomeSheet', setStateStart);
  const toggleStart = setStateEnd;
  const toggleEnd = calendarJs.indexOf('function _bindWorkoutHomeSheetActions', toggleStart);
  const openStart = calendarJs.indexOf('function _openWorkoutHomeDay');
  const openEnd = calendarJs.indexOf('async function _openWorkoutHomeRoutine', openStart);
  const sessionStart = calendarJs.indexOf('function _selectWorkoutHomeSession');
  const sessionEnd = calendarJs.indexOf('function _selectWorkoutHomeRunning', sessionStart);
  assert.ok(stateStart >= 0, 'carousel memory map should exist');
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'carousel memory helpers should exist');
  assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart, 'nav snapshot apply should exist');
  assert.ok(setStateStart >= 0 && setStateEnd > setStateStart, 'sheet state setter should exist');
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'sheet toggle should exist');
  assert.ok(openStart >= 0 && openEnd > openStart, 'day open function should exist');
  assert.ok(sessionStart >= 0 && sessionEnd > sessionStart, 'session switch function should exist');
  const helpers = calendarJs.slice(helperStart, helperEnd);
  const snapshotFn = calendarJs.slice(snapshotStart, snapshotEnd);
  const setStateFn = calendarJs.slice(setStateStart, setStateEnd);
  const toggleFn = calendarJs.slice(toggleStart, toggleEnd);
  const openFn = calendarJs.slice(openStart, openEnd);
  const sessionFn = calendarJs.slice(sessionStart, sessionEnd);

  assert.match(helpers, /return `\$\{targetKey\}::\$\{targetSessionIndex\}`/);
  assert.match(helpers, /_workoutSheetCarouselSnapshots\.set\(_workoutSheetCarouselSnapshotKey\(key, sessionIndex\), state\)/);
  assert.match(helpers, /const state = _captureWorkoutSheetCarouselState\(targetSheet\)/);
  assert.match(helpers, /return _rememberWorkoutSheetCarouselSlide\(key, sessionIndex, state\.slideIndex\)/);
  assert.match(helpers, /_workoutSheetCarouselSnapshots\.get\(_workoutSheetCarouselSnapshotKey\(key, sessionIndex\)\)/);
  assert.match(setStateFn, /_currentWorkoutHomeSheetState\(\) !== 'bar' && next === 'bar'[\s\S]*_rememberWorkoutSheetCarouselState\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\)/);
  assert.match(toggleFn, /renderWorkoutCalendarHome\(\);[\s\S]*_restoreRememberedWorkoutSheetCarousel\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\)/);
  assert.match(openFn, /renderWorkoutCalendarHome\(\);[\s\S]*_restoreRememberedWorkoutSheetCarousel\(nextKey, _workoutHomeSessionIndex\)/);
  assert.match(sessionFn, /_rememberWorkoutSheetCarouselState\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\);[\s\S]*renderWorkoutCalendarHome\(\);[\s\S]*_restoreRememberedWorkoutSheetCarousel\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\)/);
  assert.match(snapshotFn, /_currentWorkoutHomeSheetState\(\) !== 'bar' && !nextSheetOpen[\s\S]*_rememberWorkoutSheetCarouselState\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\)/);
  assert.match(snapshotFn, /if \(nextSheetOpen\) _restoreRememberedWorkoutSheetCarousel\(_workoutHomeSelectedKey, _workoutHomeSessionIndex\)/);
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
  assert.match(rows, /const cardio = _cardioEntryData\(entry\)/);
  assert.match(rows, /if \(!sets\.length && !note && !hasDraftExercise && !cardio\) return null/);
  assert.match(metrics, /_exerciseRows\(d, lookup, key, options\)/);
  assert.match(detail, /includeDraftExercises:\s*true/);
  assert.match(detail, /includePreviousRecord:\s*true/);
  assert.match(detail, /cache,\s*\n\s*\}\)/);
  assert.match(tabs, /_hasWorkoutHomeSessionRecord\(session\)/);
});

test('day sheet exercise cards render as a horizontal carousel instead of a vertical stack', () => {
  const cardsStart = calendarJs.indexOf('function _renderWorkoutDetailCards');
  const cardsEnd = calendarJs.indexOf('function _formatWorkoutKg', cardsStart);
  assert.ok(cardsStart >= 0 && cardsEnd > cardsStart, 'detail card renderer should exist');
  const cards = calendarJs.slice(cardsStart, cardsEnd);

  assert.match(cards, /_renderWorkoutExerciseDetailCarousel\(key, sessionIndex, wx\.exercises\)/);
  assert.match(cards, /function _renderWorkoutExerciseDetailCarousel\(key, sessionIndex, exercises = \[\]\)/);
  assert.match(cards, /class="wt-day-exercise-carousel \$\{count > 1 \? 'has-multiple' : 'is-single'\}"/);
  assert.match(cards, /class="wt-day-exercise-carousel-track" data-wt-day-exercise-carousel-track/);
  assert.match(cards, /data-wt-day-exercise-slide="\$\{index\}"/);
  assert.doesNotMatch(cards, /\.\.\.wx\.exercises\.map/);
  assert.match(styleCss, /\.wt-day-exercise-carousel-track\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow-x:\s*auto;[\s\S]*scroll-snap-type:\s*x mandatory;[\s\S]*touch-action:\s*pan-x pan-y;/);
  assert.match(styleCss, /\.wt-day-exercise-slide\s*\{[\s\S]*scroll-snap-align:\s*start;[\s\S]*scroll-snap-stop:\s*always;/);
  assert.match(styleCss, /\.wt-day-exercise-carousel\.has-multiple \.wt-day-exercise-slide\s*\{[\s\S]*flex-basis:\s*min\(92%,\s*540px\);/);
});

test('day sheet preserves exercise carousel position across set saves', () => {
  const inputStart = calendarJs.indexOf('function _workoutSheetScrollState');
  const inputEnd = calendarJs.indexOf('function _workoutSheetInputSelection', inputStart);
  const restoreStart = calendarJs.indexOf('function _restoreWorkoutSheetScrollState');
  const restoreEnd = calendarJs.indexOf('function _restoreWorkoutSheetInputState', restoreStart);
  const saveStart = calendarJs.indexOf('async function _saveWorkoutHomeSessionResult');
  const saveEnd = calendarJs.indexOf('function _durationFromMinSec', saveStart);
  const toggleStart = calendarJs.indexOf('async function _toggleWorkoutExerciseSetDoneFromSheet');
  const toggleEnd = calendarJs.indexOf('async function _completeWorkoutExerciseFromSheet', toggleStart);
  assert.ok(inputStart >= 0 && inputEnd > inputStart, 'scroll state helpers should exist');
  assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, 'scroll restore helper should exist');
  assert.ok(saveStart >= 0 && saveEnd > saveStart, 'sheet save function should exist');
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'set toggle function should exist');
  const inputHelpers = calendarJs.slice(inputStart, inputEnd);
  const restoreFn = calendarJs.slice(restoreStart, restoreEnd);
  const saveFn = calendarJs.slice(saveStart, saveEnd);
  const toggleFn = calendarJs.slice(toggleStart, toggleEnd);

  assert.match(inputHelpers, /function _captureWorkoutSheetCarouselState\(sheet = null\)/);
  assert.match(inputHelpers, /\[data-wt-day-exercise-carousel-track\]/);
  assert.match(inputHelpers, /\[data-wt-day-exercise-slide\]/);
  assert.match(inputHelpers, /carouselScrollLeft: carousel\?\.scrollLeft \?\? null/);
  assert.match(inputHelpers, /carouselSlideIndex: carousel\?\.slideIndex \?\? null/);
  assert.match(inputHelpers, /function _restoreWorkoutSheetCarouselState\(sheet = null, state = null\)/);
  assert.match(restoreFn, /_restoreWorkoutSheetCarouselState\(sheet, state\)/);
  assert.match(inputHelpers, /state\.carouselScrollLeft != null && Number\.isFinite\(Number\(state\.carouselScrollLeft\)\)/);
  assert.match(inputHelpers, /track\.scrollTo\(\{ left, behavior: 'auto' \}\)/);
  assert.match(inputHelpers, /data-wt-day-exercise-slide="\$\{slideIndex\}"/);
  assert.match(saveFn, /const restoreState = options\?\.preserveInput[\s\S]*_captureWorkoutSheetScrollState\(\)/);
  assert.match(saveFn, /if \(nextRestoreState\) _restoreWorkoutSheetInputState\(nextRestoreState\)/);
  assert.match(toggleFn, /\{ preserveSheetScroll: true \}/);
});

test('day sheet exercise card renders prior workout record instead of today set summary', () => {
  const rowStart = calendarJs.indexOf('function _exerciseRows');
  const rowEnd = calendarJs.indexOf('function _workoutMetrics', rowStart);
  const prevStart = calendarJs.indexOf('function _previousWorkoutRecordForRow');
  const prevEnd = calendarJs.indexOf('function _exerciseRows', prevStart);
  const cardStart = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard');
  const cardEnd = calendarJs.indexOf('function _renderWorkoutRunningDetailCard', cardStart);
  assert.ok(rowStart >= 0 && rowEnd > rowStart, 'exercise row mapper should exist');
  assert.ok(prevStart >= 0 && prevEnd > prevStart, 'previous record helper should exist');
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'exercise detail card renderer should exist');
  const rows = calendarJs.slice(rowStart, rowEnd);
  const previous = calendarJs.slice(prevStart, prevEnd);
  const card = calendarJs.slice(cardStart, cardEnd);

  assert.match(previous, /getWorkoutSessions\(source\[key\] \|\| \{\}\)/);
  assert.match(previous, /key < selectedKey/);
  assert.match(previous, /_workoutEntryMatchesRow\(item, row\)/);
  assert.match(rows, /includePreviousRecord/);
  assert.match(rows, /row\.previousRecord = _previousWorkoutRecordForRow\(previousRecordCache, row\)/);
  assert.match(card, /const previousSummary = _workoutPreviousSetSummary\(row\)/);
  assert.match(card, /previousSummary\.label/);
  assert.match(card, /previousSummary\.summary/);
  assert.match(calendarJs, /지난 기록/);
  assert.doesNotMatch(card, /<span>오늘 기록<\/span>/);
  assert.doesNotMatch(card, /const setSummary = _workoutSetSummary\(row\)/);
});

test('day sheet exercise card uses inline plus row and one complete button', () => {
  const cardStart = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard');
  const cardEnd = calendarJs.indexOf('function _renderWorkoutRunningDetailCard', cardStart);
  const rowsStart = calendarJs.indexOf('function _renderWorkoutSetInput');
  const rowsEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', rowsStart);
  const oldEditStart = calendarJs.indexOf('function _editWorkoutHomeSession');
  const oldEditEnd = calendarJs.indexOf('async function _addWorkoutHomeSession', oldEditStart);
  const completeStart = calendarJs.indexOf('async function _completeWorkoutExerciseFromSheet');
  const completeEnd = calendarJs.indexOf('async function _addWorkoutHomeSession', completeStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'exercise detail card renderer should exist');
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'set row renderer should exist');
  assert.ok(oldEditStart >= 0 && oldEditEnd > oldEditStart, 'legacy edit session function should exist');
  assert.ok(completeStart >= 0 && completeEnd > completeStart, 'exercise complete function should exist');
  const card = calendarJs.slice(cardStart, cardEnd);
  const setRows = calendarJs.slice(rowsStart, rowsEnd);
  const oldEditFn = calendarJs.slice(oldEditStart, oldEditEnd);
  const completeFn = calendarJs.slice(completeStart, completeEnd);

  assert.match(card, /const editing = !collapsed/);
  assert.match(calendarJs, /function _workoutExerciseCompletionStampAt\(row\)/);
  assert.match(calendarJs, /function _isWorkoutExerciseComplete\(row\)/);
  assert.match(calendarJs, /if \(_workoutExerciseCompletionStampAt\(row\) == null\) return false/);
  assert.match(calendarJs, /completableSets\.length > 0 && completableSets\.every\(set => set\.done === true\)/);
  assert.match(card, /const stamped = _isWorkoutExerciseCompletionStamped\(cardId, row\)/);
  assert.doesNotMatch(calendarJs, /WORKOUT_EXERCISE_STAMP_MS/);
  assert.doesNotMatch(calendarJs, /_workoutExerciseCompletionStamps\.delete\(cardId\);\s*\n\s*renderWorkoutCalendarHome\(\)/);
  assert.match(card, /wt-max-actions wt-max-actions--single/);
  assert.match(card, /data-wt-sheet-card-action="complete-exercise"/);
  assert.match(card, /data-card-id="\$\{_esc\(cardId\)\}"/);
  assert.match(card, /data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(card, /data-exercise-index="\$\{originalIndex\}"/);
  assert.doesNotMatch(card, /window\._wtCalCompleteExercise|window\._wtCalDeleteExercise/);
  assert.match(card, />종목완료<\/button>/);
  assert.doesNotMatch(card, />편집 완료<\/button>|>세트 추가<\/button>|>카드 접기<\/button>|>편집하기<\/button>/);
  assert.doesNotMatch(card, /window\._wtCalEditSession\('\$\{key\}', \$\{sessionIndex\}\)/);
  assert.match(setRows, /function _renderWorkoutSetAddRow/);
  assert.match(setRows, /wt-max-set-add-row/);
  assert.match(setRows, /data-wt-sheet-card-action="add-exercise-set"/);
  assert.match(setRows, /data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(setRows, /data-session-index="\$\{sessionIndex\}"/);
  assert.match(setRows, /data-exercise-index="\$\{exerciseIndex\}"/);
  assert.doesNotMatch(setRows, /window\._wtCalAddExerciseSet/);
  assert.match(setRows, /window\._wtCalUpdateExerciseSet/);
  assert.match(setRows, /data-wt-set-done-toggle/);
  assert.match(setRows, /data-wt-set-remove/);
  assert.match(setRows, /data-wt-sheet-card-action="toggle-set-editor"/);
  assert.match(setRows, /aria-expanded="\$\{expanded \? 'true' : 'false'\}"/);
  assert.match(setRows, /wt-max-set-editor/);
  assert.doesNotMatch(setRows, /onclick="window\._wtCalToggleExerciseSetDone/);
  assert.doesNotMatch(setRows, /onclick="window\._wtCalRemoveExerciseSet/);
  assert.doesNotMatch(oldEditFn, /_openWorkoutEditorForSession/);
  assert.match(oldEditFn, /action:\s*'sheet:edit-inline'/);
  assert.match(calendarJs, /window\._wtCalEditExerciseCard = _editWorkoutExerciseCard/);
  assert.match(calendarJs, /window\._wtCalUpdateExerciseSet = _updateWorkoutExerciseSetFromSheet/);
  assert.doesNotMatch(calendarJs, /window\._wtCalCompleteExercise = _completeWorkoutExerciseFromSheet/);
  assert.doesNotMatch(calendarJs, /window\._wtCalAddExerciseSet = _addWorkoutExerciseSetFromSheet/);
  assert.match(calendarJs, /function _runWorkoutHomeSheetCardAction\(action, control\)/);
  assert.match(calendarJs, /data-wt-sheet-card-action[\s\S]*_runWorkoutHomeSheetCardAction/);
  assert.match(calendarJs, /case 'complete-exercise':[\s\S]*_completeWorkoutExerciseFromSheet\(cardId, key, sessionIndex, exerciseIndex\)/);
  assert.match(calendarJs, /case 'add-exercise-set':[\s\S]*_addWorkoutExerciseSetFromSheet\(key, sessionIndex, exerciseIndex\)/);
  assert.match(calendarJs, /case 'toggle-set-editor':[\s\S]*_toggleWorkoutSetEditorFromSheet\(key, sessionIndex, exerciseIndex, setIndex\)/);
  assert.match(completeFn, /_hasCompletableWorkoutSheetSet\(nextSet\)/);
  assert.match(completeFn, /nextSet\.done = true/);
  assert.match(completeFn, /_markWorkoutExerciseEntryComplete\(entry, now\)/);
  assert.match(completeFn, /_markWorkoutExerciseCompletionStamp\(cardId\)/);
  assert.match(calendarJs, /data-wt-set-done-toggle[\s\S]*_toggleWorkoutExerciseSetDoneFromSheet/);
  assert.match(calendarJs, /data-wt-set-remove[\s\S]*_removeWorkoutExerciseSetFromSheet/);
  assert.match(calendarJs, /optimisticRender:\s*true/);
  assert.match(calendarJs, /sheet\.addEventListener\('touchmove',[\s\S]*\{ passive: false, capture: true \}\)/);
  assert.match(calendarJs, /upsertWorkoutSession\(day, nextSession, index, \{ now: Date\.now\(\) \}\)/);
  assert.match(styleCss, /\.wt-max-set-editor label input\s*\{/);
  assert.match(styleCss, /\.wt-max-rom-inline\.is-editing input\s*\{/);
  assert.match(styleCss, /\.wt-max-set-expand\s*\{/);
  assert.match(styleCss, /\.wt-max-set-add-row\s*\{/);
  assert.match(styleCss, /\.wt-max-actions--single\s*\{/);
  assert.match(styleCss, /\.wt-max-complete-stamp\s*\{/);
  assert.match(styleCss, /@keyframes wt-complete-stamp-pop/);
  assert.match(styleCss, /\.wt-max-set-toggle,\s*\n\.wt-max-set-remove-btn\s*\{/);
});

test('day sheet complete stamp requires the explicit exercise complete marker', () => {
  const rowsStart = calendarJs.indexOf('function _exerciseRows');
  const rowsEnd = calendarJs.indexOf('function _workoutMetrics', rowsStart);
  const stampStart = calendarJs.indexOf('function _workoutExerciseCompletionStampAt');
  const stampEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', stampStart);
  const updateStart = calendarJs.indexOf('async function _updateWorkoutExerciseSetFromSheet');
  const updateEnd = calendarJs.indexOf('async function _addWorkoutExerciseSetFromSheet', updateStart);
  const addStart = calendarJs.indexOf('async function _addWorkoutExerciseSetFromSheet');
  const addEnd = calendarJs.indexOf('async function _removeWorkoutExerciseSetFromSheet', addStart);
  const removeStart = calendarJs.indexOf('async function _removeWorkoutExerciseSetFromSheet');
  const removeEnd = calendarJs.indexOf('async function _toggleWorkoutExerciseSetDoneFromSheet', removeStart);
  const toggleStart = calendarJs.indexOf('async function _toggleWorkoutExerciseSetDoneFromSheet');
  const toggleEnd = calendarJs.indexOf('async function _completeWorkoutExerciseFromSheet', toggleStart);
  const completeStart = calendarJs.indexOf('async function _completeWorkoutExerciseFromSheet');
  const completeEnd = calendarJs.indexOf('async function _addWorkoutHomeSession', completeStart);
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'exercise row mapper should exist');
  assert.ok(stampStart >= 0 && stampEnd > stampStart, 'stamp helpers should exist');
  assert.ok(updateStart >= 0 && updateEnd > updateStart, 'set update function should exist');
  assert.ok(addStart >= 0 && addEnd > addStart, 'set add function should exist');
  assert.ok(removeStart >= 0 && removeEnd > removeStart, 'set remove function should exist');
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'set toggle function should exist');
  assert.ok(completeStart >= 0 && completeEnd > completeStart, 'exercise complete function should exist');
  const rows = calendarJs.slice(rowsStart, rowsEnd);
  const stampFns = calendarJs.slice(stampStart, stampEnd);
  const updateFn = calendarJs.slice(updateStart, updateEnd);
  const addFn = calendarJs.slice(addStart, addEnd);
  const removeFn = calendarJs.slice(removeStart, removeEnd);
  const toggleFn = calendarJs.slice(toggleStart, toggleEnd);
  const completeFn = calendarJs.slice(completeStart, completeEnd);

  assert.match(rows, /exerciseCompletedAt: _workoutExerciseCompletionStampAt\(entry\)/);
  assert.match(stampFns, /const stampAt = Number\(row\?\.exerciseCompletedAt\)/);
  assert.match(stampFns, /if \(_workoutExerciseCompletionStampAt\(row\) == null\) return false/);
  assert.match(stampFns, /completableSets\.every\(set => set\.done === true\)/);
  assert.match(completeFn, /_markWorkoutExerciseEntryComplete\(entry, now\)/);
  assert.doesNotMatch(addFn, /_markWorkoutExerciseEntryComplete|entry\.exerciseCompletedAt = now/);
  assert.doesNotMatch(updateFn, /_markWorkoutExerciseEntryComplete|entry\.exerciseCompletedAt = now/);
  assert.doesNotMatch(removeFn, /_markWorkoutExerciseEntryComplete|entry\.exerciseCompletedAt = now/);
  assert.doesNotMatch(toggleFn, /_markWorkoutExerciseEntryComplete|entry\.exerciseCompletedAt = now/);
  assert.match(addFn, /_clearWorkoutExerciseCompletionMarker\(entry\)/);
  assert.match(updateFn, /_clearWorkoutExerciseCompletionMarker\(entry\)/);
  assert.match(removeFn, /_clearWorkoutExerciseCompletionMarker\(entry\)/);
  assert.match(toggleFn, /_clearWorkoutExerciseCompletionMarker\(entry\)/);
});

test('day sheet save syncs saved session over stale active workout draft', () => {
  const saveStart = calendarJs.indexOf('async function _saveWorkoutHomeSessionResult');
  const saveEnd = calendarJs.indexOf('function _durationFromMinSec', saveStart);
  const syncStart = calendarJs.indexOf('function _syncWorkoutHomeSavedSessionState');
  const syncEnd = calendarJs.indexOf('function _hasWorkoutHomeMealRecord', syncStart);
  assert.ok(saveStart >= 0 && saveEnd > saveStart, 'sheet save function should exist');
  assert.ok(syncStart >= 0 && syncEnd > syncStart, 'sheet sync function should exist');
  const saveFn = calendarJs.slice(saveStart, saveEnd);
  const syncFn = calendarJs.slice(syncStart, syncEnd);

  assert.match(calendarJs, /import \{ S \} from '\.\/workout\/state\.js'/);
  assert.match(calendarJs, /import \{ wtReplaceActiveWorkoutDraftSession \} from '\.\/workout\/timers\.js'/);
  assert.match(saveFn, /const savePromise = saveDay\(key, payload, \{ mode: 'merge', rethrow: true \}\)/);
  assert.match(saveFn, /const cache = getCache\(\) \|\| \{\}[\s\S]*cache\[key\] = \{ \.\.\.currentDay, \.\.\.payload \}/);
  assert.match(saveFn, /if \(options\?\.optimisticRender\)[\s\S]*_syncWorkoutHomeSavedSessionState\(key, result, options\.sessionIndex\)[\s\S]*await savePromise[\s\S]*return/);
  assert.match(saveFn, /await savePromise[\s\S]*_syncWorkoutHomeSavedSessionState\(key, result, options\.sessionIndex\)/);
  assert.match(syncFn, /const targetIndex = Math\.max\(0, Math\.floor\(targetIndexRaw\)\)/);
  assert.match(syncFn, /wtReplaceActiveWorkoutDraftSession\(date, targetIndex, targetSession, 'sheet session save'\)/);
  assert.match(syncFn, /if \(!_isSameWorkoutStateDate\(key\)\) return/);
  assert.match(syncFn, /if \(activeIndex !== targetIndex\) return/);
  assert.match(syncFn, /_applyWorkoutHomeSessionToActiveState\(targetSession, targetIndex\)/);
  assert.match(calendarJs, /_saveWorkoutHomeSessionResult\(targetKey, result, \{ \.\.\.options, sessionIndex: index \}\)/);
  assert.match(calendarJs, /_saveWorkoutHomeSessionResult\(key, result, \{ sessionIndex: index \}\)/);
});

test('day sheet set done toggle uses explicit done state and larger touch targets', () => {
  const rowsStart = calendarJs.indexOf('function _exerciseRows');
  const rowsEnd = calendarJs.indexOf('function _workoutMetrics', rowsStart);
  const toggleStart = calendarJs.indexOf('async function _toggleWorkoutExerciseSetDoneFromSheet');
  const toggleEnd = calendarJs.indexOf('async function _addWorkoutHomeSession', toggleStart);
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'exercise row mapper should exist');
  assert.ok(toggleStart >= 0 && toggleEnd > toggleStart, 'set done toggle function should exist');
  const rows = calendarJs.slice(rowsStart, rowsEnd);
  const toggleFn = calendarJs.slice(toggleStart, toggleEnd);

  assert.match(rows, /rawSetDetails:[\s\S]*done: set\.done === true/);
  assert.match(toggleFn, /const wasDone = nextSet\.done === true/);
  assert.match(toggleFn, /const nextDone = !wasDone/);
  assert.doesNotMatch(toggleFn, /_isActualWorkoutSet\(nextSet\) \|\| nextSet\.done === true/);
  assert.match(toggleFn, /\{ preserveSheetScroll: true \}/);
  assert.match(styleCss, /\.wt-max-set-main\s*\{[\s\S]*grid-template-columns:\s*30px 44px minmax\(52px,\s*1fr\) minmax\(46px,\s*\.84fr\) 44px 36px/);
  assert.match(styleCss, /\.wt-max-set-check\s*\{[\s\S]*width:\s*30px;[\s\S]*height:\s*30px;/);
  assert.match(styleCss, /\.wt-max-set-remove-btn\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*38px;/);
  assert.match(styleCss, /\.wt-max-set-expand\s*\{[\s\S]*width:\s*36px;[\s\S]*height:\s*36px;/);
  assert.match(styleCss, /\.wt-max-set-toggle,\s*\n\.wt-max-set-remove-btn\s*\{[\s\S]*touch-action:\s*manipulation;/);
});

test('day sheet set rows preserve wendler set role chips', () => {
  const actualStart = calendarJs.indexOf('function _isActualWorkoutSet');
  const actualEnd = calendarJs.indexOf('function _hasDraftWorkoutEntry', actualStart);
  const rowsStart = calendarJs.indexOf('function _exerciseRows');
  const rowsEnd = calendarJs.indexOf('function _workoutMetrics', rowsStart);
  const labelStart = calendarJs.indexOf('function _workoutSetTypeLabel');
  const labelEnd = calendarJs.indexOf('function _bestWorkoutSet', labelStart);
  const renderStart = calendarJs.indexOf('function _renderWorkoutSetRows');
  const renderEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', renderStart);
  assert.ok(actualStart >= 0 && actualEnd > actualStart, 'actual set filter should exist');
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'exercise row mapper should exist');
  assert.ok(labelStart >= 0 && labelEnd > labelStart, 'set type label helper should exist');
  assert.ok(renderStart >= 0 && renderEnd > renderStart, 'set row renderer should exist');
  const actualFn = calendarJs.slice(actualStart, actualEnd);
  const rows = calendarJs.slice(rowsStart, rowsEnd);
  const labelFn = calendarJs.slice(labelStart, labelEnd);
  const renderFn = calendarJs.slice(renderStart, renderEnd);

  assert.match(actualFn, /type === 'deload'/);
  assert.match(actualFn, /role === 'deload'/);
  assert.match(rows, /wendlerRole:\s*set\.wendlerRole \|\| ''/);
  assert.match(rows, /supplementalKind:\s*set\.supplementalKind \|\| ''/);
  assert.match(rows, /wendlerPct/);
  assert.match(labelFn, /set\.wendlerRole === 'warmup'[\s\S]*return '웜업'/);
  assert.match(labelFn, /set\.wendlerRole === 'main'[\s\S]*return '메인'/);
  assert.match(labelFn, /set\.wendlerRole === 'supplemental'[\s\S]*supplementalKind === 'bbb'[\s\S]*return 'BBB'/);
  assert.match(labelFn, /supplementalKind === 'fsl'[\s\S]*return 'FSL'/);
  assert.match(labelFn, /type === 'deload'[\s\S]*return '디로드'/);
  assert.match(renderFn, /_workoutSetTypeClass\(set\)/);
  assert.match(renderFn, /_workoutSetTypeLabel\(set\)/);
});

test('day sheet set inputs preserve keyboard next focus without restoring the changed source input', () => {
  const saveStart = calendarJs.indexOf('async function _saveWorkoutHomeSessionResult');
  const saveEnd = calendarJs.indexOf('function _durationFromMinSec', saveStart);
  const inputStart = calendarJs.indexOf('function _captureWorkoutSheetInputState');
  const inputEnd = calendarJs.indexOf('function _workoutHomeScrollTop', inputStart);
  const updateStart = calendarJs.indexOf('async function _updateWorkoutExerciseSetFromSheet');
  const updateEnd = calendarJs.indexOf('async function _addWorkoutExerciseSetFromSheet', updateStart);
  const rowsStart = calendarJs.indexOf('function _renderWorkoutSetInput');
  const rowsEnd = calendarJs.indexOf('function _renderWorkoutSetRows', rowsStart);
  assert.ok(saveStart >= 0 && saveEnd > saveStart, 'sheet save function should exist');
  assert.ok(inputStart >= 0 && inputEnd > inputStart, 'input state helpers should exist');
  assert.ok(updateStart >= 0 && updateEnd > updateStart, 'set update function should exist');
  const saveFn = calendarJs.slice(saveStart, saveEnd);
  const inputHelpers = calendarJs.slice(inputStart, inputEnd);
  const updateFn = calendarJs.slice(updateStart, updateEnd);
  const inputFn = calendarJs.slice(rowsStart, rowsEnd);

  assert.match(calendarJs, /const WORKOUT_SHEET_SET_INPUT_SELECTOR = '\[data-wt-set-input\]'/);
  assert.match(inputFn, /data-wt-set-input data-session-index="\$\{sessionIndex\}"/);
  assert.match(inputFn, /data-exercise-index="\$\{exerciseIndex\}"/);
  assert.match(inputFn, /data-set-index="\$\{setIndex\}"/);
  assert.match(inputFn, /data-field="\$\{_esc\(field\)\}"/);
  assert.match(inputFn, /this\.value, this/);
  assert.match(inputHelpers, /\.wt-day-sheet-scroll/);
  assert.match(inputHelpers, /function _captureWorkoutSheetInputState\(sourceInput = null, options = \{\}\)/);
  assert.match(inputHelpers, /const focused = document\.activeElement/);
  assert.match(inputHelpers, /const ignoreSourceInput = options\?\.ignoreSourceInput === true/);
  assert.match(inputHelpers, /const allowSourceFallback = options\?\.allowSourceFallback !== false && !ignoreSourceInput/);
  assert.match(inputHelpers, /const active = focused\?\.matches\?\.\(WORKOUT_SHEET_SET_INPUT_SELECTOR\)/);
  assert.match(inputHelpers, /&& \(!ignoreSourceInput \|\| focused !== sourceInput\)/);
  assert.match(inputHelpers, /\? focused\s*:\s*allowSourceFallback && sourceMatches/);
  assert.doesNotMatch(inputHelpers, /const active = sourceInput\?\.matches/);
  assert.match(inputHelpers, /function _waitWorkoutSheetFocusTransition\(\)/);
  assert.match(inputHelpers, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(inputHelpers, /requestAnimationFrame\(restore\)/);
  assert.match(inputHelpers, /setSelectionRange\(state\.selectionStart, state\.selectionEnd\)/);
  assert.match(saveFn, /options\?\.preserveInput/);
  assert.match(saveFn, /ignoreSourceInput: options\.ignoreSourceInput === true/);
  assert.match(saveFn, /allowSourceFallback: options\.preserveSourceInput !== false/);
  assert.match(saveFn, /_captureWorkoutSheetInputState\(options\.sourceInput, inputCaptureOptions\) \|\| _captureWorkoutSheetScrollState\(\)/);
  assert.match(saveFn, /await _waitWorkoutSheetFocusTransition\(\)/);
  assert.match(saveFn, /const latestInputState = options\?\.preserveInput/);
  assert.match(saveFn, /const nextRestoreState = latestInputState \|\| restoreState/);
  assert.match(saveFn, /_restoreWorkoutSheetInputState\(nextRestoreState\)/);
  assert.match(updateFn, /sourceInput = null/);
  assert.match(updateFn, /\{ preserveInput: true, sourceInput, ignoreSourceInput: true \}/);
});

test('day sheet added workout sets copy previous user values without completion state', () => {
  const defaultsStart = calendarJs.indexOf('function _defaultWorkoutSheetSet');
  const defaultsEnd = calendarJs.indexOf('async function _mutateWorkoutExerciseFromSheet', defaultsStart);
  const updateStart = calendarJs.indexOf('async function _updateWorkoutExerciseSetFromSheet');
  const updateEnd = calendarJs.indexOf('async function _addWorkoutExerciseSetFromSheet', updateStart);
  const addStart = calendarJs.indexOf('async function _addWorkoutExerciseSetFromSheet');
  const addEnd = calendarJs.indexOf('async function _removeWorkoutExerciseSetFromSheet', addStart);
  const rowsStart = calendarJs.indexOf('function _renderWorkoutSetRows');
  const rowsEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', rowsStart);
  assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart, 'default set function should exist');
  assert.ok(addStart >= 0 && addEnd > addStart, 'add set function should exist');
  const defaults = calendarJs.slice(defaultsStart, defaultsEnd);
  const updateFn = calendarJs.slice(updateStart, updateEnd);
  const addFn = calendarJs.slice(addStart, addEnd);
  const rowsFn = calendarJs.slice(rowsStart, rowsEnd);

  assert.match(calendarJs, /function _isBlankWorkoutSheetNumber/);
  assert.match(calendarJs, /function _workoutSheetInputValue/);
  assert.match(calendarJs, /function _workoutSheetRawNumber/);
  assert.match(defaults, /const kg = _workoutSheetRawNumber\(prev\?\.kg\)/);
  assert.match(defaults, /const reps = _workoutSheetRawNumber\(prev\?\.reps\)/);
  assert.match(defaults, /kg:\s*kg === '' \? 40 : kg/);
  assert.match(defaults, /reps:\s*reps === '' \? 10 : reps/);
  assert.match(defaults, /setType:\s*prev\?\.setType \|\| 'main'/);
  assert.match(defaults, /done:\s*false/);
  assert.doesNotMatch(defaults, /completedAt|exerciseCompletedAt|wendlerRole|wendlerPct|supplementalKind|amrap/);
  assert.match(addFn, /copiedPreviousSet = sets\.length > 0/);
  assert.match(addFn, /sets\.push\(_defaultWorkoutSheetSet\(sets\[sets\.length - 1\]\)\)/);
  assert.match(addFn, /직전 세트를 복사했어요/);
  assert.match(updateFn, /safeField === 'kg'[\s\S]*allowEmpty: true/);
  assert.match(updateFn, /safeField === 'reps'[\s\S]*allowEmpty: true/);
  assert.match(rowsFn, /_workoutSheetInputValue\(set\.kg, 1\)/);
  assert.match(rowsFn, /_workoutSheetInputValue\(set\.reps, 0\)/);
  assert.match(rowsFn, /const kgDisplayText = kgText === '-' \? '미입력' : kgText/);
  assert.match(rowsFn, /const repsDisplayText = repsText === '-' \? '미입력' : repsText/);
  assert.match(rowsFn, /const expanded = editable && _isWorkoutSetEditorExpanded/);
  assert.match(rowsFn, /data-wt-sheet-card-action="toggle-set-editor"/);
  assert.match(rowsFn, /wt-max-set-editor/);
  assert.match(rowsFn, /aria-label="\$\{expanded \? '세트 수정 닫기' : '세트 수정 열기'\}"/);
  assert.match(styleCss, /\.wt-max-set-editor\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styleCss, /\.wt-max-set-editor label\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styleCss, /\.wt-max-set-expand\s*\{[\s\S]*background:\s*rgba\(33,\s*124,\s*249,\s*0\.12\);[\s\S]*box-shadow:\s*0 0 0 1px rgba\(33,\s*124,\s*249,\s*0\.18\),\s*0 0 14px rgba\(33,\s*124,\s*249,\s*0\.24\);/);
  assert.match(styleCss, /\.wt-max-set-expand\[aria-expanded="true"\]\s*\{[\s\S]*background:\s*#217cf9;[\s\S]*color:\s*#fff;/);
});

test('day sheet set rows keep goal/history blocks and use minimal collapsed editing', () => {
  const cardStart = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard');
  const cardEnd = calendarJs.indexOf('function _formatRunningDistance', cardStart);
  const labelStart = calendarJs.indexOf('function _workoutSetTypeLabel');
  const labelEnd = calendarJs.indexOf('function _bestWorkoutSet', labelStart);
  const menuStart = calendarJs.indexOf('function _renderWorkoutSetTypeMenu');
  const menuEnd = calendarJs.indexOf('function _renderWorkoutSetRows', menuStart);
  const rowsStart = calendarJs.indexOf('function _renderWorkoutSetRows');
  const rowsEnd = calendarJs.indexOf('function _renderWorkoutExerciseDetailCard', rowsStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'exercise detail card renderer should exist');
  assert.ok(labelStart >= 0 && labelEnd > labelStart, 'set type label helpers should exist');
  assert.ok(menuStart >= 0 && menuEnd > menuStart, 'set type menu renderer should exist');
  assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'set row renderer should exist');
  const card = calendarJs.slice(cardStart, cardEnd);
  const labels = calendarJs.slice(labelStart, labelEnd);
  const menu = calendarJs.slice(menuStart, menuEnd);
  const rows = calendarJs.slice(rowsStart, rowsEnd);

  assert.match(card, /const goalText = hasSetDetails \? `\$\{bestKg\}kg × \$\{bestReps\}회` : '세트 입력 대기'/);
  assert.match(card, /const previousSummary = _workoutPreviousSetSummary\(row\)/);
  assert.match(card, /<div class="wt-max-last">/);
  assert.match(calendarJs, /const WORKOUT_SET_TYPE_OPTIONS = \[/);
  assert.match(calendarJs, /const _workoutOpenSetTypeMenus = new Set\(\)/);
  assert.match(labels, /type === 'failure'[\s\S]*return '실패'/);
  assert.match(rows, /wt-max-set-type-btn/);
  assert.match(rows, /data-wt-sheet-card-action="toggle-set-type"/);
  assert.match(rows, /_renderWorkoutSetTypeMenu/);
  assert.match(menu, /data-wt-sheet-card-action="set-set-type"/);
  assert.match(menu, /data-wt-set-type-option/);
  assert.doesNotMatch(rows, /<span class="wt-max-set-value"><em>RIR<\/em>/);
  assert.doesNotMatch(rows, /wt-max-rom-inline/);
  assert.match(rows, /<div class="wt-max-set-editor"/);
  assert.match(rows, /'rir'/);
  assert.match(rows, /'romPct'/);
  assert.match(calendarJs, /case 'toggle-set-type':[\s\S]*_toggleWorkoutSetTypeMenuFromSheet/);
  assert.match(calendarJs, /case 'set-set-type':[\s\S]*_setWorkoutExerciseSetTypeFromSheet/);
});

test('set type menu flips above and scrolls into the visible sheet area near bottom', () => {
  const positionFn = extractFunctionSource(calendarJs, '_positionOpenWorkoutSetTypeMenu');
  const toggleFn = extractFunctionSource(calendarJs, '_toggleWorkoutSetTypeMenuFromSheet');

  assert.match(positionFn, /getBoundingClientRect\(\)/);
  assert.match(positionFn, /is-menu-above/);
  assert.match(positionFn, /scrollTop/);
  assert.match(positionFn, /_workoutHomeScrollRoot\(\)/);
  assert.match(toggleFn, /_positionOpenWorkoutSetTypeMenu/);
  assert.match(toggleFn, /requestAnimationFrame/);
  assert.match(
    styleCss,
    /\.wt-max-set-row\.is-menu-above\s+\.wt-max-set-type-menu\s*\{[\s\S]*top:\s*auto;[\s\S]*bottom:\s*38px;/
  );
  assert.match(
    styleCss,
    /@media\s*\(max-width:\s*420px\)[\s\S]*\.wt-max-set-row\.is-menu-above\s+\.wt-max-set-type-menu\s*\{[\s\S]*bottom:\s*36px;/
  );
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
  assert.doesNotMatch(calendarJs, /window\._wtCalAddRunning = _openWorkoutHomeRunning/);
  assert.match(calendarJs, /case 'add-running':[\s\S]*_openWorkoutHomeRunning\(key\)/);
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
  assert.match(calendarJs, /speedKmh:\s*runSpeedKmh/);
  assert.match(calendarJs, /manual-cardio/);
  assert.match(calendarJs, /avgPaceSecPerKm:\s*_num\(d\.runAvgPaceSecPerKm\)/);
  assert.match(calendarJs, /placeSummary:\s*d\.runPlaceSummary \|\| null/);
  assert.match(calendarJs, /avgHeartRateBpm:\s*Number\(runSummary\.avgHeartRateBpm\) > 0/);
  assert.match(calendarJs, /if \(row\?\.key === 'running'\) return _renderWorkoutRunningDetailCard/);
  assert.match(card, /wt-day-ex-card wt-max-read-card wt-running-read-card/);
  assert.match(card, /data-wt-sheet-card-action="delete-activity"/);
  assert.match(card, /data-wt-sheet-card-action="toggle-card"/);
  assert.match(card, /data-wt-sheet-card-action="add-running"/);
  assert.doesNotMatch(card, /window\._wtCalToggleExerciseCard|window\._wtCalDeleteActivity|window\._wtCalAddRunning/);
  assert.match(card, /wt-running-headline/);
  assert.match(card, /_renderRunningRouteMap\(row\)/);
  assert.match(mapRenderer, /wt-running-route-map wt-run-real-map/);
  assert.match(mapRenderer, /data-wt-running-route-map/);
  assert.match(mapRenderer, /wt-running-route-place/);
  assert.match(mapRenderer, /실제 지도 준비 중/);
  assert.match(card, /wt-running-metric-grid/);
  assert.match(metricBuilder, /거리/);
  assert.match(metricBuilder, /시간/);
  assert.match(metricBuilder, /속도/);
  assert.match(metricBuilder, /row\.speedKmh > 0/);
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

test('generic activity detail card uses delegated sheet card actions', () => {
  const cardStart = calendarJs.indexOf('function _renderWorkoutActivityDetailCard');
  const cardEnd = calendarJs.indexOf('function _renderWorkoutDetailEmpty', cardStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart, 'activity detail card renderer should exist');
  const card = calendarJs.slice(cardStart, cardEnd);

  assert.match(card, /wt-day-activity-card/);
  assert.match(card, /data-wt-sheet-card-action="toggle-card"/);
  assert.match(card, /data-card-id="\$\{_esc\(cardId\)\}"/);
  assert.match(card, /data-wt-sheet-card-action="delete-activity"/);
  assert.match(card, /data-date-key="\$\{_esc\(key\)\}"/);
  assert.match(card, /data-session-index="\$\{sessionIndex\}"/);
  assert.match(card, /data-activity-key="\$\{_esc\(activityKey\)\}"/);
  assert.doesNotMatch(card, /onclick=|window\._wtCalToggleExerciseCard|window\._wtCalDeleteActivity/);
  assert.match(calendarJs, /case 'delete-activity':[\s\S]*_deleteWorkoutActivity\(key, sessionIndex, activityKey\)/);
  assert.match(calendarJs, /case 'toggle-card':[\s\S]*_toggleWorkoutDetailCard\(cardId\)/);
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
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*touch-action:\s*pan-x pan-y;/);
  assert.match(styleCss, /#tab-workout\.wt-calendar-home-mode:has\(#wt-workout-timer-bar\.wt-open\) \.cal-workout-day-sheet \.wt-day-sheet-scroll\s*\{[\s\S]*padding-bottom:\s*calc\(86px \+ env\(safe-area-inset-bottom,\s*0px\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-fab\s*\{[\s\S]*bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom,\s*0px\)\)/);
  assert.match(styleCss, /\.cal-workout-day-sheet \.wt-day-fab\s*\{[\s\S]*pointer-events:\s*auto;[\s\S]*touch-action:\s*manipulation;/);
  assert.doesNotMatch(styleCss, /wt-workout-sheet-scroll-lock|wt-day-sheet-drag|is-dragging|is-mid/);
});

test('collapsed day sheet bar is a compact one-row affordance', () => {
  assert.match(styleCss, /\.workout-calendar-root\s*\{[\s\S]*padding:\s*0 var\(--wt-calendar-scroll-gutter,\s*0px\) 124px 0/);
  assert.match(styleCss, /\.workout-calendar-root\s*\{[\s\S]*scrollbar-gutter:\s*stable;/);
  assert.match(styleCss, /#tab-workout\.wt-calendar-home-mode\s*\{[\s\S]*height:\s*100dvh;[\s\S]*min-height:\s*100dvh;[\s\S]*overflow:\s*hidden;/);
  assert.match(styleCss, /#tab-workout\.wt-calendar-home-mode > #workout-calendar-root\s*\{[\s\S]*height:\s*100%;[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;/);
  assert.match(styleCss, /#tab-workout\.wt-calendar-home-mode > #workout-calendar-root\s*\{[\s\S]*overscroll-behavior-y:\s*contain;[\s\S]*-webkit-overflow-scrolling:\s*touch;[\s\S]*touch-action:\s*pan-y;/);
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
  assert.match(calendarJs, /workoutRecordsForBenchmarkWeek/);
  assert.match(calendarJs, /function _cycleRailGoalStatus\(cache = \{\}, benchmark = \{\}, weekStart, targetKg = 0, targetReps = 0\)/);
  assert.match(calendarJs, /Number\(set\.kg\) >= kgGoal && Number\(set\.reps\) >= repsGoal/);
  assert.match(calendarJs, /const plan = rx\?\.plan \|\| \{\}/);
  assert.match(calendarJs, /const displayWeek = Number\(isWendler \? \(plan\.cycleWeek \|\| plan\.week \|\| cycleWeek\) : cycleWeek\) \|\| cycleWeek/);
  assert.match(calendarJs, /programWeekText/);
  assert.match(calendarJs, /function _cycleRailExerciseLabel\(benchmark = \{\}\)/);
  assert.match(calendarJs, /return String\(benchmark\.short \|\| benchmark\.label \|\| '종목'\)\.trim\(\) \|\| '종목'/);
  assert.match(calendarJs, /weekLabel:\s*`W\$\{_fmtNum\(displayWeek, 0\)\}`/);
  assert.match(calendarJs, /exerciseLabel:\s*_cycleRailExerciseLabel\(bm\)/);
  assert.match(calendarJs, /targetLabel:\s*`목표 \$\{kgText\}`/);
  assert.match(calendarJs, /isAchieved:\s*goalStatus\.isAchieved/);
  assert.match(calendarJs, /function _buildWorkoutCycleRailItems/);
  assert.match(calendarJs, /function _renderWorkoutCycleRail/);
  assert.match(calendarJs, /benchmarkId:\s*bm\.id/);
  assert.match(calendarJs, /data-cal-cycle-target="\$\{_esc\(item\.benchmarkId\)\}"/);
  assert.match(calendarJs, /const achievedClass = item\.isAchieved \? ' is-achieved' : ''/);
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
  assert.match(grid, /const cycleItems = _buildWorkoutCycleRailItems\(cycleBoard, weekStart, cache\)/);
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
  assert.match(styleCss, /\.cal-cycle-branch\.is-achieved\s*\{[\s\S]*background:\s*#2f7df4;[\s\S]*color:\s*#ffffff/);
  assert.match(styleCss, /\.cal-cycle-branch\.is-achieved::before\s*\{[\s\S]*border-top-color:\s*#2f7df4/);
  assert.match(styleCss, /\.cal-cycle-branch\.is-achieved \.cal-cycle-branch-week,[\s\S]*\.cal-cycle-branch\.is-achieved \.cal-cycle-branch-target\s*\{[\s\S]*color:\s*#ffffff/);
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
  assert.match(swJs, /tomatofarm-v20260708z1-diet-frequent-foods/);
});
