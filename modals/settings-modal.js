export const MODAL_HTML = `
<div class="modal-backdrop" id="settings-modal" data-action="settings:close">
  <div class="modal-sheet">
    <div class="sheet-handle"></div>
    <div class="modal-title">⚙️ 설정</div>
    <div class="ex-editor-form">
      <input type="hidden" id="cfg-anthropic">
      <section class="season-settings" aria-labelledby="season-settings-title">
        <div class="season-settings-head">
          <div>
            <span>운동 · 식단</span>
            <b id="season-settings-title">시즌 관리</b>
          </div>
          <span class="season-settings-active" id="season-settings-active">불러오는 중</span>
        </div>
        <div id="season-settings-list" class="season-settings-list"></div>
        <div class="season-create-form">
          <label>
            <span>새 시즌 이름</span>
            <input id="season-name-input" type="text" maxlength="24" placeholder="예: 여름 감량 시즌">
          </label>
          <label>
            <span>시작일</span>
            <input id="season-start-input" type="date">
          </label>
          <p>이전 기록은 남고, 목표·식단 플랜·성장 보드·스트릭은 새로 시작합니다.</p>
          <button type="button" class="season-start-btn" data-action="settings:start-season">새 시즌 시작</button>
        </div>
      </section>
      <div id="pwa-install-section" style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px;display:none">
        <button id="pwa-install-btn" data-action="pwa:install" style="width:100%;padding:12px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
          📲 앱 다운로드 (홈 화면에 추가)
        </button>
      </div>
      <div id="settings-build-info" class="settings-build-info">버전 확인 중...</div>
      <div id="settings-nutrition-db-list" style="display:none"></div>
    </div>
  </div>
</div>
`;
