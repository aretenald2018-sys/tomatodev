// ================================================================
// workout/test-v2/board-render.js — 성장 보드 UI (보드 + 시트들)
// ----------------------------------------------------------------
// 계획: docs/ai/features/2026-06-12-test-mode-v2-board.md
//  - 메인 화면은 보드(표) 그 자체 (계약 1)
//  - 오늘 행에서 칸을 담아 "오늘의 배열" 구성 (계약 13)
//  - 색칠은 유저의 명시적 탭 (계약 4)
//  - 모든 버튼은 data-action + 루트 위임 (인라인 onclick 금지)
//  - 저장은 data.js saveTestBoardV2 단일 경로 (_settings.test_board_v2)
// 용어는 용어 사전 준수: 볼륨/강도 · 여유 횟수 · 자세 메모 · 1주차 · 칸.
// ================================================================

import { getTestBoardV2, saveTestBoardV2, getMaxCycle, getExList, getCache } from '../../data.js';
import { MOVEMENTS } from '../../config.js';
import { S as WS } from '../state.js';
import { saveWorkoutDay } from '../save.js';
import { loadWorkoutDate } from '../load.js';
import {
  TM2_TRACK_LABELS,
  mondayOf, addWeeks, weeksBetween, weekIndexOf, isCycleFinished, shortDate, toKey,
  activeBenchmarks, activeCycleOf, settledCyclesOf, benchmarkById, currentKgOf,
  expandColumnCells, projectFutureCells, paintWeek, recordMiss, previewAdjust,
  getLineup, toggleLineup,
  isSettleDue, buildSettleRows, applySettle,
  archiveBenchmark, addBenchmark, buildOnboardingCandidates, buildRecentMap,
  buildMinimapData, recentPaintLogs, defaultIncrementForGroup,
} from './board-core.js';
import {
  WENDLER_SCHEMES, WENDLER_SCHEME_IDS, normalizeWendlerConfig,
  wendlerWeekPrescription, wendlerCycleOverview, isWendlerAllowedMajor,
} from './wendler.js';

// 온보딩/종목관리 후보 — 실제 등록 종목(getExList) 기반 (운동할 때와 동일 출처)
function _candidates(groupId = null) {
  let recentMap = {};
  try { recentMap = buildRecentMap(getCache() || {}); } catch { recentMap = {}; }
  let exList = [];
  try { exList = getExList() || []; } catch { exList = []; }
  const all = buildOnboardingCandidates({ exList, v1Cycle: getMaxCycle(), movements: MOVEMENTS, recentMap });
  return groupId ? all.filter(c => c.groupId === groupId) : all;
}

const S = {
  board: null,
  groupId: 'chest',
  view: 'board',        // 'board' | 'minimap'
  sheet: null,          // { kind, ctx }
  card: null,           // 운동 카드 { bmId, track, weekStart, plan, sets }
  missChoice: 'extend',
  settleDecisions: {},
  session: null,        // 오늘의 배열 진행 { keys:[], idx }
};

const _todayKey = () => toKey(new Date());
const _esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _toast = (msg, type = 'info') => { if (typeof window.showToast === 'function') window.showToast(msg, 2200, type); };
const _num = (id, fallback = 0) => {
  const el = document.getElementById(id);
  const v = Number(el?.value);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const _txt = (id) => (document.getElementById(id)?.value || '').trim();

async function _persist() {
  try { await saveTestBoardV2(S.board); }
  catch (e) { console.error('[tm2] save failed', e); _toast('저장에 실패했어요 — 네트워크를 확인해 주세요', 'error'); }
}

// ----------------------------------------------------------------
// 루트 DOM
// ----------------------------------------------------------------

function _ensureRoots() {
  if (!document.getElementById('tm2-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'tm2-overlay';
    ov.className = 'tm2-root tm2-overlay';
    document.body.appendChild(ov);
    ov.addEventListener('click', _onAction);
  }
  if (!document.getElementById('tm2-sheets')) {
    const sh = document.createElement('div');
    sh.id = 'tm2-sheets';
    sh.className = 'tm2-root tm2-sheet-layer';
    document.body.appendChild(sh);
    sh.addEventListener('click', (e) => {
      if (e.target === sh) { closeSheet(); return; }
      _onAction(e);
    });
  }
}

export function closeSheet() {
  S.sheet = null;
  const sh = document.getElementById('tm2-sheets');
  if (sh) { sh.classList.remove('tm2-open'); sh.innerHTML = ''; }
}

function _openSheet(html) {
  const sh = document.getElementById('tm2-sheets');
  if (!sh) return;
  sh.innerHTML = `<div class="tm2-sheet">${html}</div>`;
  sh.classList.add('tm2-open');
}

// ----------------------------------------------------------------
// 진입
// ----------------------------------------------------------------

export async function tm2OpenBoard() {
  _ensureRoots();
  const board = getTestBoardV2();
  if (!board || !Array.isArray(board.benchmarks) || !board.benchmarks.length) {
    const mod = await import('./onboarding.js');
    mod.openOnboarding({
      onComplete: async (newBoard) => {
        S.board = newBoard;
        await _persist();
        _toast('6주 칸을 채웠어요 — 성장 보드 시작!', 'success');
        _afterBoardReady();
      },
    });
    return;
  }
  S.board = board;
  _afterBoardReady();
}

function _afterBoardReady() {
  const withBm = (S.board.groups || []).find(g => activeBenchmarks(S.board, g.id).length);
  if (withBm && !activeBenchmarks(S.board, S.groupId).length) S.groupId = withBm.id;
  S.view = 'board';
  document.getElementById('tm2-overlay').classList.add('tm2-open');
  renderBoard();
  setTimeout(_scrollToToday, 50);
}

export function tm2CloseBoard() {
  closeSheet();
  const ov = document.getElementById('tm2-overlay');
  if (ov) { ov.classList.remove('tm2-open'); ov.innerHTML = ''; }
}

// ----------------------------------------------------------------
// 보드 렌더
// ----------------------------------------------------------------

function _columnsOf(groupId) {
  const cols = [];
  for (const bm of activeBenchmarks(S.board, groupId)) {
    if (bm.program === 'wendler') cols.push({ bm, track: 'volume', wendler: true });
    else for (const t of bm.tracks) cols.push({ bm, track: t, wendler: false });
  }
  return cols;
}

const TM2_ROW_H = 46;
const _weekRange = (start, n) => Array.from({ length: n }, (_, i) => addWeeks(start, i));

function _cellHtml(cell, col) {
  if (cell.kind === 'rest') {
    return `<div class="tm2-cell tm2-rest" style="--tm2-s:${cell.span}"><i>쉼</i></div>`;
  }
  // 투영(미래 사이클) — 탭 불가, 옅은 계획
  if (cell.state === 'future' || cell.projected) {
    if (cell.kind === 'wendler') {
      return `<div class="tm2-cell tm2-future" style="--tm2-s:1"><b>${cell.kg}</b><i>${_esc(cell.repsLabel)}</i></div>`;
    }
    return `<div class="tm2-cell tm2-future" style="--tm2-s:${cell.span}"><b>${cell.kg > 0 ? cell.kg : '—'}</b><i>${cell.reps}</i></div>`;
  }
  const lineup = getLineup(S.board, _todayKey());
  const pickIdx = lineup.findIndex(x => x.benchmarkId === col.bm.id && x.track === col.track);
  const pick = (cell.isCurrent && pickIdx >= 0) ? `<span class="tm2-pick">${pickIdx + 1}</span>` : '';
  // 병합 칸을 탭하면 "이번 주"를 타겟 (칸 시작 주가 아니라)
  const tapWeek = cell.isCurrent ? mondayOf(_todayKey()) : cell.weekStart;
  const args = `data-action="tm2:cell" data-bm="${col.bm.id}" data-track="${col.track}" data-week="${tapWeek}" data-state="${cell.state}" data-current="${cell.isCurrent ? 1 : 0}"`;
  const kgLabel = cell.kg > 0 ? cell.kg : '<span style="opacity:.5">—</span>';
  if (cell.kind === 'wendler') {
    return `<button class="tm2-cell tm2-${cell.state}" style="--tm2-s:1" ${args}>
      ${pick}<b>${cell.kg}</b><i>${_esc(cell.repsLabel)}</i><u>${_esc(cell.subLabel)}</u>
    </button>`;
  }
  // 병합(span>1) stair 칸 — 주별 세그먼트로 "그 주까지" 비례 색칠
  if (cell.weekStates && cell.span > 1) {
    const segs = cell.weekStates.map(ws => `<i class="tm2-seg tm2-seg-${ws}"></i>`).join('');
    return `<button class="tm2-cell tm2-stair-seg" style="--tm2-s:${cell.span}" ${args}>
      <span class="tm2-segs">${segs}</span>
      <span class="tm2-cell-label">${pick}<b>${kgLabel}</b><i>${cell.reps}</i></span>
    </button>`;
  }
  // 단일 주 칸
  return `<button class="tm2-cell tm2-${cell.state}" style="--tm2-s:${cell.span}" ${args}>
    ${pick}<b>${kgLabel}</b><i>${cell.reps}</i>${cell.state === 'miss' ? '<u>못 채움 → 조정</u>' : ''}
  </button>`;
}

// 보드 모델 — 과거 1사이클 + 활성 + 미래 투영(최소 18주). 행=주, 셀 정렬은 행 인덱스 기준.
function _boardModel(todayKey) {
  const settled = settledCyclesOf(S.board, S.groupId);
  const active = activeCycleOf(S.board, S.groupId);
  const settledShown = settled.length ? [settled[settled.length - 1]] : [];
  const bands = [];
  settledShown.forEach((cy, i) => bands.push({ cycle: cy, start: cy.startDate, weeks: cy.weeks, label: `C${settled.length}`, projected: false }));
  if (active) bands.push({ cycle: active, start: active.startDate, weeks: active.weeks, label: `C${settled.length + 1}`, projected: false });
  if (active) {
    const nProj = Math.max(2, Math.ceil(12 / active.weeks)); // 활성 6주 + ≥12주 투영 = ≥18주
    for (let o = 1; o <= nProj; o++) {
      bands.push({ cycle: null, start: addWeeks(active.startDate, active.weeks * o), weeks: active.weeks, label: `C${settled.length + 1 + o} 예정`, projected: true, offset: o });
    }
  }
  const weeksList = [];
  const bandStartAt = {};
  for (const band of bands) {
    const ws = _weekRange(band.start, band.weeks);
    bandStartAt[ws[0]] = { label: band.label, projected: band.projected };
    weeksList.push(...ws);
  }
  return { bands, weeksList, bandStartAt, active, settledCount: settled.length };
}

// 한 열의 전체 셀(과거+활성+투영) — 행 인덱스로 weeksList와 정렬됨
function _columnCells(col, model, todayKey) {
  const cells = [];
  for (const band of model.bands) {
    if (band.cycle) cells.push(...expandColumnCells(S.board, col.bm.id, col.track, band.cycle.id, todayKey));
  }
  cells.push(...projectFutureCells(S.board, col.bm.id, col.track, 12));
  return cells;
}

function _colHeadHtml(cols) {
  const groupNames = (() => {
    const parts = [];
    let i = 0;
    while (i < cols.length) {
      const bm = cols[i].bm;
      let span = 1;
      while (i + span < cols.length && cols[i + span].bm.id === bm.id) span++;
      const wndEm = bm.program === 'wendler' ? `<em>웬들러 · 기준 ${bm.wendler.tmKg}</em>` : '';
      parts.push(`<button class="tm2-ch-grp" style="grid-column:span ${span}" data-action="tm2:column" data-bm="${bm.id}"><span class="tm2-ch-name">${_esc(bm.short || bm.label)}</span>${wndEm}</button>`);
      i += span;
    }
    return parts.join('');
  })();
  const trackChips = cols.map(c => c.wendler
    ? `<div class="tm2-ch-trk tm2-wnd">${_esc(WENDLER_SCHEMES[c.bm.wendler.scheme]?.label || '커스텀')}</div>`
    : `<div class="tm2-ch-trk">${TM2_TRACK_LABELS[c.track]}</div>`).join('');
  return `
    <div class="tm2-colhead" style="--tm2-n:${cols.length}">
      <div class="tm2-ch-rail">주</div>
      ${groupNames}
      <div></div>
      ${trackChips}
    </div>`;
}

// 연속 그리드 + 붉은 "오늘" 타임라인 (계약: 18주 가시화 + 현재 위치)
function _renderBoardView(cols, todayKey) {
  const model = _boardModel(todayKey);
  const todayMon = mondayOf(todayKey);
  const railHtml = model.weeksList.map(wk => {
    const band = model.bandStartAt[wk];
    const tag = band ? `<em class="tm2-cyc-tag${band.projected ? ' tm2-proj' : ''}">${_esc(band.label)}</em>` : '';
    return `<span class="${wk === todayMon ? 'tm2-today' : ''}${band ? ' tm2-band-start' : ''}">${tag}${shortDate(wk)}</span>`;
  }).join('');
  const colsHtml = cols.map(col => {
    const cells = _columnCells(col, model, todayKey);
    return `<div class="tm2-bcol">${cells.map(c => _cellHtml(c, col)).join('')}</div>`;
  }).join('');
  const todayIdx = model.weeksList.indexOf(todayMon);
  const nowLine = todayIdx >= 0 ? `<div class="tm2-now-line" style="top:${todayIdx * TM2_ROW_H}px"><span>오늘</span></div>` : '';
  const settleCta = model.active && isSettleDue(S.board, S.groupId, todayKey)
    ? `<button class="tm2-settle-cta" data-action="tm2:settle">6주 정산하기 — 성장/유지 결정</button>` : '';
  return `
    ${_colHeadHtml(cols)}
    <div class="tm2-bgrid tm2-grid" style="--tm2-n:${cols.length}">
      <div class="tm2-rail">${railHtml}</div>
      ${colsHtml}
      ${nowLine}
    </div>
    ${settleCta}`;
}

export function renderBoard() {
  const ov = document.getElementById('tm2-overlay');
  if (!ov || !S.board) return;
  const todayKey = _todayKey();

  if (S.view === 'minimap') { _renderMinimap(ov, todayKey); return; }

  const groups = S.board.groups || [];
  const chips = groups.map(g =>
    `<button class="${g.id === S.groupId ? 'tm2-on' : ''}" data-action="tm2:group" data-group="${g.id}">${_esc(g.label)}</button>`
  ).join('') + '<button class="tm2-add" data-action="tm2:manage">✚</button>';

  const cols = _columnsOf(S.groupId);
  const cycle = activeCycleOf(S.board, S.groupId);

  const bodyHtml = !cols.length
    ? `<div class="tm2-empty-note">이 부위에는 아직 종목이 없어요.<br>✚ 버튼으로 운동 메뉴에 종목을 추가해 주세요.</div>`
    : _renderBoardView(cols, todayKey);

  // 오늘의 배열 바 (계약 13)
  const lineup = getLineup(S.board, todayKey);
  const lineupText = lineup.map((x, i) => {
    const bm = benchmarkById(S.board, x.benchmarkId);
    if (!bm) return '';
    const cur = bm.program === 'wendler'
      ? wendlerWeekPrescription(bm.wendler, Math.max(1, Math.min(6, weekIndexOf(activeCycleOf(S.board, bm.groupId) || { startDate: todayKey }, todayKey)))).topSet?.kg
      : currentKgOf(S.board, bm, x.track).kg;
    return `${'①②③④⑤⑥⑦⑧⑨⑩'[i] || (i + 1)} ${bm.short || bm.label} ${cur || ''}`;
  }).filter(Boolean).join(' → ');
  const todaybar = `
    <div class="tm2-todaybar ${lineup.length ? 'tm2-show' : ''}">
      <div class="tm2-tl"><b>오늘의 배열 — ${lineup.length}종목</b><span>${_esc(lineupText)}</span></div>
      <button data-action="tm2:start">운동 시작</button>
    </div>`;

  const groupLabel = groups.find(g => g.id === S.groupId)?.label || '';
  const cyHead = cycle ? `${weekIndexOf(cycle, todayKey) <= cycle.weeks ? `${weekIndexOf(cycle, todayKey)}주차` : '정산 대기'}` : '';
  ov.innerHTML = `
    <div class="tm2-topbar">
      <div class="tm2-topbar-row">
        <button class="tm2-icon-btn" data-action="tm2:close">‹</button>
        <b>성장 보드</b>
        <span class="tm2-sub">${_esc(groupLabel)} · ${cyHead}</span>
        <button class="tm2-icon-btn" data-action="tm2:minimap" title="6개월 조망">⤢</button>
      </div>
      <div class="tm2-grp-chips">${chips}</div>
    </div>
    <div class="tm2-body" id="tm2-body">${bodyHtml}</div>
    <button class="tm2-fab" data-action="tm2:today">오늘로</button>
    ${todaybar}`;
}

function _scrollToToday() {
  const el = document.querySelector('#tm2-body .tm2-rail .tm2-today');
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// ----------------------------------------------------------------
// 줌아웃 미니맵 (계약 10)
// ----------------------------------------------------------------

function _renderMinimap(ov, todayKey) {
  const mm = buildMinimapData(S.board, todayKey);
  const PX = 5, GAP = 1;
  const colHtml = (col) => {
    let html = '';
    for (const seg of col.segs) {
      const color = seg.state === 'done' ? 'var(--tm2-done)'
        : seg.state === 'now' ? 'var(--tm2-now)'
        : seg.state === 'miss' ? '#f0d9a8'
        : seg.state === 'rest' ? '#f0f1f3'
        : '#cfe9db';
      html += `<i style="height:${seg.span * PX - GAP}px;background:${color}"></i>`;
    }
    return `<div class="tm2-mm-col">${html}</div>`;
  };
  const groupsHtml = mm.groups.map(g => `
    <div class="tm2-mm-grp">
      <div class="tm2-mm-label">${_esc(g.label)}</div>
      <div class="tm2-mm-cols">${g.cols.map(colHtml).join('')}</div>
    </div>`).join('');
  // 월 라벨
  let months = '';
  let lastMonth = null;
  for (let w = 0; w <= mm.totalWeeks; w++) {
    const key = addWeeks(mm.fromKey, w);
    const m = key.slice(5, 7);
    if (m !== lastMonth) {
      months += `<span style="top:${w * PX}px">${parseInt(m, 10)}월</span>`;
      lastMonth = m;
    }
  }
  const todayTop = 18 + Math.max(0, mm.todayOffset) * PX;
  ov.innerHTML = `
    <div class="tm2-topbar">
      <div class="tm2-topbar-row">
        <button class="tm2-icon-btn" data-action="tm2:back">‹</button>
        <b>성장 보드</b>
        <span class="tm2-sub">전체 조망</span>
      </div>
    </div>
    <div class="tm2-body">
      <div class="tm2-mini-wrap">
        <div class="tm2-mini-head">모든 부위 × 전체 기간 — <b>어디까지 칠해왔고 어디로 가는지</b> 한 화면.</div>
        <div class="tm2-minimap">
          <div class="tm2-mm-months">${months}</div>
          ${groupsHtml}
          <div class="tm2-mm-today" style="top:${todayTop}px"></div>
        </div>
        <div class="tm2-mini-legend">
          <span><i style="background:var(--tm2-done)"></i>달성</span>
          <span><i style="background:var(--tm2-now)"></i>이번 주</span>
          <span><i style="background:#cfe9db"></i>계획</span>
          <span><i style="background:#f0d9a8"></i>못 채움·조정</span>
        </div>
      </div>
    </div>`;
}

// ----------------------------------------------------------------
// 셀 시트 (계약 4·8·9)
// ----------------------------------------------------------------

function _metaRowsHtml(bm) {
  const rows = [];
  const rir = bm.meta?.rirTarget;
  if (rir != null && rir !== '') {
    rows.push(`<div class="tm2-std-row"><span class="tm2-ic">💪</span><div><b>세트 끝에 ${rir}회 남기기</b><small>여유 횟수(RIR) ${rir} — 한계까지 가지 않아요</small></div></div>`);
  }
  if (bm.meta?.formNote) {
    rows.push(`<div class="tm2-std-row"><span class="tm2-ic">📐</span><div><b>${_esc(bm.meta.formNote)}</b><small>자세 메모</small></div></div>`);
  }
  if (bm.meta?.gymNote) {
    rows.push(`<div class="tm2-std-row"><span class="tm2-ic">🏋️</span><div><b>${_esc(bm.meta.gymNote)}</b><small>헬스장별 기구</small></div></div>`);
  }
  return rows.length ? `<div class="tm2-sec-label">오늘의 기준</div><div class="tm2-std">${rows.join('')}</div>` : '';
}

function _kickerOf(bm, weekStart) {
  const cycle = activeCycleOf(S.board, bm.groupId);
  const group = (S.board.groups || []).find(g => g.id === bm.groupId);
  const wk = cycle ? Math.max(1, Math.min(cycle.weeks, weekIndexOf(cycle, weekStart))) : 1;
  const isThisWeek = mondayOf(weekStart) === mondayOf(_todayKey());
  return `${group?.label || ''} · ${wk}주차 — ${shortDate(weekStart)} 주${isThisWeek ? ' (이번 주)' : ''}`;
}

// 셀 탭 → 미래는 계획 미리보기, 과거는 기록 요약, 이번 주는 실제 운동카드(통합).
function openCellSheet(bmId, track, weekStart) {
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;
  const wkMon = mondayOf(weekStart);
  const thisMon = mondayOf(_todayKey());
  const rel = weeksBetween(thisMon, wkMon);
  if (rel > 0) { _openPlanPreview(bm, track, wkMon); return; }      // 미래
  if (rel < 0) { _openPastSummary(bm, track, wkMon); return; }      // 과거
  _openWorkoutCard(bm, track, wkMon);                               // 이번 주
}

// 이번 주 칸의 계획 처방
function _cellPlan(bm, track, wkMon) {
  const cycle = activeCycleOf(S.board, bm.groupId);
  if (bm.program === 'wendler') {
    const wk = cycle ? Math.max(1, Math.min(cycle.weeks, weekIndexOf(cycle, wkMon))) : 1;
    const rx = wendlerWeekPrescription(bm.wendler, wk);
    return { kind: 'wendler', kg: rx.topSet?.kg || 0, reps: rx.topSet?.reps || 0, amrap: !!rx.topSet?.amrap, rx };
  }
  const cells = cycle ? expandColumnCells(S.board, bm.id, track, cycle.id, _todayKey()) : [];
  const cell = cells.find(c => c.kind === 'stair' && weeksBetween(c.weekStart, wkMon) >= 0 && weeksBetween(c.weekStart, wkMon) < c.span);
  return { kind: 'stair', kg: cell?.kg || 0, reps: cell?.reps || 0, sets: bm.setsDefault || 4 };
}

const _CARD_TYPES = ['main', 'warmup', 'drop'];
const _cardTypeLabel = (t) => (t === 'warmup' ? '웜업' : t === 'drop' ? '드랍' : '본');

function _prefillCardSets(bm, plan) {
  const rir = bm.meta?.rirTarget ?? 2;
  if (plan.kind === 'wendler') {
    const sets = plan.rx.sets.map(s => ({ kg: s.kg, reps: s.reps, rir, romPct: 100, setType: 'main', done: false }));
    const supp = plan.rx.supplemental;
    if (supp) for (let i = 0; i < supp.sets; i++) sets.push({ kg: supp.kg, reps: supp.reps, rir, romPct: 100, setType: 'main', done: false });
    return sets;
  }
  return Array.from({ length: plan.sets || 4 }, () => ({ kg: plan.kg, reps: plan.reps, rir, romPct: 100, setType: 'main', done: false }));
}

// 오늘 실제 운동기록에 이 종목이 이미 있으면 그 세트를 카드로 복원
function _existingTodaySets(bm) {
  const now = new Date();
  const d = WS?.shared?.date;
  if (!d || d.y !== now.getFullYear() || d.m !== now.getMonth() || d.d !== now.getDate()) return null;
  const e = (WS.workout.exercises || []).find(x => (bm.exerciseId && x.exerciseId === bm.exerciseId) || (x.name && x.name === bm.label));
  if (!e || !Array.isArray(e.sets) || !e.sets.length) return null;
  return e.sets.map(s => ({
    kg: Number(s.kg) || 0, reps: Number(s.reps) || 0,
    rir: s.rpe != null ? Math.max(0, 10 - Number(s.rpe)) : (bm.meta?.rirTarget ?? 2),
    romPct: s.romPct ?? 100, setType: s.setType || 'main', done: s.done !== false,
  }));
}

function _openWorkoutCard(bm, track, wkMon) {
  const plan = _cellPlan(bm, track, wkMon);
  const sets = _existingTodaySets(bm) || _prefillCardSets(bm, plan);
  S.card = { bmId: bm.id, track, weekStart: wkMon, plan, sets };
  S.sheet = { kind: 'card', ctx: { bmId: bm.id, track, weekStart: wkMon } };
  _renderWorkoutCard();
}

function _cardSetRow(set, si) {
  const rom = set.romPct == null ? 100 : set.romPct;
  const typeCls = set.setType === 'warmup' ? 'warmup' : set.setType === 'drop' ? 'drop' : 'main';
  return `
    <div class="set-row ex-max-v2-set${set.done ? ' done' : ''}" data-si="${si}">
      <div class="ex-max-v2-main-row">
        <button type="button" class="ex-max-v2-type-btn ${typeCls}" data-action="tm2:card-settype" data-si="${si}" title="세트 타입">${_cardTypeLabel(set.setType)}</button>
        <label class="ex-max-v2-field"><span>KG</span><input class="set-input tm2-cset" data-si="${si}" data-f="kg" type="number" inputmode="decimal" min="0" step="0.5" value="${set.kg || ''}"></label>
        <label class="ex-max-v2-field"><span>REP</span><input class="set-input tm2-cset" data-si="${si}" data-f="reps" type="number" inputmode="numeric" min="0" step="1" value="${set.reps || ''}"></label>
        <label class="ex-max-v2-field"><span>RIR</span><input class="set-input tm2-cset" data-si="${si}" data-f="rir" type="number" inputmode="decimal" min="0" max="9" step="0.5" value="${set.rir ?? ''}"></label>
        <button class="set-done-btn ${set.done ? 'done' : ''}" data-action="tm2:card-done" data-si="${si}" title="완료 체크">✓</button>
        <button class="set-remove-btn" data-action="tm2:card-remove" data-si="${si}" title="세트 삭제">×</button>
      </div>
      <label class="ex-max-v2-rom">
        <span>ROM</span>
        <input class="set-rom-range tm2-cset" data-si="${si}" data-f="romPct" type="range" min="0" max="100" step="5" value="${rom}" style="--rom-pct:${rom}%">
        <input class="set-rom-input tm2-cset" data-si="${si}" data-f="romPct" type="number" min="0" max="100" step="1" value="${rom}">
        <em>%</em>
      </label>
    </div>`;
}

// 진행 그래프 — 실제 운동기록(getCache) 세션별 톱세트 무게 추이 (기존 테스트모드 그래프 계승)
function _buildCardSparkline(bm) {
  let cache = {};
  try { cache = getCache() || {}; } catch { cache = {}; }
  const pts = [];
  for (const dk of Object.keys(cache).sort()) {
    const exs = Array.isArray(cache[dk]?.exercises) ? cache[dk].exercises : [];
    const e = exs.find(x => (bm.exerciseId && x.exerciseId === bm.exerciseId) || (x.name && x.name === bm.label));
    if (!e) continue;
    let top = 0, reps = 0;
    for (const s of (Array.isArray(e.sets) ? e.sets : [])) {
      if (s?.setType === 'warmup' || s?.done === false) continue;
      const kg = Number(s?.kg) || 0;
      if (kg > top) { top = kg; reps = Number(s?.reps) || 0; }
    }
    if (top > 0) pts.push({ dk, kg: top, reps });
  }
  const last = pts.slice(-8);
  if (last.length < 2) {
    return `<div class="tm2-spark-empty">운동 기록이 2회 이상 쌓이면 성장 그래프가 그려져요${last.length ? ` · 현재 ${last[0].kg}kg×${last[0].reps}` : ''}</div>`;
  }
  const kgs = last.map(p => p.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs);
  const W = 260, H = 52, pad = 8, span = (max - min) || 1;
  const xs = (i) => pad + (W - 2 * pad) * (i / (last.length - 1));
  const ys = (kg) => pad + (H - 2 * pad) * (1 - (kg - min) / span);
  const line = last.map((p, i) => `${xs(i).toFixed(1)},${ys(p.kg).toFixed(1)}`).join(' ');
  const area = `${xs(0).toFixed(1)},${H - pad} ${line} ${xs(last.length - 1).toFixed(1)},${H - pad}`;
  const lp = last[last.length - 1];
  const growth = Math.round((lp.kg - last[0].kg) * 10) / 10;
  return `
    <div class="tm2-spark">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="tm2-spark-svg" aria-hidden="true">
        <polygon points="${area}" fill="rgba(33,166,107,0.10)"></polygon>
        <polyline points="${line}" fill="none" stroke="var(--tm2-now)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
        <circle cx="${xs(last.length - 1).toFixed(1)}" cy="${ys(lp.kg).toFixed(1)}" r="3.2" fill="var(--tm2-tomato)"></circle>
      </svg>
      <div class="tm2-spark-meta">
        <span>최근 ${last.length}회</span>
        <b>${lp.kg}kg×${lp.reps}</b>
        <em class="${growth >= 0 ? 'up' : 'down'}">${growth >= 0 ? '+' : ''}${growth}kg</em>
      </div>
    </div>`;
}

function _renderWorkoutCard() {
  const { bmId, track, weekStart, plan, sets } = S.card;
  const bm = benchmarkById(S.board, bmId);
  const isWnd = plan.kind === 'wendler';
  const trackLabel = isWnd ? `웬들러 · ${_esc(WENDLER_SCHEMES[bm.wendler.scheme]?.label || '커스텀')}` : TM2_TRACK_LABELS[track];
  const recents = recentPaintLogs(S.board, bm.id, track, weekStart)
    .map(r => `<b>✓</b> ${shortDate(r.weekStart)} · ${r.kg ? `${r.kg}kg×` : ''}${r.reps ?? ''}`)
    .join(' &nbsp;·&nbsp; ') || '아직 기록이 없어요';
  const wndHint = isWnd ? `
    <div class="tm2-note">메인 ${plan.rx.sets.length}세트(마지막 한계까지) → <b>쉬지 말고 바로 BBB</b>까지가 한 세션이에요. 아래 세트로 그대로 채워뒀어요.</div>` : '';
  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(_kickerOf(bm, weekStart))} · 운동 카드</div>
    <div class="tm2-sh-title">${_esc(bm.label)} <small>${trackLabel}</small></div>
    <div class="tm2-rx"><span>오늘 성공 기준</span><b>${plan.kg || '—'}</b><span>kg ×</span><b style="font-size:24px">${plan.reps || ''}</b><span>회${plan.amrap ? '+' : ''}</span></div>
    ${_metaRowsHtml(bm)}
    ${wndHint}
    <div class="tm2-sec-label">성장 그래프 — 세션별 톱세트</div>
    ${_buildCardSparkline(bm)}
    <div class="tm2-sec-label">최근 기록</div>
    <div class="tm2-hist">${recents}</div>
    <div class="tm2-sec-label">세트 기록 — KG · REP · 남은 횟수(RIR) · 가동범위(ROM)</div>
    <div class="tm2-card-sets" id="tm2-card-sets">${sets.map((s, i) => _cardSetRow(s, i)).join('')}</div>
    <button class="tm2-btn-addset" data-action="tm2:card-addset">＋ 세트 추가</button>
    <button class="tm2-btn-paint" data-action="tm2:card-commit">운동 완료 — 칸 색칠</button>
    <button class="tm2-btn-ghost" data-action="tm2:sheet-close">닫기 (나중에)</button>
  `);
  _bindCardInputs();
}

function _bindCardInputs() {
  const root = document.getElementById('tm2-card-sets');
  if (!root) return;
  root.querySelectorAll('.tm2-cset').forEach(inp => {
    const si = Number(inp.dataset.si), f = inp.dataset.f;
    const handler = (e) => {
      if (!S.card?.sets?.[si]) return;
      const v = e.target.value;
      S.card.sets[si][f] = (f === 'kg' || f === 'rir') ? (v === '' ? (f === 'rir' ? '' : 0) : Number(v)) : Math.round(Number(v) || 0);
      if (f === 'romPct') {
        const row = e.target.closest('.set-row');
        row?.querySelectorAll('.tm2-cset[data-f="romPct"]').forEach(x => { if (x !== e.target) x.value = v; });
        row?.querySelector('.set-rom-range')?.style.setProperty('--rom-pct', `${v}%`);
      }
    };
    inp.addEventListener('change', handler);
    if (inp.classList.contains('set-rom-range')) inp.addEventListener('input', handler);
  });
}

function _syncCardInputs() {
  document.querySelectorAll('#tm2-card-sets .tm2-cset').forEach(inp => {
    const si = Number(inp.dataset.si), f = inp.dataset.f;
    if (!S.card?.sets?.[si]) return;
    const v = inp.value;
    if (f === 'kg') S.card.sets[si].kg = Number(v) || 0;
    else if (f === 'reps') S.card.sets[si].reps = Math.round(Number(v) || 0);
    else if (f === 'rir') S.card.sets[si].rir = v === '' ? '' : Number(v);
    else if (f === 'romPct') S.card.sets[si].romPct = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  });
}

async function _ensureTodayLoaded() {
  const now = new Date();
  const d = WS?.shared?.date;
  if (d && d.y === now.getFullYear() && d.m === now.getMonth() && d.d === now.getDate()) return;
  try { await loadWorkoutDate(now.getFullYear(), now.getMonth(), now.getDate()); }
  catch (e) { console.error('[tm2] loadWorkoutDate failed', e); }
}

// 운동 완료 — 실제 workouts에 저장 + 목표 달성 시 칸 색칠 (계약: 실제 운동기록 통합)
async function _commitWorkoutCard() {
  _syncCardInputs();
  const { bmId, track, weekStart, plan, sets } = S.card;
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;

  // 1) 실제 운동기록(workouts)에 반영
  await _ensureTodayLoaded();
  // 채워진 세트(kg·reps>0)는 수행한 것으로 간주 — ✓ 체크를 강제하지 않음
  const filled = (s) => Number(s.kg) > 0 && Number(s.reps) > 0;
  const entry = {
    muscleId: bm.muscleId || bm.groupId || 'chest',
    exerciseId: bm.exerciseId || null,
    name: bm.label,
    movementId: bm.movementId || null,
    sets: sets.filter(filled).map(s => ({
      kg: Number(s.kg) || 0,
      reps: Math.round(Number(s.reps) || 0),
      rpe: (s.rir === '' || s.rir == null) ? null : Math.max(1, Math.min(10, 10 - Number(s.rir))),
      romPct: s.romPct == null ? 100 : Math.max(0, Math.min(100, Math.round(Number(s.romPct)))),
      setType: s.setType || 'main',
      done: true,
    })),
  };
  if (!entry.sets.length) { _toast('세트의 무게·횟수를 입력해 주세요', 'warning'); return; }
  const list = WS.workout.exercises;
  const idx = list.findIndex(x => (bm.exerciseId && x.exerciseId === bm.exerciseId) || x.name === bm.label);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  try { await saveWorkoutDay({ silent: true }); }
  catch (e) { console.error('[tm2] saveWorkoutDay failed', e); _toast('운동기록 저장 실패 — 네트워크를 확인해 주세요', 'error'); }

  // 2) 목표 달성 판정 → 색칠 or 조정 (채워진 본세트 기준)
  const working = sets.filter(s => s.setType !== 'warmup' && filled(s));
  const best = working.reduce((m, s) => (!m || Number(s.kg) > Number(m.kg) || (Number(s.kg) === Number(m.kg) && Number(s.reps) > Number(m.reps))) ? s : m, null);
  const hit = !!best && Number(best.kg) >= plan.kg && Number(best.reps) >= plan.reps;

  if (hit) {
    paintWeek(S.board, {
      benchmarkId: bmId, track, weekStart,
      log: { at: Date.now(), actualReps: working.map(s => s.reps).join(' · '), rir: best.rir === '' ? null : best.rir, amrapReps: best.reps, note: '' },
    });
    await _persist();
    closeSheet();
    renderBoard();
    _toast('성공! 칸을 색칠했어요 🟩 · 운동기록에 저장됨', 'success');
    _advanceLineup(weekStart);
    return;
  }
  // 미달 — 운동기록은 저장됨. 웬들러는 기록만, stair는 조정 시트.
  if (bm.program === 'wendler') {
    recordMiss(S.board, { benchmarkId: bmId, track, weekStart, choice: 'none', log: { at: Date.now(), actualReps: best ? String(best.reps) : '', amrapReps: best?.reps ?? null } });
    await _persist();
    closeSheet(); renderBoard();
    _toast('운동기록 저장됨 — 목표 미달, 다음 정산에 반영돼요', 'info');
    return;
  }
  _toast('운동기록 저장됨 — 목표 미달, 계획을 조정할 수 있어요', 'info');
  S.sheet = { kind: 'cell', ctx: { bmId, track, weekStart } };
  openMissSheet();
}

// 배열 진행 — 다음 미완료 종목 카드로
function _advanceLineup(weekStart) {
  const wkMon = mondayOf(_todayKey());
  if (mondayOf(weekStart) !== wkMon) return;
  const next = getLineup(S.board, _todayKey()).find(x => {
    const b = benchmarkById(S.board, x.benchmarkId);
    if (!b) return false;
    if (b.program === 'wendler') return !b.wendlerLog?.[wkMon]?.paintedAt;
    return !S.board.steps.some(s => s.benchmarkId === x.benchmarkId && s.track === x.track && s.weekLog?.[wkMon]?.paintedAt);
  });
  if (next) setTimeout(() => openCellSheet(next.benchmarkId, next.track, wkMon), 380);
}

// 미래 칸 — 계획 미리보기 (탭 불가 처방만)
function _openPlanPreview(bm, track, wkMon) {
  const plan = _cellPlan(bm, track, wkMon);
  S.sheet = { kind: 'preview', ctx: {} };
  const seq = plan.kind === 'wendler'
    ? plan.rx.sets.map(s => `${s.kg}×${s.reps}${s.amrap ? '+' : ''}`).join(' → ')
    : `${bm.setsDefault || 4}세트 × ${plan.kg}kg × ${plan.reps}회`;
  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(_kickerOf(bm, wkMon))} · 예정</div>
    <div class="tm2-sh-title">${_esc(bm.label)} <small>${plan.kind === 'wendler' ? '웬들러' : TM2_TRACK_LABELS[track]}</small></div>
    <div class="tm2-rx"><span>계획</span><b>${plan.kg || '—'}</b><span>kg ×</span><b style="font-size:24px">${plan.reps || ''}</b><span>회${plan.amrap ? '+' : ''}</span></div>
    <div class="tm2-note">${_esc(seq)}</div>
    <div class="tm2-note">아직 미래 칸이에요 — 이번 주 칸부터 운동 카드로 기록해요.</div>
    <button class="tm2-btn-ghost" data-action="tm2:sheet-close">닫기</button>
  `);
}

// 과거 칸 — 기록 요약 (읽기 전용)
function _openPastSummary(bm, track, wkMon) {
  S.sheet = { kind: 'past', ctx: {} };
  let painted = false, detail = '';
  if (bm.program === 'wendler') {
    const log = bm.wendlerLog?.[wkMon];
    painted = !!log?.paintedAt;
    detail = log?.amrapReps != null ? `한계 세트 ${log.amrapReps}회` : (log?.missed ? '목표 미달로 기록됨' : '');
  } else {
    const step = (S.board.steps || []).find(s => s.benchmarkId === bm.id && s.track === track && s.weekLog?.[wkMon]);
    const log = step?.weekLog?.[wkMon];
    painted = !!log?.paintedAt;
    detail = log?.actualReps ? `횟수 ${log.actualReps}` : (log?.missed ? '목표 미달로 조정됨' : '');
  }
  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(_kickerOf(bm, wkMon))} · 지난 주</div>
    <div class="tm2-sh-title">${_esc(bm.label)} <small>${bm.program === 'wendler' ? '웬들러' : TM2_TRACK_LABELS[track]}</small></div>
    <div class="tm2-note">${painted ? `<b>✓ 색칠 완료</b>${detail ? ` — ${_esc(detail)}` : ''}` : (detail ? _esc(detail) : '이 주는 기록이 없어요.')}</div>
    <button class="tm2-btn-ghost" data-action="tm2:sheet-close">닫기</button>
  `);
}

// ----------------------------------------------------------------
// 못 채운 날 — 계획 조정 (계약 5)
// ----------------------------------------------------------------

function openMissSheet() {
  const { bmId, track, weekStart } = S.sheet.ctx;
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;
  S.sheet = { kind: 'miss', ctx: { bmId, track, weekStart, actualReps: _txt('tm2-in-reps'), rir: _txt('tm2-in-rir'), note: _txt('tm2-in-note') } };
  S.missChoice = 'extend';
  _renderMissSheet();
}

function _renderMissSheet() {
  const { bmId, track, weekStart } = S.sheet.ctx;
  const bm = benchmarkById(S.board, bmId);
  const wkMon = mondayOf(weekStart);
  const cur = currentKgOf(S.board, bm, track);
  const delta = Math.min(2.5, bm.incrementKg) || 2.5;
  const choice = S.missChoice;
  const pv = previewAdjust(S.board, {
    benchmarkId: bmId, track, weekStart: wkMon, choice,
    params: { deltaKg: delta, reps: Math.max(1, cur.reps - 2) },
  }, _todayKey());
  const rowHtml = (r, missWeek) => {
    const range = r.span > 1 ? `${shortDate(r.weekStart)}~${shortDate(addWeeks(r.weekStart, r.span - 1))}` : shortDate(r.weekStart);
    const isMiss = weeksBetween(r.weekStart, missWeek) >= 0 && weeksBetween(r.weekStart, missWeek) < r.span && r.state === 'miss';
    return `<div class="tm2-pv-row ${isMiss ? 'tm2-pv-m' : 'tm2-pv-k'}">${r.kg}×${r.reps} — ${range}</div>`;
  };
  const opt = (key, title, desc, rec = false) => `
    <button class="tm2-opt ${choice === key ? 'tm2-on' : ''}" data-action="tm2:miss-choice" data-choice="${key}">
      <span class="tm2-radio"></span>
      <div><b>${title}${rec ? '<span class="tm2-rec">추천</span>' : ''}</b>${desc}</div>
    </button>`;
  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(_kickerOf(bm, wkMon))}</div>
    <div class="tm2-sh-title">오늘은 못 채웠어요 <small>${_esc(bm.label)} · ${TM2_TRACK_LABELS[track]}</small></div>
    ${opt('extend', '한 주 더 도전', `이 칸을 다음 주까지 이어가요. 뒤의 칸이 있으면 한 주씩 밀려요.`, true)}
    ${opt('lowerKg', `무게 한 칸 내리기 −${delta}kg`, `${Math.max(0, cur.kg - delta)}kg×${cur.reps}로 내려가서 다시 쌓아요.`)}
    ${opt('lowerReps', `목표 횟수 낮추기 ${cur.reps} → ${Math.max(1, cur.reps - 2)}`, `무게는 그대로, 이번 칸의 기준만 낮춰요.`)}
    <div class="tm2-preview">
      <div class="tm2-pv"><h5>지금 계획</h5>${pv.before.map(r => rowHtml(r, wkMon)).join('') || '<div class="tm2-pv-row tm2-pv-k">—</div>'}</div>
      <div class="tm2-pv-arrow">→</div>
      <div class="tm2-pv"><h5>조정 후</h5>${pv.after.map(r => rowHtml(r, '0000-00-00')).join('') || '<div class="tm2-pv-row tm2-pv-k">—</div>'}</div>
    </div>
    <button class="tm2-btn-primary" data-action="tm2:miss-apply">이렇게 바꿀게요</button>
    <button class="tm2-btn-ghost" data-action="tm2:sheet-close">취소</button>
  `);
}

async function _applyMiss() {
  const { bmId, track, weekStart, actualReps, rir, note } = S.sheet.ctx;
  const bm = benchmarkById(S.board, bmId);
  const cur = currentKgOf(S.board, bm, track);
  const delta = Math.min(2.5, bm.incrementKg) || 2.5;
  recordMiss(S.board, {
    benchmarkId: bmId, track, weekStart: mondayOf(weekStart),
    choice: S.missChoice,
    params: { deltaKg: delta, reps: Math.max(1, cur.reps - 2) },
    log: { at: Date.now(), actualReps, rir: rir === '' ? null : Number(rir), note },
  });
  await _persist();
  closeSheet();
  renderBoard();
  _toast('계획을 조정했어요 — 보드에 반영됐어요', 'success');
}

// ----------------------------------------------------------------
// 정산 시트 (계약 6·7)
// ----------------------------------------------------------------

function openSettleSheet() {
  const rows = buildSettleRows(S.board, S.groupId);
  if (!rows.length) { _toast('정산할 종목이 없어요', 'info'); return; }
  S.settleDecisions = {};
  for (const r of rows) S.settleDecisions[r.key] = r.defaultDecision;
  S.sheet = { kind: 'settle', ctx: {} };
  _renderSettleSheet();
}

function _renderSettleSheet() {
  const cycle = activeCycleOf(S.board, S.groupId);
  const rows = buildSettleRows(S.board, S.groupId);
  const group = (S.board.groups || []).find(g => g.id === S.groupId);
  const settledCnt = settledCyclesOf(S.board, S.groupId).length;
  const rowsHtml = rows.map(r => {
    const d = S.settleDecisions[r.key];
    const sub = r.missedCount > 0
      ? `<small class="tm2-warn">못 채운 주 ${r.missedCount}회 — 유지 권장</small>`
      : `<small>6주 진행 완료 ✓</small>`;
    const kg = d === 'grow'
      ? `${r.currentKg} → ${r.nextKg}<em>+${r.incrementKg}</em>`
      : `${r.currentKg} 유지`;
    return `
    <div class="tm2-settle-row">
      <div class="tm2-nm"><b>${_esc(r.label)} — ${r.trackLabel}${r.isTm ? ' (기준 무게)' : ''}</b>${sub}</div>
      <div class="tm2-kg">${kg}</div>
      <div class="tm2-seg2">
        <button class="${d === 'grow' ? 'tm2-on' : ''}" data-action="tm2:settle-decide" data-key="${_esc(r.key)}" data-decision="grow">성장</button>
        <button class="${d === 'hold' ? 'tm2-on tm2-hold' : ''}" data-action="tm2:settle-decide" data-key="${_esc(r.key)}" data-decision="hold">유지</button>
      </div>
    </div>`;
  }).join('');
  const nextStart = cycle ? addWeeks(cycle.startDate, cycle.weeks) : null;
  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(group?.label || '')} · ${cycle ? `${shortDate(cycle.startDate)} – ${shortDate(addWeeks(cycle.startDate, cycle.weeks - 1))}` : ''} 완료</div>
    <div class="tm2-sh-title">사이클 ${settledCnt + 1} 정산 — 다음 6주를 결정</div>
    ${rowsHtml}
    <div class="tm2-note">올라가는 폭은 종목마다 정한 값 그대로예요. 못 채운 주가 있던 종목은 <b>유지가 기본</b> — 무리한 증량으로 실패를 쌓지 않아요.</div>
    <button class="tm2-btn-primary" data-action="tm2:settle-confirm">확정 — 다음 6주${nextStart ? `(${shortDate(nextStart)}~)` : ''} 칸 채우기</button>
    <button class="tm2-btn-ghost" data-action="tm2:sheet-close">나중에 정산</button>
  `);
}

async function _confirmSettle() {
  const res = applySettle(S.board, S.groupId, S.settleDecisions, _todayKey(), Date.now());
  if (!res) { _toast('정산할 사이클이 없어요', 'error'); return; }
  await _persist();
  closeSheet();
  renderBoard();
  const grown = res.entry.results.filter(r => r.decision === 'grow').length;
  _toast(`정산 완료 — ${grown}개 종목 성장, 다음 6주 칸을 채웠어요`, 'success');
}

// ----------------------------------------------------------------
// 종목 설정 시트 (계약 3·7·8·9)
// ----------------------------------------------------------------

function openColumnSheet(bmId) {
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;
  S.sheet = {
    kind: 'column',
    ctx: {
      bmId,
      tracks: [...bm.tracks],
      program: bm.program,
      scheme: bm.wendler?.scheme || 'w863',
      suppKind: bm.wendler?.supplemental?.kind || 'bbb',
    },
  };
  _renderColumnSheet();
}

function _renderColumnSheet() {
  const ctx = S.sheet.ctx;
  const bm = benchmarkById(S.board, ctx.bmId);
  const group = (S.board.groups || []).find(g => g.id === bm.groupId);
  const wendlerAllowed = ['chest', 'back', 'shoulder', 'lower'].includes(bm.groupId);
  const trackBtn = (t) => `<button class="${ctx.tracks.includes(t) ? 'tm2-on' : ''}" data-action="tm2:col-track" data-track="${t}">${TM2_TRACK_LABELS[t]}</button>`;
  const isWnd = ctx.program === 'wendler';
  const w = isWnd ? normalizeWendlerConfig({ ...(bm.wendler || {}), scheme: ctx.scheme === 'custom' ? (bm.wendler?.scheme || 'custom') : ctx.scheme, supplemental: { ...(bm.wendler?.supplemental || {}), kind: ctx.suppKind } }, { primaryMajor: group?.id === 'lower' ? 'lower' : 'chest' }) : null;
  const overview = isWnd ? wendlerCycleOverview(w) : [];
  const wkRows = isWnd ? `
    <div class="tm2-wmap">
      ${overview.slice(0, 3).map(o => `<b>${o.week}·${o.week + 3}주차</b> <em>${o.pctLabel}%</em> × ${o.repsLabel}`).join('<br>')}
    </div>` : '';
  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(group?.label || '')} · 종목 설정</div>
    <div class="tm2-sh-title">${_esc(bm.label)}</div>
    <div class="tm2-fld"><span class="tm2-lb">트랙 구성<small>트랙마다 보드에 열이 하나씩</small></span><span class="tm2-track-toggle">${trackBtn('volume')}${trackBtn('intensity')}</span></div>
    <div class="tm2-fld"><span class="tm2-lb">세트 수<small>셀에는 무게×횟수만 보여요</small></span><input type="number" id="tm2-col-sets" value="${bm.setsDefault || 4}" min="1" max="10"></div>
    <div class="tm2-fld"><span class="tm2-lb">6주 성공 시 증량<small>정산 때 "성장"이면 이만큼 (${group?.bodyRegion === 'lower' ? '하체' : '상체'} 기본 +${defaultIncrementForGroup(bm.groupId)}kg)</small></span><input type="number" id="tm2-col-inc" value="${isWnd ? (bm.wendler?.incrementKg ?? defaultIncrementForGroup(bm.groupId)) : bm.incrementKg}" step="0.5" min="0.5"></div>
    ${wendlerAllowed ? `
    <div class="tm2-fld"><span class="tm2-lb">운동 방식</span>
      <span class="tm2-seg2">
        <button class="${!isWnd ? 'tm2-on' : ''}" data-action="tm2:col-program" data-program="stair">기본 계단</button>
        <button class="${isWnd ? 'tm2-on' : ''}" style="${isWnd ? 'color:#7a3ea8' : ''}" data-action="tm2:col-program" data-program="wendler">웬들러</button>
      </span>
    </div>` : ''}
    ${isWnd ? `
    <div class="tm2-wbox">
      <div class="tm2-fld" style="border:0;padding:2px 0"><span class="tm2-lb">기준 무게 (TM)</span><input type="number" id="tm2-col-tm" value="${bm.wendler?.tmKg || ''}" step="2.5" min="0" placeholder="kg"></div>
      <div class="tm2-fld" style="border:0;padding:2px 0"><span class="tm2-lb">라운딩<small>%환산 후 반올림 단위</small></span><input type="number" id="tm2-col-round" value="${bm.wendler?.roundKg ?? 2.5}" step="0.5" min="0.5"></div>
      <div class="tm2-wk-tabs">
        ${['w531', 'w863'].map(s => `<button class="${ctx.scheme === s ? 'tm2-on' : ''}" data-action="tm2:col-scheme" data-scheme="${s}">${WENDLER_SCHEMES[s].label}</button>`).join('')}
        <button class="${ctx.scheme === 'custom' ? 'tm2-on' : ''}" data-action="tm2:col-scheme" data-scheme="custom">커스텀</button>
      </div>
      ${ctx.scheme === 'custom'
        ? `<div class="tm2-wmap">커스텀: 주차표 % 직접 입력 (콤마 구분)</div>
           ${[0, 1, 2].map(i => `<div class="tm2-fld" style="border:0;padding:3px 0"><span class="tm2-lb">${i + 1}·${i + 4}주차 %</span><input type="text" id="tm2-col-wk${i}" value="${(bm.wendler?.weekMap?.[i]?.sets || []).map(s => s.pct).join(',') || ''}" placeholder="60,65,70"></div>
           <div class="tm2-fld" style="border:0;padding:3px 0"><span class="tm2-lb">${i + 1}·${i + 4}주차 횟수</span><input type="text" id="tm2-col-wr${i}" value="${(bm.wendler?.weekMap?.[i]?.sets || []).map(s => s.reps).join(',') || ''}" placeholder="8,8,8"></div>`).join('')}`
        : wkRows}
      <div class="tm2-fld" style="border:0;padding:6px 0 0"><span class="tm2-lb">보조<small>메인 직후 같은 세션에서</small></span>
        <span class="tm2-seg2">
          ${['bbb', 'fsl', 'none'].map(k => `<button class="${ctx.suppKind === k ? 'tm2-on' : ''}" data-action="tm2:col-supp" data-supp="${k}">${k === 'bbb' ? 'BBB' : k === 'fsl' ? 'FSL' : '없음'}</button>`).join('')}
        </span>
      </div>
      ${ctx.suppKind !== 'none' ? `
      <div class="tm2-fld" style="border:0;padding:3px 0"><span class="tm2-lb">보조 %TM · 세트 · 횟수</span>
        <span style="display:flex;gap:5px">
          <input type="number" id="tm2-col-supp-pct" value="${bm.wendler?.supplemental?.pct ?? 50}" style="max-width:58px" min="10">
          <input type="number" id="tm2-col-supp-sets" value="${bm.wendler?.supplemental?.sets ?? 5}" style="max-width:48px" min="1">
          <input type="number" id="tm2-col-supp-reps" value="${bm.wendler?.supplemental?.reps ?? 10}" style="max-width:48px" min="1">
        </span>
      </div>` : ''}
    </div>` : ''}
    <div class="tm2-fld"><span class="tm2-lb">여유 횟수 (RIR)<small>세트 끝에 남길 횟수</small></span><input type="number" id="tm2-col-rir" value="${bm.meta?.rirTarget ?? 2}" min="0" max="5"></div>
    <div class="tm2-fld"><span class="tm2-lb">자세 메모</span><input type="text" id="tm2-col-form" value="${_esc(bm.meta?.formNote || '')}" placeholder="예: 바닥 터치 · 반동 금지"></div>
    <div class="tm2-fld"><span class="tm2-lb">헬스장별 기구</span><input type="text" id="tm2-col-gym" value="${_esc(bm.meta?.gymNote || '')}" placeholder="예: A점 바벨 · B점 스미스 −2.5kg"></div>
    <button class="tm2-btn-primary" data-action="tm2:col-save">저장</button>
    <button class="tm2-btn-ghost" data-action="tm2:sheet-close">취소</button>
  `);
}

async function _saveColumnSheet() {
  const ctx = S.sheet.ctx;
  const bm = benchmarkById(S.board, ctx.bmId);
  if (!bm) return;
  if (!ctx.tracks.length) { _toast('트랙은 최소 1개 필요해요 (볼륨 또는 강도)', 'warning'); return; }

  const prevTracks = [...bm.tracks];
  bm.tracks = ['volume', 'intensity'].filter(t => ctx.tracks.includes(t));
  bm.setsDefault = Math.max(1, Math.round(_num('tm2-col-sets', bm.setsDefault || 4)));
  const inc = _num('tm2-col-inc', bm.incrementKg);
  bm.incrementKg = inc;
  bm.meta = bm.meta || {};
  const rirEl = document.getElementById('tm2-col-rir');
  bm.meta.rirTarget = rirEl && rirEl.value !== '' ? Math.max(0, Math.round(Number(rirEl.value))) : null;
  bm.meta.formNote = _txt('tm2-col-form');
  bm.meta.gymNote = _txt('tm2-col-gym');

  const wasWendler = bm.program === 'wendler';
  bm.program = ctx.program;
  if (bm.program === 'wendler') {
    const major = bm.groupId === 'lower' ? 'lower' : 'chest';
    let weekMap = bm.wendler?.weekMap || null;
    let scheme = ctx.scheme;
    if (ctx.scheme === 'custom') {
      const parsed = [];
      for (let i = 0; i < 3; i++) {
        const pcts = _txt(`tm2-col-wk${i}`).split(',').map(Number).filter(n => n > 0);
        const reps = _txt(`tm2-col-wr${i}`).split(',').map(Number).filter(n => n > 0);
        if (pcts.length) {
          parsed.push({ sets: pcts.map((p, j) => ({ pct: p, reps: reps[j] || reps[reps.length - 1] || 5, ...(j === pcts.length - 1 ? { amrap: true } : {}) })) });
        }
      }
      if (parsed.length === 3) weekMap = [...parsed, ...parsed.map(w => ({ sets: w.sets.map(s => ({ ...s })) }))];
    } else {
      weekMap = null; // 프리셋으로 리셋
    }
    bm.wendler = normalizeWendlerConfig({
      ...(bm.wendler || {}),
      scheme,
      weekMap,
      tmKg: _num('tm2-col-tm', bm.wendler?.tmKg || 0) || undefined,
      roundKg: _num('tm2-col-round', bm.wendler?.roundKg || 2.5),
      incrementKg: inc,
      supplemental: {
        kind: ctx.suppKind,
        pct: _num('tm2-col-supp-pct', bm.wendler?.supplemental?.pct ?? 50),
        sets: _num('tm2-col-supp-sets', bm.wendler?.supplemental?.sets ?? 5),
        reps: _num('tm2-col-supp-reps', bm.wendler?.supplemental?.reps ?? 10),
      },
    }, { primaryMajor: major, trackSpec: bm.seed?.volume ? { startKg: bm.seed.volume.kg, startReps: bm.seed.volume.reps } : null });
    bm.wendlerLog = bm.wendlerLog || {};
    // 웬들러 전환 시 이 사이클의 stair 스텝 제거 (파생 처방으로 대체)
    const cycle = activeCycleOf(S.board, bm.groupId);
    if (cycle) S.board.steps = S.board.steps.filter(s => !(s.benchmarkId === bm.id && s.cycleId === cycle.id));
  } else if (wasWendler) {
    // 기본 계단으로 복귀 — 활성 사이클에 스텝 재생성
    const cycle = activeCycleOf(S.board, bm.groupId);
    if (cycle) {
      for (const t of bm.tracks) {
        const exists = S.board.steps.some(s => s.benchmarkId === bm.id && s.track === t && s.cycleId === cycle.id);
        if (!exists) {
          const seed = currentKgOf(S.board, bm, t);
          S.board.steps.push({
            id: `st_${Date.now().toString(36)}_${t}`, benchmarkId: bm.id, track: t, cycleId: cycle.id,
            weekStart: cycle.startDate, span: cycle.weeks, kg: seed.kg, reps: seed.reps, state: 'planned', weekLog: {},
          });
        }
      }
    }
  }
  // 트랙 추가 시 활성 사이클에 스텝 생성
  if (bm.program !== 'wendler') {
    const cycle = activeCycleOf(S.board, bm.groupId);
    if (cycle) {
      for (const t of bm.tracks) {
        if (prevTracks.includes(t)) continue;
        bm.seed[t] = bm.seed[t] || { kg: 0, reps: t === 'intensity' ? 8 : 12 };
        const exists = S.board.steps.some(s => s.benchmarkId === bm.id && s.track === t && s.cycleId === cycle.id);
        if (!exists) {
          S.board.steps.push({
            id: `st_${Date.now().toString(36)}_${t}2`, benchmarkId: bm.id, track: t, cycleId: cycle.id,
            weekStart: mondayOf(_todayKey()), span: Math.max(1, cycle.weeks - weeksBetween(cycle.startDate, mondayOf(_todayKey()))),
            kg: bm.seed[t].kg, reps: bm.seed[t].reps, state: 'planned', weekLog: {},
          });
        }
      }
    }
  }

  await _persist();
  closeSheet();
  renderBoard();
  _toast('종목 설정을 저장했어요', 'success');
}

// ----------------------------------------------------------------
// 종목 관리 시트 (계약 12)
// ----------------------------------------------------------------

function openManageSheet() {
  S.sheet = { kind: 'manage', ctx: { adding: null } };
  _renderManageSheet();
}

function _renderManageSheet() {
  const group = (S.board.groups || []).find(g => g.id === S.groupId);
  const actives = activeBenchmarks(S.board, S.groupId);
  const activeRows = actives.map(bm => `
    <div class="tm2-mg-row">
      <b>${_esc(bm.label)}</b>
      ${bm.program === 'wendler'
        ? `<span class="tm2-tk tm2-tk-w">웬들러</span>`
        : bm.tracks.map(t => `<span class="tm2-tk ${t === 'intensity' ? 'tm2-tk-h' : ''}">${TM2_TRACK_LABELS[t]}</span>`).join('')}
      <button class="tm2-mg-out" data-action="tm2:manage-archive" data-bm="${bm.id}">메뉴에서 빼기</button>
    </div>`).join('') || '<div class="tm2-mg-row"><small>아직 종목이 없어요</small></div>';

  const candKey = (x) => x.exerciseId || x.movementId || '';
  const activeKeys = new Set(actives.map(candKey));
  const candidates = _candidates(S.groupId).filter(c => !activeKeys.has(candKey(c)));
  const archivedKeys = new Set((S.board.benchmarks || []).filter(b => b.status === 'archived').map(candKey));
  const adding = S.sheet.ctx.adding;
  const libRows = candidates.slice(0, 16).map(c => {
    const key = candKey(c);
    const wasHere = archivedKeys.has(key);
    const known = c.tracks.volume && !c.tracks.volume.manual ? `${c.tracks.volume.kg}kg×${c.tracks.volume.reps}` : null;
    const gym = c.gymNote ? ` · ${_esc(c.gymNote)}` : '';
    if (adding === key) {
      return `
      <div class="tm2-mg-row">
        <b>${_esc(c.label)}</b>
        <span class="tm2-ob-weight"><input id="tm2-add-kg" inputmode="decimal" value="${known ? c.tracks.volume.kg : ''}" placeholder="kg"><i>kg ×</i><input id="tm2-add-reps" inputmode="numeric" value="${c.tracks.volume?.reps || 12}" style="width:44px"><i>회</i></span>
        <button class="tm2-mg-in" data-action="tm2:manage-add-confirm" data-cand="${_esc(key)}">확인</button>
      </div>`;
    }
    return `
    <div class="tm2-mg-row">
      <b>${_esc(c.label)}</b>
      <small>${wasHere ? '기록 있음 — 이어서 시작' : known ? `최근 ${known}${gym}` : `기록 없음${gym}`}</small>
      <button class="tm2-mg-in" data-action="tm2:manage-add" data-cand="${_esc(key)}">＋ 추가</button>
    </div>`;
  }).join('') || '<div class="tm2-mg-row"><small>추가할 수 있는 종목이 없어요</small></div>';

  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(group?.label || '')} 그룹</div>
    <div class="tm2-sh-title">종목 관리</div>
    <div class="tm2-sec-label">지금 메뉴에 있는 종목</div>
    <div class="tm2-std" style="padding:2px 13px">${activeRows}</div>
    <div class="tm2-note">메뉴에서 빼도 <b>색칠 기록은 그대로 남아요.</b> 다시 추가하면 마지막 무게에서 이어서 시작해요.</div>
    <div class="tm2-sec-label">종목 추가 — 운동 라이브러리</div>
    <div class="tm2-std" style="padding:2px 13px">${libRows}</div>
    <button class="tm2-btn-primary" data-action="tm2:sheet-close">완료</button>
  `);
}

async function _confirmAdd(candKeyVal) {
  const c = _candidates(S.groupId).find(x => (x.exerciseId || x.movementId) === candKeyVal);
  if (!c) return;
  const kg = _num('tm2-add-kg', 0);
  const reps = Math.max(1, Math.round(_num('tm2-add-reps', 12)));
  const archived = (S.board.benchmarks || []).find(b => b.status === 'archived' && (b.exerciseId || b.movementId) === candKeyVal && b.groupId === S.groupId);
  if (!archived && kg <= 0) { _toast('시작 무게를 입력해 주세요', 'warning'); return; }
  addBenchmark(S.board, {
    ...c,
    tracks: { volume: { kg, reps }, intensity: null },
  }, _todayKey());
  await _persist();
  S.sheet.ctx.adding = null;
  _renderManageSheet();
  renderBoard();
  _toast(`${c.label} 추가 — 다음 주부터 칸이 계획돼요`, 'success');
}

// ----------------------------------------------------------------
// 오늘의 배열 (계약 13)
// ----------------------------------------------------------------

async function _onCellTap(d) {
  const { bm: bmId, track, week, current } = d;
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;
  const todayKey = _todayKey();
  const wkMon = mondayOf(week);
  const isFutureWeek = weeksBetween(mondayOf(todayKey), wkMon) > 0;

  if (current === '1') {
    const lineup = getLineup(S.board, todayKey);
    const inLineup = lineup.some(x => x.benchmarkId === bmId && x.track === track);
    const painted = bm.program === 'wendler'
      ? !!bm.wendlerLog?.[wkMon]?.paintedAt
      : !!S.board.steps.find(s => s.benchmarkId === bmId && s.track === track && s.weekLog?.[wkMon]?.paintedAt);
    if (!inLineup && !painted) {
      const cur = toggleLineup(S.board, todayKey, bmId, track);
      await _persist();
      renderBoard();
      _toast(`오늘의 배열에 담았어요 ${'①②③④⑤⑥⑦⑧⑨⑩'[cur.length - 1] || cur.length} — 한 번 더 누르면 열려요`, 'success');
      return;
    }
    openCellSheet(bmId, track, wkMon);
    return;
  }
  if (isFutureWeek) {
    _toast('아직 미래 칸이에요 — 이번 주 칸부터 채워요', 'info');
    return;
  }
  openCellSheet(bmId, track, wkMon);
}

function _startSession() {
  const todayKey = _todayKey();
  const lineup = getLineup(S.board, todayKey);
  if (!lineup.length) { _toast('오늘 행에서 칸을 눌러 먼저 담아 주세요', 'info'); return; }
  const wkMon = mondayOf(todayKey);
  const next = lineup.find(x => {
    const bm = benchmarkById(S.board, x.benchmarkId);
    if (!bm) return false;
    if (bm.program === 'wendler') return !bm.wendlerLog?.[wkMon]?.paintedAt;
    return !S.board.steps.some(s => s.benchmarkId === x.benchmarkId && s.track === x.track && s.weekLog?.[wkMon]?.paintedAt);
  });
  if (!next) { _toast('오늘의 배열을 전부 색칠했어요 — 수고했어요!', 'success'); return; }
  openCellSheet(next.benchmarkId, next.track, wkMon);
}

async function _paintCurrent() {
  const { bmId, track, weekStart } = S.sheet.ctx;
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;
  const log = {
    at: Date.now(),
    actualReps: _txt('tm2-in-reps') || null,
    rir: _txt('tm2-in-rir') === '' ? null : Number(_txt('tm2-in-rir')),
    note: _txt('tm2-in-note'),
    amrapReps: _txt('tm2-in-amrap') === '' ? null : Number(_txt('tm2-in-amrap')),
  };
  const ok = paintWeek(S.board, { benchmarkId: bmId, track, weekStart, log });
  if (!ok) { _toast('색칠할 칸을 찾지 못했어요', 'error'); return; }
  await _persist();
  closeSheet();
  renderBoard();
  _toast('성공! 칸을 색칠했어요 🟩', 'success');
  // 배열 진행 — 다음 미색칠 종목으로
  const wkMon = mondayOf(_todayKey());
  if (mondayOf(weekStart) === wkMon) {
    const lineup = getLineup(S.board, _todayKey());
    const next = lineup.find(x => {
      const b = benchmarkById(S.board, x.benchmarkId);
      if (!b) return false;
      if (b.program === 'wendler') return !b.wendlerLog?.[wkMon]?.paintedAt;
      return !S.board.steps.some(s => s.benchmarkId === x.benchmarkId && s.track === x.track && s.weekLog?.[wkMon]?.paintedAt);
    });
    if (next) setTimeout(() => openCellSheet(next.benchmarkId, next.track, wkMon), 350);
  }
}

// ----------------------------------------------------------------
// 액션 라우팅 (data-action 위임 — 인라인 onclick 금지)
// ----------------------------------------------------------------

async function _onAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (!action.startsWith('tm2:')) return;
  e.preventDefault();
  const d = btn.dataset;
  switch (action) {
    case 'tm2:close': tm2CloseBoard(); break;
    case 'tm2:group': S.groupId = d.group; renderBoard(); break;
    case 'tm2:minimap': S.view = 'minimap'; renderBoard(); break;
    case 'tm2:back': S.view = 'board'; renderBoard(); break;
    case 'tm2:today': _scrollToToday(); break;
    case 'tm2:cell': await _onCellTap(d); break;
    case 'tm2:column': openColumnSheet(d.bm); break;
    case 'tm2:manage': openManageSheet(); break;
    case 'tm2:settle': openSettleSheet(); break;
    case 'tm2:start': _startSession(); break;
    case 'tm2:sheet-close': closeSheet(); break;
    case 'tm2:card-settype': {
      const si = Number(d.si);
      _syncCardInputs();
      if (S.card?.sets?.[si]) {
        const cur = S.card.sets[si].setType || 'main';
        S.card.sets[si].setType = _CARD_TYPES[(_CARD_TYPES.indexOf(cur) + 1) % _CARD_TYPES.length];
        _renderWorkoutCard();
      }
      break;
    }
    case 'tm2:card-done': {
      const si = Number(d.si);
      _syncCardInputs();
      if (S.card?.sets?.[si]) { S.card.sets[si].done = !(S.card.sets[si].done !== false); _renderWorkoutCard(); }
      break;
    }
    case 'tm2:card-remove': {
      const si = Number(d.si);
      _syncCardInputs();
      if (S.card?.sets) { S.card.sets.splice(si, 1); if (!S.card.sets.length) S.card.sets.push({ kg: S.card.plan.kg, reps: S.card.plan.reps, rir: 2, romPct: 100, setType: 'main', done: false }); _renderWorkoutCard(); }
      break;
    }
    case 'tm2:card-addset': {
      _syncCardInputs();
      if (S.card?.sets) {
        const last = S.card.sets[S.card.sets.length - 1] || { kg: S.card.plan.kg, reps: S.card.plan.reps, rir: 2, romPct: 100 };
        S.card.sets.push({ kg: last.kg, reps: last.reps, rir: last.rir, romPct: last.romPct ?? 100, setType: 'main', done: false });
        _renderWorkoutCard();
      }
      break;
    }
    case 'tm2:card-commit': await _commitWorkoutCard(); break;
    case 'tm2:paint': await _paintCurrent(); break;
    case 'tm2:miss-open': openMissSheet(); break;
    case 'tm2:miss-choice': S.missChoice = d.choice; _renderMissSheet(); break;
    case 'tm2:miss-apply': await _applyMiss(); break;
    case 'tm2:miss-record': {
      const { bmId, track, weekStart } = S.sheet.ctx;
      recordMiss(S.board, { benchmarkId: bmId, track, weekStart, choice: 'none', log: { at: Date.now(), actualReps: _txt('tm2-in-amrap'), note: _txt('tm2-in-note') } });
      await _persist(); closeSheet(); renderBoard();
      _toast('기록했어요 — 정산 때 참고돼요', 'info');
      break;
    }
    case 'tm2:lineup-remove': {
      const { bmId, track } = S.sheet.ctx;
      toggleLineup(S.board, _todayKey(), bmId, track);
      await _persist(); closeSheet(); renderBoard();
      _toast('오늘의 배열에서 뺐어요', 'info');
      break;
    }
    case 'tm2:settle-decide': S.settleDecisions[d.key] = d.decision; _renderSettleSheet(); break;
    case 'tm2:settle-confirm': await _confirmSettle(); break;
    case 'tm2:col-track': {
      const t = d.track;
      const arr = S.sheet.ctx.tracks;
      if (arr.includes(t)) S.sheet.ctx.tracks = arr.filter(x => x !== t);
      else arr.push(t);
      _renderColumnSheet();
      break;
    }
    case 'tm2:col-program': S.sheet.ctx.program = d.program; _renderColumnSheet(); break;
    case 'tm2:col-scheme': S.sheet.ctx.scheme = d.scheme; _renderColumnSheet(); break;
    case 'tm2:col-supp': S.sheet.ctx.suppKind = d.supp; _renderColumnSheet(); break;
    case 'tm2:col-save': await _saveColumnSheet(); break;
    case 'tm2:manage-archive': {
      archiveBenchmark(S.board, d.bm);
      await _persist(); _renderManageSheet(); renderBoard();
      _toast('메뉴에서 뺐어요 — 기록은 보존돼요', 'info');
      break;
    }
    case 'tm2:manage-add': S.sheet.ctx.adding = d.cand; _renderManageSheet(); break;
    case 'tm2:manage-add-confirm': await _confirmAdd(d.cand); break;
    default: break;
  }
}
