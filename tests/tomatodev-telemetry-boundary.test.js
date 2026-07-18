import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function makeFixture(prefix, moduleName, moduleSource, files) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  await Promise.all([
    writeFile(join(directory, moduleName), moduleSource, 'utf8'),
    writeFile(join(directory, 'package.json'), '{"type":"module"}\n', 'utf8'),
    ...Object.entries(files).map(([name, contents]) => writeFile(join(directory, name), contents, 'utf8')),
  ]);
  return { directory, url: pathToFileURL(join(directory, moduleName)).href };
}

test('app-load telemetry entry points are write-free in TomatoDev', async () => {
  const [socialSource, loginSource] = await Promise.all([
    source('data/data-social-log.js'),
    source('feature-login.js'),
  ]);
  assert.match(loginSource, /recordLogin/);

  const state = { reads: [], writes: [], events: [] };
  globalThis.__tomatodevTelemetryState = state;
  const fixture = await makeFixture(
    'tomatodev-social-telemetry-',
    'data-social-log-under-test.mjs',
    socialSource,
    {
      'data-core.js': `
        export const db = {};
        export function doc(_db, ...segments) { return { path: segments.join('/') }; }
        export async function setDoc(ref, payload, options) {
          globalThis.__tomatodevTelemetryState.writes.push({ kind: 'setDoc', path: ref.path, payload, options });
        }
        export async function updateDoc(ref, payload) {
          globalThis.__tomatodevTelemetryState.writes.push({ kind: 'updateDoc', path: ref.path, payload });
        }
        export async function getDoc(ref) {
          globalThis.__tomatodevTelemetryState.reads.push(ref.path);
          return { exists: () => false, data: () => ({}) };
        }
        export function arrayUnion(value) { return { value }; }
        export function getCurrentUserRef() { return { id: 'production-user' }; }
        export function collection(_db, name) { return { path: name }; }
        export async function getDocs() { return { forEach() {} }; }
      `,
      'data-analytics.js': `
        export function trackEvent(...event) {
          globalThis.__tomatodevTelemetryState.events.push(event);
        }
      `,
    },
  );

  try {
    const telemetry = await import(fixture.url);
    await telemetry.recordLogin();
    await telemetry.recordTutorialDone();
    await telemetry.markPatchnoteRead('production-patchnote');
    await telemetry.recordAction('tab-click');

    assert.deepEqual(state.writes, []);
    assert.deepEqual(state.reads, []);
    assert.deepEqual(state.events, []);

    const patchnote = await telemetry.createPatchnote({ title: '관리자 공지', body: '명시적 쓰기' });
    assert.equal(state.writes.length, 1, 'fixture must detect the allowed explicit admin write');
    assert.equal(state.writes[0].kind, 'setDoc');
    assert.match(state.writes[0].path, /^_patchnotes\/pn_\d+$/);
    assert.equal(state.writes[0].payload.id, patchnote.id);
  } finally {
    delete globalThis.__tomatodevTelemetryState;
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test('app tab clicks cannot buffer, schedule, or flush production analytics', async () => {
  const [analyticsSource, appSource] = await Promise.all([
    source('data/data-analytics.js'),
    source('app.js'),
  ]);
  assert.match(appSource, /trackEvent\('nav', 'tab_visit', \{ tab \}\)/);
  assert.doesNotMatch(analyticsSource, /\bsetDoc\b|\b_buffer\b|_flushTimer|FLUSH_INTERVAL|setTimeout/);

  const state = { reads: [], writes: [], listeners: [] };
  globalThis.__tomatodevTelemetryState = state;
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener(type) { state.listeners.push(`document:${type}`); },
  };
  globalThis.window = {
    addEventListener(type) { state.listeners.push(`window:${type}`); },
  };

  const fixture = await makeFixture(
    'tomatodev-analytics-',
    'data-analytics-under-test.mjs',
    analyticsSource,
    {
      'data-core.js': `
        export const db = {};
        export function doc(_db, ...segments) { return { path: segments.join('/') }; }
        export function collection(_db, name) { return { path: name }; }
        export async function setDoc(ref, payload, options) {
          globalThis.__tomatodevTelemetryState.writes.push({ path: ref.path, payload, options });
        }
        export async function getDoc(ref) {
          globalThis.__tomatodevTelemetryState.reads.push(ref.path);
          return { exists: () => false, data: () => ({}) };
        }
        export async function getDocs(ref) {
          globalThis.__tomatodevTelemetryState.reads.push(ref.path);
          return { forEach() {} };
        }
        export function getCurrentUserRef() { return { id: 'production-user' }; }
      `,
      'data-date.js': `
        export const TODAY = new Date('2026-07-18T00:00:00Z');
        export function dateKey(y, m, d) {
          return [y, String(m + 1).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
        }
      `,
    },
  );

  try {
    const analytics = await import(fixture.url);
    analytics.trackEvent('session', 'session_start');
    analytics.trackEvent('nav', 'tab_visit', { tab: 'home' });
    analytics.trackEvent('nav', 'tab_visit', { tab: 'workout' });
    analytics.trackEvent('social', 'tab-click');
    await analytics.flushAnalytics();

    assert.deepEqual(state.writes, []);
    assert.deepEqual(state.reads, []);
    assert.deepEqual(state.listeners, []);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    delete globalThis.__tomatodevTelemetryState;
    await rm(fixture.directory, { recursive: true, force: true });
  }
});
