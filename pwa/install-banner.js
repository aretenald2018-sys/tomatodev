// Keep first-run install UI above the app's fixed bottom navigation.
// This module has no app/data dependency so its layout contract is unit-testable.
export const INSTALL_BANNER_NAV_OFFSET = 'calc(60px + env(safe-area-inset-bottom, 0px))';

export function applyInstallBannerLayout(banner) {
  banner.style.cssText = [
    'position:fixed',
    `bottom:${INSTALL_BANNER_NAV_OFFSET}`,
    'left:0',
    'right:0',
    'z-index:9999',
    'background:var(--surface,#fff)',
    'border-top:1px solid var(--border,#e5e7eb)',
    'padding:16px 20px',
    'box-shadow:0 -4px 20px rgba(0,0,0,0.1)',
    'animation:slideUp 0.3s ease',
  ].join(';') + ';';
}

export function dismissInstallBanner({ root = globalThis.document, storage = globalThis.sessionStorage } = {}) {
  try { storage?.setItem?.('pwa_banner_dismissed', '1'); } catch {}
  const banner = root?.getElementById?.('pwa-install-banner');
  if (!banner) return false;
  banner.remove?.();
  return true;
}
