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
const configJs = await readFile(new URL('../config.js', import.meta.url), 'utf8');
const runningSessionJs = await readFile(new URL('../workout/running-session.js', import.meta.url), 'utf8');
const runningMapJs = await readFile(new URL('../workout/running-map.js', import.meta.url), 'utf8');

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
  assert.match(exercisesJs, /data-picker-activity="manual-cardio"/);
  assert.match(exercisesJs, /유산소/);
  assert.match(exercisesJs, /function _openManualCardioInput/);
  assert.match(exercisesJs, /id="ex-cardio-speed"/);
  assert.match(exercisesJs, /id="ex-cardio-minutes"/);
  assert.match(exercisesJs, /source: 'manual-cardio'/);
  assert.match(exercisesJs, /speedKmh/);
  assert.match(exercisesJs, /S\.workout\.exercises = \[\]/);
  assert.match(exercisesJs, /S\.workout\.cf = false/);
  assert.match(exercisesJs, /function _snapshotManualCardioPreviousWorkout/);
  assert.match(exercisesJs, /function _restoreManualCardioPreviousWorkout/);
  assert.match(exercisesJs, /saveWorkoutDay\(\{ silent: true \}\)/);
  assert.match(exercisesJs, /PICKER_MANUAL_CARDIO_SESSION_INDEX = 2/);
  assert.match(exercisesJs, /window\.wtOpenWorkoutDaySheet\(targetDateKey, PICKER_MANUAL_CARDIO_SESSION_INDEX/);
  assert.doesNotMatch(exercisesJs, /wt-running-section/);
});

test('running picker tile and session screens have dedicated styles', () => {
  assert.match(styleCss, /\.ex-picker-activity-tile \.ex-picker-muscle-name/);
  assert.match(styleCss, /\.ex-picker-activity-tile--manual-cardio \.ex-picker-muscle-name/);
  assert.match(styleCss, /\.ex-picker-cardio-backdrop/);
  assert.match(styleCss, /\.ex-picker-cardio-mode/);
  assert.match(styleCss, /\.ex-picker-cardio-preview/);
  assert.match(styleCss, /\.ex-picker-activity-figure/);
  assert.match(styleCss, /\.wt-running-session-root/);
  assert.match(styleCss, /\.wt-running-screen--start/);
  assert.match(styleCss, /\.wt-running-screen--progress/);
  assert.match(styleCss, /\.wt-running-screen--summary/);
  assert.match(styleCss, /\.wt-run-real-map/);
  assert.match(styleCss, /\.wt-run-map-canvas/);
  assert.match(styleCss, /\.wt-run-map-status/);
  assert.match(styleCss, /\.wt-run-start-options/);
  assert.match(styleCss, /\.wt-run-goal-sheet/);
  assert.match(styleCss, /\.wt-run-goal-progress/);
  assert.match(styleCss, /image-rendering:\s*auto/);
  assert.match(styleCss, /-webkit-font-smoothing:\s*antialiased/);
  assert.match(styleCss, /width:\s*min\(24vw,\s*110px\)/);
  assert.match(styleCss, /cursor:\s*grab/);
  assert.doesNotMatch(styleCss, /\.wt-running-session-route-svg/);
  assert.doesNotMatch(styleCss, /run-map-road/);
  assert.doesNotMatch(styleCss, /\.wt-running-gps\b/);
  assert.doesNotMatch(styleCss, /\.wt-run-tip-card/);
  assert.doesNotMatch(styleCss, /\.wt-run-float/);
  assert.doesNotMatch(styleCss, /\.wt-run-map-label/);
});

test('running session has goal setup and Korean voice guidance cues', () => {
  assert.match(runningSessionJs, /DEFAULT_RUNNING_GOAL/);
  assert.match(runningSessionJs, /RUNNING_GOAL_DEFAULTS/);
  assert.match(runningSessionJs, /data-running-action="audio-toggle"/);
  assert.match(runningSessionJs, /data-running-action="goal-save"/);
  assert.match(runningSessionJs, /name="running-goal-type"/);
  assert.match(runningSessionJs, /id="wt-run-goal-distance"/);
  assert.match(runningSessionJs, /id="wt-run-goal-time"/);
  assert.match(runningSessionJs, /function _runningGoalProgress/);
  assert.match(runningSessionJs, /function _checkRunningAudioCues/);
  assert.match(runningSessionJs, /announcedSplits/);
  assert.match(runningSessionJs, /announcedGoalHalf/);
  assert.match(runningSessionJs, /announcedGoalDone/);
  assert.match(runningSessionJs, /SpeechSynthesisUtterance/);
  assert.match(runningSessionJs, /utterance\.lang = 'ko-KR'/);
  assert.match(runningSessionJs, /킬로미터 통과/);
  assert.match(runningSessionJs, /목표를 완료했습니다/);
  assert.doesNotMatch(runningSessionJs, /목표 설정은 준비 중이에요/);
});

test('running session publishes home life-zone live state without rendering a duplicate home track', () => {
  assert.match(runningSessionJs, /function _publishRunningLiveState/);
  assert.match(runningSessionJs, /window\.__tomatoRunningLive/);
  assert.match(runningSessionJs, /life-zone:running-live/);
  assert.match(runningSessionJs, /routeSummary/);
  assert.match(runningSessionJs, /placeSummary:\s*_session\.placeSummary \|\| \(routeSummary \? _runningPlaceFallback\(routeSummary\) : null\)/);
  assert.match(runningSessionJs, /previewPoint/);
  assert.match(runningSessionJs, /const shouldResolvePlace = active[\s\S]*routeSummary\?\.centroid[\s\S]*_ensureRunningPlaceSummary\(routeSummary\)\.then/);
  assert.match(runningSessionJs, /route,\s*\n\s*routeSummary/);
  assert.match(runningSessionJs, /_publishRunningLiveState\(true\);[\s\S]*function _startWatch/);
  assert.match(appJs, /document\.addEventListener\('life-zone:running-live'/);
  assert.match(appJs, /if \(_currentTab === 'home'\) renderHome\(\)/);

  assert.doesNotMatch(runningSessionJs, /function _renderLiveTrackStage/);
  assert.doesNotMatch(runningSessionJs, /wt-run-home-track-stage/);
  assert.doesNotMatch(runningSessionJs, /progress-bubble/);
  assert.doesNotMatch(runningSessionJs, /wt-run-home-runner/);
  assert.doesNotMatch(runningSessionJs, /running-track-live\.png/);

  assert.doesNotMatch(styleCss, /\.wt-run-home-track-stage/);
  assert.doesNotMatch(styleCss, /\.wt-run-home-track-map-bubble/);
  assert.doesNotMatch(styleCss, /@keyframes wt-run-home-runner-lap/);
  assert.doesNotMatch(styleCss, /assets\/workout\/running-track-live\.png/);
});

test('running maps use real provider shell instead of fake svg maps', () => {
  assert.match(configJs, /PUBLIC_VWORLD_MAP_KEY/);
  assert.match(configJs, /cfg_running_map_provider/);
  assert.match(configJs, /cfg_vworld_api_key/);
  assert.match(configJs, /cfg_vworld_map_layer/);
  assert.match(configJs, /cfg_google_maps_key/);
  assert.match(configJs, /cfg_tmap_app_key/);
  assert.match(runningMapJs, /buildVworldTileUrl/);
  assert.match(runningMapJs, /wt-vworld-map/);
  assert.match(runningMapJs, /buildGoogleMapsScriptUrl/);
  assert.match(runningMapJs, /buildTmapScriptUrl/);
  assert.match(runningMapJs, /Tmapv2\.Map/);
  assert.match(runningMapJs, /google\.maps/);
  assert.match(runningMapJs, /devicePixelRatio/);
  assert.match(runningMapJs, /tileCssSize/);
  assert.match(runningMapJs, /pointerdown/);
  assert.match(runningMapJs, /wheel/);
  assert.match(runningMapJs, /dblclick/);
  assert.match(runningMapJs, /pointerDistance/);
  assert.match(runningMapJs, /function _vworldZoomForRoute/);
  assert.match(runningMapJs, /const pad = 72/);
  assert.doesNotMatch(runningMapJs, /RUNNING_MAP_HOME_MAX_ZOOM/);
  assert.match(runningSessionJs, /data-running-real-map/);
  assert.match(runningSessionJs, /renderRunningMap/);
  assert.doesNotMatch(runningMapJs, /키를 설정하면/);
  assert.doesNotMatch(runningSessionJs, /밤에 러닝하시나요/);
  assert.doesNotMatch(runningSessionJs, /러닝 가이드/);
  assert.doesNotMatch(runningSessionJs, /현재 위치/);
  assert.doesNotMatch(runningSessionJs, /wt-run-map-label/);
  assert.doesNotMatch(runningSessionJs, /wt-run-tip-card/);
  assert.doesNotMatch(runningSessionJs, /wt-run-float/);
  assert.doesNotMatch(runningSessionJs, /buildRunningSessionRouteSvg/);
  assert.doesNotMatch(runningSessionJs, /<svg class="wt-running-session-route-svg/);
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

test('running summary save opens the saved workout day detail sheet', () => {
  assert.match(appJs, /openWorkoutDaySheet,/);
  assert.match(appJs, /async function openWorkoutDaySheetFromAction/);
  assert.match(appJs, /openWorkoutDaySheet\(dateKey,[\s\S]*sheetState:\s*'full'/);
  assert.match(appJs, /window\.wtOpenWorkoutDaySheet = openWorkoutDaySheetFromAction/);
  assert.match(runningSessionJs, /const targetDateKey = _workoutDateKeyFromState\(\)/);
  assert.match(runningSessionJs, /const targetSessionIndex = _workoutSessionIndexFromState\(\)/);
  assert.match(runningSessionJs, /await window\.wtOpenWorkoutDaySheet\(targetDateKey, targetSessionIndex,[\s\S]*action:\s*'running:save-detail'/);
  assert.match(runningSessionJs, /wtCloseRunningSession\(\);[\s\S]*typeof window\.wtOpenWorkoutDaySheet === 'function'/);
});

test('running session persists unsaved live records across app reloads', () => {
  assert.match(runningSessionJs, /RUNNING_SESSION_DRAFT_KEY_PREFIX = 'tomatofarm_running_session_draft_'/);
  assert.match(runningSessionJs, /export function normalizeRunningSessionDraft/);
  assert.match(runningSessionJs, /localStorage\.setItem\(_runningDraftKey\(\), JSON\.stringify\(draft\)\)/);
  assert.match(runningSessionJs, /window\.addEventListener\('pagehide', \(\) => _persistRunningDraft\('pagehide'\)\)/);
  assert.match(runningSessionJs, /window\.addEventListener\('beforeunload', \(\) => _persistRunningDraft\('beforeunload'\)\)/);
  assert.match(runningSessionJs, /document\.addEventListener\('visibilitychange', \(\) => \{[\s\S]*document\.hidden[\s\S]*_persistRunningDraft\('visibility hidden'\)/);
  assert.match(runningSessionJs, /function _restoreRunningDraftIfAvailable\(\)[\s\S]*_applyRunningDraft\(draft\)[\s\S]*_startWatch\(\)/);
  assert.match(runningSessionJs, /export function wtOpenRunningSession\(\) \{[\s\S]*if \(_restoreRunningDraftIfAvailable\(\)\) return;/);
  assert.match(runningSessionJs, /function _finishRun\(\)[\s\S]*_persistRunningDraft\('finish'\)/);
  assert.match(runningSessionJs, /export function wtCloseRunningSession\(\) \{[\s\S]*_clearRunningDraft\(\);[\s\S]*_resetLiveSession\(\);/);
});

test('running records save into a dedicated running session with place and device metrics', () => {
  assert.match(runningSessionJs, /const RUNNING_WORKOUT_SESSION_INDEX = 2/);
  assert.match(runningSessionJs, /function _workoutSessionIndexFromState\(\) \{\s*return RUNNING_WORKOUT_SESSION_INDEX;\s*\}/);
  assert.match(runningSessionJs, /S\.workout\.sessionIndex = RUNNING_WORKOUT_SESSION_INDEX/);
  assert.match(runningSessionJs, /S\.workout\.sessionId = 'running-track'/);
  assert.match(runningSessionJs, /memo:\s*''/);
  assert.doesNotMatch(runningSessionJs, /러닝 세션/);
  assert.doesNotMatch(runningSessionJs, /대한민국 위치 기록/);

  assert.match(runningSessionJs, /export async function resolveRunningPlaceSummary/);
  assert.match(runningSessionJs, /api\.vworld\.kr\/req\/address/);
  assert.match(runningSessionJs, /type=BOTH/);
  assert.match(runningSessionJs, /level4A/);
  assert.match(runningSessionJs, /level4L/);
  assert.match(runningSessionJs, /adminArea/);

  assert.match(runningSessionJs, /function _readRunningSensorSnapshot/);
  assert.match(runningSessionJs, /window\.__tomatoRunningSensorSnapshot/);
  assert.match(runningSessionJs, /window\.__tomatoRunningSensors\?\.getSnapshot/);
  assert.match(runningSessionJs, /window\.TomatoRunningSensors\?\.getSnapshot/);
  assert.match(runningSessionJs, /altitude:\s*_optionalFiniteNumber/);
  assert.match(runningSessionJs, /heartRateBpm:\s*_optionalNumber/);
  assert.match(runningSessionJs, /cadenceSpm:\s*_optionalNumber/);
  assert.match(runningSessionJs, /summary\.elevationGainM == null \? '--'/);
  assert.match(runningSessionJs, /summary\.avgHeartRateBpm == null \? '--'/);
  assert.match(runningSessionJs, /summary\.cadenceSpm == null \? '--'/);
});

test('running workout save writes a running life-zone snapshot', () => {
  assert.match(saveJs, /hasLifeZoneDietActivity,\s*hasLifeZoneRunningActivity,\s*hasLifeZoneWorkoutActivity/);
  assert.match(saveJs, /const state = hasLifeZoneRunningActivity\(payload\) \? 'running' : 'workout';/);
  assert.match(saveJs, /const snapshot = active \? \{ state, updatedAt: Date\.now\(\) \} : null;/);
});

test('service worker cache version was bumped for running session assets', () => {
  assert.match(swJs, /tomatofarm-v20260703z12-picker-sheet-fast-path/);
  assert.match(swJs, /\.\/workout\/running-map\.js/);
  assert.match(swJs, /\.\/workout\/running-session\.js/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/sprites\/jups-running-track\.png/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/sprites\/moonjung-tomato-running-track\.png/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/sprites\/lee-jaeheon-running-track\.png/);
  assert.doesNotMatch(swJs, /\.\/assets\/workout\/running-track-live\.png/);
  assert.doesNotMatch(swJs, /\.\/workout\/running-tracker\.js/);
});
