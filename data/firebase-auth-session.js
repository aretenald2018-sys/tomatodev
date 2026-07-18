// ================================================================
// firebase-auth-session.js — TomatoDev-only Firebase Auth boundary
// ================================================================

import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
  EmailAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { CONFIG } from '../config.js';
import {
  TOMATODEV_FIREBASE_OWNER_EMAIL,
  deriveTomatoDevFirebasePassword,
} from './firebase-auth-credential.js';

export const tomatoDevFirebaseApp = getApps().find(candidate => candidate.name === 'tomatodev')
  || initializeApp(CONFIG.FIREBASE, 'tomatodev');

const tomatoDevFirebaseAuth = getAuth(tomatoDevFirebaseApp);

const _firebaseAuthReady = setPersistence(tomatoDevFirebaseAuth, browserLocalPersistence)
  .catch((error) => {
    console.warn('[auth] Firebase local persistence setup failed:', error?.code || error?.message || error);
  })
  .then(() => new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(
      tomatoDevFirebaseAuth,
      (user) => {
        unsubscribe();
        resolve(user || null);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
  }));

function _authBoundaryError(code, message, cause = null) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

export function isTomatoDevFirebaseOwner(user = tomatoDevFirebaseAuth.currentUser) {
  return String(user?.email || '').trim().toLowerCase() === TOMATODEV_FIREBASE_OWNER_EMAIL;
}

export async function waitForTomatoDevFirebaseAuthReady() {
  await _firebaseAuthReady;
  return tomatoDevFirebaseAuth.currentUser || null;
}

export async function restoreTomatoDevFirebaseOwner() {
  const user = await waitForTomatoDevFirebaseAuthReady();
  if (!user) return null;
  if (isTomatoDevFirebaseOwner(user)) return user;
  await signOut(tomatoDevFirebaseAuth);
  return null;
}

export async function requireTomatoDevFirebaseAuth() {
  const user = await waitForTomatoDevFirebaseAuthReady();
  if (isTomatoDevFirebaseOwner(user)) return user;
  throw _authBoundaryError(
    'TOMATODEV_FIREBASE_AUTH_REQUIRED',
    'TomatoDev protected data requires the fixed Firebase owner session',
  );
}

export async function signInTomatoDevFirebaseOwner(localPassword) {
  await waitForTomatoDevFirebaseAuthReady();
  if (tomatoDevFirebaseAuth.currentUser && !isTomatoDevFirebaseOwner()) {
    await signOut(tomatoDevFirebaseAuth);
  }
  const derivedPassword = await deriveTomatoDevFirebasePassword(localPassword);
  const credential = await signInWithEmailAndPassword(
    tomatoDevFirebaseAuth,
    TOMATODEV_FIREBASE_OWNER_EMAIL,
    derivedPassword,
  );
  return credential.user;
}

export async function signOutTomatoDevFirebase() {
  await waitForTomatoDevFirebaseAuthReady();
  await signOut(tomatoDevFirebaseAuth);
}

export async function updateTomatoDevFirebasePassword(currentLocalPassword, nextLocalPassword) {
  const user = await requireTomatoDevFirebaseAuth();
  const [currentPassword, nextPassword] = await Promise.all([
    deriveTomatoDevFirebasePassword(currentLocalPassword),
    deriveTomatoDevFirebasePassword(nextLocalPassword),
  ]);
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(TOMATODEV_FIREBASE_OWNER_EMAIL, currentPassword),
  );
  await updatePassword(user, nextPassword);
  return user;
}
