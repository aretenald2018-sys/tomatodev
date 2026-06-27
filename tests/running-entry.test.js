import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const workoutUi = await readFile(new URL('../workout-ui.js', import.meta.url), 'utf8');
const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const activityFormsJs = await readFile(new URL('../workout/activity-forms.js', import.meta.url), 'utf8');
const workoutIndexJs = await readFile(new URL('../workout/index.js', import.meta.url), 'utf8');
const saveJs = await readFile(new URL('../workout/save.js', import.meta.url), 'utf8');
const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const loadJs = await readFile(new URL('../workout/load.js', import.meta.url), 'utf8');
const sessionsJs = await readFile(new URL('../workout/sessions.js', import.meta.url), 'utf8');
const styleCss = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const swJs = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

test('running type has a dedicated full-screen session root and no legacy inline form', () => {
  assert.match(indexHtml, /id="wt-chip-running"[^>]*onclick="wtSwitchType\('running'\)"[^>]*>🏃 런닝\/조깅<\/button>/);
  assert.match(indexHtml, /id="wt-running-session-root"/);
  assert.doesNotMatch(indexHtml, /id="wt-running-section"/);
  assert.doesNotMatch(indexHtml, /id="wt-run-distance"/);
  assert.doesNotMatch(indexHtml, /id="wt-run-gps-primary"/);
});

test('workout type switcher opens the running session instead of a detail section', () => {
  assert.doesNotMatch(workoutUi, /running:\s*'wt-running-section'/);
  assert.match(workoutUi, /type === 'running'/);
  assert.match(workoutUi, /wtOpenRunningSession/);
  assert.match(workoutUi, /workout\/running-session\.js/);
});

test('exercise picker category renders a running activity tile that opens running session', () => {
  assert.match(exercisesJs, /data-picker-activity="running"/);
  assert.match(exercisesJs, /런닝\/조깅/);
  assert.match(exercisesJs, /wtSwitchType\('running'\)/);
  assert.doesNotMatch(exercisesJs, /wt-running-section/);
});

test('running picker tile and session screens have dedicated styles', () => {
  assert.match(styleCss, /\.ex-picker-activity-tile \.ex-picker-muscle-name/);
  assert.match(styleCss, /\.ex-picker-activity-figure/);
  assert.match(styleCss, /\.wt-running-session-root/);
  assert.match(styleCss, /\.wt-running-screen--start/);
  assert.match(styleCss, /\.wt-running-screen--progress/);
  assert.match(styleCss, /\.wt-running-screen--summary/);
  assert.match(styleCss, /\.wt-running-session-route-svg/);
  assert.doesNotMatch(styleCss, /\.wt-running-gps\b/);
});

test('running session is wired into app init, save, load, and sessions', () => {
  assert.doesNotMatch(activityFormsJs, /initRunningTracker|renderRunningTracker/);
  assert.match(workoutIndexJs, /initRunningSession/);
  assert.match(workoutIndexJs, /window\.wtOpenRunningSession/);
  assert.match(appJs, /wtHandleRunningSessionBack/);
  assert.doesNotMatch(saveJs, /wt-run-distance|wt-run-duration-min|wt-run-duration-sec|wt-run-memo/);
  assert.match(saveJs, /runRoute:\s*Array\.isArray\(run\.route\) \? run\.route : \[\]/);
  assert.match(saveJs, /runPlaceSummary:\s*run\.placeSummary \|\| null/);
  assert.match(loadJs, /route:\s*Array\.isArray\(workoutSource\.runRoute\) \? workoutSource\.runRoute : \[\]/);
  assert.match(loadJs, /if \(active === 'running'\) active = 'gym'/);
  assert.match(sessionsJs, /'runRoute'/);
  assert.match(sessionsJs, /firstRunRoute/);
});

test('service worker cache version was bumped for running session assets', () => {
  assert.match(swJs, /tomatofarm-v20260627z17-running-session/);
  assert.match(swJs, /\.\/workout\/running-session\.js/);
  assert.doesNotMatch(swJs, /\.\/workout\/running-tracker\.js/);
});
