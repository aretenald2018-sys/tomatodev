import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('wear workout bridge native contracts are wired through Data Layer and WebView queue', async () => {
  const appGradle = await read('android/app/build.gradle');
  const wearGradle = await read('android/wear/build.gradle');
  const appManifest = await read('android/app/src/main/AndroidManifest.xml');
  const phoneBridge = await read('android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutBridge.kt');
  const listener = await read('android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutListenerService.kt');
  const mainActivity = await read('android/app/src/main/java/com/lifestreak/app/MainActivity.java');
  const wearSender = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutDataLayer.kt');
  const wearController = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt');
  const wearLayout = await read('android/wear/src/main/res/layout/page_workout.xml');

  assert.match(appGradle, /applicationId "com\.lifestreak\.app"/);
  assert.match(wearGradle, /applicationId "com\.lifestreak\.app"/);
  assert.match(appGradle, /com\.google\.android\.gms:play-services-wearable:18\.2\.0/);
  assert.match(wearGradle, /com\.google\.android\.gms:play-services-wearable:18\.2\.0/);
  assert.match(appManifest, /TomatoWearWorkoutListenerService/);
  assert.match(appManifest, /android\.wearable\.MESSAGE_RECEIVED/);
  assert.match(appManifest, /android:pathPrefix="\/tomato\/workout\/run\/complete"/);
  assert.match(listener, /WearableListenerService/);
  assert.match(listener, /onMessageReceived/);
  assert.match(listener, /TomatoWearWorkoutBridge\.enqueueFromWear/);
  assert.match(phoneBridge, /QUEUE_PREFS/);
  assert.match(phoneBridge, /evaluateJavascript/);
  assert.match(phoneBridge, /__tomatoWearWorkoutBridge/);
  assert.match(phoneBridge, /saveFromNative/);
  assert.match(phoneBridge, /drainPendingToWebView/);
  assert.match(mainActivity, /TomatoWearWorkoutBridge\.registerActivity/);
  assert.match(mainActivity, /TomatoWearWorkoutBridge\.drainPendingToWebView/);
  assert.match(wearSender, /MessageClient/);
  assert.match(wearSender, /\/tomato\/workout\/run\/complete/);
  assert.match(wearSender, /Wearable\.getNodeClient/);
  assert.match(wearSender, /Wearable\.getMessageClient/);
  assert.match(wearController, /WearWorkoutDataLayer\.sendRunComplete/);
  assert.match(wearLayout, /@\+id\/runSummarySyncStatus/);
});

test('web bridge saves a valid wear run as a cardio card and preserves existing fields', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'wear-bridge-'));
    try {
      const modulePath = join(tmp, 'wear-bridge-under-test.mjs');
      await writeFile(join(tmp, 'state.js'), 'export const S = globalThis.__wearBridgeTestState;\n', 'utf8');
      await writeFile(join(tmp, 'load.js'), 'export const loadWorkoutDate = globalThis.__wearBridgeTestLoad;\n', 'utf8');
      await writeFile(join(tmp, 'save.js'), 'export const saveWorkoutDay = globalThis.__wearBridgeTestSave;\n', 'utf8');
      await writeFile(join(tmp, 'exercises.js'), 'export const wtFocusWorkoutEntryCard = globalThis.__wearBridgeTestFocus;\n', 'utf8');
      await writeFile(modulePath, await read('workout/wear-bridge.js'), 'utf8');

    const saved = [];
    const focused = [];
    const loadedDates = [];
    const events = [];
    const toast = [];
    const store = new Map();

    globalThis.window = {
      showToast(message, duration, type) { toast.push({ message, duration, type }); },
      localStorage: {
        getItem(key) { return store.has(key) ? store.get(key) : null; },
        setItem(key, value) { store.set(key, String(value)); },
        removeItem(key) { store.delete(key); },
      },
    };
    globalThis.localStorage = globalThis.window.localStorage;
    globalThis.document = {
      dispatchEvent(event) { events.push(event.type); },
    };
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };

    const state = {
      workout: {
        exercises: [],
        running: false,
        runData: {},
      },
      diet: {
        breakfast: '토스트',
        bFoods: [{ name: '토스트' }],
      },
      shared: { date: null },
    };
    globalThis.__wearBridgeTestState = state;
    globalThis.__wearBridgeTestLoad = async (y, m, d) => {
      loadedDates.push([y, m, d]);
      state.shared.date = { y, m, d };
    };
    globalThis.__wearBridgeTestSave = async (options) => {
      saved.push({ options, workout: JSON.parse(JSON.stringify(state.workout)), diet: JSON.parse(JSON.stringify(state.diet)) });
      return true;
    };
    globalThis.__wearBridgeTestFocus = (index) => focused.push(index);

    const bridgeModule = await import(pathToFileURL(modulePath).href);
    bridgeModule.configureWearWorkoutBridgeForTest({
      state,
      loadWorkoutDate: globalThis.__wearBridgeTestLoad,
      saveWorkoutDay: globalThis.__wearBridgeTestSave,
      focusEntry: globalThis.__wearBridgeTestFocus,
    });

    await assert.rejects(
      () => bridgeModule.saveWearWorkoutPayload({ type: 'cycling', dateKey: 'bad' }),
      /unsupported wear workout type|dateKey/,
    );

    const result = await bridgeModule.saveWearWorkoutPayload({
      type: 'running',
      source: 'wear',
      dateKey: '2026-07-07',
      startedAt: 1783400000000,
      endedAt: 1783401265000,
      durationSec: 1265,
      distanceKm: 3.21,
      avgPaceSecPerKm: 394,
      avgHeartRateBpm: 141,
      maxHeartRateBpm: 166,
      samples10s: [
        { timestampMs: 1783400000000, bpm: 136 },
        { timestampMs: 1783400010000, bpm: 141 },
      ],
    });

    assert.equal(result.ok, true);
    assert.deepEqual(loadedDates, [[2026, 6, 7]]);
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0].options, { silent: true });
    assert.equal(saved[0].diet.breakfast, '토스트');
    assert.deepEqual(saved[0].diet.bFoods, [{ name: '토스트' }]);
    assert.equal(state.workout.running, true);
    assert.equal(state.workout.runData.source, 'wear');
    assert.equal(state.workout.runData.distance, 3.21);
    assert.equal(state.workout.runData.durationMin, 21);
    assert.equal(state.workout.runData.durationSec, 5);
    assert.equal(state.workout.exercises.length, 1);
    assert.equal(state.workout.exercises[0].exerciseId, 'cardio:treadmill-running');
    assert.equal(state.workout.exercises[0].cardio.source, 'wear-running');
    assert.equal(state.workout.exercises[0].cardio.avgHeartRateBpm, 141);
    assert.equal(state.workout.exercises[0].cardio.maxHeartRateBpm, 166);
    assert.equal(state.workout.exercises[0].cardio.distanceKm, 3.21);
    assert.equal(focused[0], 0);
    assert.ok(events.includes('sheet:saved'));
    assert.ok(toast.some(item => item.message.includes('워치 런닝 기록')));

    await bridgeModule.saveWearWorkoutPayload({
      type: 'running',
      source: 'wear',
      dateKey: '2026-07-07',
      startedAt: 1783400000000,
      endedAt: 1783401265000,
      durationSec: 1265,
      distanceKm: 3.21,
      avgPaceSecPerKm: 394,
      avgHeartRateBpm: 141,
      maxHeartRateBpm: 166,
      samples10s: [],
    });
    assert.equal(state.workout.exercises.length, 1, 'same wear session should update, not duplicate');
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.document;
    delete globalThis.CustomEvent;
    delete globalThis.__wearBridgeTestState;
    delete globalThis.__wearBridgeTestLoad;
    delete globalThis.__wearBridgeTestSave;
    delete globalThis.__wearBridgeTestFocus;
    await rm(tmp, { recursive: true, force: true });
  }
});
