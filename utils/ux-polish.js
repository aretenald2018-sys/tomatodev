// ================================================================
// utils/ux-polish.js — Phase D/E UX 폴리시 유틸
//   - 오프라인 배너 (navigator.online 감시)
//   - 모달 포커스 트랩 (열린 모달에서 Tab 순회 가둠)
//   - aria-label 자동 주입 헬퍼
// ================================================================

// ── 오프라인 배너 ───────────────────────────────────────────────
// CSS: style.css 의 #tds-offline-banner.visible
let _offlineBanner = null;
function _ensureOfflineBanner() {
  if (_offlineBanner) return _offlineBanner;
  const el = document.createElement('div');
  el.id = 'tds-offline-banner';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = '오프라인 상태 — 변경사항은 복구 시 동기화됩니다';
  document.body.appendChild(el);
  _offlineBanner = el;
  return el;
}

function _updateOnlineStatus() {
  const el = _ensureOfflineBanner();
  if (navigator.onLine) {
    el.classList.remove('visible');
  } else {
    el.classList.add('visible');
  }
}

export function initOfflineBanner() {
  _ensureOfflineBanner();
  window.addEventListener('online', _updateOnlineStatus);
  window.addEventListener('offline', _updateOnlineStatus);
  _updateOnlineStatus(); // 초기 상태
}

// ── aria-label 자동 주입 ────────────────────────────────────────
// 아이콘-only 버튼에 label 없으면 textContent 기반으로 자동 주입 (일반적이진 않지만
// 이모지 only 버튼이 많은 이 앱에 한정)
export function autoFillAriaLabels(root = document) {
  root.querySelectorAll('button, [role="button"]').forEach(btn => {
    if (btn.hasAttribute('aria-label')) return;
    const txt = (btn.textContent || '').trim();
    // 이모지/기호만 있는 짧은 텍스트 or 빈 텍스트 — title 이나 data-tip 으로 fallback
    if (!txt || txt.length <= 2) {
      const label = btn.getAttribute('title') || btn.dataset.tip || btn.dataset.label;
      if (label) btn.setAttribute('aria-label', label);
    }
  });
}

// ── 공통 초기화 ────────────────────────────────────────────────
export function initUxPolish() {
  try { initOfflineBanner(); } catch(e) { console.warn('[ux-polish] offline banner init 실패:', e); }
  try { autoFillAriaLabels(); } catch(e) { console.warn('[ux-polish] aria-label init 실패:', e); }
}
