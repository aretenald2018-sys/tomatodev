import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { isConfidentRunningMovement } from '../workout/running-session.js';

const runningSessionJs = await readFile(new URL('../workout/running-session.js', import.meta.url), 'utf8');
const phoneStoreJava = await readFile(new URL('../android/app/src/main/java/com/lifestreak/app/running/PhoneRunningLocationStore.java', import.meta.url), 'utf8');
const wearAccumulatorKt = await readFile(new URL('../android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulator.kt', import.meta.url), 'utf8');
const wearServiceKt = await readFile(new URL('../android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt', import.meta.url), 'utf8');

function pointAtMeters(meters, options = {}) {
  return {
    lat: 37.5665 + (meters / 111_320),
    lng: 126.978,
    ts: options.ts ?? 0,
    accuracy: options.accuracy ?? 5,
    ...(options.speed == null ? {} : { speed: options.speed }),
  };
}

test('stationary GPS drift cannot create a running distance or pace', () => {
  const start = pointAtMeters(0, { ts: 1_000, accuracy: 10 });

  assert.equal(isConfidentRunningMovement(start, pointAtMeters(30, {
    ts: 62_000,
    accuracy: 10,
  })), false);
  assert.equal(isConfidentRunningMovement(start, pointAtMeters(45, {
    ts: 16_000,
    accuracy: 10,
    speed: 0,
  })), false);
  assert.equal(isConfidentRunningMovement(start, pointAtMeters(28, {
    ts: 12_000,
    accuracy: 5,
    speed: 2.8,
  })), true);
});

test('PWA, phone APK, and Wear use the same conservative movement thresholds', () => {
  assert.match(runningSessionJs, /MAX_LIVE_GPS_ACCURACY_M = 35/);
  assert.match(runningSessionJs, /MIN_RUNNING_DISPLACEMENT_M = 12/);
  assert.match(runningSessionJs, /MIN_CONFIDENT_RUNNING_SPEED_MPS = 0\.8/);
  assert.match(runningSessionJs, /data-running-live-map/);
  assert.match(runningSessionJs, /renderRunningMap\(shell, \{ points, phase \}\)/);

  assert.match(phoneStoreJava, /MAX_ACCURACY_M = 35f/);
  assert.match(phoneStoreJava, /MIN_ROUTE_DISPLACEMENT_M = 12\.0/);
  assert.match(phoneStoreJava, /MIN_CONFIDENT_RUNNING_SPEED_MPS = 0\.8/);
  assert.match(phoneStoreJava, /distanceM <= errorRadiusM/);

  assert.match(wearAccumulatorKt, /MAX_GPS_ACCURACY_M = 35\.0/);
  assert.match(wearAccumulatorKt, /MIN_ROUTE_DISPLACEMENT_M = 12\.0/);
  assert.match(wearAccumulatorKt, /MIN_CONFIDENT_RUNNING_SPEED_MPS = 0\.8/);
  assert.match(wearAccumulatorKt, /distanceMeters = routeDistanceMeters\(normalizedRoute\)/);
  assert.match(wearServiceKt, /MAX_DIRECT_GPS_ACCURACY_M = 35f/);
});
