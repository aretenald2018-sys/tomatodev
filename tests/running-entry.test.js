import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const workoutUi = await readFile(new URL('../workout-ui.js', import.meta.url), 'utf8');
const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const activityFormsJs = await readFile(new URL('../workout/activity-forms.js', import.meta.url), 'utf8');
const saveJs = await readFile(new URL('../workout/save.js', import.meta.url), 'utf8');
const loadJs = await readFile(new URL('../workout/load.js', import.meta.url), 'utf8');
const sessionsJs = await readFile(new URL('../workout/sessions.js', import.meta.url), 'utf8');
const styleCss = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const swJs = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

test('running type has a visible workout section and type tab', () => {
  assert.match(indexHtml, /id="wt-chip-running"[^>]*onclick="wtSwitchType\('running'\)"[^>]*>🏃 런닝\/조깅<\/button>/);
  assert.match(indexHtml, /id="wt-running-section"/);
  assert.match(indexHtml, /id="wt-run-distance"/);
  assert.match(indexHtml, /id="wt-run-duration-min"/);
  assert.match(indexHtml, /id="wt-run-duration-sec"/);
  assert.match(indexHtml, /id="wt-run-memo"/);
  assert.match(indexHtml, /id="wt-running-last-copy"/);
  assert.match(indexHtml, /id="wt-run-gps-primary"/);
  assert.match(indexHtml, /id="wt-run-gps-pause"/);
  assert.match(indexHtml, /id="wt-run-route-preview"/);
  assert.match(indexHtml, /id="wt-run-place-label"/);
});

test('workout type switcher knows the running detail section', () => {
  assert.match(workoutUi, /running:\s*'wt-running-section'/);
});

test('exercise picker category renders a running activity tile that opens running section', () => {
  assert.match(exercisesJs, /data-picker-activity="running"/);
  assert.match(exercisesJs, /런닝\/조깅/);
  assert.match(exercisesJs, /wtSwitchType\('running'\)/);
  assert.match(exercisesJs, /wt-running-section/);
});

test('running picker tile and form have dedicated styles', () => {
  assert.match(styleCss, /\.ex-picker-activity-tile \.ex-picker-muscle-name/);
  assert.match(styleCss, /\.ex-picker-activity-figure/);
  assert.match(styleCss, /\.wt-running-header/);
  assert.match(styleCss, /\.wt-running-gps/);
  assert.match(styleCss, /\.wt-running-route-svg polyline/);
  assert.match(styleCss, /\.wt-running-row--memo/);
});

test('running GPS tracker is wired into form render, save, load, and sessions', () => {
  assert.match(activityFormsJs, /initRunningTracker\(\{ saveWorkoutDay, renderRunningForm: _renderRunningForm \}\)/);
  assert.match(activityFormsJs, /renderRunningTracker\(\)/);
  assert.match(saveJs, /runRoute:\s*Array\.isArray\(run\.route\) \? run\.route : \[\]/);
  assert.match(saveJs, /runPlaceSummary:\s*run\.placeSummary \|\| null/);
  assert.match(loadJs, /route:\s*Array\.isArray\(workoutSource\.runRoute\) \? workoutSource\.runRoute : \[\]/);
  assert.match(sessionsJs, /'runRoute'/);
  assert.match(sessionsJs, /firstRunRoute/);
});

test('service worker cache version was bumped for running entry assets', () => {
  assert.match(swJs, /tomatofarm-v20260627z16-running-gps/);
  assert.match(swJs, /\.\/workout\/running-tracker\.js/);
});
