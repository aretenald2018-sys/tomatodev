import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOMATODEV_FIREBASE_OWNER_EMAIL,
  deriveTomatoDevFirebasePassword,
} from '../data/firebase-auth-credential.js';

test('TomatoDev derives a deterministic domain-separated SHA-256 Firebase password', async () => {
  assert.equal(TOMATODEV_FIREBASE_OWNER_EMAIL, 'kim-taewoo@tomatodev.local');
  assert.equal(
    await deriveTomatoDevFirebasePassword('Tomato!2026'),
    'tdv1_44405795e9e8cfaa1fdc949057cba036e607f1c53fba363e3b2975860de4113c',
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
