// Scene 10 — 루틴 생성 모달 (부위·시간·RPE + AI 균형 nudge)
export const MODAL_HTML = `
<div class="modal-overlay routine-suggest-overlay" id="routine-suggest-modal">
  <div class="modal-sheet routine-suggest-sheet">
    <div class="expert-onb-topbar">
      <button type="button" class="topbar-back" data-expert-modal-action="close-routine-suggest">‹</button>
      <div class="topbar-title">오늘 뭘 할까?</div>
      <div style="width:36px"></div>
    </div>
    <div class="expert-onb-content" id="routine-suggest-content"></div>
    <div class="bottom-cta">
      <button type="button" class="btn btn-primary" id="routine-suggest-go" data-expert-modal-action="generate-routine">🤖 AI로 2개 후보 생성</button>
    </div>
  </div>
</div>
`;
