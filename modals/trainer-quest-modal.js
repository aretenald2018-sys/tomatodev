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

    <nav class="trainer-quest-game-menu" data-trainer-quest-game-menu aria-label="트레이너 선택지">
      <button type="button" class="trainer-quest-game-option trainer-quest-game-option--disabled" disabled>
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">퀘스트를 수락합니다(향후 구현예정)</span>
      </button>
      <button type="button" class="trainer-quest-game-option" data-trainer-quest-action="stats">
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">내 운동 통계 살펴보기</span>
      </button>
      <button type="button" class="trainer-quest-game-option" data-trainer-quest-action="close">
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">닫기</span>
      </button>
    </nav>

    <div class="trainer-quest-stats" data-trainer-quest-stats hidden>
      <div class="trainer-quest-stats-head">
        <button type="button" class="trainer-quest-icon-btn" data-trainer-quest-back aria-label="목록으로 돌아가기">‹</button>
        <div class="trainer-quest-stats-title">
          <span>기타</span>
          <h3>내 운동 통계</h3>
        </div>
        <div class="trainer-quest-export-actions" aria-label="통계 내보내기">
          <button type="button" class="trainer-quest-icon-btn trainer-quest-export-btn" data-trainer-quest-export="share" aria-label="통계 JSON 공유하기" title="공유하기">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"></path>
              <path d="M12 16V4"></path>
              <path d="M7 9l5-5 5 5"></path>
            </svg>
          </button>
          <button type="button" class="trainer-quest-icon-btn trainer-quest-export-btn" data-trainer-quest-export="copy" aria-label="통계 JSON 복사하기" title="복사하기">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="8" y="8" width="11" height="11" rx="2"></rect>
              <path d="M5 15H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v1"></path>
            </svg>
          </button>
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
  const menu = modal.querySelector('[data-trainer-quest-game-menu]');
  const stats = modal.querySelector('[data-trainer-quest-stats]');
  if (menu) menu.hidden = false;
  if (stats) stats.hidden = true;
}

async function _showStats() {
  const modal = _modal();
  if (!modal) return;
  const menu = modal.querySelector('[data-trainer-quest-game-menu]');
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

async function _trainerStatsExportText() {
  const { buildTrainerQuestStatsExportText } = await import('../render-stats.js');
  return buildTrainerQuestStatsExportText();
}

async function _writeStatsClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand?.('copy');
  textarea.remove();
  if (!ok) throw new Error('clipboard unavailable');
}

async function _copyStatsExport() {
  try {
    const text = await _trainerStatsExportText();
    await _writeStatsClipboard(text);
    window.showToast?.('통계 JSON을 클립보드에 복사했어요', 2500, 'success');
  } catch (error) {
    console.warn('[trainer-quest] stats copy failed:', error);
    window.showToast?.('통계 JSON 복사에 실패했어요', 2500, 'error');
  }
}

async function _shareStatsExport() {
  try {
    const text = await _trainerStatsExportText();
    const title = '토마토 키우기 운동 통계 JSON';
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await _writeStatsClipboard(text);
    window.showToast?.('공유를 지원하지 않아 JSON을 복사했어요', 3000, 'info');
  } catch (error) {
    console.warn('[trainer-quest] stats share failed:', error);
    window.showToast?.('통계 JSON 공유에 실패했어요', 2500, 'error');
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
  modal.querySelector('[data-trainer-quest-export="share"]')?.addEventListener('click', _shareStatsExport);
  modal.querySelector('[data-trainer-quest-export="copy"]')?.addEventListener('click', _copyStatsExport);
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
