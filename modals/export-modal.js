export const MODAL_HTML = `
<div class="modal-backdrop" id="export-modal" data-action="export:close">
<div class="modal-sheet">
<div class="sheet-handle"></div>
<div class="modal-title">📥 데이터 내보내기 (CSV)</div>
<div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
<button class="export-period-btn" data-action="export:run" data-action-arg="30">최근 30일 기록</button>
<button class="export-period-btn" data-action="export:run" data-action-arg="90">최근 90일 기록</button>
<button class="export-period-btn" data-action="export:run" data-action-arg="365">최근 1년 기록</button>
<button class="export-period-btn" data-action="export:run" data-action-arg="0">전체 데이터 내보내기</button>
<button class="tds-btn cancel-btn ghost md" data-action="export:close">창 닫기</button>
</div>
</div>
</div>
`;
