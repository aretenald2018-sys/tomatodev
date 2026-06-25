import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  WORKOUT_ROUTES,
  closeWorkoutDaySheet,
  currentWorkoutRoute,
  getWorkoutNavSnapshot,
  handleWorkoutBack,
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

test('workout navigation is wired to app, calendar, detail root, and PWA cache', async () => {
  const [appJs, calendarJs, indexHtml, workoutExercises, swJs] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../render-calendar.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8'),
    readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  ]);

  assert.match(appJs, /enableWorkoutPwaHistory\(\{ getActiveTab: \(\) => _currentTab \}\)/);
  assert.match(appJs, /window\.Capacitor\?\.Plugins\?\.App/);
  assert.match(appJs, /handleWorkoutBack\(\{ activeTab: _currentTab, preferHistory: true \}\)/);
  assert.match(calendarJs, /openWorkoutDaySheet\(nextKey/);
  assert.match(calendarJs, /window\.wtOpenWorkoutRecord/);
  assert.match(indexHtml, /id="wt-exercise-detail-root"/);
  assert.match(workoutExercises, /pushWorkoutDetail\(\{/);
  assert.match(workoutExercises, /export function renderWorkoutExerciseDetail\(\)/);
  assert.match(swJs, /\.\/workout\/navigation-stack\.js/);
  assert.match(swJs, /tomatofarm-v20260625z44-workout-nav-stack/);
});
