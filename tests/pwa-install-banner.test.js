import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTALL_BANNER_NAV_OFFSET, applyInstallBannerLayout } from '../pwa/install-banner.js';

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
