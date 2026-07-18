import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const coreSource = read('data/data-core.js');
const loadSource = read('data/data-load.js');
const adminSource = read('data/data-admin.js');
const apiSource = read('data/data-api.js');
const friendsSource = read('data/data-social-friends.js');
const interactSource = read('data/data-social-interact.js');
const appSource = read('app.js');

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

function assertOrdered(source, tokens) {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `missing or out-of-order token: ${token}`);
    cursor = next;
  }
}

test('shared auth identity remains separate from its resolved data owner', () => {
  const setCurrentUser = sliceBetween(
    coreSource,
    'export function setCurrentUserRef',
    'export const ADMIN_ID',
  );
  const getDataOwner = sliceBetween(
    coreSource,
    'export function getDataOwnerId',
    'async function _probeSharedAccountOwner',
  );

  assert.match(setCurrentUser, /_currentUser = user;/);
  assert.match(setCurrentUser, /_sharedAccountOwnerId = null;/);
  assert.match(setCurrentUser, /_sharedAccountOwnerProbePromise = null;/);
  assert.match(getDataOwner, /isSharedAdminAccount\(_currentUser\.id\) && !_sharedAccountOwnerId\) return null;/);
  assert.match(coreSource, /error\.code = 'ACCOUNT_DATA_OWNER_UNRESOLVED';/);
  assert.match(coreSource, /const ownerId = _assertResolvedDataOwner\(getDataOwnerId\(\)\);/);
});

test('shared owner resolution uses the server or fails closed without writing metadata', () => {
  const probe = sliceBetween(
    coreSource,
    'async function _probeSharedAccountOwner',
    'export async function resolveDataOwnerIdForAccount',
  );
  const resolver = sliceBetween(
    coreSource,
    'export async function resolveDataOwnerIdForAccount',
    'function _assertResolvedDataOwner',
  );

  assertOrdered(probe, [
    "getDocFromServer(doc(db, '_accounts', ADMIN_ACCOUNT_ID))",
    'readPersistedAccountOwner(accountSnapshot.data())',
    'ACCOUNT_OWNER_PROBE_COLLECTIONS.map',
    "collection(db, 'users', ADMIN_ACCOUNT_ID, collectionName)",
    'getDocsFromServer',
    'selectSharedAccountOwner',
  ]);
  assert.doesNotMatch(probe, /\bgetDoc\(|\bgetDocs\(/);
  assert.doesNotMatch(probe, /setDoc|updateDoc|deleteDoc/);
  assert.match(resolver, /catch \(error\)/);
  assert.match(resolver, /_sharedAccountOwnerProbePromise = null;/);
});

test('loadAll activates the resolved owner only after alias journals are durable', () => {
  const ownerGate = sliceBetween(
    loadSource,
    'async function _resolveSharedOwnerAndReload',
    'export async function loadAll',
  );
  const loadAll = loadSource.slice(loadSource.indexOf('export async function loadAll'));

  assertOrdered(ownerGate, [
    'await resolveDataOwnerIdForAccount(sessionUserId)',
    'reassignPendingDayWrites(globalThis.localStorage',
    'setResolvedSharedAccountOwnerId(selectedOwnerId)',
    'return loadAll();',
  ]);
  assert.doesNotMatch(loadAll, /await unifySharedAccountData\(/);
  assert.doesNotMatch(loadSource, /function _mergeWorkoutTwinCache/);
});

test('friend, admin, premium, and gift paths resolve shared data owners', () => {
  assert.ok((friendsSource.match(/await resolveDataOwnerIdForAccount\(friendId\)/g) || []).length >= 5);
  assert.ok((adminSource.match(/await resolveDataOwnerIdForAccount\(userId\)/g) || []).length >= 2);

  const premium = sliceBetween(
    apiSource,
    'export async function publishDietPremiumReportIssue',
    'export const getDietPremiumReportSeen',
  );
  assertOrdered(premium, [
    'const resolvedTargets = await Promise.all',
    'ownerId: await resolveDataOwnerIdForAccount(userId)',
    "await _fbOp('publishDietPremiumReportIssue'",
  ]);

  const sendGift = sliceBetween(
    apiSource,
    'export async function sendTomatoGift',
    'export async function revertTomatoGift',
  );
  assertOrdered(sendGift, [
    'const [fromOwnerId, toOwnerId] = await Promise.all',
    'resolveDataOwnerIdForAccount(senderAccountId)',
    'resolveDataOwnerIdForAccount(toUserId)',
    'if (getDataOwnerId() !== fromOwnerId)',
    "setDoc(doc(db, '_tomato_gifts', giftId)",
    "doc(db, 'users', toOwnerId, 'settings', 'tomato_state')",
  ]);

  const revertGift = sliceBetween(
    apiSource,
    'export async function revertTomatoGift',
    'export async function getReceivedTomatoGifts',
  );
  assertOrdered(revertGift, [
    'resolveDataOwnerIdForAccount(fromUserId)',
    'resolveDataOwnerIdForAccount(toUserId)',
    "getDocs(collection(db, '_tomato_gifts'))",
    "doc(db, 'users', fromOwnerId, 'settings', 'tomato_state')",
  ]);
});

test('shared owner bootstrap keeps the application inert after timeout or failure', () => {
  const session = sliceBetween(
    appSource,
    'async function _initializeAppSession',
    '_bindLifeZoneNpcQuestEvent();',
  );
  const blockedOverlay = sliceBetween(
    appSource,
    'function _showSharedOwnerBlockedOverlay',
    '// ── 탭 스켈레톤 삽입',
  );
  const requiredTimeout = sliceBetween(
    appSource,
    'function _withRequiredSharedOwnerTimeout',
    'function _showSharedOwnerBlockedOverlay',
  );

  assertOrdered(session, [
    'const sharedAccountBootstrapRequired = isAdmin() || isAdminGuest();',
    'const dataLoadPromise = loadAll();',
    "? _withRequiredSharedOwnerTimeout(dataLoadPromise, 10000, 'shared account data load')",
    ": _withTimeout(dataLoadPromise, 10000, 'data load')",
    'if (_isSharedOwnerSessionUnresolved())',
    "throw _sharedOwnerBootstrapError('Shared account owner resolution timed out or failed')",
    "err?.code === 'ACCOUNT_DATA_OWNER_UNRESOLVED'",
    '_showSharedOwnerBlockedOverlay(sharedOwnerBootstrapFailure)',
  ]);
  assert.match(requiredTimeout, /throw _sharedOwnerBootstrapError\(`\$\{label\} failed`, cause\)/);
  assert.match(requiredTimeout, /reject\(_sharedOwnerBootstrapError\(`\$\{label\} timed out after \$\{ms\}ms`\)\)/);
  assert.doesNotMatch(session, /_withTimeout\(loadAll\(\)/);
  assert.match(blockedOverlay, /child\.inert = true;/);
  assert.match(blockedOverlay, /loading\.classList\.remove\('hidden'\);/);
  assert.match(blockedOverlay, /zIndex: '2147483647'/);
});

test('TomatoDev cannot register or remove an FCM token on any platform', () => {
  assert.match(interactSource, /const TOMATODEV_FCM_DISABLED_RESULT = Object\.freeze\(\{/);
  assert.match(interactSource, /reason: 'tomatodev-fcm-disabled'/);
  assert.match(interactSource, /export async function saveFcmToken\(_token\) \{\s*return TOMATODEV_FCM_DISABLED_RESULT;\s*\}/);
  assert.match(interactSource, /export async function removeFcmToken\(_token\) \{\s*return TOMATODEV_FCM_DISABLED_RESULT;\s*\}/);
  assert.doesNotMatch(interactSource, /function _isFcmTokenWriteEnabled|_fcm_tokens|_simpleHash\(token\)/);
});
