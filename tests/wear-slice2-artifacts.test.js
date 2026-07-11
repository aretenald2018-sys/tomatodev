import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function assertHasResourceId(xml, id) {
  assert.match(xml, new RegExp(`android:id="@\\+id/${id}"`), `missing Android resource id ${id}`);
}

function activeRunFlow(xml) {
  const activeStart = xml.indexOf('@+id/runActiveScreen');
  assert.notEqual(activeStart, -1, 'page_workout.xml must keep runActiveScreen');

  const pausedStart = xml.indexOf('@+id/runPausedScreen', activeStart);
  assert.notEqual(pausedStart, -1, 'page_workout.xml must keep runPausedScreen after active flow');

  return xml.slice(activeStart, pausedStart);
}

test('wear layout declares the run-only surfaces', () => {
  const layout = readProjectFile('android/wear/src/main/res/layout/page_workout.xml');
  const activeFlow = activeRunFlow(layout);

  [
    'runReadyScreen',
    'runStartButton',
    'runActiveScreen',
    'runMetricPager',
    'runPauseButton',
    'runPausedScreen',
    'runResumeButton',
    'runFinalStopButton',
    'runSummaryScreen',
    'runSummaryDistance',
    'runSummaryDuration',
    'runSummaryHeartRate',
    'runSummarySyncStatus',
  ].forEach((id) => assertHasResourceId(layout, id));

  assert.equal(
    [...layout.matchAll(/@(?:\+id|id)\/runMetricPager\b/g)].length,
    1,
    'page_workout.xml must declare exactly one active metrics pager',
  );
  assert.match(activeFlow, /androidx\.viewpager2\.widget\.ViewPager2/);
  assert.match(layout, /러닝/);
  assert.doesNotMatch(
    layout,
    /@\+id\/pager|@\+id\/indicator|dot[0-5]|page_(streak|checkin|week|stocks|timer)|wearWorkoutCarousel|wearWorkoutCarouselStrip|wo_list|준비중|오늘 앱 기록 없음/,
  );
});

test('wear state starts from the run-ready screen', () => {
  const state = readProjectFile('android/wear/src/main/java/com/lifestreak/wear/workout/WearRunUiState.kt');
  const stateTest = readProjectFile('android/wear/src/test/java/com/lifestreak/wear/workout/WearRunUiStateTest.kt');

  assert.match(state, /READY/);
  assert.doesNotMatch(state, /PICKER/);
  assert.match(stateTest, /WearRunUiScreen\.READY/);
});
