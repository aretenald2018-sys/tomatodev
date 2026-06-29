// ================================================================
// modals/miranda-quest-modal.js
// ================================================================

const MIRANDA_QUEST_SPEECH_TEXT = '무엇을 원하죠?';
const MIRANDA_QUEST_TYPE_MS = 64;
let _speechTypingTimer = null;

export const MODAL_HTML = `
<div class="modal-backdrop trainer-quest-modal miranda-quest-modal" id="miranda-quest-modal" aria-hidden="true">
  <div class="modal-sheet trainer-quest-sheet miranda-quest-sheet" role="dialog" aria-modal="true" aria-labelledby="miranda-quest-title">
    <div class="sheet-handle"></div>
    <div class="trainer-quest-stage" data-miranda-quest-character>
      <h2
        class="trainer-quest-speech"
        id="miranda-quest-title"
        aria-label="${MIRANDA_QUEST_SPEECH_TEXT}"
        data-miranda-quest-speech
        data-miranda-quest-speech-text="${MIRANDA_QUEST_SPEECH_TEXT}"
      >
        <span class="trainer-quest-speech-text" data-miranda-quest-speech-value></span>
        <span class="trainer-quest-type-cursor" aria-hidden="true"></span>
      </h2>
      <div class="trainer-quest-seated-character trainer-quest-seated-character--miranda" aria-hidden="true">
        <img src="./assets/home/life-zone/ui/miranda-npc-seated.png" alt="" loading="eager" decoding="async">
      </div>
    </div>

    <nav class="trainer-quest-game-menu" data-miranda-quest-game-menu aria-label="미란다 선택지">
      <button type="button" class="trainer-quest-game-option trainer-quest-game-option--disabled" disabled>
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">미란다의 업무 지시를 받습니다(향후 구현예정)</span>
      </button>
      <button type="button" class="trainer-quest-game-option" data-miranda-quest-action="close">
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">닫기</span>
      </button>
    </nav>
  </div>
</div>
`;

function _modal() {
  return document.getElementById('miranda-quest-modal');
}

function _stopSpeechTyping() {
  if (_speechTypingTimer) {
    clearInterval(_speechTypingTimer);
    _speechTypingTimer = null;
  }
}

function _startSpeechTyping(modal) {
  const speech = modal?.querySelector('[data-miranda-quest-speech]');
  const value = modal?.querySelector('[data-miranda-quest-speech-value]');
  if (!speech || !value) return;

  const text = speech.dataset.mirandaQuestSpeechText || MIRANDA_QUEST_SPEECH_TEXT;
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
  }, MIRANDA_QUEST_TYPE_MS);
}

function _bindMirandaQuestModal() {
  const modal = _modal();
  if (!modal || modal.dataset.bound === '1') return;
  modal.dataset.bound = '1';

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeMirandaQuestModal();
  });
  modal.querySelector('.miranda-quest-sheet')?.addEventListener('click', event => event.stopPropagation());
  modal.querySelector('[data-miranda-quest-action="close"]')?.addEventListener('click', closeMirandaQuestModal);
}

export function openMirandaQuestModal() {
  _bindMirandaQuestModal();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'false');
  _startSpeechTyping(modal);
  window._openModal?.('miranda-quest-modal');
}

export function closeMirandaQuestModal() {
  _stopSpeechTyping();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'true');
  window._closeModal?.('miranda-quest-modal');
}

Object.assign(window, {
  openMirandaQuestModal,
  closeMirandaQuestModal,
});
