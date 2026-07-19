// ================================================================
// data-auth.js — 인증, 역할 체크, 비밀번호
// ================================================================

import {
  getCurrentUserRef, setCurrentUserRef,
  ADMIN_ID, ADMIN_GUEST_ID, getKimMode, setKimMode,
  TOMATODEV_AUTH_STORAGE_KEYS,
  _idbSet, _idbGet, _idbRemove,
} from './data-core.js';

let _authSessionGeneration = 0;
let _authPersistence = Promise.resolve();

function _queueAuthPersistence(operation) {
  const next = _authPersistence.then(operation, operation);
  _authPersistence = next.catch(() => {});
}

export async function waitForAuthPersistence() {
  let pending;
  do {
    pending = _authPersistence;
    await pending;
  } while (pending !== _authPersistence);
}

export function getCurrentUser() { return getCurrentUserRef(); }
export function getAdminId() { return ADMIN_ID; }
export function getAdminGuestId() { return ADMIN_GUEST_ID; }

export function isAdmin() {
  return getCurrentUserRef()?.id === ADMIN_ID && getKimMode() === 'admin';
}

export function isAdminGuest() {
  return getCurrentUserRef()?.id === ADMIN_ID && getKimMode() === 'guest';
}

export function isSameInstance(id1, id2) {
  if (id1 === id2) return true;
  const normalize = (id) => (id === ADMIN_GUEST_ID ? ADMIN_ID : id);
  return normalize(id1) === normalize(id2);
}

export function isAdminInstance(id) {
  return id === ADMIN_ID || id === ADMIN_GUEST_ID;
}

export const GUEST_CONFIG = {
  homeCards: {
    hero: true,
    unit_goal: true,
    mini_memo: false,
    goals: false,
    quests: false,
    diet_goal: true,
    friends: true,
    tomato_basket: true,
  },
};

export function shouldShow(section, key) {
  if (isAdmin()) return true;
  return GUEST_CONFIG[section]?.[key] !== false;
}

export function setCurrentUser(user) {
  _authSessionGeneration += 1;
  const normalizedUser = _normalizeKimUser(user);
  setCurrentUserRef(normalizedUser);
  if (normalizedUser) {
    localStorage.setItem(TOMATODEV_AUTH_STORAGE_KEYS.currentUser, JSON.stringify(normalizedUser));
    _queueAuthPersistence(() => _idbSet(TOMATODEV_AUTH_STORAGE_KEYS.currentUser, normalizedUser));
  } else {
    localStorage.removeItem(TOMATODEV_AUTH_STORAGE_KEYS.currentUser);
    _queueAuthPersistence(async () => {
      await _idbRemove(TOMATODEV_AUTH_STORAGE_KEYS.currentUser);
      await _idbRemove(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated);
      await _idbRemove(TOMATODEV_AUTH_STORAGE_KEYS.kimAuthenticated);
    });
  }
}

export function loadSavedUser() {
  try {
    const saved = localStorage.getItem(TOMATODEV_AUTH_STORAGE_KEYS.currentUser);
    if (saved) {
      setCurrentUser(_normalizeKimUser(JSON.parse(saved)));
      return getCurrentUserRef();
    }
  } catch {}
  return null;
}

export function backupAdminAuth() {
  _queueAuthPersistence(() => _idbSet(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated, true));
}
export function clearAdminAuth() {
  _queueAuthPersistence(() => _idbRemove(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated));
}
export const backupKimAuth = backupAdminAuth;
export const clearKimAuth = clearAdminAuth;

export async function restoreUserFromBackup() {
  const restoreGeneration = _authSessionGeneration;
  if (getCurrentUserRef()) return getCurrentUserRef();

  await waitForAuthPersistence();
  if (_authSessionGeneration !== restoreGeneration || getCurrentUserRef()) {
    return getCurrentUserRef();
  }

  try {
    const backup = await _idbGet(TOMATODEV_AUTH_STORAGE_KEYS.currentUser);
    if (_authSessionGeneration !== restoreGeneration || getCurrentUserRef()) {
      return getCurrentUserRef();
    }
    if (!backup) return null;

    const [adminAuth, kimAuth] = await Promise.all([
      _idbGet(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated),
      _idbGet(TOMATODEV_AUTH_STORAGE_KEYS.kimAuthenticated),
    ]);
    if (_authSessionGeneration !== restoreGeneration || getCurrentUserRef()) {
      return getCurrentUserRef();
    }

    const normalizedBackup = _normalizeKimUser(backup);
    setCurrentUser(normalizedBackup);
    if (adminAuth || kimAuth) {
      localStorage.setItem(TOMATODEV_AUTH_STORAGE_KEYS.adminAuthenticated, 'true');
    }
    return getCurrentUserRef();
  } catch {}
  return null;
}

function _normalizeKimUser(user) {
  if (!user || user.id !== ADMIN_GUEST_ID) return user;
  setKimMode('guest');
  const normalizedFirstName = typeof user.firstName === 'string'
    ? user.firstName.replace(/\(guest\)/i, '').replace(/\(Guest\)/g, '').trim()
    : user.firstName;
  return { ...user, id: ADMIN_ID, firstName: normalizedFirstName };
}

// ── 비밀번호 (단순 해시) ────────────────────────────────────────
export function _simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function _accountNeedsPassword(account) {
  if (!account) return false;
  const flag = account.hasPassword;
  if (flag === true || flag === 'true' || flag === 1 || flag === '1') return true;
  if (flag === false || flag === 'false' || flag === 0 || flag === '0') return false;
  return !!account.passwordHash;
}

export function verifyPassword(account, input) {
  if (!_accountNeedsPassword(account) || !account.passwordHash) return true;

  const rawInput = String(input ?? '');
  const inputHash = _simpleHash(rawInput);
  const storedHash = account.passwordHash;

  if (String(storedHash) === inputHash) return true;
  if (String(storedHash) === rawInput) return true;

  return false;
}

export function hashPassword(pw) { return _simpleHash(pw); }
