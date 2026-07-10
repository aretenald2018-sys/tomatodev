import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function writeWearBridgeModule(tmp) {
  const modulePath = join(tmp, 'wear-bridge-under-test.mjs');
  await Promise.all([
    writeFile(modulePath, await read('workout/wear-bridge.js'), 'utf8'),
    writeFile(join(tmp, 'running-route-store.js'), await read('workout/running-route-store.js'), 'utf8'),
    writeFile(join(tmp, 'package.json'), '{"type":"module"}\n', 'utf8'),
  ]);
  return modulePath;
}

test('wear run uses GPS location data and sends route result in final payload', async () => {
  const manifest = await read('android/wear/src/main/AndroidManifest.xml');
  const mainActivity = await read('android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt');
  const service = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt');
  const store = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseSessionStore.kt');
  const accumulator = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulator.kt');
  const payload = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearRunPayload.kt');
  const controller = await read('android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt');
  const layout = await read('android/wear/src/main/res/layout/page_workout.xml');

  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(manifest, /android\.permission\.FOREGROUND_SERVICE_LOCATION/);
  assert.match(manifest, /android:foregroundServiceType="health\|location"/);
  assert.match(mainActivity, /Manifest\.permission\.ACCESS_FINE_LOCATION/);

  assert.match(service, /DataType\.LOCATION/);
  assert.match(service, /isGpsEnabled = hasLocationPermission\(\)/);
  assert.match(service, /WarmUpConfig/);
  assert.match(service, /prepareExerciseAsync/);
  assert.match(service, /requestedDataTypes\(\)\.intersect\(runningCapabilities\.supportedDataTypes\)/);
  assert.match(service, /warmUpDataTypes\(config\.dataTypes\)/);
  assert.doesNotMatch(service, /ensureGpsDataTypes/);
  assert.match(service, /hasLocationPermission/);
  assert.match(service, /getData\(DataType\.LOCATION\)/);
  assert.doesNotMatch(service, /getData\(DataType\.LOCATION\)[\s\S]{0,120}lastOrNull\(\)/);
  assert.match(service, /locationPoints\.forEach/);

  assert.match(accumulator, /WearRoutePoint/);
  assert.match(accumulator, /routePoints/);
  assert.doesNotMatch(accumulator, /routePointsByBucket/);
  assert.match(accumulator, /ROUTE_GAP_MS = 45_000L/);
  assert.match(accumulator, /gapBefore = explicitGap \|\| inferredGap/);
  assert.match(accumulator, /gapReason = routePoint\.gapReason \?: if \(inferredGap\) "time-gap" else null/);
  assert.match(store, /routePoints: List<WearRoutePoint>/);
  assert.match(payload, /data class WearRoutePoint/);
  assert.match(payload, /ROUTE_GAP_MS = 45_000L/);
  assert.match(payload, /segmentId: Int\?/);
  assert.match(payload, /gapBefore: Boolean/);
  assert.match(payload, /gapReason: String\?/);
  assert.match(payload, /"route"/);
  assert.match(payload, /"routeSummary"/);
  assert.match(payload, /"segmentId"/);
  assert.match(payload, /"gapBefore"/);
  assert.match(payload, /"gapReason"/);
  assert.match(payload, /"segmentCount"/);
  assert.match(payload, /"gapCount"/);
  assert.match(payload, /"interrupted"/);
  assert.match(controller, /routePoints = exerciseSnapshot\.routePoints/);

  assert.match(layout, /@\+id\/runActiveGpsStatus/);
  assert.match(layout, /@\+id\/runSummaryGpsStatus/);
});

test('web wear bridge saves GPS route into running data only', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'wear-gps-bridge-'));
  try {
    const modulePath = await writeWearBridgeModule(tmp);
    await writeFile(join(tmp, 'state.js'), 'export const S = globalThis.__wearGpsState;\n', 'utf8');
    await writeFile(join(tmp, 'load.js'), 'export const loadWorkoutDate = globalThis.__wearGpsLoad;\n', 'utf8');
    await writeFile(join(tmp, 'save.js'), 'export const saveWorkoutDay = globalThis.__wearGpsSave;\n', 'utf8');
    await writeFile(join(tmp, 'exercises.js'), 'export const wtFocusWorkoutEntryCard = globalThis.__wearGpsFocus;\n', 'utf8');

    const saved = [];
    globalThis.window = {
      showToast() {},
      localStorage: {
        getItem() { return '[]'; },
        setItem() {},
        removeItem() {},
      },
    };
    globalThis.localStorage = globalThis.window.localStorage;
    globalThis.document = { dispatchEvent() {} };
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    };
    const state = { workout: { exercises: [], runData: {} }, diet: {} };
    globalThis.__wearGpsState = state;
    globalThis.__wearGpsLoad = async () => {};
    globalThis.__wearGpsSave = async () => {
      saved.push(JSON.parse(JSON.stringify(state.workout)));
      return true;
    };
    globalThis.__wearGpsFocus = () => {};

    const bridge = await import(pathToFileURL(modulePath).href);
    bridge.configureWearWorkoutBridgeForTest({
      state,
      loadWorkoutDate: globalThis.__wearGpsLoad,
      saveWorkoutDay: globalThis.__wearGpsSave,
      focusEntry: globalThis.__wearGpsFocus,
      getDay() { return { workoutSessions: [] }; },
    });

    await bridge.saveWearWorkoutPayload({
      type: 'running',
      source: 'wear',
      dateKey: '2026-07-07',
      startedAt: 1783400000000,
      endedAt: 1783400060000,
      durationSec: 60,
      distanceKm: 0.12,
      avgPaceSecPerKm: 500,
      avgHeartRateBpm: 132,
      maxHeartRateBpm: 145,
      samples10s: [],
      route: [
        { timestampMs: 1783400000000, lat: 37.5665, lng: 126.978, altitude: 34.1, bearing: 91.2 },
        { timestampMs: 1783400010000, lat: 37.5666, lng: 126.979, altitude: 35.0, bearing: 94.4 },
      ],
      routeSummary: {
        source: 'wear-gps',
        pointCount: 2,
        distanceKm: 0.12,
        durationSec: 60,
        startedAt: 1783400000000,
        endedAt: 1783400060000,
      },
    });

    assert.equal(saved.length, 1);
    assert.equal(state.workout.runData.route.length, 2);
    assert.equal(state.workout.runData.route[0].lat, 37.5665);
    assert.equal(state.workout.runData.routeSummary.source, 'wear-gps');
    assert.equal(state.workout.runData.routeSummary.pointCount, 2);
    assert.equal(state.workout.sessionIndex, 2);
    assert.equal(state.workout.exercises.length, 0);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.document;
    delete globalThis.CustomEvent;
    delete globalThis.__wearGpsState;
    delete globalThis.__wearGpsLoad;
    delete globalThis.__wearGpsSave;
    delete globalThis.__wearGpsFocus;
    await rm(tmp, { recursive: true, force: true });
  }
});
