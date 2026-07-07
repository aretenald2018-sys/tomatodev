import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function assertHasResourceId(xml, id) {
  assert.match(xml, new RegExp(`android:id="@\\+id/${id}"`), `missing Android resource id ${id}`);
}

test('wear slice2 layout declares the required running surfaces', () => {
  const layout = readProjectFile('android/wear/src/main/res/layout/page_workout.xml');
  [
    'wearWorkoutPicker',
    'wearWorkoutCarousel',
    'runStartButton',
    'runActiveScreen',
    'runActiveHeartRate',
    'runPauseButton',
    'runPausedScreen',
    'runResumeButton',
    'runFinalStopButton',
    'runSummaryScreen',
    'runSummaryHeartRate',
  ].forEach((id) => assertHasResourceId(layout, id));

  assert.match(layout, /런닝\/&#10;조깅/);
  assert.match(layout, /심박수/);
  assert.match(layout, /킬로미터/);
});

test('wear slice2 has behavioral and rendered evidence', () => {
  [
    'android/wear/src/test/java/com/lifestreak/wear/workout/WearRunUiStateTest.kt',
    '.omo/evidence/wear-cardio-running-poc/slice2-watch-ui.png',
    '.omo/evidence/wear-cardio-running-poc/slice2-watch-ui-picker.png',
    '.omo/evidence/wear-cardio-running-poc/slice2-watch-ui-active.png',
    '.omo/evidence/wear-cardio-running-poc/slice2-watch-ui-paused.png',
    '.omo/evidence/wear-cardio-running-poc/slice2-watch-ui-summary.png',
  ].forEach((relativePath) => {
    assert.ok(existsSync(new URL(`../${relativePath}`, import.meta.url)), `missing ${relativePath}`);
  });
});
