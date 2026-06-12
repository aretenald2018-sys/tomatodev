// ================================================================
// workout/test-v2/onboarding.js — 성장 보드 첫 설정 (계약 11)
// ----------------------------------------------------------------
//  1. 운동 메뉴 만들기 — 기존 테스트모드(v1) 벤치마크/라이브러리에서
//     디폴트 종목 자동 구성 (읽기 전용). "그날 골라 쓰는 메뉴".
//  2. 시작 무게 — 기록 있으면 이어받고, 없으면 직접 입력.
//     6주 증량 기본값: 상체 +2.5kg / 하체 +10kg (종목 설정에서 변경).
//  3. 시작일 — 다음 주 월요일(추천) / 이번 주 월요일.
// 빈 보드로 시작시키지 않는다.
// ================================================================

import { getMaxCycle } from '../../data.js';
import { MOVEMENTS } from '../../config.js';
import {
  TM2_GROUPS, TM2_TRACK_LABELS, TM2_DEFAULTS,
  buildOnboardingCandidates, buildBoardFromOnboarding,
  mondayOf, addWeeks, shortDate, toKey,
} from './board-core.js';

const OB = {
  candidates: [],
  enabled: new Set(),      // movementId
  weights: {},             // `${movementId}:${track}` → { kg, reps }
  tab: 'chest',
  startChoice: 'next',     // 'next' | 'this'
  onComplete: null,
  bound: false,
};

const _esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _toast = (msg, type = 'info') => { if (typeof window.showToast === 'function') window.showToast(msg, 2200, type); };
const _todayKey = () => toKey(new Date());

export function openOnboarding({ onComplete } = {}) {
  OB.onComplete = onComplete;
  OB.candidates = buildOnboardingCandidates({ v1Cycle: getMaxCycle(), movements: MOVEMENTS });
  OB.enabled = new Set(OB.candidates.filter(c => c.defaultOn).map(c => c.movementId));
  OB.weights = {};
  for (const c of OB.candidates) {
    for (const t of ['volume', 'intensity']) {
      const spec = c.tracks[t];
      if (spec && !spec.manual) OB.weights[`${c.movementId}:${t}`] = { kg: spec.kg, reps: spec.reps };
      else if (spec) OB.weights[`${c.movementId}:${t}`] = { kg: '', reps: spec.reps || (t === 'intensity' ? 8 : 12) };
    }
  }
  OB.tab = TM2_GROUPS[0].id;
  OB.startChoice = 'next';

  const layer = document.getElementById('tm2-sheets');
  if (!layer) return;
  if (!OB.bound) {
    layer.addEventListener('click', _onObAction);
    OB.bound = true;
  }
  _render();
}

function _syncInputs() {
  document.querySelectorAll('#tm2-sheets [data-ob-key]').forEach(inp => {
    const key = inp.dataset.obKey;
    const field = inp.dataset.obField;
    if (!OB.weights[key]) OB.weights[key] = { kg: '', reps: 12 };
    OB.weights[key][field] = inp.value;
  });
}

function _render() {
  const layer = document.getElementById('tm2-sheets');
  if (!layer) return;

  const tabBtns = TM2_GROUPS.map(g => {
    const n = OB.candidates.filter(c => c.groupId === g.id && OB.enabled.has(c.movementId)).length;
    return `<button class="${OB.tab === g.id ? 'tm2-on' : ''}" data-action="tm2ob:tab" data-group="${g.id}">${g.label} ${n}</button>`;
  }).join('');

  const listRows = OB.candidates.filter(c => c.groupId === OB.tab).slice(0, 12).map(c => {
    const on = OB.enabled.has(c.movementId);
    const tks = ['volume', 'intensity'].filter(t => c.tracks[t])
      .map(t => `<span class="tm2-tk ${t === 'intensity' ? 'tm2-tk-h' : ''}">${TM2_TRACK_LABELS[t]}</span>`).join('');
    const note = c.source === 'v1' ? '하던 종목' : '라이브러리';
    return `
    <button class="tm2-ob-row ${on ? '' : 'tm2-dim'}" data-action="tm2ob:toggle" data-movement="${_esc(c.movementId)}">
      <span class="tm2-ck ${on ? '' : 'tm2-off'}">✓</span>
      <b>${_esc(c.label)}</b>${on ? tks : ''}
      <small>${on ? note : '꺼둠'}</small>
    </button>`;
  }).join('');

  const weightRows = OB.candidates.filter(c => OB.enabled.has(c.movementId)).flatMap(c =>
    ['volume', 'intensity'].filter(t => c.tracks[t]).map(t => {
      const key = `${c.movementId}:${t}`;
      const w = OB.weights[key] || { kg: '', reps: 12 };
      const inherited = c.tracks[t] && !c.tracks[t].manual;
      return `
      <div class="tm2-ob-row">
        <b>${_esc(c.label)}</b>
        <span class="tm2-tk ${t === 'intensity' ? 'tm2-tk-h' : ''}">${TM2_TRACK_LABELS[t]}</span>
        <span class="tm2-ob-weight">
          <input data-ob-key="${_esc(key)}" data-ob-field="kg" inputmode="decimal" value="${w.kg}" placeholder="kg"><i>kg ×</i>
          <input data-ob-key="${_esc(key)}" data-ob-field="reps" inputmode="numeric" value="${w.reps}" style="width:44px"><i>회</i>
          ${inherited ? '<span class="tm2-ob-from">기록 이어받음</span>' : '<span class="tm2-ob-from" style="color:#b7791f">직접 입력</span>'}
        </span>
      </div>`;
    })
  ).join('') || '<div class="tm2-ob-row"><small>1단계에서 종목을 켜 주세요</small></div>';

  const thisMon = mondayOf(_todayKey());
  const nextMon = addWeeks(thisMon, 1);
  const dateRow = (key, label, sub) => `
    <button class="tm2-ob-row ${OB.startChoice === key ? '' : 'tm2-dim'}" data-action="tm2ob:start" data-choice="${key}">
      <span class="tm2-ck ${OB.startChoice === key ? '' : 'tm2-off'}">✓</span>
      <b>${label}</b><small>${sub}</small>
    </button>`;

  layer.innerHTML = `
    <div class="tm2-sheet">
      <div class="tm2-grab"></div>
      <div class="tm2-sh-title">성장 보드 시작하기</div>
      <p class="tm2-ob-lead">6주 단위로 무게를 쌓는 계획표이자, 매일의 운동 배열판을 만들어요.</p>

      <div class="tm2-ob-step"><b>1</b>운동 메뉴 만들기 <span>그 부위 날, 여기서 골라 쓰는 후보예요</span></div>
      <div class="tm2-ob-card">
        <div class="tm2-ob-tabs">${tabBtns}</div>
        ${listRows || '<div class="tm2-ob-row"><small>이 부위 후보가 없어요</small></div>'}
      </div>
      <div class="tm2-note">매번 전부 하는 게 아니에요 — <b>운동하는 날 보드에서 골라 담는 메뉴</b>예요.</div>

      <div class="tm2-ob-step"><b>2</b>시작 무게 확인 <span>기록이 있으면 이어받고, 없으면 직접 적어요</span></div>
      <div class="tm2-ob-card">${weightRows}</div>
      <div class="tm2-note">6주마다 오를 기본값 — <b>상체 +${TM2_DEFAULTS.incrementUpperKg}kg · 하체 +${TM2_DEFAULTS.incrementLowerKg}kg</b>. 종목 설정에서 언제든 바꿔요.</div>

      <div class="tm2-ob-step"><b>3</b>언제부터 시작할까요?</div>
      <div class="tm2-ob-card">
        ${dateRow('next', `다음 주 월요일 (${shortDate(nextMon)})`, '추천 — 주 단위가 딱 맞아요')}
        ${dateRow('this', `이번 주부터 (${shortDate(thisMon)} 주)`, '바로 시작')}
      </div>

      <button class="tm2-btn-primary" data-action="tm2ob:create">6주 칸 채우기 →</button>
      <button class="tm2-btn-ghost" data-action="tm2ob:cancel">나중에</button>
    </div>`;
  layer.classList.add('tm2-open');
}

async function _create() {
  _syncInputs();
  const selections = [];
  const missing = [];
  for (const c of OB.candidates) {
    if (!OB.enabled.has(c.movementId)) continue;
    const tracks = {};
    for (const t of ['volume', 'intensity']) {
      if (!c.tracks[t]) { tracks[t] = null; continue; }
      const w = OB.weights[`${c.movementId}:${t}`] || {};
      const kg = Number(w.kg);
      const reps = Math.max(1, Math.round(Number(w.reps) || (t === 'intensity' ? 8 : 12)));
      if (!Number.isFinite(kg) || kg <= 0) { missing.push(`${c.label}(${TM2_TRACK_LABELS[t]})`); tracks[t] = { kg: 0, reps }; }
      else tracks[t] = { kg, reps };
    }
    selections.push({ ...c, tracks });
  }
  if (!selections.length) { _toast('종목을 1개 이상 켜 주세요', 'warning'); return; }
  if (missing.length) { _toast(`시작 무게를 입력해 주세요 — ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? ` 외 ${missing.length - 2}개` : ''}`, 'warning'); return; }

  const thisMon = mondayOf(_todayKey());
  const startDate = OB.startChoice === 'next' ? addWeeks(thisMon, 1) : thisMon;
  const board = buildBoardFromOnboarding({
    selections,
    startDate,
    source: getMaxCycle() ? 'max_cycle_v1' : 'manual',
  });
  board.createdAt = Date.now();

  const layer = document.getElementById('tm2-sheets');
  if (layer) { layer.classList.remove('tm2-open'); layer.innerHTML = ''; }
  if (typeof OB.onComplete === 'function') await OB.onComplete(board);
}

function _onObAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (!action.startsWith('tm2ob:')) return;
  e.preventDefault();
  switch (action) {
    case 'tm2ob:tab': _syncInputs(); OB.tab = btn.dataset.group; _render(); break;
    case 'tm2ob:toggle': {
      _syncInputs();
      const id = btn.dataset.movement;
      if (OB.enabled.has(id)) OB.enabled.delete(id);
      else OB.enabled.add(id);
      _render();
      break;
    }
    case 'tm2ob:start': _syncInputs(); OB.startChoice = btn.dataset.choice; _render(); break;
    case 'tm2ob:create': _create(); break;
    case 'tm2ob:cancel': {
      const layer = document.getElementById('tm2-sheets');
      if (layer) { layer.classList.remove('tm2-open'); layer.innerHTML = ''; }
      break;
    }
    default: break;
  }
}
