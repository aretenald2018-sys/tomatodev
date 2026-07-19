import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = readFileSync(new URL('../data/data-core.js', import.meta.url), 'utf8');
const login = readFileSync(new URL('../feature-login.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function bootMode(storage) {
  const start = core.indexOf("let _kimMode = 'guest';");
  const end = core.indexOf('export function hasResolvedSharedAccountOwner()', start);
  const source = core.slice(start, end).replaceAll('export function', 'function');
  return new Function('localStorage', 'TOMATODEV_AUTH_STORAGE_KEYS', `${source}; return { getKimMode, setKimMode };`)(storage, { kimMode: 'dev-mode' });
}

test('every module boot resets a stale shared-admin UI mode to guest', () => {
  const values = new Map([['dev-mode', 'admin']]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
  const first = bootMode(storage);
  assert.equal(first.getKimMode(), 'guest');
  assert.equal(values.get('dev-mode'), 'guest');
  first.setKimMode('admin');
  assert.equal(first.getKimMode(), 'admin');
  assert.equal(bootMode(storage).getKimMode(), 'guest');
});

test('an explicit mode switch updates the UI without reloading or changing data ownership', () => {
  const start = login.indexOf('export async function switchKimMode(mode)');
  const end = login.indexOf('async function openNicknameEdit()', start);
  const source = login.slice(start, end);
  assert.doesNotMatch(source, /location\.reload/);
  assert.match(source, /tomatodev:kim-mode-changed/);
  assert.match(app, /addEventListener\('tomatodev:kim-mode-changed'/);
  assert.match(app, /switchTab\(isAdmin\(\) \? 'admin' : 'home'\)/);
});
