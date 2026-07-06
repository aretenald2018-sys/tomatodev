import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const exercisesJs = readFileSync('workout/exercises.js', 'utf8');
const expertJs = readFileSync('workout/expert.js', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

function sliceByFirstBrace(source, startToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  let open = -1;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] !== '{') continue;
    const before = source.slice(start, i);
    if (/\)\s*$/.test(before) || /=>\s*$/.test(before)) {
      open = i;
      break;
    }
  }
  assert.notEqual(open, -1, `${startToken} should have a body`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${startToken} body should close`);
}

test('Dashboard3 workout list renderer is locked to the test-mode card template', () => {
  assert.match(exercisesJs, /const DASHBOARD3_TEST_MODE_UI = true;/);
  assert.match(exercisesJs, /function _isTestModeEntry/);
  assert.match(exercisesJs, /function _isTestModePickerContext/);

  const renderList = sliceByFirstBrace(exercisesJs, 'export function _renderExerciseList');
  assert.match(renderList, /ex-block--max-v2/);
  assert.match(renderList, /_buildMaxExerciseCardHeader/);
  assert.match(renderList, /ex-max-v2-primary/);
  assert.doesNotMatch(renderList, /<div class="ex-block-header">/);
  assert.doesNotMatch(renderList, /maxPrescriptionHtml/);
  assert.doesNotMatch(renderList, /poPillHtml|expertHtml/);
  assert.doesNotMatch(renderList, /\bisMaxMode\b/);

  const entryMode = sliceByFirstBrace(exercisesJs, 'function _isMaxEntryMode');
  assert.match(entryMode, /_isTestModeEntry/);
});

test('workout entry cards render as a horizontal carousel instead of bookmark tabs', () => {
  const renderList = sliceByFirstBrace(exercisesJs, 'export function _renderExerciseList');
  const controls = sliceByFirstBrace(exercisesJs, 'function _renderWorkoutEntryCarouselControls');
  const scrollTo = sliceByFirstBrace(exercisesJs, 'function _scrollWorkoutEntryCarouselTo');
  const complete = sliceByFirstBrace(exercisesJs, 'function _advanceWorkoutEntry');

  assert.match(renderList, /ex-entry-carousel-track/);
  assert.match(renderList, /data-wt-entry-slide-idx/);
  assert.match(renderList, /_bindWorkoutEntryCarousel\(shell\)/);
  assert.match(renderList, /_scrollWorkoutEntryCarouselTo\(activeIdx, \{ behavior: 'auto' \}\)/);
  assert.match(controls, /ex-entry-carousel-controls/);
  assert.match(controls, /data-wt-entry-dot-idx/);
  assert.match(scrollTo, /track\.scrollTo/);
  assert.match(complete, /_nextWorkoutEntryIdx/);
  assert.doesNotMatch(exercisesJs, /ex-entry-bookmark|data-wt-entry-tab-idx|_renderWorkoutEntryBookmarks/);
});

test('exercise picker always creates test-mode entries on Dashboard3', () => {
  const maxPool = sliceByFirstBrace(exercisesJs, 'function _getMaxBenchmarkPickerPool');
  assert.match(maxPool, /_isTestModePickerContext\(\)/);
  assert.doesNotMatch(maxPool, /_isMaxWorkoutMode\(\) \|\|/);

  const ensureEntry = sliceByFirstBrace(exercisesJs, 'function _ensureTestModePickerEntry');
  assert.match(ensureEntry, /mode: 'max'/);
  assert.match(ensureEntry, /dashboard3-test-mode/);
  assert.match(ensureEntry, /_testModeSetsFromPrescription/);
  assert.match(ensureEntry, /keepExistingSets = Array\.isArray\(base\.sets\) && base\.sets\.length && !generatedSets/);

  const generatedSets = sliceByFirstBrace(exercisesJs, 'function _testModeSetsFromPrescription');
  assert.match(generatedSets, /_firstTestModePrescriptionSet/);
  assert.match(generatedSets, /prescription\.program === 'wendler'/);
  assert.match(generatedSets, /_defaultTestModeSet\(\)/);
  assert.match(generatedSets, /prescription\.applySets === true/);
  assert.match(generatedSets, /prescription\.sets/);
  assert.match(generatedSets, /prescription\.sets\.map/);
  assert.match(generatedSets, /Number\(prescription\.targetRpe\) \|\| null/);
  assert.doesNotMatch(generatedSets, /targetSets|startKg|repsHigh|repsLow|Array\.from/);

  const programEntry = sliceByFirstBrace(exercisesJs, 'function _buildProgramPickerExerciseEntry');
  assert.match(programEntry, /_testModeSetsFromPrescription\(program\.prescription\)/);
  assert.doesNotMatch(programEntry, /sets:\s*program\.prescription\.sets\s*\|\|/);

  const pickerEntry = sliceByFirstBrace(exercisesJs, 'function _buildPickerExerciseEntry');
  assert.match(pickerEntry, /_buildProgramPickerExerciseEntry/);
  assert.match(pickerEntry, /_ensureTestModePickerEntry/);
  assert.match(pickerEntry, /_isTestModePickerContext\(\)/);
  assert.ok(
    pickerEntry.indexOf('_buildProgramPickerExerciseEntry(ex)') < pickerEntry.indexOf('buildMaxPickerExerciseEntry({'),
    'program prescriptions should be applied before Max recommendation picker fallback',
  );
});

test('exercise picker seeds the first manual row from latest work set or 40x10 fallback', () => {
  const defaultSet = sliceByFirstBrace(exercisesJs, 'function _defaultPickerExerciseSet');
  assert.match(defaultSet, /const latest = _latestPickerExerciseSet\(ex\?\.id\)/);
  assert.match(defaultSet, /kg:\s*latest\?\.kg \|\| 40/);
  assert.match(defaultSet, /reps:\s*latest\?\.reps \|\| 10/);
  assert.match(defaultSet, /done:\s*false/);

  const latestSet = sliceByFirstBrace(exercisesJs, 'function _latestPickerExerciseSet');
  assert.match(latestSet, /getCache\(\)/);
  assert.match(latestSet, /getWorkoutSessions/);
  assert.match(latestSet, /todayKey/);
  assert.match(latestSet, /entry\?\.exerciseId !== exerciseId/);
  assert.match(latestSet, /set\.setType === 'warmup'/);

  const pickerEntry = sliceByFirstBrace(exercisesJs, 'function _buildPickerExerciseEntry');
  assert.match(pickerEntry, /entry\.sets = \[_defaultPickerExerciseSet\(ex\)\]/);
  assert.match(pickerEntry, /sets:\s*\[_defaultPickerExerciseSet\(ex\)\]/);
  assert.doesNotMatch(pickerEntry, /sets:\s*\[\{ kg:\s*0,\s*reps:\s*0,\s*setType:\s*'main'/);
});

test('wendler generated sets render program role chips instead of normal set type chips', () => {
  const labelFn = sliceByFirstBrace(exercisesJs, 'function _maxSetTypeLabel');
  assert.match(labelFn, /set\?\.wendlerRole === 'warmup'[\s\S]*return '웜업'/);
  assert.match(labelFn, /set\?\.wendlerRole === 'main'[\s\S]*return '메인'/);
  assert.match(labelFn, /supplementalKind === 'bbb'[\s\S]*return 'BBB'/);
  assert.match(labelFn, /supplementalKind === 'fsl'[\s\S]*return 'FSL'/);
  assert.match(labelFn, /return '메인'/);

  const nextFn = sliceByFirstBrace(exercisesJs, 'function _nextMaxSetType');
  assert.match(nextFn, /_isWendlerSet\(set\)[\s\S]*return type \|\| 'main'/);

  const renderSets = sliceByFirstBrace(exercisesJs, 'function _renderSets');
  assert.match(renderSets, /_maxSetTypeClass\(set\.setType,\s*set\)/);
  assert.match(renderSets, /_maxSetTypeLabel\(set\.setType,\s*set\)/);
  assert.match(renderSets, /if \(_isWendlerSet\(set\)\) return/);
});

test('Dashboard3 mode controls cannot persist normal or pro workout record UI', () => {
  assert.match(expertJs, /const DASHBOARD3_TEST_MODE_ONLY = true;/);

  const renderTop = sliceByFirstBrace(expertJs, 'export function renderExpertTopArea');
  const forcedBranch = renderTop.indexOf('_isDashboardTestModeOnly()');
  const modeRead = renderTop.indexOf('const mode = getExpertMode');
  assert.ok(forcedBranch >= 0 && forcedBranch < modeRead, 'Dashboard3 branch must run before preset mode routing');
  assert.match(renderTop, /_syncWorkoutModeClass\('max'\)/);
  assert.match(renderTop, /host\.innerHTML = _renderDashboardTestModeEntry\(\)/);

  const showPro = sliceByFirstBrace(expertJs, 'window.wtExcShowProView = async');
  assert.doesNotMatch(showPro, /mode:\s*'pro'/);
  assert.match(showPro, /wtOpenGymListSheet/);

  const showMax = sliceByFirstBrace(expertJs, 'window.wtExcShowMaxView = async');
  assert.match(showMax, /mode:\s*'max'/);
  assert.doesNotMatch(showMax, /openMaxMiniOnboarding\(\)/);

  const switchNormal = sliceByFirstBrace(expertJs, 'window.wtExcSwitchToNormalView = async');
  assert.match(switchNormal, /mode:\s*'max'/);
  assert.doesNotMatch(switchNormal, /mode:\s*'normal'/);

  const leaveExpert = sliceByFirstBrace(expertJs, 'window.wtExcLeaveExpertMode = async');
  assert.match(leaveExpert, /mode:\s*'max'/);
  assert.doesNotMatch(leaveExpert, /mode:\s*'normal'/);

  const reEnable = sliceByFirstBrace(expertJs, 'window.wtExcReEnableExpertMode = async');
  assert.match(reEnable, /mode:\s*'max'/);
  assert.doesNotMatch(reEnable, /mode:\s*'pro'/);
});

test('service worker cache version was bumped for workout asset changes', () => {
  assert.match(swJs, /tomatofarm-v20260706z10-cardio-picker-images/);
});
