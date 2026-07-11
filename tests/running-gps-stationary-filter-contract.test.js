import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildConfirmedRunningMovementRoute,
  isConfidentRunningMovement,
  runningRouteDistanceMeters,
  summarizeRunningRoute,
} from '../workout/running-session.js';

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
  const stationaryJitter = [start, 8, -6, 9, -7, 5].map((meters, index) => (
    typeof meters === 'object' ? meters : pointAtMeters(meters, { ts: 1_000 + index * 10_000, accuracy: 10, speed: 0 })
  ));

  assert.equal(buildConfirmedRunningMovementRoute(stationaryJitter).length, 1);
  assert.equal(runningRouteDistanceMeters(stationaryJitter), 0);
  assert.equal(isConfidentRunningMovement(start, pointAtMeters(28, {
    ts: 12_000,
    accuracy: 5,
    speed: 0,
  })), true);
});

test('PWA, phone APK, and Wear preserve the raw route while distance uses drift thresholds', () => {
  assert.match(runningSessionJs, /MAX_LIVE_GPS_ACCURACY_M = 35/);
  assert.match(runningSessionJs, /MIN_RUNNING_DISPLACEMENT_M = 12/);
  assert.match(runningSessionJs, /MIN_CONFIDENT_RUNNING_SPEED_MPS = 0\.3/);
  assert.match(runningSessionJs, /buildConfirmedRunningMovementRoute/);
  assert.doesNotMatch(runningSessionJs, /_markRouteGap\('gps-error'\)/);
  assert.match(runningSessionJs, /data-running-live-map/);
  assert.match(runningSessionJs, /renderRunningMap\(shell, \{ points, phase \}\)/);

  assert.match(phoneStoreJava, /MAX_ACCURACY_M = 35f/);
  assert.doesNotMatch(phoneStoreJava, /MIN_ROUTE_DISPLACEMENT_M/);
  assert.doesNotMatch(phoneStoreJava, /location\.getSpeed\(\) < /);
  assert.match(phoneStoreJava, /inferredSpeedMps > MAX_RUNNING_SPEED_MPS/);

  assert.match(wearAccumulatorKt, /MAX_GPS_ACCURACY_M = 35\.0/);
  assert.match(wearAccumulatorKt, /MIN_ROUTE_DISPLACEMENT_M = 12\.0/);
  assert.match(wearAccumulatorKt, /MIN_CONFIDENT_RUNNING_SPEED_MPS = 0\.3/);
  assert.match(wearAccumulatorKt, /val routeDistanceMeters = routeDistanceMeters\(movementRoute\)/);
  assert.match(wearAccumulatorKt, /distanceSamples = routeDistanceSamples\(movementRoute\)/);
  assert.match(wearAccumulatorKt, /fun markRouteGap/);
  assert.match(wearServiceKt, /currentAccumulator\.markRouteGap\("pause"\)/);
  assert.match(wearServiceKt, /MAX_DIRECT_GPS_ACCURACY_M = 35f/);
});

test('reported zero speed does not erase a real two-kilometer route or its metrics', () => {
  const route = Array.from({ length: 801 }, (_, index) => pointAtMeters(index * 2.5, {
    ts: 1_000 + index * 1_000,
    accuracy: 5,
    speed: 0,
  }));

  const confirmed = buildConfirmedRunningMovementRoute(route);
  const distanceM = runningRouteDistanceMeters(route);
  const summary = summarizeRunningRoute(route, { startedAt: 1_000, endedAt: 801_000 });
  assert.equal(route.length, 801);
  assert.ok(confirmed.length > 100);
  assert.ok(distanceM > 1_950 && distanceM <= 2_000, `unexpected distanceM=${distanceM}`);
  assert.ok(summary.distanceKm >= 1.95 && summary.distanceKm <= 2);
  assert.ok(summary.avgPaceSecPerKm >= 400 && summary.avgPaceSecPerKm <= 410);
  assert.ok(summary.speedKmh >= 8.8 && summary.speedKmh <= 9.1);
});
