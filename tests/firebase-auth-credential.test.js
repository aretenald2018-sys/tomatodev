import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOMATODEV_FIREBASE_OWNER_EMAIL,
  deriveTomatoDevFirebasePassword,
} from '../data/firebase-auth-credential.js';

test('TomatoDev derives a deterministic domain-separated PBKDF2 Firebase password', async () => {
  assert.equal(TOMATODEV_FIREBASE_OWNER_EMAIL, 'kim-taewoo@tomatodev.local');
  assert.equal(
    await deriveTomatoDevFirebasePassword('Tomato!2026'),
    'tdv2_bc9ad32e32cd170982544b2494530f44b7b274cd6a2d06376b2da507b51c0080',
  );
  assert.notEqual(
    await deriveTomatoDevFirebasePassword('Tomato!2027'),
    await deriveTomatoDevFirebasePassword('Tomato!2026'),
  );
  await assert.rejects(() => deriveTomatoDevFirebasePassword(''), /requires a local password/);
});

test('equivalent Unicode local passwords derive the same credential', async () => {
  assert.equal(
    await deriveTomatoDevFirebasePassword('Cafe\u0301'),
    await deriveTomatoDevFirebasePassword('Café'),
  );
});
