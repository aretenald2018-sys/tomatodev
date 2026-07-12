import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTALL_BANNER_NAV_OFFSET, applyInstallBannerLayout, dismissInstallBanner } from '../pwa/install-banner.js';

test('first-run PWA install banner reserves the fixed bottom tab bar', () => {
  const banner = { style: { cssText: '' } };

  applyInstallBannerLayout(banner);

  assert.equal(INSTALL_BANNER_NAV_OFFSET, 'calc(60px + env(safe-area-inset-bottom, 0px))');
  assert.match(
    banner.style.cssText,
    /bottom:calc\(60px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    'the banner must leave the fixed navigation bar and its safe area touchable',
  );
});

test('dismissing the first-run PWA prompt frees fixed sheets and suppresses it for this session', () => {
  let removed = false;
  const writes = new Map();
  const root = {
    getElementById(id) {
      return id === 'pwa-install-banner' ? { remove: () => { removed = true; } } : null;
    },
  };
  const storage = { setItem: (key, value) => writes.set(key, value) };

  assert.equal(dismissInstallBanner({ root, storage }), true);
  assert.equal(removed, true);
  assert.equal(writes.get('pwa_banner_dismissed'), '1');
});
