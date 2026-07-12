export const MODAL_HTML = `
<div class="modal-backdrop" id="checkin-modal" data-action="checkin:close">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="modal-title">📊 주간 체크인</div>
    <div class="ex-editor-form">
      <div><div class="ex-editor-label">날짜</div><input class="ex-editor-input" id="ci-date" type="date"></div>
      <div>
        <div class="ex-editor-label">체중 (kg)</div>
        <input class="ex-editor-input" id="ci-weight" type="number" step="0.1" placeholder="74.5">
      </div>
      <div class="ci-toggle-row" data-action="checkin:toggle-body-fat">
        <div class="ci-toggle-copy">
          <div class="ex-editor-label" style="margin-bottom:2px;">체지방률도 입력할래요?</div>
          <div class="ci-toggle-sub">원할 때만 같이 기록해도 돼요</div>
        </div>
        <button type="button" class="toggle-switch" id="ci-bodyfat-toggle" aria-label="체지방률 입력 토글">
          <span class="toggle-knob"></span>
        </button>
      </div>
      <div class="ci-bodyfat-wrap" id="ci-bodyfat-wrap">
        <div><div class="ex-editor-label">체지방률 (%)</div><input class="ex-editor-input" id="ci-bodyfat" type="number" step="0.1" placeholder="16.5"></div>
      </div>
      <div><div class="ex-editor-label">메모</div><input class="ex-editor-input" id="ci-note" placeholder="이번 주 컨디션이나 변화 기록..."></div>
      <div class="ex-editor-actions">
        <button class="tds-btn cancel-btn ghost md" id="ci-delete-btn" data-action="checkin:delete" style="display:none;color:var(--diet-bad)">삭제</button>
        <button class="tds-btn cancel-btn ghost md" data-action="checkin:close">취소</button>
        <button class="tds-btn fill md" id="ci-save-btn" data-action="checkin:save">저장하기</button>
      </div>
    </div>
  </div>
</div>
`;
