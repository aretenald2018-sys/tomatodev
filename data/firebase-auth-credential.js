// ================================================================
// firebase-auth-credential.js — TomatoDev owner credential derivation
// ================================================================

export const TOMATODEV_FIREBASE_OWNER_EMAIL = 'kim-taewoo@tomatodev.local';

const TOMATODEV_FIREBASE_PASSWORD_CONTEXT = 'tomatodev-firebase-password:v1';

export async function deriveTomatoDevFirebasePassword(localPassword, cryptoProvider = globalThis.crypto) {
  const password = String(localPassword ?? '').normalize('NFC');
  if (!password) throw new TypeError('TomatoDev Firebase password requires a local password');
  if (!cryptoProvider?.subtle?.digest) throw new Error('Web Crypto SHA-256 is unavailable');

  const payload = new TextEncoder().encode(`${TOMATODEV_FIREBASE_PASSWORD_CONTEXT}\u0000${password}`);
  const digest = await cryptoProvider.subtle.digest('SHA-256', payload);
  const hex = [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `tdv1_${hex}`;
}
