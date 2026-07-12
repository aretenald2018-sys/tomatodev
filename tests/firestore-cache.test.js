import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreWithMultiTabCache } from '../data/firestore-cache.js';

test('Firestore uses persistent cache with a multi-tab manager when IndexedDB is available', () => {
  const app = { name: 'tomato' };
  const db = { kind: 'persistent' };
  const calls = [];
  const result = createFirestoreWithMultiTabCache(app, {
    getFirestore() { throw new Error('memory fallback should not run'); },
    initializeFirestore(receivedApp, settings) {
      calls.push({ receivedApp, settings });
      return db;
    },
    persistentLocalCache(settings) { return { cache: 'persistent', ...settings }; },
    persistentMultipleTabManager() { return { manager: 'multiple-tabs' }; },
    shouldUsePersistentCache: () => true,
  });

  assert.equal(result, db);
  assert.deepEqual(calls, [{
    receivedApp: app,
    settings: {
      localCache: {
        cache: 'persistent',
        tabManager: { manager: 'multiple-tabs' },
      },
    },
  }]);
});

test('Firestore falls back to memory cache when persistent initialization is unavailable', () => {
  const app = { name: 'tomato' };
  const fallback = { kind: 'memory' };
  const failure = new Error('IndexedDB unavailable');
  const errors = [];
  const result = createFirestoreWithMultiTabCache(app, {
    getFirestore(receivedApp) {
      assert.equal(receivedApp, app);
      return fallback;
    },
    initializeFirestore() { throw failure; },
    persistentLocalCache() { return { cache: 'persistent' }; },
    persistentMultipleTabManager() { return { manager: 'multiple-tabs' }; },
    shouldUsePersistentCache: () => true,
    onCacheError(error) { errors.push(error); },
  });

  assert.equal(result, fallback);
  assert.deepEqual(errors, [failure]);
});

test('Firestore uses memory cache without IndexedDB support', () => {
  const fallback = { kind: 'memory' };
  const result = createFirestoreWithMultiTabCache({}, {
    getFirestore() { return fallback; },
    initializeFirestore() { throw new Error('not reached'); },
    persistentLocalCache() { throw new Error('not reached'); },
    persistentMultipleTabManager() { throw new Error('not reached'); },
    shouldUsePersistentCache: () => false,
  });

  assert.equal(result, fallback);
});
