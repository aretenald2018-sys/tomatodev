// ================================================================
// modals/trainer-quest-modal.js
// ================================================================

const TRAINER_QUEST_SPEECH_TEXT = '무엇을 도와드릴까요?';
const TRAINER_QUEST_TYPE_MS = 28;
let _speechTypingTimer = null;

export const MODAL_HTML = `
<div class="modal-backdrop trainer-quest-modal" id="trainer-quest-modal" aria-hidden="true">
  <div class="modal-sheet trainer-quest-sheet" role="dialog" aria-modal="true" aria-labelledby="trainer-quest-title">
    <div class="sheet-handle"></div>
    <div class="trainer-quest-stage" data-trainer-quest-character>
      <h2
        class="trainer-quest-speech"
        id="trainer-quest-title"
        aria-label="${TRAINER_QUEST_SPEECH_TEXT}"
        data-trainer-quest-speech
        data-trainer-quest-speech-text="${TRAINER_QUEST_SPEECH_TEXT}"
      >
        <span class="trainer-quest-speech-text" data-trainer-quest-speech-value></span>
        <span class="trainer-quest-type-cursor" aria-hidden="true"></span>
      </h2>
      <div class="trainer-quest-seated-character" aria-hidden="true">
        <img src="./assets/home/life-zone/ui/trainer-quest-seated-trainer.png" alt="" loading="eager" decoding="async">
      </div>
    </div>

    <div class="trainer-quest-menu" data-trainer-quest-menu>
      <button type="button" class="trainer-quest-choice is-disabled" disabled>
        <span class="trainer-quest-choice-dot is-quest" aria-hidden="true"></span>
        <b>퀘스트</b>
        <small>준비중</small>
      </button>
      <button type="button" class="trainer-quest-choice" data-trainer-quest-action="stats">
        <span class="trainer-quest-choice-dot is-stats" aria-hidden="true"></span>
        <b>통계</b>
        <small>운동 분석</small>
      </button>
      <button type="button" class="trainer-quest-choice" data-trainer-quest-action="close">
        <span class="trainer-quest-choice-dot is-close" aria-hidden="true"></span>
        <b>닫기</b>
        <small>나중에</small>
      </button>
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

function _stopSpeechTyping() {
  if (_speechTypingTimer) {
    clearInterval(_speechTypingTimer);
    _speechTypingTimer = null;
  }
}

function _startSpeechTyping(modal) {
  const speech = modal?.querySelector('[data-trainer-quest-speech]');
  const value = modal?.querySelector('[data-trainer-quest-speech-value]');
  if (!speech || !value) return;

  const text = speech.dataset.trainerQuestSpeechText || TRAINER_QUEST_SPEECH_TEXT;
  _stopSpeechTyping();
  speech.classList.add('is-typing');
  speech.setAttribute('aria-label', text);
  value.textContent = '';

  let index = 0;
  _speechTypingTimer = setInterval(() => {
    index += 1;
    value.textContent = text.slice(0, index);
    if (index >= text.length) {
      _stopSpeechTyping();
      speech.classList.remove('is-typing');
    }
  }, TRAINER_QUEST_TYPE_MS);
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
  modal.querySelector('[data-trainer-quest-back]')?.addEventListener('click', _showMenu);
  modal.querySelector('[data-trainer-quest-action="stats"]')?.addEventListener('click', _showStats);
  modal.querySelector('[data-trainer-quest-action="close"]')?.addEventListener('click', closeTrainerQuestModal);
}

export function openTrainerQuestModal() {
  _bindTrainerQuestModal();
  _showMenu();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'false');
  _startSpeechTyping(modal);
  window._openModal?.('trainer-quest-modal');
}

export function closeTrainerQuestModal() {
  _stopSpeechTyping();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'true');
  window._closeModal?.('trainer-quest-modal');
}

Object.assign(window, {
  openTrainerQuestModal,
  closeTrainerQuestModal,
});
