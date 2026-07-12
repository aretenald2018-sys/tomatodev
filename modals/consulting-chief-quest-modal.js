// ================================================================
// modals/consulting-chief-quest-modal.js
// ================================================================

const CONSULTING_CHIEF_QUEST_SPEECH_TEXT = '원하는 스타일 있으실까요?';
const CONSULTING_CHIEF_QUEST_TYPE_MS = 60;
let _speechTypingTimer = null;

export const MODAL_HTML = `
<div class="modal-backdrop trainer-quest-modal consulting-chief-quest-modal" id="consulting-chief-quest-modal" aria-hidden="true">
  <div class="modal-sheet trainer-quest-sheet consulting-chief-quest-sheet" role="dialog" aria-modal="true" aria-labelledby="consulting-chief-quest-title">
    <div class="sheet-handle"></div>
    <div class="trainer-quest-stage" data-consulting-chief-quest-character>
      <h2
        class="trainer-quest-speech"
        id="consulting-chief-quest-title"
        aria-label="${CONSULTING_CHIEF_QUEST_SPEECH_TEXT}"
        data-consulting-chief-quest-speech
        data-consulting-chief-quest-speech-text="${CONSULTING_CHIEF_QUEST_SPEECH_TEXT}"
      >
        <span class="trainer-quest-speech-text" data-consulting-chief-quest-speech-value></span>
        <span class="trainer-quest-type-cursor" aria-hidden="true"></span>
      </h2>
      <div class="trainer-quest-seated-character trainer-quest-seated-character--consulting-chief" aria-hidden="true">
        <img src="./assets/home/life-zone/ui/consulting-chief-npc-modal.png" alt="" loading="eager" decoding="async">
      </div>
    </div>

    <nav class="trainer-quest-game-menu" data-consulting-chief-quest-game-menu aria-label="상담실장 선택지">
      <button type="button" class="trainer-quest-game-option trainer-quest-game-option--disabled" disabled>
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">상담실장 상담을 예약합니다(향후 구현예정)</span>
      </button>
      <button type="button" class="trainer-quest-game-option" data-consulting-chief-quest-action="close">
        <span class="trainer-quest-game-marker" aria-hidden="true">›</span>
        <span class="trainer-quest-game-label">닫기</span>
      </button>
    </nav>
  </div>
</div>
`;

function _modal() {
  return document.getElementById('consulting-chief-quest-modal');
}

function _stopSpeechTyping() {
  if (_speechTypingTimer) {
    clearInterval(_speechTypingTimer);
    _speechTypingTimer = null;
  }
}

function _startSpeechTyping(modal) {
  const speech = modal?.querySelector('[data-consulting-chief-quest-speech]');
  const value = modal?.querySelector('[data-consulting-chief-quest-speech-value]');
  if (!speech || !value) return;

  const text = speech.dataset.consultingChiefQuestSpeechText || CONSULTING_CHIEF_QUEST_SPEECH_TEXT;
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
  }, CONSULTING_CHIEF_QUEST_TYPE_MS);
}

function _bindConsultingChiefQuestModal() {
  const modal = _modal();
  if (!modal || modal.dataset.bound === '1') return;
  modal.dataset.bound = '1';

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeConsultingChiefQuestModal();
  });
  modal.querySelector('.consulting-chief-quest-sheet')?.addEventListener('click', event => event.stopPropagation());
  modal.querySelector('[data-consulting-chief-quest-action="close"]')?.addEventListener('click', closeConsultingChiefQuestModal);
}

export function openConsultingChiefQuestModal() {
  _bindConsultingChiefQuestModal();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'false');
  _startSpeechTyping(modal);
  openModal('consulting-chief-quest-modal');
}

export function closeConsultingChiefQuestModal() {
  _stopSpeechTyping();
  const modal = _modal();
  if (modal) modal.setAttribute('aria-hidden', 'true');
  closeModal('consulting-chief-quest-modal');
}

import { closeModal, openModal } from '../app/overlay-stack.js';
