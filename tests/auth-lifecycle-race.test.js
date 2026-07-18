import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const AUTH_SOURCE = readFileSync(new URL('../data/data-auth.js', import.meta.url), 'utf8');
const FEATURE_LOGIN_SOURCE = readFileSync(new URL('../feature-login.js', import.meta.url), 'utf8');
const DATA_ACCOUNT_SOURCE = readFileSync(new URL('../data/data-account.js', import.meta.url), 'utf8');
const DATA_API_SOURCE = readFileSync(new URL('../data/data-api.js', import.meta.url), 'utf8');
const AUTH_DATA_IMPORT_MARKER = "import('./" + "data.js')";
const AUTH_KEYS = Object.freeze({
  currentUser: 'tomatodev:auth:current-user:v1',
  adminAuthenticated: 'tomatodev:auth:admin-authenticated:v1',
  kimAuthenticated: 'tomatodev:auth:kim-authenticated:v1',
  kimMode: 'tomatodev:auth:kim-mode:v1',
});

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    const exactKey = String(key);
    return this.values.has(exactKey) ? this.values.get(exactKey) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

let authModuleSequence = 0;

async function loadAuthModule(overrides = {}) {
  const harnessKey = '__authLifecycleHarness' + (++authModuleSequence);
  const storage = new MemoryStorage();
  const idb = new Map();
  const harness = {
    currentUser: null,
    kimMode: 'admin',
    idb,
    async idbSet(key, value) {
      idb.set(key, value);
    },
    async idbGet(key) {
      return idb.get(key) ?? null;
    },
    async idbRemove(key) {
      idb.delete(key);
    },
    ...overrides,
  };
  globalThis[harnessKey] = harness;

  const coreSource = [
    'const harness = globalThis[' + JSON.stringify(harnessKey) + '];',
    "export const ADMIN_ID = 'admin';",
    "export const ADMIN_GUEST_ID = 'admin(guest)';",
    'export const TOMATODEV_AUTH_STORAGE_KEYS = ' + JSON.stringify(AUTH_KEYS) + ';',
    'export function getCurrentUserRef() { return harness.currentUser; }',
    'export function setCurrentUserRef(user) { harness.currentUser = user; }',
    'export function getKimMode() { return harness.kimMode; }',
    'export function setKimMode(mode) { harness.kimMode = mode; }',
    'export function _idbSet(key, value) { return harness.idbSet(key, value); }',
    'export function _idbGet(key) { return harness.idbGet(key); }',
    'export function _idbRemove(key) { return harness.idbRemove(key); }',
  ].join('\n');
  const coreUrl = 'data:text/javascript;base64,' + Buffer.from(coreSource).toString('base64');
  const moduleSource = AUTH_SOURCE.replace(
    "from './data-core.js';",
    'from ' + JSON.stringify(coreUrl) + ';',
  );
  assert.notEqual(moduleSource, AUTH_SOURCE, 'data-auth core import should be replaced');

  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = storage;
  const moduleUrl = 'data:text/javascript;base64,' +
    Buffer.from(moduleSource).toString('base64') + '#' + authModuleSequence;
  const auth = await import(moduleUrl);

  return {
    auth,
    harness,
    storage,
    cleanup() {
      if (previousStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = previousStorage;
      delete globalThis[harnessKey];
    },
  };
}

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, startToken + ' should exist');
  const end = source.indexOf(endToken, start);
  assert.notEqual(end, -1, endToken + ' should exist after ' + startToken);
  return source.slice(start, end);
}

test('late IndexedDB restore cannot replace a user selected after restore began', async () => {
  const backupRead = deferred();
  const readStarted = deferred();
  const writes = [];
  const loaded = await loadAuthModule({
    idbGet(key) {
      if (key === AUTH_KEYS.currentUser) {
        readStarted.resolve();
        return backupRead.promise;
      }
      return null;
    },
    async idbSet(key, value) {
      writes.push(key + ':' + (value?.id || value));
    },
  });

  try {
    const restorePromise = loaded.auth.restoreUserFromBackup();
    await readStarted.promise;

    const selectedUser = { id: 'owner-b', nickname: 'B' };
    const setResult = loaded.auth.setCurrentUser(selectedUser);
    assert.equal(setResult, undefined, 'setCurrentUser must remain synchronous');

    backupRead.resolve({ id: 'owner-a', nickname: 'A' });
    const restoreResult = await restorePromise;
    await loaded.auth.waitForAuthPersistence();

    assert.equal(restoreResult, selectedUser);
    assert.equal(loaded.harness.currentUser, selectedUser);
    assert.equal(JSON.parse(loaded.storage.getItem(AUTH_KEYS.currentUser)).id, 'owner-b');
    assert.deepEqual(writes, [AUTH_KEYS.currentUser + ':owner-b']);
  } finally {
    loaded.cleanup();
  }
});

test('TomatoDev auth ignores and preserves production-origin auth records', async () => {
  const loaded = await loadAuthModule();
  const productionUser = JSON.stringify({ id: 'production-owner' });
  loaded.storage.setItem('currentUser', productionUser);
  loaded.storage.setItem('admin_authenticated', 'true');
  loaded.storage.setItem('kim_authenticated', 'true');
  loaded.harness.idb.set('currentUser', { id: 'production-idb-owner' });
  loaded.harness.idb.set('admin_authenticated', true);

  try {
    assert.equal(loaded.auth.loadSavedUser(), null);
    assert.equal(await loaded.auth.restoreUserFromBackup(), null);

    loaded.auth.setCurrentUser({ id: 'development-owner' });
    await loaded.auth.waitForAuthPersistence();
    assert.equal(
      JSON.parse(loaded.storage.getItem(AUTH_KEYS.currentUser)).id,
      'development-owner',
    );

    loaded.auth.setCurrentUser(null);
    await loaded.auth.waitForAuthPersistence();
    assert.equal(loaded.storage.getItem('currentUser'), productionUser);
    assert.equal(loaded.storage.getItem('admin_authenticated'), 'true');
    assert.equal(loaded.storage.getItem('kim_authenticated'), 'true');
    assert.equal(loaded.harness.idb.get('currentUser').id, 'production-idb-owner');
    assert.equal(loaded.harness.idb.get('admin_authenticated'), true);
  } finally {
    loaded.cleanup();
  }
});

test('auth IndexedDB writes and removals run on one ordered promise chain', async () => {
  const operations = [];
  let activeOperations = 0;
  let maxActiveOperations = 0;
  const idb = new Map();

  async function runOperation(label, apply) {
    operations.push(label);
    activeOperations += 1;
    maxActiveOperations = Math.max(maxActiveOperations, activeOperations);
    await new Promise(resolve => setImmediate(resolve));
    apply();
    activeOperations -= 1;
  }

  const loaded = await loadAuthModule({
    idb,
    idbSet(key, value) {
      return runOperation('set:' + key + ':' + (value?.id || value), () => idb.set(key, value));
    },
    idbRemove(key) {
      return runOperation('remove:' + key, () => idb.delete(key));
    },
    async idbGet(key) {
      return idb.get(key) ?? null;
    },
  });

  try {
    assert.equal(loaded.auth.setCurrentUser({ id: 'owner-a' }), undefined);
    loaded.auth.backupAdminAuth();
    loaded.auth.setCurrentUser(null);
    loaded.auth.setCurrentUser({ id: 'owner-b' });
    loaded.auth.clearAdminAuth();

    assert.equal(loaded.harness.currentUser.id, 'owner-b');
    await loaded.auth.waitForAuthPersistence();

    assert.equal(maxActiveOperations, 1);
    assert.deepEqual(operations, [
      'set:' + AUTH_KEYS.currentUser + ':owner-a',
      'set:' + AUTH_KEYS.adminAuthenticated + ':true',
      'remove:' + AUTH_KEYS.currentUser,
      'remove:' + AUTH_KEYS.adminAuthenticated,
      'remove:' + AUTH_KEYS.kimAuthenticated,
      'set:' + AUTH_KEYS.currentUser + ':owner-b',
      'remove:' + AUTH_KEYS.adminAuthenticated,
    ]);
    assert.equal(idb.get(AUTH_KEYS.currentUser).id, 'owner-b');
    assert.equal(idb.has(AUTH_KEYS.adminAuthenticated), false);
    assert.equal(idb.has(AUTH_KEYS.kimAuthenticated), false);
  } finally {
    loaded.cleanup();
  }
});

test('both account-exit flows delay reload until auth persistence is cleared', async () => {
  const waitGate = deferred();
  const events = [];
  const storage = {
    removeItem(key) { events.push('storage:' + key); },
  };
  const location = {
    reload() { events.push('reload'); },
  };
  const auth = {
    setCurrentUser(user) {
      assert.equal(user, null);
      events.push('clear-user');
    },
    clearAdminAuth() { events.push('clear-admin'); },
    async waitForAuthPersistence() {
      events.push('wait-start');
      await waitGate.promise;
      events.push('wait-done');
    },
  };

  const confirmLogoutSource = sliceBetween(
    FEATURE_LOGIN_SOURCE,
    'async function confirmLogout()',
    'export async function switchKimMode',
  )
    .replace('async function confirmLogout()', 'async function confirmLogout(__data)')
    .replaceAll(AUTH_DATA_IMPORT_MARKER, 'Promise.resolve(__data)');
  const confirmLogout = new Function(
    'localStorage',
    'location',
    'TOMATODEV_AUTH_STORAGE_KEYS',
    confirmLogoutSource + '\nreturn confirmLogout;',
  )(storage, location, AUTH_KEYS);

  const confirmPromise = confirmLogout(auth);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events, [
    'clear-user',
    'storage:' + AUTH_KEYS.adminAuthenticated,
    'storage:' + AUTH_KEYS.kimAuthenticated,
    'clear-admin',
    'wait-start',
  ]);
  assert.equal(events.includes('reload'), false);

  waitGate.resolve();
  await confirmPromise;
  assert.deepEqual(events.slice(-2), ['wait-done', 'reload']);

  const otherAccountSource = sliceBetween(
    FEATURE_LOGIN_SOURCE,
    "document.getElementById('kim-lock-other').onclick",
    "setTimeout(() => document.getElementById('kim-lock-pw')",
  )
    .replace("document.getElementById('kim-lock-other')", 'target')
    .replace(AUTH_DATA_IMPORT_MARKER, 'Promise.resolve(__data)');
  const target = {};
  const lockDiv = { remove() { events.push('remove-lock'); } };
  const otherWaitGate = deferred();
  const otherAuth = {
    async waitForAuthPersistence() {
      events.push('other-wait-start');
      await otherWaitGate.promise;
      events.push('other-wait-done');
    },
  };
  new Function(
    'target',
    'setCurrentUser',
    'localStorage',
    'lockDiv',
    'location',
    '__data',
    'TOMATODEV_AUTH_STORAGE_KEYS',
    otherAccountSource,
  )(
    target,
    auth.setCurrentUser,
    storage,
    lockDiv,
    location,
    otherAuth,
    AUTH_KEYS,
  );

  const eventStart = events.length;
  const otherPromise = target.onclick();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events.slice(eventStart), [
    'clear-user',
    'storage:' + AUTH_KEYS.adminAuthenticated,
    'storage:' + AUTH_KEYS.kimAuthenticated,
    'other-wait-start',
  ]);
  otherWaitGate.resolve();
  await otherPromise;
  assert.deepEqual(events.slice(-3), ['other-wait-done', 'remove-lock', 'reload']);
});

test('auth persistence wait is exported through the public data facade', () => {
  assert.match(DATA_API_SOURCE, /restoreUserFromBackup, waitForAuthPersistence,/);
});

test('account refresh cannot overwrite a user selected while its fetch is pending', async () => {
  const refreshSource = sliceBetween(
    DATA_ACCOUNT_SOURCE,
    'export async function refreshCurrentUserFromDB()',
    'export async function recoverDeletedAccounts()',
  ).replace('export async function', 'async function');

  let currentUser = { id: 'owner-a', nickname: 'old-a' };
  let accountRead = deferred();
  const appliedUsers = [];
  const refreshCurrentUserFromDB = new Function(
    'getCurrentUser',
    'getAccountList',
    'setCurrentUser',
    refreshSource + '\nreturn refreshCurrentUserFromDB;',
  )(
    () => currentUser,
    () => accountRead.promise,
    user => {
      appliedUsers.push(user);
      currentUser = user;
    },
  );

  const staleRefresh = refreshCurrentUserFromDB();
  currentUser = { id: 'owner-b', nickname: 'selected-b' };
  accountRead.resolve([{ id: 'owner-a', nickname: 'fresh-a' }]);
  await staleRefresh;
  assert.deepEqual(currentUser, { id: 'owner-b', nickname: 'selected-b' });
  assert.deepEqual(appliedUsers, []);

  accountRead = deferred();
  const matchingRefresh = refreshCurrentUserFromDB();
  const freshB = { id: 'owner-b', nickname: 'fresh-b' };
  accountRead.resolve([freshB]);
  await matchingRefresh;
  assert.equal(currentUser, freshB);
  assert.deepEqual(appliedUsers, [freshB]);
});
