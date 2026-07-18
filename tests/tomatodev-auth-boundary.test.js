import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const coreSource = read('data/data-core.js');
const authSource = read('data/data-auth.js');
const authSessionSource = read('data/firebase-auth-session.js');
const authCredentialSource = read('data/firebase-auth-credential.js');
const accountSource = read('data/data-account.js');
const loadSource = read('data/data-load.js');
const featureLoginSource = read('feature-login.js');
const appSource = read('app.js');
const runningSource = read('workout/running-session.js');
const firebaseConfigSource = read('config.js');
const firestoreRulesSource = read('firestore.rules');
const runtimeAssetsSource = read('runtime-assets.js');
const firebaseRc = JSON.parse(read('.firebaserc'));

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

test('TomatoDev owns a named Firebase app and independent auth persistence stores', () => {
  assert.match(authSessionSource, /initializeApp\(CONFIG\.FIREBASE, 'tomatodev'\)/);
  assert.match(authSessionSource, /getAuth\(tomatoDevFirebaseApp\)/);
  assert.match(authSessionSource, /setPersistence\(tomatoDevFirebaseAuth, browserLocalPersistence\)/);
  assert.match(authSessionSource, /onAuthStateChanged\(/);
  assert.match(coreSource, /const app = tomatoDevFirebaseApp;/);
  assert.match(authCredentialSource, /kim-taewoo@tomatodev\.local/);
  assert.match(authCredentialSource, /subtle\.importKey\(/);
  assert.match(authCredentialSource, /subtle\.deriveBits\(/);
  assert.match(authCredentialSource, /hash:\s*'SHA-256'/);
  assert.match(authCredentialSource, /TOMATODEV_FIREBASE_PASSWORD_ITERATIONS = 310_000/);
  assert.match(authCredentialSource, /return `tdv2_\$\{hex\}`/);
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

test('TomatoDev runtime and deployment mapping use only the isolated Firebase project', () => {
  assert.match(firebaseConfigSource, /projectId:\s+"tomatodev-arete"/);
  assert.match(firebaseConfigSource, /authDomain:\s+"tomatodev-arete\.firebaseapp\.com"/);
  assert.doesNotMatch(firebaseConfigSource, /exercise-management/);
  assert.equal(firebaseRc.projects.default, 'tomatodev-arete');
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
  assert.doesNotMatch(coreSource + authSessionSource, /firebase-functions\.js|getFunctions\(|export const functions\b/);
});

test('production login uses only the pre-provisioned Firebase owner', () => {
  const authenticate = sliceBetween(
    authSource,
    'export async function authenticateTomatoDevOwner',
    'export async function changeTomatoDevOwnerPassword',
  );
  assert.match(authenticate, /signInTomatoDevFirebaseOwner\(localPassword\)/);
  assert.doesNotMatch(authenticate, /verifyPassword|createUser/);
  assert.match(authSessionSource, /signInWithEmailAndPassword\(/);
  assert.doesNotMatch(authSessionSource, /createUserWithEmailAndPassword|signInOrCreate/);
  assert.doesNotMatch(featureLoginSource, /storedHash:|inputHash:/);
});

test('protected boot, owner resolution, and writes wait for Firebase owner auth', () => {
  const loadAll = loadSource.slice(loadSource.indexOf('export async function loadAll'));
  assert.ok(loadAll.indexOf('await requireTomatoDevFirebaseAuth();') < loadAll.indexOf('getDocs(ownerCollection'));
  const firebaseOp = sliceBetween(coreSource, 'export async function _fbOp', '// ── 설정 저장 헬퍼');
  assert.ok(firebaseOp.indexOf('await requireTomatoDevFirebaseAuth();') < firebaseOp.indexOf('const result = await fn();'));
  const appBoot = appSource.slice(appSource.indexOf('async function _initializeAppSession'));
  assert.ok(appBoot.indexOf('await waitForTomatoDevFirebaseAuthReady()') < appBoot.indexOf('loadSavedUser()'));
  assert.ok(appBoot.indexOf('loadSavedUser()') < appBoot.indexOf('const dataLoadPromise = loadAll();'));
  assert.match(appBoot, /if \(!isTomatoDevFirebaseOwner\(firebaseUser\)\)/);
});

test('account discovery requires auth, uses one exact owner get, and propagates failures', () => {
  const getAccountList = sliceBetween(accountSource, 'export async function getAccountList', 'export async function saveAccount');
  assert.ok(getAccountList.indexOf('await requireTomatoDevFirebaseAuth();')
    < getAccountList.indexOf("getDocFromServer(doc(db, '_accounts', ADMIN_ID))"));
  assert.match(getAccountList, /getDocFromServer\(doc\(db, '_accounts', ADMIN_ID\)\)/);
  assert.doesNotMatch(getAccountList, /getDocs|collection\(/);
  assert.doesNotMatch(getAccountList, /catch\s*\(/);
  assert.match(getAccountList, /TOMATODEV_OWNER_PROFILE_MISSING/);
  assert.match(accountSource, /export async function saveAccount[\s\S]*await requireTomatoDevFirebaseAuth\(\);/);
});

test('login signs in before profile fetch and clears both sessions on either failure', () => {
  const loginFlow = sliceBetween(
    featureLoginSource,
    'async function _authenticateAndFetchOwner',
    'function _showLoadingUntilAppReady',
  );
  assert.ok(loginFlow.indexOf('await data.authenticateTomatoDevOwner(password)')
    < loginFlow.indexOf('await _fetchAuthenticatedOwnerProfile(data)'));
  assert.match(loginFlow, /catch \(error\)[\s\S]*await _clearFailedOwnerSession\(data\)/);

  const clearFlow = sliceBetween(
    featureLoginSource,
    'async function _clearFailedOwnerSession',
    'async function _fetchAuthenticatedOwnerProfile',
  );
  assert.match(clearFlow, /await data\.signOutTomatoDevFirebase\(\)/);
  assert.match(clearFlow, /data\.setCurrentUser\(null\)/);
  assert.match(clearFlow, /await data\.waitForAuthPersistence\(\)/);
});

test('Firestore stays deny-all until fixed owner and reader UIDs are approved', () => {
  assert.match(firestoreRulesSource, /allow read, write: if false;/);
  assert.doesNotMatch(firestoreRulesSource, /request\.auth\.token\.email|@tomatodev\.local/);
  assert.doesNotMatch(firestoreRulesSource, /allow get:|accountId ==/);
  assert.doesNotMatch(firestoreRulesSource, /allow read, write: if true/);
});

test('logout and password rotation use Firebase Auth lifecycle APIs', () => {
  assert.match(featureLoginSource, /async function confirmLogout\(\)[\s\S]*await signOutTomatoDevFirebase\(\)/);
  assert.match(authSessionSource, /reauthenticateWithCredential\(/);
  assert.match(authSessionSource, /updatePassword\(user, nextPassword\)/);
  assert.doesNotMatch(featureLoginSource, /passwordHash\s*=\s*hashPassword/);
});

test('Firebase auth modules are precached runtime assets', () => {
  assert.match(runtimeAssetsSource, /\.\/data\/firebase-auth-credential\.js/);
  assert.match(runtimeAssetsSource, /\.\/data\/firebase-auth-session\.js/);
});

test('opening the TomatoDev login screen cannot repair accounts or rewrite a password', () => {
  const maintenance = sliceBetween(
    featureLoginSource,
    'function _runDeferredLoginMaintenance',
    'function _needsPassword',
  );
  const signup = sliceBetween(
    featureLoginSource,
    'async function createAccountFromSignup',
    '// ── 가입 토글',
  );
  assert.doesNotMatch(maintenance, /recoverDeletedAccounts|getAccountList|saveAccount|hashPassword|setDoc/);
  assert.match(maintenance, /automatic account maintenance is disabled on TomatoDev/);
  assert.match(signup, /TomatoDev에서는 브라우저 계정 가입을 지원하지 않습니다/);
  assert.doesNotMatch(signup, /saveAccount|getAccountList|hashPassword/);
});
