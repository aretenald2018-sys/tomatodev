import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const coreSource = read('data/data-core.js');
const authSource = read('data/data-auth.js');
const featureLoginSource = read('feature-login.js');
const runningSource = read('workout/running-session.js');

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

test('TomatoDev owns a named Firebase app and independent auth persistence stores', () => {
  assert.match(coreSource, /initializeApp\(CONFIG\.FIREBASE, 'tomatodev'\)/);
  assert.match(coreSource, /const _IDB_NAME = 'tomatodev_session_v1';/);
  for (const key of [
    'tomatodev:auth:current-user:v1',
    'tomatodev:auth:admin-authenticated:v1',
    'tomatodev:auth:kim-authenticated:v1',
    'tomatodev:auth:kim-mode:v1',
  ]) {
    assert.ok(coreSource.includes(key), `missing TomatoDev auth key: ${key}`);
  }
  assert.doesNotMatch(coreSource, /localStorage\.getItem\('kimMode'\)/);
  assert.doesNotMatch(coreSource, /localStorage\.setItem\('kimMode'/);
  assert.doesNotMatch(coreSource, /dashboard3_session/);
});

test('auth, login, and running recovery never read or delete production auth keys', () => {
  assert.match(authSource, /TOMATODEV_AUTH_STORAGE_KEYS\.currentUser/);
  assert.match(featureLoginSource, /TOMATODEV_AUTH_STORAGE_KEYS\.adminAuthenticated/);
  assert.match(featureLoginSource, /TOMATODEV_AUTH_STORAGE_KEYS\.kimAuthenticated/);
  assert.match(runningSource, /TOMATODEV_CURRENT_USER_STORAGE_KEY = 'tomatodev:auth:current-user:v1'/);

  for (const source of [authSource, featureLoginSource, runningSource]) {
    assert.doesNotMatch(source, /(?:getItem|setItem|removeItem)\('currentUser'/);
    assert.doesNotMatch(source, /(?:getItem|setItem|removeItem)\('admin_authenticated'/);
    assert.doesNotMatch(source, /(?:getItem|setItem|removeItem)\('kim_authenticated'/);
  }
});

test('running recovery reads and deletes only TomatoDev draft records', () => {
  assert.match(runningSource, /RUNNING_SESSION_DRAFT_KEY_PREFIX = 'tomatodev_running_session_draft_'/);
  assert.match(runningSource, /RUNNING_SESSION_DRAFT_ACTIVE_KEY = 'tomatodev_running_session_draft_active'/);
  assert.match(featureLoginSource, /'tomatodev_running_session_draft_' \+ encodeURIComponent\(ownerId\)/);
  assert.match(featureLoginSource, /'tomatodev_running_session_draft_active'/);

  for (const source of [featureLoginSource, runningSource]) {
    assert.doesNotMatch(source, /tomatofarm_running_session_draft/);
  }
});

test('TomatoDev does not initialize a production Firebase Functions client', () => {
  assert.doesNotMatch(coreSource, /firebase-functions\.js|getFunctions\(|export const functions\b/);
});

test('opening the TomatoDev login screen cannot repair accounts or rewrite a password', () => {
  const maintenance = sliceBetween(
    featureLoginSource,
    'function _runDeferredLoginMaintenance',
    'function _needsPassword',
  );
  const savedAdminLock = sliceBetween(
    featureLoginSource,
    '// 김태우 잠금 화면',
    "document.getElementById('loading').style.display = 'none';",
  );

  assert.doesNotMatch(maintenance, /recoverDeletedAccounts|getAccountList|saveAccount|hashPassword|setDoc/);
  assert.match(maintenance, /automatic account maintenance is disabled on TomatoDev/);
  assert.doesNotMatch(savedAdminLock, /saveAccount|hashPassword|passwordHash\s*=/);
});
