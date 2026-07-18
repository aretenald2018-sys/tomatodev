import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { openSeasonDashboardDestination } from '../app/dashboard-destination.js';

const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const activity = readFileSync('android/app/src/main/java/com/lifestreak/app/MainActivity.java', 'utf8');
const app = readFileSync('app.js', 'utf8');
const gradle = readFileSync('android/app/build.gradle', 'utf8');

test('TomatoDev exposes an isolated dashboard module deep-link contract', () => {
  assert.match(manifest, /android:scheme="tomatodev"/);
  assert.doesNotMatch(manifest, /android:scheme="tomatofarm"/);
  assert.match(manifest, /android:host="diet"[\s\S]*android:pathPrefix="\/today"/);
  assert.match(manifest, /android:host="workout"[\s\S]*android:pathPrefix="\/season"/);
  assert.match(manifest, /android:host="workout"[\s\S]*android:pathPrefix="\/running"/);
  assert.match(activity, /"diet"\.equals\(host\)[\s\S]*return "diet"/);
  assert.match(activity, /"workout"\.equals\(host\)[\s\S]*"\/season"\.equals\(path\)[\s\S]*return "season"/);
  assert.match(activity, /"workout"\.equals\(host\)[\s\S]*"\/running"\.equals\(path\)[\s\S]*return "running"/);
});

test('dashboard destinations open their exact TomatoDev screens', () => {
  assert.match(app, /action === 'diet'[\s\S]*switchTab\('diet'\)/);
  assert.match(app, /action === 'season'[\s\S]*openSeasonDashboardDestination\(\{[\s\S]*registry: getSeasonRegistry\(\)[\s\S]*switchToWorkout: \(\) => switchTab\('workout'\)[\s\S]*openSeasonOverview[\s\S]*openFallback: tm2OpenBoard/);
  assert.match(app, /action === 'running'[\s\S]*switchTab\('workout'\)[\s\S]*wtOpenRunningSession\(\)/);
  assert.match(app, /\['diet', 'season', 'running'\]\.includes\(entry\)/);
});

test('season dashboard entry opens the active season overview without the board fallback', async () => {
  const calls = [];
  const result = await openSeasonDashboardDestination({
    registry: {
      seasons: [{ id: 'summer-2026', name: 'Summer', startDate: '2026-07-01', endDate: '2026-08-31' }],
    },
    todayKey: '2026-07-19',
    switchToWorkout: async () => { calls.push('workout'); },
    openSeasonOverview: seasonId => {
      calls.push(`overview:${seasonId}`);
      return true;
    },
    openFallback: async () => { calls.push('fallback'); },
  });

  assert.deepEqual(calls, ['workout', 'overview:summer-2026']);
  assert.deepEqual(result, {
    destination: 'season-overview',
    seasonId: 'summer-2026',
    opened: true,
  });
});

test('season dashboard entry uses the board fallback only without an active season', async () => {
  const calls = [];
  const result = await openSeasonDashboardDestination({
    registry: {
      seasons: [{ id: 'spring-2026', name: 'Spring', startDate: '2026-03-01', endDate: '2026-05-31' }],
    },
    todayKey: '2026-07-19',
    switchToWorkout: async () => { calls.push('workout'); },
    openSeasonOverview: seasonId => { calls.push(`overview:${seasonId}`); },
    openFallback: async () => { calls.push('fallback'); },
  });

  assert.deepEqual(calls, ['workout', 'fallback']);
  assert.deepEqual(result, {
    destination: 'fallback',
    seasonId: null,
    opened: true,
  });
});

test('season dashboard entry never falls back when an active overview reports unavailable', async () => {
  const calls = [];
  const result = await openSeasonDashboardDestination({
    registry: {
      seasons: [{ id: 'summer-2026', name: 'Summer', startDate: '2026-07-01', endDate: '2026-08-31' }],
    },
    todayKey: '2026-07-19',
    switchToWorkout: async () => { calls.push('workout'); },
    openSeasonOverview: seasonId => {
      calls.push(`overview:${seasonId}`);
      return false;
    },
    openFallback: async () => { calls.push('fallback'); },
  });

  assert.deepEqual(calls, ['workout', 'overview:summer-2026']);
  assert.equal(result.destination, 'season-overview');
  assert.equal(result.opened, false);
});

test('the distributable TomatoDev APK version is bumped for deep links', () => {
  assert.match(gradle, /versionCode 3/);
  assert.match(gradle, /versionName "1\.2"/);
});
