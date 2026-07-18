import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TOMATODEV_ACTIVE_SEASON_BOARD_KEY,
  TOMATODEV_SEASON_REGISTRY_KEY,
  buildMissingTomatoDevSeasonMigrationEntries,
  isTomatoDevSeasonSettingKey,
  tomatoDevSeasonBoardKey,
  tomatoDevSeasonRunningPlanKey,
  tomatoDevSeasonWorkoutPlanKey,
} from '../data/season-storage.js';

const storeSource = readFileSync(new URL('../data/season-store.js', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../data/data-api.js', import.meta.url), 'utf8');
const loadSource = readFileSync(new URL('../data/data-load.js', import.meta.url), 'utf8');

test('season persistence keys are all TomatoDev-only', () => {
  assert.equal(TOMATODEV_SEASON_REGISTRY_KEY, 'tomatodev_season_registry_v3');
  assert.equal(TOMATODEV_ACTIVE_SEASON_BOARD_KEY, 'tomatodev_test_board_v3');
  assert.equal(tomatoDevSeasonWorkoutPlanKey('summer'), 'tomatodev_season_summer_workout_plan_v4');
  assert.equal(tomatoDevSeasonBoardKey('summer'), 'tomatodev_season_summer_test_board_v3');
  assert.equal(tomatoDevSeasonRunningPlanKey('summer'), 'tomatodev_season_summer_running_plan_v3');
  assert.doesNotMatch(storeSource, /_doc\('settings',\s*'season_registry'\)/);
  assert.doesNotMatch(storeSource, /_doc\('settings',\s*'test_board_v2'\)/);
  assert.doesNotMatch(apiSource, /const activeRef = _doc\('settings', 'test_board_v2'\)/);
});

test('legacy season migration creates only missing TomatoDev keys and never targets production keys', () => {
  const legacy = {
    season_registry: {
      schemaVersion: 2,
      seasons: [{ id: 'summer', startDate: '2026-07-01', endDate: '2026-08-31' }],
    },
    test_board_v2: { id: 'active-board' },
    season_summer_workout_plan: { id: 'workout-plan' },
    season_summer_test_board_v2: { id: 'season-board' },
    season_summer_running_plan: {
      id: 'running-plan', goalType: '10k', completionGoal: 'time', raceDistanceKm: 10, targetTimeMin: 50,
      weeklyDistanceKm: 24, weeklySessions: 4,
    },
    tomatodev_test_board_v3: { id: 'existing-dev-board' },
  };
  const entries = buildMissingTomatoDevSeasonMigrationEntries(legacy);
  assert.deepEqual(entries, {
    tomatodev_season_registry_v3: legacy.season_registry,
    tomatodev_season_summer_workout_plan_v4: legacy.season_summer_workout_plan,
    tomatodev_season_summer_test_board_v3: legacy.season_summer_test_board_v2,
    tomatodev_season_summer_running_plan_v3: {
      schemaVersion: 3,
      seasonId: 'summer',
      createdAt: null,
      clientRequestId: null,
      goalType: 'pace',
      paceMode: 'adaptive-weekly',
      targetPaceSecPerKm: null,
      baselinePaceSecPerKm: null,
      adaptiveRatePct: 1,
      referenceDistanceKm: 5,
      startDate: '2026-07-01',
      endDate: '2026-08-31',
      recoveryEveryWeeks: 4,
      paceCheckWeekday: 3,
      heartRateCautionBpm: null,
      baselineWeeklyDistanceKm: null,
      weeklyDistanceKm: 24,
      weeklySessions: 4,
      longestRunKm: null,
      speedSessionsPerWeek: 1,
      optionalDurationMin: null,
    },
  });
  assert.equal(entries.tomatodev_test_board_v3, undefined, 'an existing dev destination is never overwritten');
  assert.equal('raceDistanceKm' in entries.tomatodev_season_summer_running_plan_v3, false);
  assert.equal('targetTimeMin' in entries.tomatodev_season_summer_running_plan_v3, false);
  assert.equal(Object.keys(entries).every(isTomatoDevSeasonSettingKey), true);
  assert.match(loadSource, /snapshot\.exists\(\)[\s\S]*transaction\.set\(refs\[index\], \{ value: entries\[key\] \}\)/);
  assert.doesNotMatch(loadSource, /transaction\.set\([^\n]*(?:season_registry|test_board_v2|season_[^']+_(?:workout_plan|running_plan))/);
});
