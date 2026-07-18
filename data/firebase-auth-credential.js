// ================================================================
// firebase-auth-credential.js — TomatoDev owner credential derivation
// ================================================================

export const TOMATODEV_FIREBASE_OWNER_EMAIL = 'kim-taewoo@tomatodev.local';

const TOMATODEV_FIREBASE_PASSWORD_CONTEXT = 'tomatodev-firebase-password:v2';
const TOMATODEV_FIREBASE_PASSWORD_ITERATIONS = 310_000;

export async function deriveTomatoDevFirebasePassword(localPassword, cryptoProvider = globalThis.crypto) {
  const password = String(localPassword ?? '').normalize('NFC');
  if (!password) throw new TypeError('TomatoDev Firebase password requires a local password');
  if (!cryptoProvider?.subtle?.importKey || !cryptoProvider?.subtle?.deriveBits) {
    throw new Error('Web Crypto PBKDF2 is unavailable');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await cryptoProvider.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await cryptoProvider.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: encoder.encode(`${TOMATODEV_FIREBASE_PASSWORD_CONTEXT}\u0000${TOMATODEV_FIREBASE_OWNER_EMAIL}`),
    iterations: TOMATODEV_FIREBASE_PASSWORD_ITERATIONS,
  }, keyMaterial, 256);
  const hex = [...new Uint8Array(derived)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `tdv2_${hex}`;
}
