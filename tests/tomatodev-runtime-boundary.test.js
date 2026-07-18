import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PRODUCTION_SETTING_KEYS = [
  'cfg_anthropic',
  'cfg_alphavantage',
  'cfg_running_map_provider',
  'cfg_vworld_api_key',
  'cfg_vworld_map_layer',
  'cfg_google_maps_key',
  'cfg_tmap_app_key',
];

const TOMATODEV_SETTING_KEYS = {
  ANTHROPIC: 'tomatodev_cfg_anthropic',
  ALPHAVANTAGE: 'tomatodev_cfg_alphavantage',
  RUNNING_MAP_PROVIDER: 'tomatodev_cfg_running_map_provider',
  VWORLD_API_KEY: 'tomatodev_cfg_vworld_api_key',
  VWORLD_MAP_LAYER: 'tomatodev_cfg_vworld_map_layer',
  GOOGLE_MAPS_KEY: 'tomatodev_cfg_google_maps_key',
  TMAP_APP_KEY: 'tomatodev_cfg_tmap_app_key',
};

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

function exactStringPattern(value) {
  return new RegExp(`['"]${value}['"]`);
}

test('TomatoDev callable facade never creates or invokes a production callable proxy', async () => {
  const callableSource = await source('data/data-functions.js');
  assert.doesNotMatch(callableSource, /httpsCallable|firebase-functions\.js|data-core\.js/);

  const functions = await import(new URL(`../data/data-functions.js?boundary=${Date.now()}`, import.meta.url));
  for (const [call, callableName] of [
    [functions.callGeminiProxy, 'geminiProxy'],
    [functions.callOcrProxy, 'ocrProxy'],
  ]) {
    await assert.rejects(
      call({ private: 'payload' }),
      error => {
        assert.equal(error?.code, 'TOMATODEV_PRODUCTION_CALLABLE_BLOCKED');
        assert.match(String(error?.message), /TOMATODEV/);
        assert.match(String(error?.message), new RegExp(callableName));
        return true;
      },
    );
  }
});

test('TomatoDev workout persistence keys cannot address production drafts or queues', async () => {
  const [timersSource, wearSource] = await Promise.all([
    source('workout/timers.js'),
    source('workout/wear-bridge.js'),
  ]);

  assert.match(timersSource, /_LS_TIMER_KEY_PREFIX\s*=\s*'tomatodev_active_timer_'/);
  assert.match(timersSource, /_LS_ACTIVE_WORKOUT_DRAFT_KEY_PREFIX\s*=\s*'tomatodev_active_workout_draft_'/);
  assert.match(timersSource, /_LS_GROWTH_BOARD_TIMER_KEY_PREFIX\s*=\s*'tomatodev_growth_board_auto_timer_'/);
  assert.match(wearSource, /WEAR_QUEUE_KEY\s*=\s*'tomatodev_wear_workout_queue_v1'/);
  assert.doesNotMatch(timersSource, /['"]tomatofarm_(?:active_timer|active_workout_draft|growth_board_auto_timer)_/);
  assert.doesNotMatch(wearSource, /['"]tomatofarm_wear_workout_queue_v1['"]/);

  const productionQueue = '[{"id":"production-only"}]';
  const reads = [];
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      reads.push(key);
      return key === 'tomatofarm_wear_workout_queue_v1' ? productionQueue : null;
    },
    setItem() {},
    removeItem() {},
  };
  try {
    const bridge = await import(new URL(`../workout/wear-bridge.js?boundary=${Date.now()}`, import.meta.url));
    assert.deepEqual(await bridge.drainWearWorkoutQueue(), { ok: true, drained: 0 });
    assert.deepEqual(reads, ['tomatodev_wear_workout_queue_v1']);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test('TomatoDev boot and resume timer recovery cannot persist shared Firestore state', async () => {
  const [loadSource, apiSource, timersSource] = await Promise.all([
    source('data/data-load.js'),
    source('data/data-api.js'),
    source('workout/timers.js'),
  ]);

  assert.match(loadSource, /_settings\.active_timer\s*=\s*null/);
  assert.doesNotMatch(loadSource, /_settings\.active_timer\s*=\s*fbMap\.active_timer/);

  const saveActiveStart = apiSource.indexOf('export async function saveActiveTimer');
  const clearActiveStart = apiSource.indexOf('export async function clearActiveTimer');
  const milestoneStart = apiSource.indexOf('export const getMilestoneShown', clearActiveStart);
  assert.ok(saveActiveStart >= 0 && clearActiveStart > saveActiveStart && milestoneStart > clearActiveStart);
  const activeTimerApi = apiSource.slice(saveActiveStart, milestoneStart);
  assert.match(activeTimerApi, /_settings\.active_timer\s*=\s*state\s*\?\?\s*null/);
  assert.match(activeTimerApi, /_settings\.active_timer\s*=\s*null/);
  assert.doesNotMatch(activeTimerApi, /_saveSetting|setDoc|updateDoc|deleteDoc/);

  assert.doesNotMatch(timersSource, /import \{[^}]*\b(?:getActiveTimer|saveActiveTimer|clearActiveTimer)\b[^}]*\} from '\.\.\/data\.js'/);
  const idleCheckStart = timersSource.indexOf('export async function wtCheckWorkoutIdleLimit');
  const idleCheckEnd = timersSource.indexOf('\n// ── 운동 시간 측정', idleCheckStart);
  const idleCheck = timersSource.slice(idleCheckStart, idleCheckEnd);
  assert.ok(idleCheckStart >= 0 && idleCheckEnd > idleCheckStart);
  assert.match(idleCheck, /closeWorkoutTimeline\(S\.workout/);
  assert.match(idleCheck, /endedBy:\s*'idle-limit-local'/);
  assert.doesNotMatch(idleCheck, /wtFinishWorkout\s*\(\s*\{/);
  assert.doesNotMatch(idleCheck, /saveWorkoutDay\s*\(/);

  const recoverStart = timersSource.indexOf('export function wtRecoverTimers');
  const recoverEnd = timersSource.indexOf('\nif (typeof window', recoverStart);
  const recover = timersSource.slice(recoverStart, recoverEnd);
  assert.ok(recoverStart >= 0 && recoverEnd > recoverStart);
  assert.match(recover, /_lsReadTimer\(\)/);
  assert.doesNotMatch(recover, /getActiveTimer|saveActiveTimer|clearActiveTimer/);

  const explicitFinishStart = timersSource.indexOf('export function wtFinishWorkout');
  const explicitFinishEnd = timersSource.indexOf('\nexport function wtRecoverTimers', explicitFinishStart);
  const explicitFinish = timersSource.slice(explicitFinishStart, explicitFinishEnd);
  assert.match(explicitFinish, /return saveWorkoutDay\(\)\.then/);
});

test('TomatoDev config reads only its own private setting namespace', async () => {
  const values = new Map();
  PRODUCTION_SETTING_KEYS.forEach(key => values.set(key, `production:${key}`));
  Object.values(TOMATODEV_SETTING_KEYS).forEach(key => values.set(key, `development:${key}`));

  const reads = [];
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      reads.push(key);
      return values.get(key) || null;
    },
  };
  try {
    const { CONFIG, TOMATODEV_LOCAL_SETTING_KEYS } = await import(
      new URL(`../config.js?boundary=${Date.now()}`, import.meta.url)
    );
    assert.deepEqual(TOMATODEV_LOCAL_SETTING_KEYS, TOMATODEV_SETTING_KEYS);

    assert.equal(CONFIG.ANTHROPIC_KEY, 'development:tomatodev_cfg_anthropic');
    assert.equal(CONFIG.ALPHAVANTAGE_KEY, 'development:tomatodev_cfg_alphavantage');
    assert.equal(CONFIG.MAPS.RUNNING_PROVIDER, 'development:tomatodev_cfg_running_map_provider');
    assert.equal(CONFIG.MAPS.VWORLD_API_KEY, 'development:tomatodev_cfg_vworld_api_key');
    assert.equal(CONFIG.MAPS.VWORLD_MAP_LAYER, 'development:tomatodev_cfg_vworld_map_layer');
    assert.equal(CONFIG.MAPS.GOOGLE_MAPS_KEY, 'development:tomatodev_cfg_google_maps_key');
    assert.equal(CONFIG.MAPS.TMAP_APP_KEY, 'development:tomatodev_cfg_tmap_app_key');
    assert.deepEqual(reads, Object.values(TOMATODEV_SETTING_KEYS));
    PRODUCTION_SETTING_KEYS.forEach(key => assert.equal(reads.includes(key), false));
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test('settings UI shares the TomatoDev key constant and has no production-key fallback', async () => {
  const [configSource, settingsSource] = await Promise.all([
    source('config.js'),
    source('feature-misc.js'),
  ]);

  assert.match(settingsSource, /import \{ TOMATODEV_LOCAL_SETTING_KEYS \} from '\.\/config\.js'/);
  assert.match(settingsSource, /localStorage\.getItem\(TOMATODEV_LOCAL_SETTING_KEYS\.ANTHROPIC\)/);
  assert.match(settingsSource, /localStorage\.setItem\(TOMATODEV_LOCAL_SETTING_KEYS\.ANTHROPIC, anthropic\)/);
  for (const key of PRODUCTION_SETTING_KEYS) {
    assert.doesNotMatch(configSource, exactStringPattern(key));
    assert.doesNotMatch(settingsSource, exactStringPattern(key));
  }
});
