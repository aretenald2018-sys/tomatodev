import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('wear slice3 declares Health Services dependency, permissions, and foreground service', () => {
  const gradle = readProjectFile('android/wear/build.gradle');
  const manifest = readProjectFile('android/wear/src/main/AndroidManifest.xml');

  assert.match(gradle, /androidx\.health:health-services-client:/);

  [
    'android.permission.BODY_SENSORS',
    'android.permission.health.READ_HEART_RATE',
    'android.permission.ACTIVITY_RECOGNITION',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_HEALTH',
  ].forEach((permissionName) => {
    assert.match(manifest, new RegExp(`android:name="${permissionName.replaceAll('.', '\\.')}"`));
  });

  assert.match(manifest, /android:name="\.workout\.WearExerciseService"/);
  assert.match(manifest, /android:exported="false"/);
  assert.match(manifest, /android:foregroundServiceType="health(?:\|location)?"/);
});

test('wear slice3 service owns ExerciseClient and streams run metrics to UI state', () => {
  const service = readProjectFile('android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt');
  const controller = readProjectFile('android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt');

  [
    'HealthServices.getClient',
    'ExerciseUpdateCallback',
    'setUpdateCallback',
    'clearUpdateCallbackAsync',
    'ExerciseConfig',
    'ExerciseType.RUNNING',
    'DataType.HEART_RATE_BPM',
    'DataType.DISTANCE_TOTAL',
    'DataType.SPEED',
    'DataType.ACTIVE_EXERCISE_DURATION_TOTAL',
    'startForeground',
  ].forEach((needle) => {
    assert.ok(service.includes(needle), `missing ${needle}`);
  });

  [
    'WearExerciseService.startRun',
    'WearExerciseService.pauseRun',
    'WearExerciseService.resumeRun',
    'WearExerciseService.endRun',
    'WearExerciseSessionStore',
    'runState.updateMetrics',
  ].forEach((needle) => {
    assert.ok(controller.includes(needle), `missing ${needle}`);
  });
});
