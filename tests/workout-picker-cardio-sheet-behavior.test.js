import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function repoUrl(relativePath, suffix = '') {
  return `${pathToFileURL(path.join(repoRoot, relativePath)).href}${suffix}`;
}

async function writeStub(tempDir, name, source) {
  const filePath = path.join(tempDir, name);
  await writeFile(filePath, source, 'utf8');
  return pathToFileURL(filePath).href;
}

async function runCardioSheetHarness() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tomato-cardio-sheet-'));
  const htmlPath = path.join(tempDir, 'harness.html');
  try {
    const stateUrl = repoUrl('workout/state.js');
    const exercisesUrl = repoUrl('workout/exercises.js');
    const stubDataUrl = await writeStub(tempDir, 'stub-data.js', `
export function getExList() { return []; }
export function getGlobalExList() { return []; }
export function getGymExList() { return []; }
export function getGyms() { return []; }
export function getLastSession() { return null; }
export function detectPRs() { return []; }
export function getCache() { return {}; }
export function dateKey() { return '2026-07-06'; }
export async function saveExercise() { return true; }
export async function deleteExercise() { return true; }
export function getMuscleParts() {
  return [
    { id: 'biceps', name: '이두', color: '#334155' },
    { id: 'tricep', name: '삼두', color: '#334155' },
    { id: 'abs', name: '복부', color: '#334155' },
  ];
}
export async function saveCustomMuscle() { return true; }
export function isExpertModeEnabled() { return false; }
export function getExpertPreset() { return { mode: 'normal' }; }
export function getExpertMode() { return 'normal'; }
export function getMaxCycle() { return null; }
export function getTestBoardV2() { return null; }
export async function saveTestBoardV2() { return true; }
`);
    const stubSaveUrl = await writeStub(tempDir, 'stub-save.js', `
export async function saveWorkoutDay() {
  window.__qaSaves = (window.__qaSaves || 0) + 1;
  return true;
}
`);
    const stubTimersUrl = await writeStub(tempDir, 'stub-timers.js', `
export function wtRestTimerStart() {}
export function wtRestTimerClearSetRecord() {}
export function wtRefreshWorkoutTimelineDuration() {}
export function wtPersistActiveWorkoutDraft() {
  window.__qaDraftPersists = (window.__qaDraftPersists || 0) + 1;
}
`);
    const stubUtilsUrl = await writeStub(tempDir, 'stub-utils.js', `
export function showToast() {}
`);
    const stubCalcUrl = await writeStub(tempDir, 'stub-calc.js', `
export const SUBPATTERN_TO_MAJOR = {};
export function estimate1RM() { return 0; }
export function estimateSet1RM() { return 0; }
export function rpeRepsToPct() { return 0; }
export function targetWeightKg() { return 0; }
export function weightRange() { return [0, 0]; }
export function getTrackMetricHistory() { return []; }
export function getWendlerMetricHistory() { return []; }
export function getLastTrackSession() { return null; }
export function normalizeWorkoutTrack(value) { return value || null; }
export function calcSetVolume() { return 0; }
export function isWendlerWorkoutEntry() { return false; }
`);
    const stubMaxPickerUrl = await writeStub(tempDir, 'stub-max-picker.js', `
export function buildMaxPickerExerciseEntry() { return null; }
export function resolveMaxBenchmarkPickerItems() { return []; }
`);
    const stubEditorUrl = await writeStub(tempDir, 'stub-editor.js', `
export function buildExerciseEditorRecord() { return null; }
export function customExerciseMuscleId(value) { return value || null; }
export function exerciseEditorRecordId(value) { return value || ''; }
export function verifyExerciseEditorSavedRecord() { return true; }
`);
    const stubEntryUrl = await writeStub(tempDir, 'stub-entry.js', `
export function findWorkoutEntryIndexByExerciseId() { return -1; }
export function selectWorkoutExerciseEntry() {}
export function workoutExerciseSelectionDetail(value) { return value; }
`);
    const stubBoardUrl = await writeStub(tempDir, 'stub-board.js', `
export function buildExerciseProgramWorkoutPrescription() { return null; }
export function findExerciseProgramBenchmark() { return null; }
export function getExerciseProgramSettings() { return null; }
export function mondayOf(value) { return value; }
export function upsertExerciseProgramBenchmark() { return null; }
`);
    const stubSessionsUrl = await writeStub(tempDir, 'stub-sessions.js', `
export function getWorkoutSessions() { return []; }
`);
    const stubTimelineUrl = await writeStub(tempDir, 'stub-timeline.js', `
export function clearSetCompletedAt(value) { return value; }
export function stampSetCompletedAt(value) { return value; }
export function stripSetCompletedAt(value) { return value; }
`);
    const stubExpertUrl = await writeStub(tempDir, 'stub-expert.js', `
export function resolveCurrentGymId() { return null; }
export function isExpertViewShown() { return false; }
`);
    const importMap = {
      imports: {
        [repoUrl('data.js')]: stubDataUrl,
        [repoUrl('workout/save.js')]: stubSaveUrl,
        [repoUrl('workout/timers.js')]: stubTimersUrl,
        [repoUrl('home/utils.js')]: stubUtilsUrl,
        [repoUrl('calc.js', '?v=20260514v72')]: stubCalcUrl,
        [repoUrl('workout/expert/max-benchmark-picker.js', '?v=20260517v3')]: stubMaxPickerUrl,
        [repoUrl('workout/exercise-editor-actions.js')]: stubEditorUrl,
        [repoUrl('workout/exercise-entry-actions.js')]: stubEntryUrl,
        [repoUrl('workout/test-v2/board-core.js')]: stubBoardUrl,
        [repoUrl('workout/sessions.js')]: stubSessionsUrl,
        [repoUrl('workout/timeline.js')]: stubTimelineUrl,
        [repoUrl('workout/expert.js')]: stubExpertUrl,
      },
    };
    await writeFile(htmlPath, `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<script type="importmap">${JSON.stringify(importMap)}</script></head>
<body>
<div id="ex-picker-modal">
  <button type="button" id="ex-picker-back"></button>
  <input id="ex-picker-search">
  <button type="button" id="ex-picker-search-clear"></button>
  <button type="button" id="ex-picker-add-top"></button>
  <div class="ex-picker-tabs"></div>
  <div id="ex-picker-list"></div>
  <button type="button" id="ex-picker-done"></button>
</div>
<script type="module">
try {
  window.showToast = () => {};
  window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  const state = await import(${JSON.stringify(stateUrl)});
  const exercises = await import(${JSON.stringify(exercisesUrl)});
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

  state.S.workout.exercises = [{
    muscleId: 'cardio',
    muscleIds: [],
    movementId: null,
    exerciseId: 'cardio:step-machine',
    name: '스텝머신',
    sets: [],
    cardio: {
      id: 'step-machine',
      label: '스텝머신',
      detail: '계단 오르기',
      kcal: 123,
      distanceKm: 0,
      speedKmh: 0,
      laps: 0,
      unit: 'metric',
      source: 'manual-cardio'
    }
  }];
  exercises.wtOpenManualCardioInput({ cardioId: 'step-machine' });
  await nextFrame();
  const legacyInput = document.querySelector('#ex-cardio-kcal');
  const legacy = {
    kcal: legacyInput?.value || '',
    mode: legacyInput?.dataset.cardioKcalMode || '',
    status: document.querySelector('[data-cardio-kcal-status]')?.textContent || '',
    preview: document.querySelector('[data-cardio-preview]')?.textContent || ''
  };

  document.querySelector('[data-picker-cardio-sheet]')?.remove();
  state.S.workout.exercises = [];
  exercises.wtOpenManualCardioInput({ cardioId: 'step-machine' });
  await nextFrame();
  const distance = document.querySelector('#ex-cardio-distance');
  const speed = document.querySelector('#ex-cardio-speed');
  distance.value = '5';
  distance.dispatchEvent(new Event('input', { bubbles: true }));
  speed.value = '10';
  speed.dispatchEvent(new Event('input', { bubbles: true }));
  await nextFrame();
  const autoInput = document.querySelector('#ex-cardio-kcal');
  const autoBase = {
    kcal: autoInput?.value || '',
    mode: autoInput?.dataset.cardioKcalMode || '',
    status: document.querySelector('[data-cardio-kcal-status]')?.textContent || '',
    preview: document.querySelector('[data-cardio-preview]')?.textContent || ''
  };

  const level = document.querySelector('#ex-cardio-level');
  if (!level) throw new Error('step-machine level input missing');
  level.value = '10';
  level.dispatchEvent(new Event('input', { bubbles: true }));
  await nextFrame();
  const stepLevel = {
    kcal: autoInput?.value || '',
    mode: autoInput?.dataset.cardioKcalMode || '',
    status: document.querySelector('[data-cardio-kcal-status]')?.textContent || '',
    preview: document.querySelector('[data-cardio-preview]')?.textContent || ''
  };
  document.querySelector('[data-picker-cardio-form]')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await nextFrame();
  const savedStep = state.S.workout.exercises.find(entry => entry.exerciseId === 'cardio:step-machine')?.cardio || null;

  exercises.wtOpenManualCardioInput({ cardioId: 'step-machine' });
  await nextFrame();
  const clearInput = document.querySelector('#ex-cardio-kcal');
  clearInput.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  await nextFrame();
  const cleared = {
    kcal: clearInput?.value || '',
    mode: clearInput?.dataset.cardioKcalMode || '',
    status: document.querySelector('[data-cardio-kcal-status]')?.textContent || ''
  };

  document.querySelector('[data-picker-cardio-sheet]')?.remove();
  state.S.workout.exercises = [];
  exercises.wtOpenManualCardioInput({ cardioId: 'my-mountain' });
  await nextFrame();
  const mountainDistance = document.querySelector('#ex-cardio-distance');
  const mountainSpeed = document.querySelector('#ex-cardio-speed');
  const angle = document.querySelector('#ex-cardio-angle');
  if (!angle) throw new Error('my-mountain angle input missing');
  mountainDistance.value = '5';
  mountainDistance.dispatchEvent(new Event('input', { bubbles: true }));
  mountainSpeed.value = '10';
  mountainSpeed.dispatchEvent(new Event('input', { bubbles: true }));
  angle.value = '12';
  angle.dispatchEvent(new Event('input', { bubbles: true }));
  await nextFrame();
  const mountainInput = document.querySelector('#ex-cardio-kcal');
  const myMountain = {
    kcal: mountainInput?.value || '',
    mode: mountainInput?.dataset.cardioKcalMode || '',
    status: document.querySelector('[data-cardio-kcal-status]')?.textContent || '',
    preview: document.querySelector('[data-cardio-preview]')?.textContent || ''
  };

  document.querySelector('[data-picker-cardio-sheet]')?.remove();
  window.__runningSessionCalls = 0;
  window.wtOpenRunningSession = () => {
    window.__runningSessionCalls += 1;
  };
  await exercises.wtOpenExercisePicker();
  await nextFrame();
  const runningTile = document.querySelector('[data-picker-body-action="running"]');
  if (!runningTile) throw new Error('running category tile missing');
  runningTile.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await nextFrame();
  const activeTab = document.querySelector('.ex-picker-tab.active')?.textContent?.trim() || '';
  const gpsText = Array.from(document.querySelectorAll('[data-picker-running-gps] *'))
    .map(node => node.textContent?.trim() || '')
    .filter(Boolean);
  const runningBeforeStart = {
    view: document.querySelector('#ex-picker-modal')?.dataset.pickerView || '',
    activeTab,
    toolbarCount: document.querySelectorAll('#ex-picker-list .ex-picker-list-toolbar').length,
    sortButtonCount: document.querySelectorAll('#ex-picker-list [data-picker-sort]').length,
    scopeButtonCount: document.querySelectorAll('#ex-picker-list [data-picker-scope]').length,
    rowCount: document.querySelectorAll('#ex-picker-list [data-picker-cardio-id], #ex-picker-list [data-picker-exercise-id]').length,
    gpsText,
    startButtonCount: document.querySelectorAll('[data-picker-running-start]').length,
    runningCalls: window.__runningSessionCalls,
  };
  const startButton = document.querySelector('[data-picker-running-start]');
  if (!startButton) throw new Error('running start button missing');
  startButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await nextFrame();
  const runningAfterStart = {
    runningCalls: window.__runningSessionCalls,
    modalOpen: document.querySelector('#ex-picker-modal')?.classList.contains('open') || false,
  };
  window.__qaDone = { legacy, autoBase, stepLevel, savedStep, cleared, myMountain, runningBeforeStart, runningAfterStart };
} catch (e) {
  window.__qaError = String(e && (e.stack || e.message) || e);
}
</script>
</body></html>`, 'utf8');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--allow-file-access-from-files'],
    });
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__qaDone || window.__qaError, { timeout: 15000 });
      const result = await page.evaluate(() => ({ done: window.__qaDone || null, error: window.__qaError || null }));
      assert.equal(result.error, null);
      assert.deepEqual(pageErrors, []);
      return result.done;
    } finally {
      await browser.close();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

test('manual cardio sheet preserves legacy kcal records and auto-calculates intensity fields', async () => {
  const result = await runCardioSheetHarness();

  assert.equal(result.legacy.kcal, '123');
  assert.equal(result.legacy.mode, 'manual');
  assert.equal(result.legacy.status, '직접 입력');
  assert.match(result.legacy.preview, /123 kcal/);

  assert.equal(result.autoBase.kcal, '368');
  assert.equal(result.autoBase.mode, 'auto');
  assert.equal(result.autoBase.status, '거리/속도/단계 자동 산출');
  assert.match(result.autoBase.preview, /368 kcal/);

  assert.equal(result.stepLevel.kcal, '450');
  assert.equal(result.stepLevel.mode, 'auto');
  assert.equal(result.stepLevel.status, '거리/속도/단계 자동 산출');
  assert.match(result.stepLevel.preview, /450 kcal/);
  assert.match(result.stepLevel.preview, /10단계/);
  assert.equal(result.savedStep.level, 10);

  assert.equal(result.cleared.kcal, '');
  assert.equal(result.cleared.mode, 'manual');
  assert.equal(result.cleared.status, '직접 입력');

  assert.equal(result.myMountain.kcal, '522');
  assert.equal(result.myMountain.mode, 'auto');
  assert.equal(result.myMountain.status, '거리/속도/각도 자동 산출');
  assert.match(result.myMountain.preview, /522 kcal/);
  assert.match(result.myMountain.preview, /각도 12°/);

  assert.equal(result.runningBeforeStart.view, 'running');
  assert.equal(result.runningBeforeStart.activeTab, '런닝/조깅');
  assert.equal(result.runningBeforeStart.toolbarCount, 0);
  assert.equal(result.runningBeforeStart.sortButtonCount, 0);
  assert.equal(result.runningBeforeStart.scopeButtonCount, 0);
  assert.equal(result.runningBeforeStart.rowCount, 0);
  assert.deepEqual(result.runningBeforeStart.gpsText, ['GPS 위치', '현재 위치 대기']);
  assert.equal(result.runningBeforeStart.startButtonCount, 1);
  assert.equal(result.runningBeforeStart.runningCalls, 0);
  assert.equal(result.runningAfterStart.runningCalls, 1);
  assert.equal(result.runningAfterStart.modalOpen, false);
});
