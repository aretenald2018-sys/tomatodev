// ================================================================
// modals/trainer-quest-modal.js
// ================================================================

export const MODAL_HTML = `
<div class="modal-backdrop trainer-quest-modal" id="trainer-quest-modal" aria-hidden="true">
  <div class="modal-sheet trainer-quest-sheet" role="dialog" aria-modal="true" aria-labelledby="trainer-quest-title">
    <div class="sheet-handle"></div>
    <div class="trainer-quest-stage" data-trainer-quest-character>
      <h2 class="trainer-quest-speech" id="trainer-quest-title">무엇을 도와드릴까요?</h2>
      <div class="trainer-quest-seated-character" aria-hidden="true">
        <img src="./assets/home/life-zone/ui/trainer-quest-seated-trainer.png" alt="" loading="eager" decoding="async">
      </div>
    </div>
    <div class="trainer-quest-head">
      <div class="trainer-quest-portrait" aria-hidden="true">
        <span>PT</span>
      </div>
      <div class="trainer-quest-head-copy">
        <span>트레이너</span>
      </div>
      <button type="button" class="trainer-quest-icon-btn" data-trainer-quest-close aria-label="닫기">×</button>
    </div>

    <div class="trainer-quest-menu" data-trainer-quest-menu>
      <section class="trainer-quest-section" aria-labelledby="trainer-quest-complete-title">
        <h3 id="trainer-quest-complete-title">완료가능한 퀘스트</h3>
        <div class="trainer-quest-row is-disabled" aria-disabled="true">
          <span class="trainer-quest-row-mark is-complete" aria-hidden="true"></span>
          <div>
            <b>업데이트 예정</b>
            <small>완료 가능한 퀘스트는 곧 열릴 예정입니다.</small>
          </div>
        </div>
      </section>

      <section class="trainer-quest-section" aria-labelledby="trainer-quest-etc-title">
        <h3 id="trainer-quest-etc-title">기타</h3>
        <button type="button" class="trainer-quest-row trainer-quest-row-btn" data-trainer-quest-action="stats">
          <span class="trainer-quest-row-mark is-etc" aria-hidden="true"></span>
          <div>
            <b>내 운동 통계 살펴보기</b>
            <small>전체 요약, 건강 지표, 운동 활성, 트레이너 분석을 봅니다.</small>
          </div>
          <span class="trainer-quest-row-arrow" aria-hidden="true">›</span>
        </button>
      </section>
    </div>

    <div class="trainer-quest-stats" data-trainer-quest-stats hidden>
      <div class="trainer-quest-stats-head">
        <button type="button" class="trainer-quest-icon-btn" data-trainer-quest-back aria-label="목록으로 돌아가기">‹</button>
        <div>
          <span>기타</span>
          <h3>내 운동 통계</h3>
        </div>
      </div>
      <div class="trainer-quest-stats-root" data-trainer-quest-stats-root data-stats-root="trainer-quest"></div>
    </div>
  </div>
</div>
`;

function _modal() {
  return document.getElementById('trainer-quest-modal');
}

function _showMenu() {
  const modal = _modal();
  if (!modal) return;
  const menu = modal.querySelector('[data-trainer-quest-menu]');
  const stats = modal.querySelector('[data-trainer-quest-stats]');
  if (menu) menu.hidden = false;
  if (stats) stats.hidden = true;
}

async function _showStats() {
  const modal = _modal();
  if (!modal) return;
  const menu = modal.querySelector('[data-trainer-quest-menu]');
  const stats = modal.querySelector('[data-trainer-quest-stats]');
  const root = modal.querySelector('[data-trainer-quest-stats-root]');
  if (menu) menu.hidden = true;
  if (stats) stats.hidden = false;
  if (root) {
    root.innerHTML = '<div class="trainer-quest-loading">통계를 불러오는 중입니다.</div>';
    try {
      const { renderTrainerQuestStats } = await import('../render-stats.js');
      renderTrainerQuestStats(root);
    } catch (error) {
      console.warn('[trainer-quest] stats render failed:', error);
      root.innerHTML = '<div class="trainer-quest-empty">통계를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>';
    }
  }
}

function _bindTrainerQuestModal() {
  const modal = _modal();
  if (!modal || modal.dataset.bound === '1') return;
  modal.dataset.bound = '1';

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeTrainerQuestModal();
  });
  modal.querySelector('.trainer-quest-sheet')?.addEventListener('click', event => event.stopPropagation());
  modal.querySelectorAll('[data-trainer-quest-close]').forEach(btn => {
    btn.addEventListener('click', () => closeTrainerQuestModal());
  });
  modal.querySelector('[data-trainer-quest-back]')?.addEventListener('click', _showMenu);
  modal.querySelector('[data-trainer-quest-action="stats"]')?.addEventListener('click', _showStats);
}

export function openTrainerQuestModal() {
  _bindTrainerQuestModal();
  _showMenu();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'false');
  window._openModal?.('trainer-quest-modal');
}

export function closeTrainerQuestModal() {
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'true');
  window._closeModal?.('trainer-quest-modal');
}

Object.assign(window, {
  openTrainerQuestModal,
  closeTrainerQuestModal,
});
