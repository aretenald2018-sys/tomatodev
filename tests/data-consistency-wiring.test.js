import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const dataLoadSource = read('data/data-load.js');
const dataApiSource = read('data/data-api.js');
const dataAccountSource = read('data/data-account.js');
const workoutEquipmentSource = read('data/data-workout-equipment.js');
const equipmentPoolSource = read('data/data-equipment-pool.js');
const appSource = read('app.js');
const runtimeAssetsSource = read('runtime-assets.js');
const serviceWorkerSource = read('sw.js');

function sliceBetween(source, startToken, endToken, label) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, label + ' start boundary should exist');
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, label + ' end boundary should exist');
  return source.slice(start, end);
}

function sliceFrom(source, startToken, label) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, label + ' start boundary should exist');
  return source.slice(start);
}

function assertOrdered(source, tokens, label) {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1);
    assert.ok(next > cursor, label + ': missing or out-of-order token: ' + token);
    cursor = next;
  }
}

test('loadAll immediately seeds pending data and captures owner-scoped Firestore references', () => {
  const loadAll = sliceFrom(dataLoadSource, 'export async function loadAll()', 'loadAll');

  assert.match(loadAll,
    /const ownerCollection = \(name\) => collection\(db, 'users', ownerId, name\);/);

  const pendingSeed = loadAll.indexOf('const pendingSeed = restorePendingDayWritesForOwner(ownerId, {});');
  const cacheSeed = loadAll.indexOf('_setCache(pendingSeed);');
  const firstAwait = loadAll.indexOf('await ');
  assert.ok(pendingSeed >= 0 && pendingSeed < cacheSeed && cacheSeed < firstAwait,
    'fresh pending cache must be visible before loadAll performs any asynchronous read');

  for (const collectionName of [
    'workouts', 'exercises', 'goals', 'quests', 'cooking',
    'body_checkins', 'nutrition_db', 'tomato_cycles', 'settings',
  ]) {
    assert.ok(loadAll.includes("getDocs(ownerCollection('" + collectionName + "'))"),
      collectionName + ' should use the collection factory captured for the starting owner');
  }
});

test('loadAll discards stale-owner results and overlays remote data with pending writes', () => {
  const loadAll = sliceFrom(dataLoadSource, 'export async function loadAll()', 'loadAll');

  assert.match(loadAll,
    /const loadGeneration = \+\+_loadAllGeneration;[\s\S]*const isCurrentLoad = \(\) => \([\s\S]*_loadAllGeneration === loadGeneration[\s\S]*getDataOwnerId\(\) === ownerId/);
  assert.match(loadAll,
    /const abandonIfStale = \(\) => \{[\s\S]*if \(isCurrentLoad\(\)\) return false;[\s\S]*if \(_loadAllGeneration === loadGeneration\)[\s\S]*restorePendingDayWritesForOwner\(currentOwnerId, \{\}\)/);
  assert.ok((loadAll.match(/if \(abandonIfStale\(\)\) return;/g) || []).length >= 7,
    'loadAll should guard cache and global-state writes after every async stage');
  assertOrdered(loadAll, [
    'await Promise.all([',
    'if (abandonIfStale()) return;',
    'const remoteCache = {};',
  ], 'stale owner result discard');
  assert.match(loadAll, /catch\(e\) \{\s*if \(abandonIfStale\(\)\) return;/,
    'a stale failed load must not reset the newly selected account to defaults');

  assertOrdered(loadAll, [
    'const remoteCache = {};',
    'const remoteWithSeed = { ...remoteCache };',
    'Object.entries(pendingSeed).forEach(([dateKey, pendingDay]) => {',
    'remoteWithSeed[dateKey] = { ...(remoteWithSeed[dateKey] || {}), ...pendingDay };',
    '_setCache(restorePendingDayWritesForOwner(ownerId, remoteWithSeed));',
  ], 'remote then pending overlay');
});

test('late account-scoped equipment loads cannot populate a newly selected account', () => {
  const loadAll = sliceFrom(dataLoadSource, 'export async function loadAll()', 'loadAll');
  assert.match(loadAll,
    /Promise\.all\(\[loadGyms\(ownerId\), loadRoutineTemplates\(ownerId\), loadEquipmentPool\(ownerId\)\]\)/);

  for (const [source, loader, collectionName] of [
    [workoutEquipmentSource, 'loadGyms', 'gyms'],
    [workoutEquipmentSource, 'loadRoutineTemplates', 'routine_templates'],
    [equipmentPoolSource, 'loadEquipmentPool', 'equipment_pool'],
  ]) {
    const body = sliceFrom(source, 'export async function ' + loader, loader);
    assert.ok(body.startsWith('export async function ' + loader + '(ownerId = getDataOwnerId())'));
    assert.ok(body.includes("collection(db, 'users', ownerId, '" + collectionName + "')"));
    assert.ok(body.includes('if (getDataOwnerId() !== ownerId) return;'));
  }
});

test('workout realtime subscription stays owner-scoped and emits changed-date events', () => {
  const realtime = sliceBetween(
    dataLoadSource,
    'export function startWorkoutRealtimeSync',
    '// Selected shared-account owner boundary',
    'startWorkoutRealtimeSync',
  );
  const notify = sliceBetween(
    dataLoadSource,
    'function _notifyWorkoutCacheChanged',
    'export function stopWorkoutRealtimeSync',
    '_notifyWorkoutCacheChanged',
  );

  assert.match(realtime,
    /const ownerWorkouts = collection\(db, 'users', ownerId, 'workouts'\);/);
  assertOrdered(realtime, [
    'onSnapshot(ownerWorkouts, (snapshot) => {',
    'if (getDataOwnerId() !== ownerId) {',
    'const remoteCache = {};',
    'const nextCache = restorePendingDayWritesForOwner(ownerId, remoteCache);',
    'if (getDataOwnerId() !== ownerId) return;',
    'const changedDateKeys = _changedWorkoutDateKeys(_cache, nextCache);',
    '_setCache(nextCache);',
    "_notifyWorkoutCacheChanged(ownerId, changedDateKeys, 'firestore');",
  ], 'owner-scoped realtime cache update');
  assert.match(notify,
    /new CustomEvent\('data:workouts-updated', \{\s*detail: \{ ownerId, changedDateKeys, source \},\s*\}\)/);
});

test('a queued callback from an unsubscribed realtime listener cannot stop a newer owner listener', () => {
  const realtime = sliceBetween(
    dataLoadSource,
    'export function startWorkoutRealtimeSync',
    '// Selected shared-account owner boundary',
    'startWorkoutRealtimeSync',
  );

  assert.match(dataLoadSource, /let _workoutRealtimeGeneration = 0;/);
  assert.match(dataLoadSource,
    /export function stopWorkoutRealtimeSync\(\) \{\s*_workoutRealtimeGeneration \+= 1;/);
  assertOrdered(realtime, [
    'const realtimeGeneration = ++_workoutRealtimeGeneration;',
    'onSnapshot(ownerWorkouts, (snapshot) => {',
    'if (_workoutRealtimeGeneration !== realtimeGeneration) return;',
    'if (getDataOwnerId() !== ownerId) {',
    'stopWorkoutRealtimeSync();',
  ], 'stale realtime callback fence');
});

test('ensureWorkoutDayCached uses its captured owner and rejects stale async results', () => {
  const ensureDay = sliceBetween(
    dataApiSource,
    'export async function ensureWorkoutDayCached',
    '// 가장 최근 body_checkin',
    'ensureWorkoutDayCached',
  );

  assertOrdered(ensureDay, [
    'const ownerId = getDataOwnerId();',
    'const startingCache = _cache;',
    'const existing = startingCache[key];',
    'const pendingSeed = restorePendingDayWritesForOwner(ownerId, {})[key] || {};',
    "const workoutRef = doc(db, 'users', ownerId, 'workouts', key);",
    'const snap = await getDoc(workoutRef);',
    'if (getDataOwnerId() !== ownerId) return {};',
    'if (_cache !== startingCache || _cache[key] !== existing) return _cache[key] || {};',
    'const remoteDay = snap.exists() ? (snap.data() || {}) : {};',
    'const remoteWithSeed = { [key]: { ...remoteDay, ...pendingSeed } };',
    'const latest = restorePendingDayWritesForOwner(ownerId, remoteWithSeed);',
    '_cache[key] = latest[key] || {};',
  ], 'captured-owner day hydration');
});

test('workout data updates rerender the active app tab', () => {
  const handler = sliceBetween(
    appSource,
    "document.addEventListener('data:workouts-updated'",
    "document.addEventListener('sheet:saved', () => scheduleSeasonDashboardWidgetSync",
    'data:workouts-updated handler',
  );

  assert.match(handler, /_workoutDataRefreshTimer = setTimeout\(\(\) => \{/);
  const expectedBranches = [
    ['home', 'renderHome();'],
    ['diet', 'loadWorkoutDate(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());'],
    ['workout', "void _renderWorkoutRoute(getWorkoutNavSnapshot(), 'data:workouts-updated');"],
    ['calendar', 'void _lazyRenderCalendar();'],
    ['stats', 'void _lazyRenderStats();'],
  ];
  for (const [tab, action] of expectedBranches) {
    const branchStart = handler.indexOf("if (_currentTab === '" + tab + "')");
    const actionIndex = handler.indexOf(action, branchStart);
    const nextBranch = handler.indexOf('if (_currentTab ===', branchStart + 1);
    assert.ok(branchStart >= 0 && actionIndex > branchStart
      && (nextBranch === -1 || actionIndex < nextBranch),
    tab + ' should rerender through its own active-tab branch');
  }
});

test('pending journal is precached under a versioned service worker cache', () => {
  const runtimeAssetList = sliceBetween(
    runtimeAssetsSource,
    'root.TOMATO_STATIC_ASSETS = Object.freeze([',
    ']);',
    'runtime asset list',
  );

  assert.match(runtimeAssetList, /'\.\/data\/pending-day-writes\.js'/);
  assert.match(serviceWorkerSource,
    /const CACHE_VERSION = 'tomatodev-v\d{8}z\d+-[^']+';/);
});

test('selected-owner bootstrap and compatibility migrations are write-free', () => {
  const migrate = sliceBetween(
    dataLoadSource,
    'export async function migrateDataToUser',
    'export async function unifySharedAccountData',
    'migrateDataToUser',
  );
  const unify = sliceBetween(
    dataLoadSource,
    'export async function unifySharedAccountData',
    '// ═══════════════════════════════════════════════════════════════\n// loadAll',
    'unifySharedAccountData',
  );
  const loadAll = sliceFrom(dataLoadSource, 'export async function loadAll()', 'loadAll');

  assertOrdered(migrate, [
    'await resolveDataOwnerIdForAccount(userId)',
    'return 0;',
  ], 'manual migration compatibility export is a read-only no-op');
  assert.match(unify, /return \{ state: 'disabled', ownerId: targetUserId, copied: 0 \};/);
  assert.doesNotMatch(migrate + unify,
    /setDoc|runTransaction|transaction\.|_copyMissingDocuments|mergeAccountWorkoutFields|runRouteRef/);
  assert.doesNotMatch(loadAll, /\bsetDoc\s*\(|_migrateFromLS|ownerDoc/);
  assert.doesNotMatch(dataLoadSource,
    /_copyMissingDocuments|mergeAccountWorkoutFields|getDocs\(collection\(db, collectionName\)/);

  assertOrdered(loadAll, [
    'const seedPlan = buildExerciseCatalogSeedPlan({',
    '_setExList(_sortExList(seedPlan.exercises',
  ], 'exercise defaults remain memory-only');
  assert.match(loadAll,
    /sharedSnap\.forEach\(d => sharedItems\.push\(d\.data\(\)\)\);[\s\S]*_setNutritionDB\(sharedItems\);/);
  assert.match(loadAll,
    /if \(maxCyclePlan\.shouldWriteMaxCycle\) \{\s*_settings\.max_cycle = maxCyclePlan\.canonicalCycle;\s*\}/);
  assert.match(loadAll, /flushPendingDayWrites\(ownerId\)/,
    'only the TomatoDev recovery journal may flush during bootstrap');
});

test('account writes preserve data-owner routing metadata', () => {
  const saveAccount = sliceBetween(
    dataAccountSource,
    'export async function saveAccount',
    'export async function refreshCurrentUserFromDB',
    'saveAccount',
  );
  const recover = sliceBetween(
    dataAccountSource,
    'export async function recoverDeletedAccounts',
    'export async function deleteUserAccount',
    'recoverDeletedAccounts',
  );

  assert.match(saveAccount,
    /setDoc\(doc\(db, '_accounts', account\.id\), account, \{ merge: true \}\)/);
  assert.match(recover, /await saveAccount\(account\);/);
  assert.doesNotMatch(recover, /setDoc\(doc\(db, '_accounts'/);
});
