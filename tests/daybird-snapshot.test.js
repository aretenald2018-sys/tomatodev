import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildTomatoDevDaybirdSnapshot,
  buildTomatoDevNutritionSnapshot,
} from '../data/daybird-snapshot.js';

const bridgeSource = readFileSync(new URL('../workout/season-widget-bridge.js', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../data/data-api.js', import.meta.url), 'utf8');

test('TomatoDev Daybird snapshot has a strict source marker, integer metrics, and newest five runs', () => {
  const cache = Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return [`2026-07-${day}`, {
      running: true,
      runDistance: 5 + index / 10,
      runDurationMin: 30,
      runRouteSummary: { avgPaceSecPerKm: 360.7 - index, avgHeartRateBpm: 150.6 + index, cadenceSpm: 170.4 + index },
    }];
  }));
  const contract = buildTomatoDevDaybirdSnapshot({
    seasonSnapshot: { state: 'ready', season: { id: 's' }, seasonGoals: [{ weekStart: '2026-07-06' }], running: { goal: { mode: 'manual' } } },
    cache,
    generatedAt: 123,
    reason: 'test',
  });
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.sourceEnvironment, 'tomatodev');
  assert.equal(contract.generatedAt, 123);
  assert.equal(contract.running.recent.length, 5);
  assert.equal(contract.running.recent[0].dateKey, '2026-07-06');
  assert.equal(Number.isInteger(contract.running.recent[0].paceSecPerKm), true);
  assert.equal(Number.isInteger(contract.running.recent[0].avgHeartRateBpm), true);
  assert.equal(Number.isInteger(contract.running.recent[0].cadenceSpm), true);
});

test('no-season contract uses a non-empty collecting mode and web never publishes a public summary document', () => {
  const contract = buildTomatoDevDaybirdSnapshot({ seasonSnapshot: { state: 'no-season' }, generatedAt: 1 });
  assert.equal(contract.running.goal.mode, 'collecting');
  assert.deepEqual(contract.seasonGoals, []);
  assert.match(bridgeSource, /buildTomatoDevDaybirdSnapshot/);
  assert.match(bridgeSource, /plugin\?\.saveSnapshot/);
  assert.doesNotMatch(bridgeSource, /saveTomatoDevDaybirdSnapshot|getDataOwnerId/);
  assert.doesNotMatch(apiSource, /tomatodev_daybird_snapshot|saveTomatoDevDaybirdSnapshot/);
});

test('TomatoDev nutrition snapshot sums today cache fields and uses percent progress', () => {
  const nutrition = buildTomatoDevNutritionSnapshot({
    dayData: {
      bKcal: 400, lKcal: 650.4, dKcal: 500, sKcal: 50,
      bProtein: 22.25, lProtein: 41, dProtein: 30, sProtein: 4,
      bCarbs: 45, lCarbs: 72.34, dCarbs: 50, sCarbs: 8,
      bFat: 12, lFat: 18.25, dFat: 14, sFat: 2,
    },
    targetKcal: 1900.4,
  });
  assert.deepEqual(nutrition, {
    actualKcal: 1600,
    targetKcal: 1900,
    progress: 84,
    proteinG: 97.3,
    carbsG: 175.3,
    fatG: 46.3,
  });
  const contract = buildTomatoDevDaybirdSnapshot({ nutrition: { dayData: {}, targetKcal: null } });
  assert.deepEqual(contract.nutrition, {
    actualKcal: 0,
    targetKcal: 0,
    progress: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });
  assert.equal(buildTomatoDevNutritionSnapshot({
    dayData: { bKcal: 2400 },
    targetKcal: 1800,
  }).progress, 100);
});
