export const MODAL_HTML = `
<div class="modal-backdrop" id="ex-picker-modal">
<div class="modal-sheet ex-picker-sheet">
  <div class="ex-picker-topbar">
    <button type="button" class="ex-picker-nav-btn" id="ex-picker-back" aria-label="닫기">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 18 9 12l6-6"/></svg>
    </button>
    <div class="ex-picker-search-wrap">
      <svg aria-hidden="true" class="ex-picker-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="ex-picker-search" type="search" autocomplete="off" placeholder="Search(스쿼트, 벤치…)" />
      <button type="button" id="ex-picker-search-clear" class="ex-picker-search-clear" aria-label="지우기">✕</button>
    </div>
    <button type="button" class="ex-picker-nav-btn" id="ex-picker-add-top" aria-label="종목 추가">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
    </button>
  </div>
  <div class="ex-picker-tabs" role="tablist" aria-label="종목 필터">
    <button type="button" class="ex-picker-tab active" data-picker-tab="category" role="tab" aria-selected="true">분류</button>
  </div>
  <div id="ex-picker-list" class="ex-picker-content"></div>
</div>
</div>
`;
