// ================================================================
// workout/expert/max-cycle-render.js — 테스트모드 성장판 HTML 렌더링
// ================================================================

import {
  MAJOR_LABEL,
  _esc,
  _displayKg,
  _impactCopy,
  _shortDate,
  _targetRepsForTrack,
  _targetTrackLabel,
  _trackSpec,
  _trackWeekStatus,
  _benchmarkMovementId,
  _benchmarkOptionValue,
  _dedupeBenchmarkOptions,
  buildBenchmarkActuals,
  buildMaxGrowthStairs,
  buildRenderedMaxCycleSnapshot,
  isMaxTrackEnabled,
  maxBenchmarkProgram,
  maxBenchmarkTrackList,
  normalizeMaxCycleTracks,
  predictBenchmarkProgression,
} from './max-cycle-core.js';
import {
  WENDLER_SCHEMES,
  isWendlerAllowedMajor,
  normalizeWendlerConfig,
  wendlerCycleOverview,
  wendlerWeekPrescription,
} from './max-wendler.js';

const PLAN_MAJOR_ORDER = Object.keys(MAJOR_LABEL);

function _planMajorKeys(benchmarks = []) {
  const seen = new Set();
  const keys = [];
  for (const major of PLAN_MAJOR_ORDER) {
    if (!seen.has(major)) {
      seen.add(major);
      keys.push(major);
    }
  }
  for (const benchmark of benchmarks || []) {
    const major = benchmark?.primaryMajor || 'custom';
    if (major && !seen.has(major)) {
      seen.add(major);
      keys.push(major);
    }
  }
  return keys;
}

function _renderV4WendlerLift(benchmark, snapshot) {
  const cfg = normalizeWendlerConfig(benchmark.wendler || {}, {
    primaryMajor: benchmark.primaryMajor,
    trackSpec: _trackSpec(benchmark, isMaxTrackEnabled(benchmark, 'H') ? 'H' : 'M'),
  });
  const rx = wendlerWeekPrescription(cfg, snapshot.weekIndex);
  const schemeLabel = cfg.scheme === 'custom' ? '커스텀' : (WENDLER_SCHEMES[cfg.scheme]?.label || cfg.scheme);
  const latest = benchmark.latest;
  const setsLabel = (rx.sets || []).map(s => `${_planKg(s.kg)}×${s.reps}${s.amrap ? '+' : ''}`).join(' · ');
  const supp = rx.supplemental;
  const topOk = latest && rx.topSet ? latest.kg >= rx.topSet.kg : null;
  const paceClass = topOk === null ? 'is-empty' : (topOk ? 'is-on' : 'is-behind');
  const paceText = topOk === null
    ? (rx.topSet?.amrap ? `AMRAP ${rx.topSet.reps}+ 목표` : '실측 없음')
    : (topOk ? '톱세트 달성' : `톱세트 ${_planKg(rx.topSet.kg)}kg 도전`);
  const expanded = topOk === false;
  return `
    <article class="wt-v4-lift is-wendler${expanded ? ' is-expanded' : ''}${benchmark.hasRegisteredExercise === false ? ' is-missing-exercise' : ''}" data-benchmark-id="${_esc(benchmark.id)}">
      <div class="wt-v4-lift-top">
        <div>
          <div class="wt-v4-lift-part">${_esc(MAJOR_LABEL[benchmark.primaryMajor] || benchmark.primaryMajor)} · 웬들러</div>
          <div class="wt-v4-lift-name">${_esc(benchmark.label)} <em>${_esc(schemeLabel)}</em></div>
          ${benchmark.hasRegisteredExercise === false ? '<div class="wt-v4-lift-warning">등록 종목에서 삭제됨 · 벤치마크를 바꾸세요</div>' : ''}
        </div>
        <button type="button" class="wt-v4-expand" data-action="toggle-max-lift" aria-label="상세 보기">${expanded ? '접기' : '상세'}</button>
      </div>
      <div class="wt-v4-row-track is-single" role="status" aria-label="${_esc(benchmark.label)} 웬들러 프로그램">
        <button type="button" class="on" data-action="open-max-benchmark-editor" data-benchmark-id="${_esc(benchmark.id)}" aria-label="웬들러 모듈 설정 열기">웬들러 · TM ${_planKg(rx.tmKg)}kg · 설정 ›</button>
      </div>
      <div class="wt-v4-lift-main">
        <div class="wt-v4-weight-wrap">
          <button type="button" class="wt-v4-weight" data-action="open-max-benchmark-editor" data-benchmark-id="${_esc(benchmark.id)}" aria-label="웬들러 모듈 설정 열기">
            <span>${_planKg(rx.topSet?.kg)}</span><small>kg</small>
          </button>
        </div>
        <div class="wt-v4-reps">
          <div>W${rx.week} · ${_esc(setsLabel)}</div>
          <small>${supp
            ? `${_esc(supp.label)} ${_planKg(supp.kg)}kg × ${supp.reps} × ${supp.sets}세트`
            : (latest ? `이전 ${latest.kg} × ${latest.reps} · ${_shortDate(latest.dateKey)}` : '보조 모듈 없음')}</small>
        </div>
      </div>
      <div class="wt-v4-detail">
        <div class="wt-v4-pace ${paceClass}">${_esc(paceText)}</div>
        <div class="wt-v4-impact"><strong>웬들러 처방.</strong> 정산 시 TM +${_planKg(cfg.incrementKg)}kg → ${_planKg(rx.tmKg + cfg.incrementKg)}kg 기준으로 다음 사이클을 진행합니다.</div>
        <button type="button" class="wt-v4-benchmark-edit-entry" data-action="open-max-benchmark-editor" data-benchmark-id="${_esc(benchmark.id)}">웬들러 모듈 설정 (스킴 · TM · 주차표)</button>
      </div>
    </article>
  `;
}

function _renderV4Lift(benchmark, snapshot, cycle, index = 0) {
  if (maxBenchmarkProgram(benchmark) === 'wendler' && isWendlerAllowedMajor(benchmark.primaryMajor)) {
    return _renderV4WendlerLift(benchmark, snapshot);
  }
  const hasIntensity = isMaxTrackEnabled(benchmark, 'H');
  const requestedTrack = benchmark.activeTrack || snapshot.track || 'M';
  const track = requestedTrack === 'H' && hasIntensity ? 'H' : 'M';
  const reps = `${benchmark.planned.startReps || (track === 'H' ? 8 : 12)}-${benchmark.planned.targetReps || (track === 'H' ? 6 : 12)}`;
  const latest = benchmark.latest;
  const displayKg = _displayKg(cycle, snapshot.todayKey, benchmark, track);
  const changed = Math.abs(Number(displayKg) - Number(benchmark.planned.plannedKg)) > 0.001;
  const pct = Math.max(0, Math.min(100, Number(benchmark.planned?.percent) || 0));
  const actualPct = benchmark.actualPct === null || benchmark.actualPct === undefined ? null : Math.max(0, Math.min(100, Number(benchmark.actualPct) || 0));
  const paceClass = benchmark.onPlan === null ? 'is-empty' : (benchmark.onPlan ? 'is-on' : 'is-behind');
  const paceText = benchmark.onPlan === null ? '실측 없음' : (benchmark.onPlan ? '목표 페이스' : `${benchmark.delta}kg 뒤`);
  const expanded = changed || benchmark.onPlan === false;
  return `
    <article class="wt-v4-lift${changed ? ' is-changed' : ''}${expanded ? ' is-expanded' : ''}${benchmark.hasRegisteredExercise === false ? ' is-missing-exercise' : ''}" data-benchmark-id="${_esc(benchmark.id)}">
      <div class="wt-v4-lift-top">
        <div>
          <div class="wt-v4-lift-part">${_esc(MAJOR_LABEL[benchmark.primaryMajor] || benchmark.primaryMajor)} · 기본 트랙</div>
          <div class="wt-v4-lift-name">${_esc(benchmark.label)} <em>${track === 'H' ? '강도' : '볼륨'}</em></div>
          ${benchmark.hasRegisteredExercise === false ? '<div class="wt-v4-lift-warning">등록 종목에서 삭제됨 · 벤치마크를 바꾸세요</div>' : ''}
        </div>
        <button type="button" class="wt-v4-expand" data-action="toggle-max-lift" aria-label="상세 보기">${expanded ? '접기' : '상세'}</button>
      </div>
      ${hasIntensity ? `
        <div class="wt-v4-row-track${track === 'H' ? ' is-h' : ''}" role="tablist" aria-label="${_esc(benchmark.label)} 트랙">
          <i></i>
          <button type="button" class="${track === 'M' ? 'on' : ''}" data-action="set-max-benchmark-track" data-benchmark-id="${_esc(benchmark.id)}" data-track="M">볼륨</button>
          <button type="button" class="${track === 'H' ? 'on' : ''}" data-action="set-max-benchmark-track" data-benchmark-id="${_esc(benchmark.id)}" data-track="H">강도</button>
        </div>
      ` : `
        <div class="wt-v4-row-track is-single" role="status" aria-label="${_esc(benchmark.label)} 볼륨 단일 트랙">
          <button type="button" class="on" disabled>볼륨 단일</button>
        </div>
      `}
      <div class="wt-v4-lift-main">
        <div class="wt-v4-weight-wrap">
          <button type="button" class="wt-v4-weight${changed ? ' is-changed' : ''}"
                  data-action="open-max-adjust"
                  data-benchmark-id="${_esc(benchmark.id)}">
            <span>${_esc(displayKg)}</span><small>kg</small>
          </button>
          <div class="wt-v4-step-inline">
            <button type="button" data-action="adjust-max-weight" data-benchmark-id="${_esc(benchmark.id)}" data-delta="-${Number(benchmark.planned.incrementKg) || 2.5}">-${Number(benchmark.planned.incrementKg) || 2.5}</button>
            <button type="button" data-action="adjust-max-weight" data-benchmark-id="${_esc(benchmark.id)}" data-delta="${Number(benchmark.planned.incrementKg) || 2.5}">+${Number(benchmark.planned.incrementKg) || 2.5}</button>
          </div>
        </div>
        <div class="wt-v4-reps">
          <div>${track === 'H' ? '3' : '4'} × ${_esc(reps)}</div>
          <small>${latest ? `이전 ${latest.kg} × ${latest.reps} · ${_shortDate(latest.dateKey)}` : '이전 성공값 없음'}</small>
        </div>
      </div>
      <div class="wt-v4-detail">
        <div class="wt-v4-pace ${paceClass}">${_esc(paceText)}</div>
        <div class="wt-v4-impact"><strong>${changed ? '조정됨.' : '계획값.'}</strong> ${_esc(_impactCopy(displayKg, benchmark))}</div>
        <div class="wt-v4-progression" aria-label="6주 목표 ${_esc(benchmark.planned.targetKg)}kg">
          <div class="wt-v4-prog-line wt-v4-prog-dual">
            <i class="planned" style="width:${pct}%"></i>
            ${actualPct === null ? '' : `<i class="actual" style="width:${actualPct}%"></i>`}
          </div>
          <div class="wt-v4-prog-meta">
            <span>시작 ${_esc(benchmark.planned.startKg)}kg</span>
            <b>계획 ${_esc(displayKg)}kg</b>
            <span>목표 ${_esc(benchmark.planned.targetKg)}kg</span>
          </div>
        </div>
        <button type="button" class="wt-v4-benchmark-edit-entry" data-action="open-max-benchmark-editor" data-benchmark-id="${_esc(benchmark.id)}">계획·프로그램 설정${isWendlerAllowedMajor(benchmark.primaryMajor) ? ' (웬들러 전환 가능)' : ''}</button>
      </div>
    </article>
  `;
}

function _renderMatrix(snapshot) {
  const rows = (snapshot.schedule || []).slice(0, snapshot.weeks);
  const bms = (snapshot.benchmarks || []).slice(0, 6);
  if (!rows.length || !bms.length) return '';
  return `
    <div class="wt-max-cycle-matrix" role="table" aria-label="6주 듀얼 트랙 성장판">
      <div class="wt-max-cycle-matrix-row is-head" role="row">
        <div>주차</div>
        ${bms.map(b => `<div>${_esc(b.label)}</div>`).join('')}
      </div>
      ${rows.map(row => `
        <div class="wt-max-cycle-matrix-row${row.week === snapshot.weekIndex ? ' is-today' : ''}" role="row">
          <div>W${row.week}<small>계획</small></div>
           ${bms.map(b => {
             const cell = row.cells.find(c => c.benchmarkId === b.id);
             const hasIntensity = isMaxTrackEnabled(b, 'H');
             const volume = cell?.plannedByTrack?.M || predictBenchmarkProgression(b, snapshot, row.dateKey, 'M');
             const volumeStatus = _trackWeekStatus(b, row, volume, 'M', snapshot);
             const intensity = hasIntensity ? (cell?.plannedByTrack?.H || predictBenchmarkProgression(b, snapshot, row.dateKey, 'H')) : null;
             const intensityStatus = intensity ? _trackWeekStatus(b, row, intensity, 'H', snapshot) : null;
             return `
               <div class="wt-max-cycle-dual-cell${hasIntensity ? '' : ' is-single'}">
                 <span class="track-m is-${_esc(volumeStatus.state)}"><em>볼륨</em><b>${_esc(volume.plannedKg)}</b><small>${_esc(volume.targetReps || _targetRepsForTrack('M'))}회</small><i>${_esc(volumeStatus.label)}</i></span>
                 ${intensity ? `<span class="track-h is-${_esc(intensityStatus.state)}"><em>강도</em><b>${_esc(intensity.plannedKg)}</b><small>${_esc(intensity.targetReps || _targetRepsForTrack('H'))}회</small><i>${_esc(intensityStatus.label)}</i></span>` : ''}
               </div>
             `;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function _renderPrediction(snapshot) {
  const rows = (snapshot.benchmarks || []).slice(0, 5);
  if (!rows.length) return '';
  return `
    <div class="wt-max-cycle-predict">
      <div class="wt-max-cycle-subtitle">6주 뒤 예상</div>
      ${rows.map(b => `
        <div class="wt-max-cycle-predict-row">
          <span>${_esc(b.label)}</span>
          <b>${b.planned.startKg} → ${b.planned.targetKg}kg</b>
        </div>
      `).join('')}
    </div>
  `;
}

function _snapshotMajorCombo(snapshot, majors = []) {
  const fromMajors = [...new Set((majors || []).filter(Boolean))]
    .map(id => MAJOR_LABEL[id] || id);
  if (fromMajors.length) return fromMajors.join(' + ');
  const fromBenchmarks = [...new Set((snapshot?.benchmarks || []).map(b => b.primaryMajor).filter(Boolean))]
    .map(id => MAJOR_LABEL[id] || id);
  return fromBenchmarks.length ? fromBenchmarks.join(' + ') : '오늘 부위';
}

// ── 성장 계단 카드 — 정산 1회 = 계단 1개. 사이클 히스토리 + 현재 + 예약 성장 ──

function _benchmarkRepresentativeIncrement(benchmark = {}) {
  if (maxBenchmarkProgram(benchmark) === 'wendler' && Number(benchmark.wendler?.incrementKg) > 0) {
    return Number(benchmark.wendler.incrementKg);
  }
  const inc = Number(_trackSpec(benchmark, 'M').incrementKg);
  return inc > 0 ? inc : 2.5;
}

function _incrementRangeLabel(benchmarks = []) {
  const incs = (benchmarks || []).map(_benchmarkRepresentativeIncrement).filter(v => v > 0);
  if (!incs.length) return '+2.5kg';
  const min = Math.min(...incs);
  const max = Math.max(...incs);
  return min === max ? `+${_planKg(min)}kg` : `+${_planKg(min)}~${_planKg(max)}kg`;
}

function _cycleSettleDday(snapshot) {
  const start = new Date(`${snapshot?.startDate}T00:00:00`);
  const today = new Date(`${snapshot?.todayKey}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(today.getTime())) return null;
  const end = new Date(start);
  end.setDate(start.getDate() + (Number(snapshot.weeks) || 6) * 7 - 1);
  return Math.ceil((end - today) / 86400000);
}

function _renderV4GrowthSummaryCard(snapshot, cycle, history = []) {
  const lanes = buildMaxGrowthStairs(history, cycle);
  const laneByKey = new Map(lanes.map(lane => [lane.id, lane]));
  const dday = _cycleSettleDday(snapshot);
  const settleReady = snapshot.weekIndex >= snapshot.weeks;
  const rows = (snapshot.benchmarks || []).map(b => {
    const lane = laneByKey.get(b.movementId || b.id);
    const current = lane?.points?.find(p => p.kind === 'current');
    if (!current) return '';
    const settled = lane.points.filter(p => p.kind === 'settled');
    const grownTotal = settled.reduce((sum, p) => sum + (p.decision === 'grow' ? (Number(p.afterKg) - Number(p.kg)) : 0), 0);
    const histText = settled.length
      ? `지난 정산 ${settled.length}회 · 누적 +${_planKg(grownTotal)}kg`
      : '첫 사이클';
    const isWendler = maxBenchmarkProgram(b) === 'wendler';
    return `
      <div class="wt-max-cycle-settle-row">
        <span>${_esc(b.label)}${isWendler ? ' (TM)' : ''}<small class="wt-v4-settle-status">${_esc(histText)}</small></span>
        <b>${_planKg(current.kg)} → ${_planKg(current.afterKg)}kg</b>
        <small class="wt-v4-growth-delta">+${_planKg(current.incrementKg)}</small>
      </div>
    `;
  }).join('');
  if (!rows.trim()) return '';
  return `
    <section class="card wt-v4-growth-summary">
      <div class="card-head">
        <div>
          <b>성장 예약</b>
          <span>이 사이클을 정산하면 지금 무게가 이만큼 오릅니다.</span>
        </div>
        <div class="badge">${settleReady ? '지금 정산 가능' : (dday === null ? `W${snapshot.weekIndex}/${snapshot.weeks}` : `정산 D-${Math.max(0, dday)}`)}</div>
      </div>
      ${rows}
      <div class="wt-v4-growth-summary-foot">증량폭은 계획·프로그램 설정에서 벤치마크별로 바꿀 수 있어요.</div>
    </section>
  `;
}

function _renderV4BenchmarkCard(snapshot, cycle) {
  const count = (snapshot.benchmarks || []).length;
  return `
    <section class="card wt-v4-benchmark-card wt-v4-accordion is-collapsed">
      <button type="button" class="card-head wt-v4-accordion-toggle" data-action="toggle-v4-accordion" aria-expanded="false">
        <div>
          <b>오늘 열릴 벤치마크</b>
          <span>모달을 열지 않고 이 카드 안에서 계획값, 트랙, 이전 성공값을 봅니다.</span>
        </div>
        <div class="badge wt-v4-accordion-label">${count}개 · 펼치기</div>
      </button>
      <div class="wt-v4-accordion-body">
        <div class="wt-v4-lift-list">
          ${(snapshot.benchmarks || []).slice(0, 5).map((b, idx) => _renderV4Lift(b, snapshot, cycle, idx)).join('')}
        </div>
        <button type="button" class="wt-v4-benchmark-edit-entry" data-action="open-max-plan-editor">벤치마크 · 프로그램 조정</button>
      </div>
    </section>
  `;
}

export function renderMaxCycleDashboard({ cycle, cache, exList, todayKey, isDraft = false, majors = [], history = [] } = {}) {
  const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache, exList, todayKey });
  if (!snapshot) return '';
  snapshot.todayKey = todayKey;
  const combo = _snapshotMajorCombo(snapshot, majors);
  const benchmarkCount = (snapshot.benchmarks || []).length;
  const draft = isDraft || snapshot.status === 'draft';
  const settleReady = !draft && snapshot.weekIndex >= snapshot.weeks;
  const incrementLabel = _incrementRangeLabel(snapshot.benchmarks || []);
  return `
    <section class="wt-v4-board wt-v4-entry" id="wt-max-cycle-card">
      <div class="topbar">
        <button type="button" class="icon" data-action="switch-normal-view" aria-label="일반 모드로">‹</button>
        <button type="button" class="title" data-action="open-max-cycle-board">
          <strong>${_esc(_shortDate(todayKey))}</strong>
          <span>Week ${snapshot.weekIndex} / ${snapshot.weeks}</span>
        </button>
        <button type="button" class="icon" data-action="open-max-plan-editor" aria-label="계획 조정">⋯</button>
      </div>

      <section class="hero">
        <div class="hero-kicker">오늘의 성장판</div>
        <h1>${_esc(combo)} 조합으로 진행해요</h1>
        <p>${draft ? '성장판 초안입니다. 시작하면 현재 조합과 벤치마크가 저장됩니다.' : `${snapshot.startDate} 시작 · 계획 ${snapshot.progressPct}%${snapshot.actualProgressPct === null ? '' : ` · 실제 ${snapshot.actualProgressPct}%`} 진행 중입니다.`}</p>
        <div class="score-row">
          <div class="score"><b>W${snapshot.weekIndex}</b><span>6주 성장판</span></div>
          <div class="score"><b>${benchmarkCount}개</b><span>오늘 벤치마크</span></div>
          <div class="score"><b>${_esc(incrementLabel.replace(/kg$/, ''))}</b><span>kg · 정산 시 성장</span></div>
        </div>
      </section>

      ${draft ? '' : _renderV4GrowthSummaryCard(snapshot, cycle, history)}
      ${_renderV4BenchmarkCard(snapshot, cycle)}
      <div class="next-actions">
        <button type="button" class="ghost" data-action="clear-max-major">오늘 부위 변경</button>
        ${settleReady
          ? '<button type="button" class="primary" data-action="settle-max-cycle">6주 정산하기</button>'
          : `<button type="button" class="primary" data-action="${draft ? 'start-max-cycle' : 'start-max-session'}">
          ${draft ? '6주 성장판 시작' : '종목 추가(선택)'}
        </button>`}
      </div>
    </section>
  `;
}

export function renderMaxCycleBoard({ cycle, cache, exList, todayKey } = {}) {
  const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache, exList, todayKey });
  if (!snapshot) return '';
  const primary = snapshot.benchmarks?.[0];
  const rows = snapshot.schedule || [];
  return `
    <div class="wt-v4-sheet-body">
      <div class="wt-v4-modal-head">
        <button type="button" class="wt-v4-icon" data-action="close-max-sheet">‹</button>
        <strong>Week ${snapshot.weekIndex} / ${snapshot.weeks}</strong>
        <button type="button" class="wt-v4-icon" data-action="close-max-sheet">×</button>
      </div>
      ${primary ? `
        <div class="wt-v4-cycle-hero">
          <span>${_esc(MAJOR_LABEL[primary.primaryMajor] || primary.primaryMajor)}</span>
          <b>${_esc(primary.label)}</b>
          <div>${_esc(primary.planned.startKg)} → ${_esc(primary.planned.targetKg)} kg</div>
          <i><em style="width:${Math.min(100, primary.planned.percent)}%"></em></i>
        </div>
      ` : ''}
      <div class="wt-v4-cycle-list">
        ${_renderMatrix(snapshot)}
      </div>
    </div>
  `;
}

function _planWeekCount(cycle) {
  return Math.max(1, Math.min(12, Number(cycle?.weeks) || 6));
}

function _dateKeyFromLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _planWeekKey(cycle, week) {
  const start = new Date(`${cycle?.startDate || ''}T00:00:00`);
  if (Number.isNaN(start.getTime())) return cycle?.startDate || '';
  start.setDate(start.getDate() + (Math.max(1, Number(week) || 1) - 1) * 7);
  return _dateKeyFromLocalDate(start);
}

function _planActiveWeek(cycle, todayKey = null) {
  const weeks = _planWeekCount(cycle);
  const start = new Date(`${cycle?.startDate || ''}T00:00:00`);
  const today = new Date(`${todayKey || cycle?.startDate || ''}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(today.getTime())) return 1;
  return Math.max(1, Math.min(weeks, Math.floor((today - start) / 604800000) + 1));
}

function _planStartDateValue(cycle = {}) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(cycle?.startDate || ''))) return cycle.startDate;
  return _dateKeyFromLocalDate(new Date());
}

function _planKg(v) {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function _planTrackLabel(track) {
  return track === 'H' ? '강도' : '볼륨';
}

function _monthDay(key) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return '';
  return `${Number(m[1])}/${Number(m[2])}`;
}

function _actualShortLabel(actual = {}) {
  const date = _monthDay(actual.dateKey);
  const kg = Number(actual.kg) || 0;
  const reps = Number(actual.reps) || 0;
  const load = kg > 0 && reps > 0 ? `${_planKg(kg)}kg×${reps}` : '';
  return [date, load].filter(Boolean).join(' ');
}

function _addDaysKey(key, days = 0) {
  const d = new Date(`${key || ''}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(days || 0));
  return _dateKeyFromLocalDate(d);
}

function _weekActuals(actuals = [], weekStartKey, todayKey = null) {
  const weekEndKey = _addDaysKey(weekStartKey, 7);
  return (actuals || [])
    .filter(p => p?.dateKey >= weekStartKey && p.dateKey < weekEndKey && (!todayKey || p.dateKey <= todayKey))
    .sort((a, b) => String(a.dateKey || '').localeCompare(String(b.dateKey || '')) || (Number(a.e1rm) || 0) - (Number(b.e1rm) || 0));
}

function _planTrackPoints(cycle, benchmark, track, { actuals = [], todayKey = null } = {}) {
  const weeks = _planWeekCount(cycle);
  const weekIndex = _planActiveWeek(cycle, todayKey);
  return Array.from({ length: weeks }, (_, idx) => {
    const week = idx + 1;
    const dateKey = _planWeekKey(cycle, week);
    const planned = predictBenchmarkProgression(benchmark, { ...cycle, weeks }, dateKey, track);
    const status = _trackWeekStatus(
      { ...benchmark, actuals },
      { week, dateKey },
      planned,
      track,
      { todayKey, weekIndex },
    );
    const cleared = status?.state === 'done' || status?.state === 'over';
    const state = status?.state || 'challenge';
    const issue = state === 'behind' || state === 'missed';
    const issueLabel = state === 'behind' && status?.actual?.dateKey
      ? `${_actualShortLabel(status.actual)} 미달`
      : (state === 'missed' ? (status?.label || '계획 미수행') : '');
    const actualsInWeek = _weekActuals(actuals, dateKey, todayKey);
    return {
      week,
      kg: Number(planned?.plannedKg) || 0,
      reps: Number(planned?.targetReps) || _targetRepsForTrack(track),
      dateKey,
      incrementKg: Number(planned?.incrementKg) || Number(_trackSpec(benchmark, track).incrementKg) || 2.5,
      status,
      state,
      issue,
      cleared,
      actual: status?.actual || null,
      actuals: actualsInWeek,
      clearLabel: cleared && status?.actual?.dateKey ? `${_actualShortLabel(status.actual)} 돌파` : '',
      issueLabel,
    };
  });
}

function _baselinePointForTrack(benchmark = {}, track = 'M') {
  const matchesTrack = (point = {}) => {
    const pointTrack = point.track === 'H' || point.track === 'M' ? point.track : null;
    return !pointTrack || pointTrack === track;
  };
  const baseline = [
    ...(Array.isArray(benchmark?.baselineActuals) ? benchmark.baselineActuals : []),
    benchmark?.baselineLatest || null,
  ]
    .filter(point => point && matchesTrack(point))
    .sort((a, b) => String(a.dateKey || '').localeCompare(String(b.dateKey || '')))
    .at(-1) || null;
  if (!baseline) return null;
  const kg = Number(baseline.kg) || 0;
  const reps = Number(baseline.reps) || 0;
  if (kg <= 0 || reps <= 0) return null;
  const label = _actualShortLabel(baseline);
  return {
    week: 0,
    kg,
    reps,
    dateKey: baseline.dateKey || null,
    state: 'baseline',
    actual: baseline,
    actuals: [],
    baselineLabel: label ? `${label} 기준` : '기준',
  };
}

function _statusLabelHtml(point = {}) {
  if (point.baselineLabel) {
    const detail = _monthDay(point.dateKey) || '시작';
    return `<em title="${_esc(point.baselineLabel)}"><i>${_esc(detail)}</i><span class="wt-v4-plan-status">기준</span></em>`;
  }
  const label = point.clearLabel || point.issueLabel || '';
  if (!label) return '<em></em>';
  const pieces = /^(.*)\s+(돌파|미달|미수행)$/.exec(label);
  if (!pieces) return `<em title="${_esc(label)}"><i>${_esc(label)}</i></em>`;
  const detail = /^(\d{1,2}\/\d{1,2})\s+(.+)$/.exec(pieces[1]);
  const detailHtml = detail
    ? `<i><span>${_esc(detail[1])}</span><span>${_esc(detail[2])}</span></i>`
    : `<i>${_esc(pieces[1])}</i>`;
  return `<em title="${_esc(label)}">${detailHtml}<span class="wt-v4-plan-status">${_esc(pieces[2])}</span></em>`;
}

function _stairGeometry(points, activeWeek) {
  const left = 18;
  const right = 342;
  const top = 12;
  const bottom = 90;
  const n = Math.max(1, points.length);
  const values = [
    ...points.map(p => Number(p.kg) || 0),
    ...points.flatMap(p => (p.actuals || []).map(actual => Number(actual?.kg) || 0)).filter(v => v > 0),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const yFor = (value) => range > 0
    ? bottom - (((Number(value) || 0) - min) / range) * (bottom - top)
    : (top + bottom) / 2;
  const coords = points.map((p, idx) => {
    const x = n === 1 ? (left + right) / 2 : left + ((right - left) / (n - 1)) * idx;
    const y = yFor(p.kg);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });
  const spacing = n > 1 ? Math.abs(coords[1].x - coords[0].x) : 44;
  const actualCoords = points.flatMap((p, idx) => {
    const actuals = Array.isArray(p.actuals) ? p.actuals : [];
    const count = actuals.length;
    return actuals.map((actual, actualIdx) => {
      const kg = Number(actual?.kg) || 0;
      if (kg <= 0) return null;
      const reps = Number(actual?.reps) || 0;
      const baseX = coords[idx]?.x ?? (n === 1 ? (left + right) / 2 : left + ((right - left) / (n - 1)) * idx);
      const spread = Math.min(12, spacing * 0.18);
      const offset = count > 1 ? (actualIdx - ((count - 1) / 2)) * spread : 0;
      const x = Math.max(left, Math.min(right, baseX + offset));
      const y = yFor(kg);
      const actualCleared = kg >= (Number(p.kg) || 0) && reps >= (Number(p.reps) || 0);
      return {
        ...p,
        actual,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        actualKg: kg,
        actualReps: reps,
        issue: !actualCleared,
        cleared: actualCleared,
      };
    }).filter(Boolean);
  });
  const d = coords.reduce((path, coord, idx) => {
    if (idx === 0) return `M${coord.x} ${coord.y}`;
    return `${path} H${coord.x} V${coord.y}`;
  }, '');
  const activeIdx = Math.max(0, Math.min(coords.length - 1, (Number(activeWeek) || 1) - 1));
  let currentD = '';
  if (coords.length === 1) {
    currentD = `M${coords[0].x - 20} ${coords[0].y} H${coords[0].x + 20}`;
  } else if (activeIdx === 0) {
    currentD = `M${coords[0].x} ${coords[0].y} H${coords[1].x}`;
  } else {
    currentD = `M${coords[activeIdx - 1].x} ${coords[activeIdx - 1].y} V${coords[activeIdx].y} H${coords[activeIdx].x}`;
  }
  return { d, currentD, coords, actualCoords };
}

function _renderPlanStairLane({ cycle, benchmark, track, activeWeek, selected = false, actuals = [], todayKey = null, interactive = true }) {
  const spec = _trackSpec(benchmark, track);
  const planPoints = _planTrackPoints(cycle, benchmark, track, { actuals, todayKey });
  const baselinePoint = _baselinePointForTrack(benchmark, track);
  const points = baselinePoint ? [baselinePoint, ...planPoints] : planPoints;
  const geom = _stairGeometry(points, baselinePoint ? (Number(activeWeek) || 1) + 1 : activeWeek);
  const weeks = points.length;
  const increment = Number(spec.incrementKg) || planPoints[0]?.incrementKg || 2.5;
  const disabled = spec.enabled === false;
  const actualD = geom.actualCoords
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
    .join(' ');
  const actualMarkers = geom.actualCoords.map(p => `
    <g class="wt-v4-plan-actual-point${p.issue ? ' is-issue' : ''}${p.cleared ? ' is-cleared' : ''}">
      <circle cx="${p.x}" cy="${p.y}" r="5.8" class="halo"></circle>
      <circle cx="${p.x}" cy="${p.y}" r="3.6" class="dot"></circle>
      <title>${_esc(`${_monthDay(p.actual.dateKey)} · ${p.actualKg}kg x ${p.actualReps}회`)}</title>
    </g>
  `).join('');
  const actionAttrs = (p) => !p.baselineLabel && interactive
    ? `data-action="select-max-plan-step" data-benchmark-id="${_esc(benchmark.id)}" data-track="${track}" data-week="${p.week}"`
    : `tabindex="-1" aria-disabled="true" data-track="${track}" data-week="${p.week}"`;
  return `
    <div class="wt-v4-plan-stair-lane${disabled ? ' is-disabled' : ''}${selected ? ' is-selected' : ''}" data-track="${track}">
      <div class="wt-v4-plan-stair-title">
        <b>${_planTrackLabel(track)}</b>
        <span>검정 목표 · 파랑 실제 · +${_planKg(increment)}kg</span>
      </div>
      <div class="wt-v4-plan-stair-graph" style="--weeks:${weeks}; --active-week:${activeWeek};">
        <svg viewBox="0 0 360 108" aria-label="${_esc(_planTrackLabel(track))} 계단식 6주 계획">
          <path d="M18 92 H342 M18 62 H342 M18 32 H342" class="wt-v4-plan-stair-grid"></path>
          <path d="${_esc(geom.d)}" class="wt-v4-plan-stair-line"></path>
          ${actualD ? `<path d="${_esc(actualD)}" class="wt-v4-plan-actual-halo"></path><path d="${_esc(actualD)}" class="wt-v4-plan-actual-line"></path>` : ''}
          ${actualMarkers}
          ${points.map((p, idx) => {
            const n = Math.max(1, points.length);
            const x = n === 1 ? 180 : 18 + (324 / (n - 1)) * idx;
            return `<text x="${Math.round(x * 10) / 10}" y="104" text-anchor="middle" class="${p.week === activeWeek ? 'is-current' : ''}">W${p.week}</text>`;
          }).join('')}
        </svg>
        <div class="wt-v4-plan-stair-hitgrid">
          ${points.map(p => `
            <button type="button" class="is-${_esc(p.state)}${p.week === activeWeek ? ' is-current' : ''}${selected && p.week === activeWeek ? ' is-selected' : ''}" ${actionAttrs(p)} aria-label="${_esc(`${benchmark.label || '벤치마크'} ${_planTrackLabel(track)} W${p.week}`)}">
              <span>${_planKg(p.kg)}kg</span>
              <small>${p.reps}회</small>
              ${_statusLabelHtml(p)}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function _previewTrackFromPlanned(benchmark = {}, track = 'M') {
  const key = track === 'H' ? 'H' : 'M';
  const planned = benchmark?.plannedByTrack?.[key]
    || (benchmark?.activeTrack === key ? benchmark?.planned : null)
    || {};
  const fallback = _trackSpec(benchmark, key);
  const kg = Number(planned.plannedKg) || Number(planned.startKg) || Number(fallback.startKg) || 0;
  return {
    ...fallback,
    startKg: Number(planned.startKg) || kg,
    targetKg: Number(planned.targetKg) || Number(planned.plannedKg) || Number(fallback.targetKg) || kg,
    incrementKg: Number(planned.incrementKg) || Number(fallback.incrementKg) || 2.5,
    startReps: Number(planned.startReps) || Number(fallback.startReps) || _targetRepsForTrack(key),
    targetReps: Number(planned.targetReps) || Number(fallback.targetReps) || _targetRepsForTrack(key),
    enabled: planned.enabled === false ? false : fallback.enabled !== false,
  };
}

function _benchmarkForPreviewPlan(benchmark = {}) {
  if (benchmark?.tracks && !Array.isArray(benchmark.tracks)) return benchmark;
  const m = _previewTrackFromPlanned(benchmark, 'M');
  const h = _previewTrackFromPlanned(benchmark, 'H');
  return {
    ...benchmark,
    tracks: { M: m, H: h },
    startKg: m.startKg,
    targetKg: m.targetKg,
    incrementKg: m.incrementKg,
    startReps: m.startReps,
    targetReps: m.targetReps,
  };
}

export function renderMaxBenchmarkPlanPreview({ cycle = {}, benchmark = null, major = null, cache = {}, exList = [], todayKey = null, extraBenchmarks = 0, detailHtml = '' } = {}) {
  const majorId = major || benchmark?.primaryMajor || 'custom';
  const majorLabel = MAJOR_LABEL[majorId] || '기타';
  if (!benchmark?.id) {
    return `
      <article class="wt-v4-growth-card wt-v4-growth-card-plan is-missing-benchmark" data-major="${_esc(majorId)}">
        <div class="wt-v4-growth-head">
          <div><b>${_esc(majorLabel)}</b></div>
          <div class="badge warn">기준 필요</div>
        </div>
        <div class="wt-v4-growth-benchmark">
          <button type="button"
                  class="wt-v4-growth-benchmark-chip is-missing"
                  data-action="open-max-benchmark-editor"
                  data-benchmark-missing="1"
                  data-major-part="${_esc(majorId)}"
                  aria-label="${_esc(`${majorLabel} 기준 벤치마크 등록`)}">
            기준 벤치마크 · 등록하기
          </button>
        </div>
        ${detailHtml}
      </article>
    `;
  }
  const previewBenchmark = _benchmarkForPreviewPlan(benchmark);
  const normalized = normalizeMaxCycleTracks({
    ...cycle,
    weeks: 6,
    benchmarks: [previewBenchmark],
  });
  const b = normalized.benchmarks?.[0] || benchmark;
  const previewCycle = { ...normalized, weeks: 6 };
  const activeWeek = _planActiveWeek(previewCycle, todayKey);
  const trackList = maxBenchmarkTrackList(b);
  const selectedTrack = trackList.includes(b.activeTrack) ? b.activeTrack : trackList[0];
  const actualsByTrack = Object.fromEntries(trackList.map(track => [
    track,
    buildBenchmarkActuals({ cache, exList, benchmark: b, todayKey, track }),
  ]));
  return `
    <article class="wt-v4-growth-card wt-v4-growth-card-plan wt-v4-plan-benchmark" data-benchmark-id="${_esc(b.id)}" data-major="${_esc(majorId)}">
      <div class="wt-v4-growth-head">
        <div><b>${_esc(majorLabel)}</b></div>
        <div class="badge">계획 연동</div>
      </div>
      <div class="wt-v4-growth-benchmark">
        <button type="button"
                class="wt-v4-growth-benchmark-chip"
                data-action="open-max-benchmark-editor"
                data-benchmark-id="${_esc(b.id)}"
                data-major-part="${_esc(majorId)}"
                aria-label="${_esc(`${b.label || majorLabel} 벤치마크 수정`)}">
          기준 벤치마크 · ${_esc(b.label || majorLabel)}
        </button>
        ${extraBenchmarks ? `<small>외 ${extraBenchmarks}개</small>` : ''}
      </div>
      <div class="wt-v4-plan-stairs">
        ${trackList.map(track => _renderPlanStairLane({ cycle: previewCycle, benchmark: b, track, activeWeek, selected: selectedTrack === track, actuals: actualsByTrack[track], todayKey, interactive: false })).join('')}
      </div>
      ${detailHtml}
    </article>
  `;
}

// ── 웬들러 모듈 에디터 (플랜 시트 벤치마크 카드 내부) ──

function _renderProgramToggle(benchmark) {
  const isWendler = maxBenchmarkProgram(benchmark) === 'wendler';
  const allowed = isWendlerAllowedMajor(benchmark.primaryMajor);
  return `
    <div class="wt-v4-plan-program">
      <span>진행 프로그램</span>
      <div class="wt-v4-row-track wt-v4-program-toggle${isWendler ? ' is-h' : ''}" role="tablist" aria-label="${_esc(benchmark.label || '벤치마크')} 진행 프로그램">
        <i></i>
        <button type="button" class="${isWendler ? '' : 'on'}" data-action="set-max-benchmark-program" data-benchmark-id="${_esc(benchmark.id)}" data-program="linear">기본 트랙</button>
        <button type="button" class="${isWendler ? 'on' : ''}" data-action="set-max-benchmark-program" data-benchmark-id="${_esc(benchmark.id)}" data-program="wendler" ${allowed ? '' : 'disabled'}>웬들러</button>
      </div>
      <small>${allowed
        ? (isWendler ? '웬들러: 아래에서 스킴(5/3/1·8/6/3)·TM·주차표·보조(BBB/FSL)를 설정합니다.' : '웬들러를 선택하면 5/3/1·8/6/3 모듈과 TM 기반 %처방으로 바뀝니다.')
        : '이 부위는 볼륨 전용이라 기본 트랙만 사용합니다.'}</small>
    </div>
  `;
}

function _renderWendlerEditor(benchmark, activeWeek = 1) {
  const cfg = normalizeWendlerConfig(benchmark.wendler || {}, {
    primaryMajor: benchmark.primaryMajor,
    trackSpec: _trackSpec(benchmark, isMaxTrackEnabled(benchmark, 'H') ? 'H' : 'M'),
  });
  const overview = wendlerCycleOverview(cfg);
  const points = overview.map(w => ({ week: w.week, kg: Number(w.topSet?.kg) || 0, actuals: [] }));
  const geom = _stairGeometry(points, activeWeek);
  const schemeTabs = [
    ...Object.entries(WENDLER_SCHEMES).map(([id, preset]) => ({ id, label: preset.label })),
    { id: 'custom', label: '커스텀' },
  ];
  return `
    <div class="wt-v4-plan-major-tabs wt-v4-wendler-scheme" role="tablist" aria-label="웬들러 스킴 프리셋">
      ${schemeTabs.map(tab => `
        <button type="button" class="${cfg.scheme === tab.id ? 'on' : ''}" data-action="set-wendler-scheme" data-benchmark-id="${_esc(benchmark.id)}" data-scheme="${_esc(tab.id)}">${_esc(tab.label)}</button>
      `).join('')}
    </div>
    <div class="wt-v4-plan-stairs">
      <div class="wt-v4-plan-stair-lane is-selected" data-track="W">
        <div class="wt-v4-plan-stair-title">
          <b>메인 톱세트</b>
          <span>%TM × TM ${_planKg(cfg.tmKg)}kg · 라운딩 ${_planKg(cfg.roundKg)}kg</span>
        </div>
        <div class="wt-v4-plan-stair-graph" style="--weeks:${overview.length}; --active-week:${activeWeek};">
          <svg viewBox="0 0 360 108" aria-label="웬들러 주차별 톱세트">
            <path d="M18 92 H342 M18 62 H342 M18 32 H342" class="wt-v4-plan-stair-grid"></path>
            <path d="${_esc(geom.d)}" class="wt-v4-plan-stair-line"></path>
            ${points.map((p, idx) => {
              const x = geom.coords[idx]?.x ?? 18;
              return `<text x="${x}" y="104" text-anchor="middle" class="${p.week === activeWeek ? 'is-current' : ''}">W${p.week}</text>`;
            }).join('')}
          </svg>
          <div class="wt-v4-plan-stair-hitgrid">
            ${overview.map(w => `
              <button type="button" class="${w.week === activeWeek ? 'is-current is-selected' : 'is-challenge'}" aria-disabled="true" tabindex="-1">
                <span>${_esc(w.pctLabel)}%</span>
                <small>${_esc(w.repsLabel)} · ${_planKg(w.topSet?.kg)}kg</small>
                <em></em>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="wt-v4-plan-stair-editor">
      <div>
        <b class="wt-v4-plan-stair-editor-title">주차표 직접 편집</b>
        <span class="wt-v4-plan-stair-editor-sub">세트별 %TM과 반복을 바꾸면 스킴이 커스텀으로 저장됩니다. 마지막 세트는 AMRAP(+).</span>
      </div>
      <small>기본 프리셋 = 3주 웨이브 ×2 (W1–3 / W4–6)</small>
    </div>
    <div class="wt-v4-wendler-week-table">
      ${cfg.weekMap.map((week, weekIdx) => `
        <div class="wt-v4-wendler-week-row${weekIdx + 1 === activeWeek ? ' is-current' : ''}">
          <b>W${weekIdx + 1}</b>
          ${week.sets.map((set, setIdx) => `
            <label class="wt-v4-wendler-set">
              <input type="number" min="30" max="110" step="2.5" value="${_esc(set.pct)}" data-wendler-week="${weekIdx + 1}" data-wendler-set="${setIdx}" data-wendler-prop="pct" aria-label="W${weekIdx + 1} ${setIdx + 1}세트 %TM"><small>%</small>
              <input type="number" min="1" max="20" step="1" value="${_esc(set.reps)}" data-wendler-week="${weekIdx + 1}" data-wendler-set="${setIdx}" data-wendler-prop="reps" aria-label="W${weekIdx + 1} ${setIdx + 1}세트 반복"><small>${set.amrap ? '+' : '회'}</small>
            </label>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div class="wt-v4-track-edit wt-v4-plan-track-fields wt-v4-wendler-fields">
      <div class="wt-v4-track-edit-row is-selected-track" data-track="TM">
        <b>TM<small>Training Max</small></b>
        <label>TM <input data-wendler-field="tmKg" type="number" min="0" max="500" step="0.5" value="${_esc(cfg.tmKg)}"></label>
        <label>증량폭 <input data-wendler-field="incrementKg" type="number" min="0.5" max="20" step="0.5" value="${_esc(cfg.incrementKg)}"></label>
        <label>라운딩 <input data-wendler-field="roundKg" type="number" min="0.5" max="10" step="0.5" value="${_esc(cfg.roundKg)}"></label>
        <button type="button" data-action="suggest-wendler-tm" data-benchmark-id="${_esc(benchmark.id)}">최근 기록으로 TM 제안</button>
      </div>
      <div class="wt-v4-track-edit-row" data-track="SUPP">
        <b>보조<small>볼륨 모듈</small></b>
        <label>모듈 <select data-wendler-field="suppKind">
          <option value="none" ${cfg.supplemental.kind === 'none' ? 'selected' : ''}>없음</option>
          <option value="bbb" ${cfg.supplemental.kind === 'bbb' ? 'selected' : ''}>BBB</option>
          <option value="fsl" ${cfg.supplemental.kind === 'fsl' ? 'selected' : ''}>FSL</option>
        </select></label>
        <label>%TM <input data-wendler-field="suppPct" type="number" min="30" max="100" step="2.5" value="${_esc(cfg.supplemental.pct)}" ${cfg.supplemental.kind === 'bbb' ? '' : 'disabled'}></label>
        <label>세트 <input data-wendler-field="suppSets" type="number" min="1" max="10" step="1" value="${_esc(cfg.supplemental.sets)}" ${cfg.supplemental.kind === 'none' ? 'disabled' : ''}></label>
        <label>반복 <input data-wendler-field="suppReps" type="number" min="1" max="20" step="1" value="${_esc(cfg.supplemental.reps)}" ${cfg.supplemental.kind === 'none' ? 'disabled' : ''}></label>
      </div>
    </div>
    <small class="wt-v4-wendler-note">정산 시 TM이 +${_planKg(cfg.incrementKg)}kg 성장합니다. 주차 처방은 %TM × TM을 ${_planKg(cfg.roundKg)}kg 단위로 라운딩합니다.</small>
  `;
}

function _renderPlanTrackInputs(benchmark, track, activeWeek, selectedTrack, weeks = 6, { lockEnabled = false } = {}) {
  const spec = _trackSpec(benchmark, track);
  const increment = Number(spec.incrementKg) || 2.5;
  const applyLabel = activeWeek >= weeks
    ? `W${activeWeek} 기준 +${_planKg(increment)}kg`
    : `W${activeWeek + 1} 이후 +${_planKg(increment)}kg`;
  return `
    <div class="wt-v4-track-edit-row${track === selectedTrack ? ' is-selected-track' : ''}" data-track="${track}">
      <b>${_planTrackLabel(track)}<small>${track === 'H' ? '고중량' : '고반복'}</small></b>
      <label>시작 <input data-bench-track="${track}" data-bench-field="startKg" type="number" min="0" max="400" step="${increment}" value="${_esc(spec.startKg)}"></label>
      <label>목표 <input data-bench-track="${track}" data-bench-field="targetKg" type="number" min="0" max="400" step="${increment}" value="${_esc(spec.targetKg)}"></label>
      <label>증량폭 <input data-bench-track="${track}" data-bench-field="incrementKg" type="number" min="0.5" max="20" step="0.5" value="${_esc(increment)}"></label>
      <label>반복 <input data-bench-track="${track}" data-bench-field="targetReps" type="number" min="1" max="30" step="1" value="${_esc(spec.targetReps)}"></label>
      ${lockEnabled
        ? '<span class="wt-v4-track-single-note">볼륨 단일</span>'
        : `<label class="wt-v4-track-enabled"><input data-bench-track="${track}" data-bench-field="enabled" type="checkbox" ${spec.enabled === false ? '' : 'checked'}> 사용</label>`}
      <button type="button" data-action="apply-max-plan-increment" data-track="${track}" data-week="${activeWeek}">${applyLabel}</button>
    </div>
  `;
}

export function renderMaxPlanEditor({ cycle, gyms = [], currentGymId = null, movements = [], cache = {}, exList = [], focusBenchmarkId = null, focusAddBenchmark = false, activeMajorId = null, todayKey = null } = {}) {
  const benchmarks = Array.isArray(cycle?.benchmarks) ? normalizeMaxCycleTracks(cycle).benchmarks : [];
  const exerciseOptions = _dedupeBenchmarkOptions(Array.isArray(movements) ? movements : [], { currentGymId });
  const weeks = 6;
  const activeWeek = _planActiveWeek({ ...cycle, weeks }, todayKey);
  const startDateValue = _planStartDateValue(cycle);
  const selectedOptionValue = (b) => {
    const exact = exerciseOptions.find(m => _benchmarkOptionValue(m) === b.exerciseId);
    if (exact) return _benchmarkOptionValue(exact);
    const sameMovement = exerciseOptions.find(m => _benchmarkMovementId(m) === b.movementId);
    if (sameMovement) return _benchmarkOptionValue(sameMovement);
    return b.exerciseId || (b.movementId ? `movement:${b.movementId}` : '');
  };
  const renderOptions = (b) => {
    const selectedValue = selectedOptionValue(b);
    const hasSelected = exerciseOptions.some(m => _benchmarkOptionValue(m) === selectedValue);
    const options = hasSelected || !selectedValue
      ? exerciseOptions
      : [{
        id: selectedValue,
        exerciseId: selectedValue && !String(selectedValue).startsWith('movement:') ? selectedValue : null,
        movementId: b.movementId || null,
        primary: b.primaryMajor || null,
        optionLabel: `등록 종목 없음 · ${b.label || b.movementId || selectedValue}`,
      }, ...exerciseOptions];
    return options.map(m => {
      const value = _benchmarkOptionValue(m);
      return `<option value="${_esc(value)}" ${value === selectedValue ? 'selected' : ''}>${_esc(m.optionLabel || `${MAJOR_LABEL[m.primary] || m.primary || '기타'} · ${m.nameKo || m.name || m.id} · ${m.equipment_category || '공통'}`)}</option>`;
    }).join('');
  };
  const renderMissing = (b) => {
    const selectedValue = selectedOptionValue(b);
    const hasSelected = exerciseOptions.some(m => _benchmarkOptionValue(m) === selectedValue);
    return hasSelected ? '' : '<small class="wt-v4-bench-missing">현재 운동추가 목록에서 찾을 수 없습니다. 이 카드에서 다른 종목으로 연결하거나 삭제할 수 있어요.</small>';
  };
  const majorKeys = _planMajorKeys(benchmarks);
  const focusBenchmark = focusBenchmarkId ? benchmarks.find(b => b.id === focusBenchmarkId) : null;
  const firstBenchmarkMajor = benchmarks.find(b => b?.primaryMajor)?.primaryMajor || null;
  const requestedMajor = activeMajorId && majorKeys.includes(activeMajorId) ? activeMajorId : null;
  const activeMajor = focusBenchmark?.primaryMajor || requestedMajor || firstBenchmarkMajor || majorKeys[0] || 'custom';
  return `
    <div class="wt-v4-sheet-body wt-v4-plan-editor">
      <div class="wt-v4-modal-head">
        <button type="button" class="wt-v4-icon" data-action="close-max-sheet">‹</button>
        <strong>계획 조정</strong>
        <button type="button" class="wt-v4-save" data-action="save-max-plan-editor">저장</button>
      </div>
      <input type="hidden" id="max-plan-weeks-value" value="6">
      <section class="wt-v4-plan-section wt-v4-plan-meta">
        <label class="wt-v4-field">
          <span>W1 시작일</span>
          <input id="max-plan-start-date" type="date" value="${_esc(startDateValue)}">
        </label>
      </section>
      <section class="wt-v4-plan-section${focusAddBenchmark ? ' is-add-focused' : ''} wt-v4-plan-lanes">
        <h4>벤치마크 성장판</h4>
        <div class="wt-v4-plan-major-tabs">
          ${majorKeys.length ? majorKeys.map(major => `
            <button type="button" class="${major === activeMajor ? 'on' : ''}" data-action="select-max-plan-major" data-major="${_esc(major)}">${_esc(MAJOR_LABEL[major] || '기타')}</button>
          `).join('') : '<span>벤치마크 없음</span>'}
        </div>
        ${majorKeys.map(major => {
          const rows = benchmarks.filter(b => (b.primaryMajor || 'custom') === major);
          return `
          <div class="wt-v4-plan-major-panel${major === activeMajor ? ' is-active' : ''}" data-major="${_esc(major)}">
            ${rows.length ? rows.map(b => {
              const trackList = maxBenchmarkTrackList(b);
              const selectedTrack = trackList.includes('H') ? 'H' : 'M';
              const isWendler = maxBenchmarkProgram(b) === 'wendler' && isWendlerAllowedMajor(b.primaryMajor);
              const actualsByTrack = isWendler ? {} : Object.fromEntries(trackList.map(track => [
                track,
                buildBenchmarkActuals({ cache, exList, benchmark: b, todayKey, track }),
              ]));
              const linearBody = isWendler ? '' : `
                  <div class="wt-v4-plan-stairs">
                    ${trackList.map(track => _renderPlanStairLane({ cycle: { ...cycle, weeks }, benchmark: b, track, activeWeek, selected: selectedTrack === track, actuals: actualsByTrack[track], todayKey })).join('')}
                  </div>
                  <div class="wt-v4-plan-stair-editor">
                    <div>
                      <b class="wt-v4-plan-stair-editor-title">선택 계단 · W${activeWeek} ${_planTrackLabel(selectedTrack)}</b>
                      <span class="wt-v4-plan-stair-editor-sub">아래 시작/목표/증량폭을 바꾸면 저장 후 계획선에 반영됩니다.</span>
                    </div>
                    <small data-bench-default-note>${_esc(b.benchmarkSourceLabel || (trackList.length === 1 ? '볼륨 트랙 단일 운영입니다.' : '볼륨/강도 트랙을 따로 계산합니다.'))}</small>
                  </div>
                  <div class="wt-v4-track-edit wt-v4-plan-track-fields">
                    ${trackList.map(track => _renderPlanTrackInputs(b, track, activeWeek, selectedTrack, weeks, { lockEnabled: trackList.length === 1 })).join('')}
                  </div>`;
              return `
                <article class="wt-v4-plan-benchmark wt-v4-bench-edit${b.id === focusBenchmarkId ? ' is-focused' : ''}" data-benchmark-id="${_esc(b.id)}" data-major="${_esc(major)}" data-program="${isWendler ? 'wendler' : 'linear'}" data-selected-week="${activeWeek}" data-selected-track="${selectedTrack}" data-current-week="${activeWeek}" data-default-track="${selectedTrack}">
                  <div class="wt-v4-plan-bench-head">
                    <div>
                      <span>${_esc(MAJOR_LABEL[major] || '기타')}</span>
                      <b>${_esc(b.label || '벤치마크')}</b>
                    </div>
                    <button type="button" data-action="delete-max-benchmark" data-benchmark-id="${_esc(b.id)}" aria-label="벤치마크 삭제">×</button>
                  </div>
                  <label class="wt-v4-plan-bench-select">
                    <span>연결 종목</span>
                    <select data-bench-field="exerciseId">${renderOptions(b)}</select>
                    ${renderMissing(b)}
                  </label>
                  ${_renderProgramToggle(b)}
                  ${isWendler ? _renderWendlerEditor(b, activeWeek) : linearBody}
                </article>
              `;
            }).join('') : `
              <div class="wt-v4-plan-empty">
                <b>${_esc(MAJOR_LABEL[major] || '기타')} 벤치마크가 아직 없습니다.</b>
                <span>이 부위를 선택한 상태에서 아래 버튼을 누르면 해당 부위 종목을 연결합니다.</span>
              </div>
            `}
          </div>
        `;
        }).join('')}
        <button type="button" class="wt-v4-bench-add${focusAddBenchmark ? ' is-focused' : ''}" data-action="add-max-benchmark">벤치마크 추가</button>
      </section>
    </div>
  `;
}

export function renderMaxCycleSettle(cycle, snapshot, settleResult = null) {
  if (!snapshot) return '';
  const rows = settleResult?.rows || [];
  const early = snapshot.weekIndex < snapshot.weeks;
  return `
    <div class="wt-v4-sheet-body wt-v4-settle-sheet">
      <div class="wt-v4-modal-head">
        <button type="button" class="wt-v4-icon" data-action="close-max-sheet">‹</button>
        <strong>사이클 정산 · W${snapshot.weekIndex}/${snapshot.weeks}</strong>
        <button type="button" class="wt-v4-icon" data-action="close-max-sheet">×</button>
      </div>
      <div class="wt-max-cycle-settle">
        <div class="wt-max-cycle-settle-title">${early ? '아직 사이클 중입니다 — 지금 정산하면 조기 종료됩니다.' : '6주 완주 — 설정한 증량폭만큼 성장을 확정하세요.'}</div>
        ${rows.map(r => {
          const grow = r.decision === 'grow';
          const rep = r.representative || {};
          const kgText = grow
            ? `${_planKg(rep.before)} → ${_planKg(rep.after)}kg (+${_planKg(rep.incrementKg)})`
            : `${_planKg(rep.before)} → ${_planKg(rep.before)}kg`;
          const statusText = r.onPlan === true ? '계획 달성' : (r.onPlan === false ? '실측 미달' : '실측 없음');
          return `
            <div class="wt-max-cycle-settle-row" data-settle-benchmark="${_esc(r.id)}" data-decision="${grow ? 'grow' : 'hold'}">
              <span>${_esc(r.label)}${r.program === 'wendler' ? ' (TM)' : ''}<small class="wt-v4-settle-status">${statusText}</small></span>
              <b>${kgText}</b>
              <small class="wt-v4-settle-choice">
                <button type="button" class="${grow ? 'on' : ''}" data-action="set-settle-decision" data-benchmark-id="${_esc(r.id)}" data-decision="grow">성장</button>
                <button type="button" class="${grow ? '' : 'on'}" data-action="set-settle-decision" data-benchmark-id="${_esc(r.id)}" data-decision="hold">유지</button>
              </small>
            </div>
          `;
        }).join('')}
        <div class="wt-max-cycle-settle-note">성장폭은 계획 조정 시트의 증량폭(웬들러는 TM 증량폭) 그대로입니다. 미달 벤치마크는 유지가 기본이며, 확정하면 다음 사이클이 바로 시작되고 이번 사이클은 성장 계단에 보존됩니다.</div>
      </div>
      <div class="wt-v4-sheet-actions">
        <button type="button" data-action="close-max-sheet">나중에</button>
        <button type="button" class="primary" data-action="confirm-max-settle">확정하고 다음 사이클 시작</button>
      </div>
    </div>
  `;
}
