// ================================================================
// workout/test-v2/entry.js — 성장 보드(테스트모드 v2) 진입 연결
// ----------------------------------------------------------------
// workout/index.js에서 eager import. 무거운 보드 모듈(board-render.js)은
// 운동 방식 카드에서 tm2OpenBoard() 호출 시 dynamic import한다.
// ================================================================

let _opening = false;
const TM2_MODULE_VERSION = '20260702z19-current-user-set-button';

async function _open() {
  if (_opening) return;
  _opening = true;
  try {
    // 주의: 이 파일은 workout/test-v2/ 깊이 — 동적 import 상대 경로는 ./ 기준
    const mod = await import(`./board-render.js?v=${TM2_MODULE_VERSION}`);
    await mod.tm2OpenBoard();
  } catch (e) {
    console.error('[tm2] open failed', e);
    if (typeof window.showToast === 'function') window.showToast('성장 보드를 여는 데 실패했어요', 2200, 'error');
  } finally {
    _opening = false;
  }
}

async function _openBenchmarkSettings(benchmarkId) {
  if (_opening) return;
  _opening = true;
  try {
    const mod = await import(`./board-render.js?v=${TM2_MODULE_VERSION}`);
    await mod.tm2OpenBenchmarkSettings(benchmarkId);
  } catch (e) {
    console.error('[tm2] open benchmark settings failed', e);
    if (typeof window.showToast === 'function') window.showToast('목표 설정을 여는 데 실패했어요', 2200, 'error');
  } finally {
    _opening = false;
  }
}

export function tm2RenderEntry() {
  const host = document.getElementById('tm2-entry');
  if (!host) return;
  host.dataset.tm2Ready = '1';
  host.classList.add('tm2-root');
  host.hidden = true;
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = '';
}

// 디버그/외부 진입용 전역 노출
window.tm2OpenBoard = _open;
window.tm2OpenBenchmarkSettings = _openBenchmarkSettings;
window.tm2RenderEntry = tm2RenderEntry;

// 모듈 로드 시점에 예전 정적 진입 카드 자리를 비운다. 실제 진입은 운동 방식 목록에서 처리한다.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tm2RenderEntry, { once: true });
} else {
  tm2RenderEntry();
}
