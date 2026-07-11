import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('phone APK requests precise location and runs a foreground GPS service', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const activity = read('android/app/src/main/java/com/lifestreak/app/MainActivity.java');
  const plugin = read('android/app/src/main/java/com/lifestreak/app/running/TomatoRunningLocationPlugin.java');
  const service = read('android/app/src/main/java/com/lifestreak/app/running/TomatoRunningLocationService.java');

  assert.match(manifest, /ACCESS_FINE_LOCATION/);
  assert.match(manifest, /FOREGROUND_SERVICE_LOCATION/);
  assert.match(manifest, /TomatoRunningLocationService/);
  assert.match(manifest, /foregroundServiceType="location"/);
  assert.match(activity, /registerPlugin\(TomatoRunningLocationPlugin\.class\)/);
  assert.match(plugin, /requestPermissionForAlias\("location"/);
  assert.match(plugin, /startForegroundService/);
  assert.match(service, /LocationManager\.GPS_PROVIDER/);
  assert.match(service, /requestLocationUpdates/);
});

test('phone route collection rejects stale and inaccurate fixes and drains native points on finish', () => {
  const store = read('android/app/src/main/java/com/lifestreak/app/running/PhoneRunningLocationStore.java');
  const session = read('workout/running-session.js');

  assert.match(store, /MAX_ACCURACY_M = 35f/);
  assert.match(store, /MAX_LOCATION_AGE_MS = 30_000L/);
  assert.match(store, /MAX_RUNNING_SPEED_MPS = 15\.0/);
  assert.match(session, /maximumAge:\s*0/);
  assert.match(session, /TomatoRunningLocation/);
  assert.match(session, /await _stopWatch\('finish'\)/);
  assert.match(session, /stopTracking\?\.\(\{ afterIndex: _session\.nativeLocationCursor \}\)/);
});

test('watch uses direct GPS fallback and refuses to start without precise location permission', () => {
  const service = read('android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt');
  const controller = read('android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt');

  assert.match(service, /LocationManager\.GPS_PROVIDER/);
  assert.match(service, /startDirectLocationUpdates\(\)/);
  assert.match(service, /WearRoutePoint\([\s\S]*accuracy = accuracy\.toDouble\(\)/);
  assert.match(controller, /ACCESS_FINE_LOCATION/);
  assert.match(controller, /GPS 권한 필요/);
});

test('empty running routes never render the Seoul City Hall fallback as a recorded route', () => {
  const runningMap = read('workout/running-map.js');
  const calendar = read('render-calendar.js');

  assert.match(runningMap, /if \(!route\.length\) \{[\s\S]*'no-location'[\s\S]*return null/);
  assert.match(calendar, /if \(!hasStoredRoute\) \{[\s\S]*GPS 경로가 저장되지 않았어요/);
});
