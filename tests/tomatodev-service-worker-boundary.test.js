import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const swSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function readConstant(name) {
  const match = swSource.match(new RegExp(`const ${name} = '([^']+)'`));
  assert.ok(match, `${name} should be declared as a string constant`);
  return match[1];
}

function loadServiceWorker({ cacheNames = [], fetchImpl = () => Promise.reject(new Error('offline')) } = {}) {
  const handlers = new Map();
  const deleted = [];
  const opened = [];
  let claimed = 0;

  const cache = {
    add() { return Promise.resolve(); },
    match() { return Promise.resolve(undefined); },
    put() { return Promise.resolve(); },
  };
  const context = {
    URL,
    Request,
    Promise,
    caches: {
      delete(name) {
        deleted.push(name);
        return Promise.resolve(true);
      },
      keys() {
        return Promise.resolve([...cacheNames]);
      },
      open(name) {
        opened.push(name);
        return Promise.resolve(cache);
      },
    },
    console: { error() {}, log() {}, warn() {} },
    fetch: fetchImpl,
    importScripts() {},
    self: {
      TOMATO_STATIC_ASSETS: [],
      registration: { scope: 'https://aretenald2018-sys.github.io/tomatodev/' },
      clients: {
        claim() {
          claimed += 1;
          return Promise.resolve();
        },
      },
      addEventListener(type, handler) {
        handlers.set(type, handler);
      },
      skipWaiting() { return Promise.resolve(); },
    },
  };

  vm.runInNewContext(swSource, context, { filename: 'sw.js' });
  return { claimed: () => claimed, deleted, handlers, opened };
}

test('TomatoDev service worker deletes only its own stale cache names', async () => {
  const cacheVersion = readConstant('CACHE_VERSION');
  const runtimeCache = readConstant('RUNTIME_CACHE');
  const staleDevCaches = [
    'tomatodev-v20260717z9-stale',
    'tomatodev-runtime-old',
  ];
  const foreignCaches = [
    'tomatofarm-v20260717z13-production',
    'dashboard3-runtime',
    'workbox-precache-v2-third-party',
  ];
  const harness = loadServiceWorker({
    cacheNames: [cacheVersion, runtimeCache, ...staleDevCaches, ...foreignCaches],
  });

  let activation;
  harness.handlers.get('activate')({
    waitUntil(promise) { activation = promise; },
  });
  await activation;

  assert.deepEqual(harness.deleted.sort(), staleDevCaches.sort());
  assert.equal(harness.claimed(), 1);
  for (const foreignCache of foreignCaches) {
    assert.equal(harness.deleted.includes(foreignCache), false);
  }
});

test('TomatoDev service worker owns cache lookup and recognizes scoped navigation', async () => {
  assert.match(swSource, /const CACHE_PREFIX = 'tomatodev-';/);
  assert.match(swSource, /const CACHE_VERSION = 'tomatodev-v\d{8}z\d+-[^']+';/);
  assert.match(swSource, /const RUNTIME_CACHE = 'tomatodev-runtime';/);
  assert.match(swSource, /new URL\('\.\/', self\.registration\.scope\)/);
  assert.match(swSource, /request\.mode === 'navigate'/);
  assert.doesNotMatch(swSource, /\bcaches\.match\s*\(/);
  assert.doesNotMatch(swSource, /\/tomatofarm\//);

  const response = { clone() { return this; }, status: 200 };
  const harness = loadServiceWorker({ fetchImpl: () => Promise.resolve(response) });
  let responsePromise;
  harness.handlers.get('fetch')({
    request: {
      destination: 'document',
      method: 'GET',
      mode: 'navigate',
      url: 'https://aretenald2018-sys.github.io/tomatodev/',
    },
    respondWith(promise) { responsePromise = promise; },
  });

  assert.equal(await responsePromise, response);
  assert.equal(harness.opened.includes(readConstant('CACHE_VERSION')), true);
});
