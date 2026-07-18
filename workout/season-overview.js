import {
  getCache,
  getSeasonRegistry,
  getSeasonRunningPlan,
  getSeasonTestBoardV2,
  getSeasonWorkoutPlan,
} from '../data.js';
import { findSeasonById } from '../data/season-model.js';
import { buildSeasonGoalOverview } from '../data/season-overview.js';
import { formatPaceSecPerKm } from '../data/running-pace-goal.js';

const STATUS = Object.freeze({
  achieved: { icon: '✓', label: '달성' },
  attempted: { icon: '△', label: '시도' },
  missed: { icon: '!', label: '미달성' },
  planned: { icon: '○', label: '진행 예정' },
  future: { icon: '→', label: '예정' },
  inactive: { icon: '–', label: '비활성' },
});

function _esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function _todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function _goalHtml(goal) {
  const status = STATUS[goal.state] || STATUS.planned;
  const heart = goal.type === 'running' && goal.avgHeartRateBpm
    ? `<small class="season-overview-heart${goal.heartRateCaution ? ' is-caution' : ''}">심박 ${goal.avgHeartRateBpm} bpm${goal.heartRateCaution ? ' · 강도 확인' : ''}</small>`
    : '';
  return `<li class="season-overview-goal is-${_esc(goal.state)}">
    <span class="season-overview-status-icon" aria-hidden="true">${status.icon}</span>
    <span class="season-overview-goal-copy"><b>${_esc(goal.label)}${goal.track === 'intensity' ? ' · 강도' : goal.track === 'volume' ? ' · 볼륨' : ''}</b><small>${_esc(goal.detail || `${goal.startDate || ''}–${goal.endDate || ''}`)}</small>${heart}</span>
    <em>${status.label}</em>
  </li>`;
}

function _weekHtml(week, todayKey) {
  const status = STATUS[week.state] || STATUS.planned;
  const isCurrent = week.weekStart <= todayKey && todayKey <= week.weekEnd;
  return `<details class="season-overview-week is-${_esc(week.state)}" ${isCurrent ? 'open' : ''}>
    <summary><span><i aria-hidden="true">${status.icon}</i><b>${_esc(week.weekStart.slice(5).replace('-', '.'))}–${_esc(week.weekEnd.slice(5).replace('-', '.'))}</b>${isCurrent ? '<small>이번 주</small>' : ''}</span><em>${status.label}</em></summary>
    <ul>${week.goals.map(_goalHtml).join('') || '<li class="season-overview-empty">이 주에 활성화된 목표가 없습니다.</li>'}</ul>
  </details>`;
}

function _modal() {
  let modal = document.getElementById('season-overview-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'season-overview-modal';
  modal.className = 'modal-backdrop season-overview-modal';
  modal.hidden = true;
  modal.innerHTML = '<section class="modal-sheet season-overview-sheet" role="dialog" aria-modal="true" aria-labelledby="season-overview-title"></section>';
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeSeasonOverview();
  });
  modal.querySelector('.season-overview-sheet').addEventListener('click', event => {
    event.stopPropagation();
    if (event.target.closest?.('[data-season-overview-close]')) closeSeasonOverview();
  });
  return modal;
}

export function openSeasonOverview(seasonId, options = {}) {
  const registry = getSeasonRegistry();
  const season = findSeasonById(registry, seasonId);
  if (!season) return false;
  const todayKey = options.todayKey || _todayKey();
  const overview = buildSeasonGoalOverview({
    cache: getCache() || {},
    season,
    board: getSeasonTestBoardV2(season.id),
    workoutPlan: getSeasonWorkoutPlan(season.id) || {},
    runningPlan: getSeasonRunningPlan(season.id) || {},
    todayKey,
  });
  const modal = _modal();
  const running = overview.running || {};
  modal.querySelector('.season-overview-sheet').innerHTML = `
    <header class="season-overview-head"><div><span>SEASON GOALS</span><h2 id="season-overview-title">${_esc(season.name)}</h2><p>${season.startDate}–${season.endDate}</p></div><button type="button" data-season-overview-close aria-label="닫기">×</button></header>
    <section class="season-overview-running"><span>러닝 페이스</span><strong>${_esc(formatPaceSecPerKm(running.targetPaceSecPerKm))}</strong><small>${running.mode === 'manual' ? '직접 목표' : `주간 적응형 · 성공 시 ${running.adaptiveRatePct || 1}% (최대 5초/km)`}${running.avgHeartRateBpm ? ` · 심박 ${running.avgHeartRateBpm} bpm` : ''}</small></section>
    <nav class="season-overview-legend" aria-label="목표 상태">${Object.entries(STATUS).map(([state, item]) => `<span class="is-${state}"><i>${item.icon}</i>${item.label}</span>`).join('')}</nav>
    <div class="season-overview-weeks">${overview.weeks.map(week => _weekHtml(week, todayKey)).join('')}</div>`;
  modal.hidden = false;
  modal.classList.add('open');
  document.body.classList.add('wt-modal-scroll-lock');
  modal.querySelector('[data-season-overview-close]')?.focus();
  return true;
}

export function closeSeasonOverview() {
  const modal = document.getElementById('season-overview-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.hidden = true;
  document.body.classList.remove('wt-modal-scroll-lock');
}
