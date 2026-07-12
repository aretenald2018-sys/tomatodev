// modals/calendar-day-modal.js
// 캘린더 탭에서 날짜 셀 클릭 시 열리는 요약 모달

export const MODAL_HTML = `
<div class="modal-backdrop" id="calendar-day-modal">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="modal-title" id="calendar-day-title">날짜</div>
    <div id="calendar-day-body"></div>
    <button type="button" class="cal-day-close" data-cal-day-close
      style="margin-top:16px;width:100%;padding:14px;border:none;border-radius:12px;background:var(--primary);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">
      닫기
    </button>
  </div>
</div>
`;
