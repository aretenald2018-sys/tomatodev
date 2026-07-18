import { showToast } from './ui/toast.js';
import { applyInstallBannerLayout, dismissInstallBanner } from './pwa/install-banner.js';
// ================================================================
// pwa-fcm.js — TomatoDev FCM 차단 + PWA 설치 배너
// ================================================================

// ── 상태 ──────────────────────────────────────────────────────────
let _deferredInstallPrompt = null;
let _installBannerTimer = null;
const TOMATODEV_FCM_DISABLED_RESULT = Object.freeze({
  ok: false,
  enabled: false,
  reason: 'tomatodev-fcm-disabled',
});

// ── FCM 초기화 ────────────────────────────────────────────────────
// Keep the public initializer stable, but do not request permission or persist
// tokens until messaging is configured specifically for TomatoDev.
export async function initFCM() {
  return TOMATODEV_FCM_DISABLED_RESULT;
}

// ── PWA 설치 배너 ────────────────────────────────────────────────
export function dismissPWAInstallBanner() {
  if (_installBannerTimer) {
    clearTimeout(_installBannerTimer);
    _installBannerTimer = null;
  }
  return dismissInstallBanner();
}

export function showPWAInstallBanner() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) return;
  if (sessionStorage.getItem('pwa_banner_dismissed')) return;
  if (_installBannerTimer) return;

  _installBannerTimer = setTimeout(() => {
    _installBannerTimer = null;
    const existing = document.getElementById('pwa-install-banner');
    if (existing) return;

    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    applyInstallBannerLayout(banner);
    banner.innerHTML = `
      <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
      <div style="display:flex;align-items:center;gap:14px;max-width:480px;margin:0 auto;">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--primary,#22c55e);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🍅</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:var(--text,#111);">토마토 키우기 앱 설치</div>
          <div style="font-size:12px;color:var(--text-tertiary,#888);margin-top:2px;">${isIOS
            ? '홈 화면에 추가하면 앱처럼 사용할 수 있어요'
            : '설치하면 더 빠르고 편하게 사용할 수 있어요'}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          ${isIOS
            ? `<button data-pwa-action="ios-guide" style="padding:8px 16px;border:none;border-radius:999px;background:var(--primary,#22c55e);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">방법 보기</button>`
            : `<button data-pwa-action="install" style="padding:8px 16px;border:none;border-radius:999px;background:var(--primary,#22c55e);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">설치</button>`
          }
          <button data-pwa-action="dismiss" style="padding:8px 10px;border:none;background:none;color:var(--text-tertiary,#888);font-size:16px;cursor:pointer;">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
  }, 1500);
}

export function updateInstallBtn() {
  const btn = document.getElementById('pwa-install-btn');
  if (!btn) return;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  btn.style.display = isStandalone ? 'none' : '';
}

export function installPWA() {
  if (_deferredInstallPrompt) {
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then((result) => {
      if (result.outcome === 'accepted') {
        const section = document.getElementById('pwa-install-section');
        if (section) section.style.display = 'none';
      }
      _deferredInstallPrompt = null;
    });
  } else {
    showToast('이미 설치되었거나, 브라우저가 미지원. 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 이용하세요', 4500, 'info');
  }
}

export function getDeferredInstallPrompt() {
  return _deferredInstallPrompt;
}

// ── 이벤트 리스너 + window 등록 ──────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  const section = document.getElementById('pwa-install-section');
  if (section) section.style.display = 'block';
  updateInstallBtn();
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  const section = document.getElementById('pwa-install-section');
  if (section) section.style.display = 'none';
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
});

function _showIOSInstallGuide() {
  dismissPWAInstallBanner();

  const modal = document.createElement('div');
  modal.id = 'ios-install-guide';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:var(--surface,#fff);border-radius:16px;padding:24px;max-width:320px;width:100%;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🍅</div>
      <div style="font-size:16px;font-weight:700;color:var(--text,#111);margin-bottom:16px;">홈 화면에 추가하기</div>
      <div style="text-align:left;font-size:13px;color:var(--text-secondary,#555);line-height:1.8;">
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e5e7eb);"><b>1.</b> 하단 Safari 메뉴에서 <span style="font-size:16px;vertical-align:middle;">⎋</span> <b>공유</b> 버튼 탭</div>
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e5e7eb);"><b>2.</b> <b>"홈 화면에 추가"</b> 선택</div>
        <div style="padding:8px 0;"><b>3.</b> 오른쪽 상단 <b>"추가"</b> 탭</div>
      </div>
      <button data-pwa-action="close-ios-guide" style="margin-top:16px;width:100%;padding:12px;border:none;border-radius:999px;background:var(--primary,#22c55e);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">확인</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function _bindPwaActions(root = document) {
  if (root.documentElement?.dataset.pwaActionsBound === '1') return;
  if (root.documentElement) root.documentElement.dataset.pwaActionsBound = '1';
  root.addEventListener('click', (event) => {
    const control = event.target?.closest?.('[data-pwa-action]');
    if (!control) return;
    const action = control.dataset.pwaAction;
    if (action === 'ios-guide') _showIOSInstallGuide();
    if (action === 'install') {
      void installPWA();
      dismissPWAInstallBanner();
    }
    if (action === 'dismiss') dismissPWAInstallBanner();
    if (action === 'close-ios-guide') document.getElementById('ios-install-guide')?.remove();
  });
}

_bindPwaActions();
