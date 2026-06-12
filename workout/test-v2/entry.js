// ================================================================
// workout/test-v2/entry.js — 성장 보드(테스트모드 v2) 진입 카드
// ----------------------------------------------------------------
// workout/index.js에서 eager import. 무거운 보드 모듈(board-render.js)은
// 카드 클릭 시 dynamic import — Lazy Module Button Rule 준수:
// 버튼 핸들러는 여기서 직접 바인딩하고 인라인 onclick을 쓰지 않는다.
// ================================================================

let _opening = false;

async function _open() {
  if (_opening) return;
  _opening = true;
  try {
    // 주의: 이 파일은 workout/test-v2/ 깊이 — 동적 import 상대 경로는 ./ 기준
    const mod = await import('./board-render.js');
    await mod.tm2OpenBoard();
  } catch (e) {
    console.error('[tm2] open failed', e);
    if (typeof window.showToast === 'function') window.showToast('성장 보드를 여는 데 실패했어요', 2200, 'error');
  } finally {
    _opening = false;
  }
}

export function tm2RenderEntry() {
  const host = document.getElementById('tm2-entry');
  if (!host || host.dataset.tm2Ready) return;
  host.dataset.tm2Ready = '1';
  host.classList.add('tm2-root');
  host.innerHTML = `
    <button type="button" class="tm2-entry-card" id="tm2-entry-btn">
      <span class="tm2-entry-icon">🟩</span>
      <span class="tm2-entry-text">
        <b>성장 보드</b>
        <span>6주 계획표 — 엑셀처럼 한눈에, 색칠로 달성</span>
      </span>
      <span class="tm2-entry-arrow">›</span>
    </button>`;
  host.querySelector('#tm2-entry-btn').addEventListener('click', _open);
}

// 디버그/외부 진입용 전역 노출
window.tm2OpenBoard = _open;
window.tm2RenderEntry = tm2RenderEntry;

// 모듈 로드 시점에 카드 렌더 (정적 #tm2-entry 컨테이너 — index.html)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tm2RenderEntry, { once: true });
} else {
  tm2RenderEntry();
}
