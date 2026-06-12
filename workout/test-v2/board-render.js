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

import { getTestBoardV2, saveTestBoardV2, getMaxCycle } from '../../data.js';
import { MOVEMENTS } from '../../config.js';
import {
  TM2_TRACK_LABELS,
  mondayOf, addWeeks, weeksBetween, weekIndexOf, isCycleFinished, shortDate, toKey,
  activeBenchmarks, activeCycleOf, settledCyclesOf, benchmarkById, currentKgOf,
  expandColumnCells, paintWeek, recordMiss, previewAdjust,
  getLineup, toggleLineup,
  isSettleDue, buildSettleRows, applySettle,
  archiveBenchmark, addBenchmark, buildOnboardingCandidates,
  buildMinimapData, recentPaintLogs, defaultIncrementForGroup,
} from './board-core.js';
import {
  WENDLER_SCHEMES, WENDLER_SCHEME_IDS, normalizeWendlerConfig,
  wendlerWeekPrescription, wendlerCycleOverview, isWendlerAllowedMajor,
} from './wendler.js';

const S = {
  board: null,
  groupId: 'chest',
  view: 'board',        // 'board' | 'minimap'
  sheet: null,          // { kind, ctx }
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

function _cellHtml(cell, col, todayMon) {
  if (cell.kind === 'rest') {
    return `<div class="tm2-cell tm2-rest" style="--tm2-s:${cell.span}"><i>쉼</i></div>`;
  }
  const lineup = getLineup(S.board, _todayKey());
  const pickIdx = lineup.findIndex(x => x.benchmarkId === col.bm.id && x.track === col.track);
  const pick = (cell.isCurrent && pickIdx >= 0) ? `<span class="tm2-pick">${pickIdx + 1}</span>` : '';
  const args = `data-action="tm2:cell" data-bm="${col.bm.id}" data-track="${col.track}" data-week="${cell.weekStart}" data-state="${cell.state}" data-current="${cell.isCurrent ? 1 : 0}"`;
  if (cell.kind === 'wendler') {
    return `<button class="tm2-cell tm2-${cell.state}" style="--tm2-s:1" ${args}>
      ${pick}<b>${cell.kg}</b><i>${_esc(cell.repsLabel)}</i><u>${_esc(cell.subLabel)}</u>
    </button>`;
  }
  const dots = cell.span > 1 || cell.isCurrent
    ? `<span class="tm2-dots">${cell.dots.map(d => `<s class="${d.on ? 'tm2-dot-on' : ''}"></s>`).join('')}</span>`
    : '';
  const kgLabel = cell.kg > 0 ? cell.kg : '<span style="opacity:.5">—</span>';
  return `<button class="tm2-cell tm2-${cell.state}" style="--tm2-s:${cell.span}" ${args}>
    ${pick}<b>${kgLabel}</b><i>${cell.reps}</i>${cell.state === 'miss' ? '<u>못 채움 → 조정</u>' : dots}
  </button>`;
}

function _cycleBlockHtml(cycle, cols, todayKey, label) {
  const todayMon = mondayOf(todayKey);
  const wkIdx = weekIndexOf(cycle, todayKey);
  const due = isCycleFinished(cycle, todayKey);
  const railHtml = Array.from({ length: cycle.weeks }, (_, i) => {
    const wk = addWeeks(cycle.startDate, i);
    return `<span class="${wk === todayMon ? 'tm2-today' : ''}">${shortDate(wk)}</span>`;
  }).join('');
  const colsHtml = cols.map(col => {
    const cells = expandColumnCells(S.board, col.bm.id, col.track, cycle.id, todayKey);
    return `<div class="tm2-bcol">${cells.map(c => _cellHtml(c, col, todayMon)).join('')}</div>`;
  }).join('');
  let headRight;
  if (cycle.status === 'settled') headRight = '<i class="tm2-ok">정산 완료</i>';
  else if (due) headRight = '<i class="tm2-dday">정산할 시간!</i>';
  else headRight = `<i class="tm2-dday">${Math.min(wkIdx, cycle.weeks)}주차 · 정산 D-${Math.max(0, weeksBetween(todayMon, addWeeks(cycle.startDate, cycle.weeks)) * 7 - 7 + (7 - (parseInt(todayKey.slice(8), 10) ? 0 : 0)))}</i>`;
  // D-day: 사이클 종료(마지막 주 일요일)까지 남은 일수
  const endDay = addWeeks(cycle.startDate, cycle.weeks);
  const msLeft = (new Date(endDay) - new Date(todayKey)) / 86400000;
  if (cycle.status !== 'settled' && !due) headRight = `<i class="tm2-dday">${Math.min(wkIdx, cycle.weeks)}주차 · 정산 D-${Math.max(0, Math.round(msLeft))}</i>`;
  return `
  <div class="tm2-cyc">
    <div class="tm2-cyc-head"><b>${_esc(label)}</b><span>${shortDate(cycle.startDate)} – ${shortDate(addWeeks(cycle.startDate, cycle.weeks - 1))}</span>${headRight}</div>
    <div class="tm2-bgrid" style="--tm2-n:${cols.length}">
      <div class="tm2-rail">${railHtml}</div>
      ${colsHtml}
    </div>
  </div>`;
}

function _settleStripHtml(groupId) {
  const entries = (S.board.history || []).filter(h => h.groupId === groupId);
  const last = entries[entries.length - 1];
  if (!last) return '';
  const parts = last.results.slice(0, 4).map(r => {
    const bm = benchmarkById(S.board, r.benchmarkId);
    const name = bm?.short || bm?.label || '';
    return r.decision === 'grow' ? `${_esc(name)} +${Math.round((r.after - r.before) * 10) / 10}` : `${_esc(name)} 유지`;
  });
  return `<div class="tm2-settle-strip"><em>✓</em>${shortDate(last.period.end)} 정산 — ${parts.join(' · ')}</div>`;
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

  let bodyHtml = '';
  if (!cols.length) {
    bodyHtml = `<div class="tm2-empty-note">이 부위에는 아직 종목이 없어요.<br>✚ 버튼으로 운동 메뉴에 종목을 추가해 주세요.</div>`;
  } else {
    const colHead = `
      <div class="tm2-colhead" style="--tm2-n:${cols.length}">
        <div class="tm2-ch-rail">주</div>
        ${(() => {
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
        })()}
        <div></div>
        ${cols.map(c => c.wendler
          ? `<div class="tm2-ch-trk tm2-wnd">${_esc(WENDLER_SCHEMES[c.bm.wendler.scheme]?.label || '커스텀')}</div>`
          : `<div class="tm2-ch-trk">${TM2_TRACK_LABELS[c.track]}</div>`).join('')}
      </div>`;

    const settled = settledCyclesOf(S.board, S.groupId);
    const prev = settled[settled.length - 1];
    const prevHtml = prev ? _cycleBlockHtml(prev, cols, todayKey, `C${settled.length}`) : '';
    const strip = prev ? _settleStripHtml(S.groupId) : '';
    const curHtml = cycle ? _cycleBlockHtml(cycle, cols, todayKey, `C${settled.length + 1}`) : '';
    const settleCta = cycle && isSettleDue(S.board, S.groupId, todayKey)
      ? `<button class="tm2-settle-cta" data-action="tm2:settle">6주 정산하기 — 성장/유지 결정</button>` : '';
    bodyHtml = colHead + prevHtml + strip + curHtml + settleCta;
  }

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

function openCellSheet(bmId, track, weekStart) {
  const bm = benchmarkById(S.board, bmId);
  if (!bm) return;
  S.sheet = { kind: 'cell', ctx: { bmId, track, weekStart } };
  if (bm.program === 'wendler') { _renderWendlerCellSheet(bm, weekStart); return; }

  const cycle = activeCycleOf(S.board, bm.groupId);
  const cells = cycle ? expandColumnCells(S.board, bm.id, track, cycle.id, _todayKey()) : [];
  const cell = cells.find(c => c.kind === 'stair' && weeksBetween(c.weekStart, weekStart) >= 0 && weeksBetween(c.weekStart, weekStart) < c.span);
  if (!cell) { _toast('이 주에는 계획된 칸이 없어요', 'info'); return; }
  const wkMon = mondayOf(weekStart);
  const log = (S.board.steps.find(s => s.id === cell.stepId)?.weekLog || {})[wkMon] || null;
  const painted = !!log?.paintedAt;
  const isFuture = weeksBetween(mondayOf(_todayKey()), wkMon) > 0;
  const recents = recentPaintLogs(S.board, bm.id, track, wkMon)
    .map(r => `<b>✓</b> ${shortDate(r.weekStart)} · ${r.kg}kg×${r.reps} 성공${r.rir != null ? ` (여유 ${r.rir})` : ''}`)
    .join(' &nbsp;·&nbsp; ') || '아직 색칠한 기록이 없어요';
  const inLineup = getLineup(S.board, _todayKey()).some(x => x.benchmarkId === bm.id && x.track === track);
  const sets = bm.setsDefault || 4;

  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(_kickerOf(bm, wkMon))}</div>
    <div class="tm2-sh-title">${_esc(bm.label)} <small>${TM2_TRACK_LABELS[track]}</small></div>
    <div class="tm2-rx"><span>${sets}세트 ×</span><b>${cell.kg || '—'}</b><span>kg ×</span><b style="font-size:24px">${cell.reps}</b><span>회</span></div>
    ${_metaRowsHtml(bm)}
    <div class="tm2-sec-label">최근 기록</div>
    <div class="tm2-hist">${recents}</div>
    ${painted ? `
      <div class="tm2-note"><b>색칠 완료</b> — ${log.actualReps ? `횟수 ${_esc(log.actualReps)}` : '기록됨'}${log.rir != null ? ` · 여유 ${log.rir}회` : ''}${log.note ? ` · ${_esc(log.note)}` : ''}</div>
      <button class="tm2-btn-ghost" data-action="tm2:sheet-close">닫기</button>
    ` : `
      <div class="tm2-sec-label">오늘 한 만큼</div>
      <div class="tm2-inps">
        <div class="tm2-inp">횟수<input id="tm2-in-reps" inputmode="numeric" placeholder="12 · 12 · 12 · 11"></div>
        <div class="tm2-inp">여유<input id="tm2-in-rir" inputmode="numeric" placeholder="${bm.meta?.rirTarget ?? 2}"></div>
        <div class="tm2-inp">메모<input id="tm2-in-note" placeholder="선택"></div>
      </div>
      <button class="tm2-btn-paint" data-action="tm2:paint" ${isFuture ? 'disabled' : ''}>${isFuture ? '아직 미래 칸이에요' : '성공 — 칸 색칠하기'}</button>
      ${isFuture ? '' : `<button class="tm2-btn-ghost" data-action="tm2:miss-open">목표를 못 채웠어요 ›</button>`}
      ${inLineup ? `<button class="tm2-btn-ghost" data-action="tm2:lineup-remove">오늘의 배열에서 빼기</button>` : ''}
    `}
  `);
}

function _renderWendlerCellSheet(bm, weekStart) {
  const cycle = activeCycleOf(S.board, bm.groupId);
  const wk = cycle ? Math.max(1, Math.min(cycle.weeks, weekIndexOf(cycle, weekStart))) : 1;
  const rx = wendlerWeekPrescription(bm.wendler, wk);
  const wkMon = mondayOf(weekStart);
  const log = bm.wendlerLog?.[wkMon] || null;
  const painted = !!log?.paintedAt;
  const isFuture = weeksBetween(mondayOf(_todayKey()), wkMon) > 0;
  const top = rx.topSet;
  const mainSeq = rx.sets.map(s => `${s.kg}×${s.reps}${s.amrap ? '+' : ''}`).join(' → ');
  const supp = rx.supplemental;
  const lineup = getLineup(S.board, _todayKey());
  const inLineup = lineup.some(x => x.benchmarkId === bm.id);

  _openSheet(`
    <div class="tm2-grab"></div>
    <div class="tm2-sh-kicker">${_esc(_kickerOf(bm, wkMon))}</div>
    <div class="tm2-sh-title">${_esc(bm.label)} <small>웬들러 · ${_esc(WENDLER_SCHEMES[bm.wendler.scheme]?.label || '커스텀')}</small></div>
    <div class="tm2-rx"><span>톱세트</span><b>${top?.kg ?? '—'}</b><span>kg ×</span><b style="font-size:24px">${top?.reps ?? ''}</b><span>회${top?.amrap ? ' — 마지막은 한계까지' : ''}</span></div>
    <div class="tm2-sec-label">오늘 순서 — 메인 치고 바로 보조까지</div>
    <div class="tm2-std">
      <div class="tm2-std-row"><span class="tm2-ic">1️⃣</span><div><b>메인 — ${_esc(mainSeq)}</b><small>기준 ${rx.tmKg}kg의 ${rx.sets.map(s => s.pct + '%').join('·')} · 마지막 세트는 한계까지</small></div></div>
      ${supp ? `<div class="tm2-std-row"><span class="tm2-ic">2️⃣</span><div><b>바로 이어서 ${supp.label} — ${supp.kg}kg × ${supp.reps}회 × ${supp.sets}세트</b><small>기준의 ${supp.pct}% · 메인 끝나고 쉬지 말고 그대로</small></div></div>` : ''}
      ${bm.meta?.formNote ? `<div class="tm2-std-row"><span class="tm2-ic">📐</span><div><b>${_esc(bm.meta.formNote)}</b><small>자세 메모</small></div></div>` : ''}
    </div>
    ${painted ? `
      <div class="tm2-note"><b>색칠 완료</b> — 한계 세트 ${log.amrapReps ?? '-'}회${log.note ? ` · ${_esc(log.note)}` : ''}</div>
      <button class="tm2-btn-ghost" data-action="tm2:sheet-close">닫기</button>
    ` : `
      <div class="tm2-sec-label">오늘 한 만큼</div>
      <div class="tm2-inps">
        <div class="tm2-inp">한계 세트(${top?.kg}kg)<input id="tm2-in-amrap" inputmode="numeric" placeholder="${top?.reps ?? ''}회 이상?"></div>
        <div class="tm2-inp">메모<input id="tm2-in-note" placeholder="선택"></div>
      </div>
      <div class="tm2-note">한계 세트 횟수가 목표보다 많으면 다음 정산에서 기준 무게 <b>+${bm.wendler.incrementKg}kg</b>의 근거가 돼요.</div>
      <button class="tm2-btn-paint" data-action="tm2:paint" ${isFuture ? 'disabled' : ''}>${isFuture ? '아직 미래 칸이에요' : '성공 — 칸 색칠하기'}</button>
      ${isFuture ? '' : `<button class="tm2-btn-ghost" data-action="tm2:miss-record">목표를 못 채웠어요 — 기록만 남기기</button>`}
      ${inLineup ? `<button class="tm2-btn-ghost" data-action="tm2:lineup-remove">오늘의 배열에서 빼기</button>` : ''}
    `}
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

  const candidates = buildOnboardingCandidates({ v1Cycle: getMaxCycle(), movements: MOVEMENTS })
    .filter(c => c.groupId === S.groupId)
    .filter(c => !actives.some(b => b.movementId === c.movementId));
  const archivedIds = new Set((S.board.benchmarks || []).filter(b => b.status === 'archived').map(b => b.movementId));
  const adding = S.sheet.ctx.adding;
  const libRows = candidates.slice(0, 14).map(c => {
    const wasHere = archivedIds.has(c.movementId);
    const known = c.tracks.volume && !c.tracks.volume.manual ? `${c.tracks.volume.kg}kg×${c.tracks.volume.reps}` : null;
    if (adding === c.movementId) {
      return `
      <div class="tm2-mg-row">
        <b>${_esc(c.label)}</b>
        <span class="tm2-ob-weight"><input id="tm2-add-kg" inputmode="decimal" value="${known ? c.tracks.volume.kg : ''}" placeholder="kg"><i>kg ×</i><input id="tm2-add-reps" inputmode="numeric" value="${c.tracks.volume?.reps || 12}" style="width:44px"><i>회</i></span>
        <button class="tm2-mg-in" data-action="tm2:manage-add-confirm" data-movement="${_esc(c.movementId)}">확인</button>
      </div>`;
    }
    return `
    <div class="tm2-mg-row">
      <b>${_esc(c.label)}</b>
      <small>${wasHere ? '기록 있음 — 이어서 시작' : known ? `최근 ${known}` : '기록 없음'}</small>
      <button class="tm2-mg-in" data-action="tm2:manage-add" data-movement="${_esc(c.movementId)}">＋ 추가</button>
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

async function _confirmAdd(movementId) {
  const c = buildOnboardingCandidates({ v1Cycle: getMaxCycle(), movements: MOVEMENTS })
    .find(x => x.movementId === movementId && x.groupId === S.groupId);
  if (!c) return;
  const kg = _num('tm2-add-kg', 0);
  const reps = Math.max(1, Math.round(_num('tm2-add-reps', 12)));
  const archived = (S.board.benchmarks || []).find(b => b.status === 'archived' && b.movementId === movementId && b.groupId === S.groupId);
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
    case 'tm2:manage-add': S.sheet.ctx.adding = d.movement; _renderManageSheet(); break;
    case 'tm2:manage-add-confirm': await _confirmAdd(d.movement); break;
    default: break;
  }
}
