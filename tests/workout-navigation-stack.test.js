import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  WORKOUT_ROUTES,
  closeWorkoutDaySheet,
  currentWorkoutRoute,
  getWorkoutNavSnapshot,
  handleWorkoutBack,
  openWorkoutCalendar,
  openWorkoutDaySheet,
  pushWorkoutDetail,
  pushWorkoutRecord,
  resetWorkoutNavState,
  updateWorkoutCalendarState,
} from '../workout/navigation-stack.js';

test('workout stack back order keeps calendar sheet state', () => {
  resetWorkoutNavState();
  updateWorkoutCalendarState({ viewYear: 2026, viewMonth: 5, scrollTop: 320 });
  openWorkoutDaySheet('2026-06-25', { sessionIndex: 1, sheetState: 'full', history: 'replace' });
  pushWorkoutRecord({ dateKey: '2026-06-25', sessionIndex: 1 }, { history: 'replace' });
  pushWorkoutDetail({
    dateKey: '2026-06-25',
    sessionIndex: 1,
    exerciseKey: 'bench:0',
    entryIdx: 0,
    recordScrollTop: 180,
  }, { history: 'replace' });

  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.DETAIL);

  assert.equal(handleWorkoutBack({ preferHistory: false }), true);
  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.RECORD);
  assert.equal(getWorkoutNavSnapshot().record.scrollTop, 180);

  assert.equal(handleWorkoutBack({ preferHistory: false }), true);
  let snapshot = getWorkoutNavSnapshot();
  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.CALENDAR);
  assert.equal(snapshot.calendar.sheetOpen, true);
  assert.equal(snapshot.calendar.selectedKey, '2026-06-25');
  assert.equal(snapshot.calendar.selectedSessionIndex, 1);
  assert.equal(snapshot.calendar.scrollTop, 320);

  assert.equal(handleWorkoutBack({ preferHistory: false }), true);
  snapshot = getWorkoutNavSnapshot();
  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.CALENDAR);
  assert.equal(snapshot.calendar.sheetOpen, false);
  assert.equal(snapshot.calendar.sheetState, 'bar');

  assert.equal(handleWorkoutBack({ preferHistory: false }), false);
});

test('sheet close is not treated as record/detail route pop', () => {
  resetWorkoutNavState();
  openWorkoutDaySheet('2026-06-25', { sheetState: 'full', history: 'replace' });
  closeWorkoutDaySheet({ history: 'replace' });

  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.CALENDAR);
  assert.equal(getWorkoutNavSnapshot().calendar.sheetOpen, false);
  assert.equal(handleWorkoutBack({ preferHistory: false }), false);
});

test('inactive tab does not consume back', () => {
  resetWorkoutNavState();
  pushWorkoutRecord({ dateKey: '2026-06-25', sessionIndex: 0 }, { history: 'replace' });

  assert.equal(handleWorkoutBack({ activeTab: 'home', preferHistory: false }), false);
  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.RECORD);
});

test('calendar open can reset the workout home month to today', () => {
  resetWorkoutNavState();
  updateWorkoutCalendarState({ viewYear: 0, viewMonth: 0, selectedKey: '2026-01-01' });
  openWorkoutCalendar({
    selectedKey: '2026-06-25',
    selectedSessionIndex: 0,
    viewYear: 2026,
    viewMonth: 5,
    scrollTop: 0,
    history: 'replace',
  });
  const snapshot = getWorkoutNavSnapshot();
  assert.equal(currentWorkoutRoute().name, WORKOUT_ROUTES.CALENDAR);
  assert.equal(snapshot.calendar.selectedKey, '2026-06-25');
  assert.equal(snapshot.calendar.viewYear, 2026);
  assert.equal(snapshot.calendar.viewMonth, 5);
});

test('workout navigation is wired to app, calendar, record card focus, and PWA cache', async () => {
  const [appJs, calendarJs, indexHtml, workoutExercises, navJs, styleCss, swJs] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../render-calendar.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8'),
    readFile(new URL('../workout/navigation-stack.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  ]);

  assert.match(appJs, /enableWorkoutPwaHistory\(\{[\s\S]*getActiveTab: \(\) => _currentTab,[\s\S]*handleOverlayBack: _handleWorkoutOverlayBack/);
  assert.match(appJs, /window\.Capacitor\?\.Plugins\?\.App/);
  assert.match(appJs, /_handleWorkoutOverlayBack\(\) \|\| handleWorkoutBack/);
  assert.match(appJs, /handleWorkoutBack\(\{ activeTab: _currentTab, preferHistory: true \}\)/);
  assert.match(appJs, /const WORKOUT_PULL_BACK_THRESHOLD_PX = 72/);
  assert.match(appJs, /function initWorkoutPullBackGesture\(\)/);
  assert.match(appJs, /document\.body\?\.classList\.toggle\('wt-workout-tab-active', tab === 'workout'\)/);
  assert.match(appJs, /window\.addEventListener\('touchmove', onMove, \{ passive: false, capture: true \}\)/);
  assert.match(appJs, /handleWorkoutBack\(\{ activeTab: _currentTab, preferHistory: true, action: 'pull:back' \}\)/);
  assert.match(appJs, /action:\s*'calendar:tab-today'/);
  assert.match(appJs, /selectedKey:\s*_dateKeyFromParts\(TODAY\.getFullYear\(\), TODAY\.getMonth\(\), TODAY\.getDate\(\)\)/);
  assert.match(appJs, /viewYear:\s*TODAY\.getFullYear\(\)/);
  assert.match(appJs, /viewMonth:\s*TODAY\.getMonth\(\)/);
  assert.match(appJs, /route\.name === WORKOUT_ROUTES\.DETAIL[\s\S]*_setWorkoutSurface\('record'\)/);
  assert.match(appJs, /const detailTarget = snapshot\.detail\?\.exerciseKey \|\| snapshot\.detail\?\.entryIdx != null/);
  assert.match(appJs, /window\.wtFocusWorkoutEntryFromDetail\?\.\(detailTarget\)/);
  assert.match(calendarJs, /openWorkoutDaySheet\(nextKey/);
  assert.match(calendarJs, /calendar\.viewYear != null && Number\.isFinite\(Number\(calendar\.viewYear\)\)/);
  assert.match(calendarJs, /\^\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)\$/);
  assert.match(calendarJs, /window\.wtOpenWorkoutRecord/);
  assert.match(indexHtml, /class="wt-record-back-btn"[\s\S]*window\.wtHandleWorkoutBack\?\.\(\)/);
  assert.match(indexHtml, /id="wt-exercise-detail-root"/);
  assert.doesNotMatch(workoutExercises, /pushWorkoutDetail\(\{/);
  assert.match(workoutExercises, /function _findWorkoutEntryIndexByExerciseId/);
  assert.match(workoutExercises, /export function wtFocusWorkoutEntryCard/);
  assert.match(workoutExercises, /block\.dataset\.wtEntryIdx = String\(idx\)/);
  assert.match(workoutExercises, /if \(existingIdx >= 0\)[\s\S]*wtFocusWorkoutEntryCard\(existingIdx\)/);
  assert.match(workoutExercises, /const entryIdx = S\.workout\.exercises\.push\(_buildPickerExerciseEntry\(ex\)\) - 1/);
  assert.match(workoutExercises, /wtFocusWorkoutEntryCard\(entryIdx\)/);
  assert.match(workoutExercises, /export function wtHandleExercisePickerBack\(\)/);
  assert.match(workoutExercises, /export function renderWorkoutExerciseDetail\(\)/);
  assert.match(navJs, /typeof options\.handleOverlayBack === 'function' && options\.handleOverlayBack\(\)/);
  assert.match(navJs, /_writeHistory\('push', 'overlay:back'\)/);
  assert.match(styleCss, /body\.wt-workout-tab-active\s*\{[\s\S]*overscroll-behavior-y:\s*none;/);
  assert.match(styleCss, /body\.wt-workout-tab-active #tab-workout\.active\s*\{[\s\S]*overscroll-behavior-y:\s*contain;/);
  assert.match(swJs, /\.\/workout\/navigation-stack\.js/);
  assert.match(swJs, /tomatofarm-v20260626z6-calendar-cycle-rail/);
});
