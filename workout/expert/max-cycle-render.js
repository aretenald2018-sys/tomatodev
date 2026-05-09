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
  buildRenderedMaxCycleSnapshot,
  normalizeMaxCycleTracks,
  predictBenchmarkProgression,
} from './max-cycle-core.js';

function _renderV4Lift(benchmark, snapshot, cycle, index = 0) {
  const track = benchmark.activeTrack || snapshot.track || 'M';
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
          <div class="wt-v4-lift-part">${_esc(MAJOR_LABEL[benchmark.primaryMajor] || benchmark.primaryMajor)}</div>
          <div class="wt-v4-lift-name">${_esc(benchmark.label)} <em>${track === 'H' ? '강도' : '볼륨'}</em></div>
          ${benchmark.hasRegisteredExercise === false ? '<div class="wt-v4-lift-warning">등록 종목에서 삭제됨 · 벤치마크를 바꾸세요</div>' : ''}
        </div>
        <button type="button" class="wt-v4-expand" data-action="toggle-max-lift" aria-label="상세 보기">${expanded ? '접기' : '상세'}</button>
      </div>
      <div class="wt-v4-row-track${track === 'H' ? ' is-h' : ''}" role="tablist" aria-label="${_esc(benchmark.label)} 트랙">
        <i></i>
        <button type="button" class="${track === 'M' ? 'on' : ''}" data-action="set-max-benchmark-track" data-benchmark-id="${_esc(benchmark.id)}" data-track="M">볼륨</button>
        <button type="button" class="${track === 'H' ? 'on' : ''}" data-action="set-max-benchmark-track" data-benchmark-id="${_esc(benchmark.id)}" data-track="H">강도</button>
      </div>
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
          <div>W${row.week}<small>볼륨+강도</small></div>
           ${bms.map(b => {
             const cell = row.cells.find(c => c.benchmarkId === b.id);
             const volume = cell?.plannedByTrack?.M || predictBenchmarkProgression(b, snapshot, row.dateKey, 'M');
             const intensity = cell?.plannedByTrack?.H || predictBenchmarkProgression(b, snapshot, row.dateKey, 'H');
             const volumeStatus = _trackWeekStatus(b, row, volume, 'M', snapshot);
             const intensityStatus = _trackWeekStatus(b, row, intensity, 'H', snapshot);
             return `
               <div class="wt-max-cycle-dual-cell">
                 <span class="track-m is-${_esc(volumeStatus.state)}"><em>볼륨</em><b>${_esc(volume.plannedKg)}</b><small>${_esc(volume.targetReps || _targetRepsForTrack('M'))}회</small><i>${_esc(volumeStatus.label)}</i></span>
                 <span class="track-h is-${_esc(intensityStatus.state)}"><em>강도</em><b>${_esc(intensity.plannedKg)}</b><small>${_esc(intensity.targetReps || _targetRepsForTrack('H'))}회</small><i>${_esc(intensityStatus.label)}</i></span>
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

function _renderV4CycleChart(snapshot) {
  return `
    <section class="card wt-v4-entry-chart">
      <div class="card-head">
        <div>
          <b>오늘 수행 궤적</b>
          <span>계획 페이스와 실제 수행 페이스를 함께 봅니다.</span>
        </div>
        <div class="badge">W${snapshot.weekIndex}</div>
      </div>
      <div class="chart">
        <svg viewBox="0 0 330 132" aria-label="6주 성장판 계획 실제 그래프">
          <path d="M12 106 H318" stroke="#ededf0"/><path d="M12 76 H318" stroke="#ededf0"/><path d="M12 46 H318" stroke="#ededf0"/>
          <path d="M18 104 C76 91, 91 78, 145 73 C205 68, 224 52, 312 42" fill="none" stroke="#fa342c" stroke-width="3" stroke-linecap="round"/>
          <path d="M18 108 C82 100, 94 84, 145 80 C205 76, 224 63, 312 55" fill="none" stroke="#111114" stroke-width="3" stroke-linecap="round"/>
          <text x="18" y="124" font-size="10" fill="#707078">W1</text><text x="145" y="124" font-size="10" fill="#707078">오늘</text><text x="292" y="124" font-size="10" fill="#707078">W${_esc(snapshot.weeks)}</text>
          <circle cx="145" cy="80" r="5" fill="#111114"/><circle cx="145" cy="73" r="5" fill="#fa342c"/>
        </svg>
        <div class="wt-v4-line-legend">
          <span><i class="planned"></i>빨간선: 6주 계획 페이스</span>
          <span><i class="actual"></i>검은선: 실제 수행 페이스</span>
        </div>
      </div>
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
        <button type="button" class="wt-v4-benchmark-edit-entry" data-action="open-max-plan-editor">벤치마크 종목 수정</button>
      </div>
    </section>
  `;
}

export function renderMaxCycleDashboard({ cycle, cache, exList, todayKey, isDraft = false, majors = [], recommendationHtml = '', nextAdviceHtml = '' } = {}) {
  const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache, exList, todayKey });
  if (!snapshot) return '';
  snapshot.todayKey = todayKey;
  const trackLabel = _targetTrackLabel(snapshot.track);
  const combo = _snapshotMajorCombo(snapshot, majors);
  const benchmarkCount = (snapshot.benchmarks || []).length;
  return `
    <section class="wt-v4-board wt-v4-entry" id="wt-max-cycle-card">
      <div class="topbar">
        <button type="button" class="icon" onclick="wtExcSwitchToNormalView()" aria-label="일반 모드로">‹</button>
        <button type="button" class="title" data-action="open-max-cycle-board">
          <strong>${_esc(_shortDate(todayKey))}</strong>
          <span>Week ${snapshot.weekIndex} / ${snapshot.weeks}</span>
        </button>
        <button type="button" class="icon" data-action="open-max-plan-editor" aria-label="계획 조정">⋯</button>
      </div>

      <section class="hero">
        <div class="hero-kicker">오늘의 성장판</div>
        <h1>${_esc(combo)} 조합으로 진행해요</h1>
        <p>${isDraft || snapshot.status === 'draft' ? '성장판 초안입니다. 시작하면 현재 조합과 벤치마크가 저장됩니다.' : `${snapshot.startDate} 시작 · 계획 ${snapshot.progressPct}%${snapshot.actualProgressPct === null ? '' : ` · 실제 ${snapshot.actualProgressPct}%`} 진행 중입니다.`}</p>
        <div class="score-row">
          <div class="score"><b>W${snapshot.weekIndex}</b><span>6주 성장판</span></div>
          <div class="score"><b>${benchmarkCount}개</b><span>오늘 벤치마크</span></div>
          <div class="score"><b>${_esc(trackLabel)}</b><span>오늘 트랙</span></div>
        </div>
      </section>

      ${_renderV4CycleChart(snapshot)}
      ${nextAdviceHtml || ''}
      <section class="card wt-v4-track-card">
        <div class="card-head">
          <div><b>오늘 트랙</b><span>벤치마크별로도 볼륨/강도 전환이 가능합니다.</span></div>
          <div class="badge">${_esc(trackLabel)}</div>
        </div>
        <div class="wt-v4-track${snapshot.track === 'H' ? ' is-h' : ''}" role="tablist" aria-label="오늘 트랙">
          <i></i>
          <button type="button" class="${snapshot.track === 'M' ? 'on' : ''}" data-action="set-max-track" data-track="M">볼륨</button>
          <button type="button" class="${snapshot.track === 'H' ? 'on' : ''}" data-action="set-max-track" data-track="H">강도</button>
        </div>
      </section>
      ${_renderV4BenchmarkCard(snapshot, cycle)}
      ${recommendationHtml || ''}
      <div class="wt-v4-last-ten">
        <div class="wt-v4-last-dot"></div>
        <div>
          <b>마지막 10분 보강</b>
          <span>벤치마크를 끝내면 부족분 1-2개만 제안합니다.</span>
        </div>
      </div>
      <div class="next-actions">
        <button type="button" class="ghost" data-action="clear-max-major">오늘 부위 변경</button>
        <button type="button" class="primary" data-action="${isDraft || snapshot.status === 'draft' ? 'start-max-cycle' : 'start-max-session'}">
          ${isDraft || snapshot.status === 'draft' ? '6주 성장판 시작' : '종목 추가(선택)'}
        </button>
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

export function renderMaxPlanEditor({ cycle, gyms = [], currentGymId = null, movements = [] } = {}) {
  const gym = gyms.find(g => g.id === currentGymId) || null;
  const benchmarks = Array.isArray(cycle?.benchmarks) ? normalizeMaxCycleTracks(cycle).benchmarks : [];
  const exerciseOptions = _dedupeBenchmarkOptions(Array.isArray(movements) ? movements : []);
  const selectedOptionValue = (b) => {
    const exact = exerciseOptions.find(m => _benchmarkOptionValue(m) === b.exerciseId);
    if (exact) return _benchmarkOptionValue(exact);
    const sameMovement = exerciseOptions.find(m => _benchmarkMovementId(m) === b.movementId);
    if (sameMovement) return _benchmarkOptionValue(sameMovement);
    return b.exerciseId || (b.movementId ? `movement:${b.movementId}` : '');
  };
  const weekOptions = [4, 6, 8].map(weeks => `
    <button type="button" class="${Number(cycle?.weeks) === weeks ? 'on' : ''}" data-plan-weeks="${weeks}">${weeks}주</button>
  `).join('');
  const gymOptions = [
    `<option value="">헬스장 미선택</option>`,
    ...gyms.map(g => `<option value="${_esc(g.id)}" ${g.id === currentGymId ? 'selected' : ''}>${_esc(g.name || '이름 없는 헬스장')}</option>`),
  ].join('');
  return `
    <div class="wt-v4-sheet-body wt-v4-plan-editor">
      <div class="wt-v4-modal-head">
        <button type="button" class="wt-v4-icon" data-action="close-max-sheet">‹</button>
        <strong>계획 조정</strong>
        <button type="button" class="wt-v4-save" data-action="save-max-plan-editor">저장</button>
      </div>
      <section class="wt-v4-plan-card">
        <h4>사이클</h4>
        <div class="wt-v4-cycle-len">${weekOptions}</div>
        <input type="hidden" id="max-plan-weeks-value" value="${Number(cycle?.weeks) || 6}">
        <p>각 주차에 볼륨/강도 목표를 함께 기재합니다.</p>
      </section>
      <section class="wt-v4-plan-section">
        <h4>벤치마크 종목</h4>
        <p>운동추가 목록에 등록된 실제 종목을 기준으로 벤치마크를 연결합니다.</p>
        ${benchmarks.map(b => `
          <div class="wt-v4-bench-row wt-v4-bench-edit" data-benchmark-id="${_esc(b.id)}">
            <label>
              <span>${_esc(MAJOR_LABEL[b.primaryMajor] || b.primaryMajor)}</span>
              <select data-bench-field="exerciseId">
                ${(() => {
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
                  return options
                    .map(m => {
                      const value = _benchmarkOptionValue(m);
                      return `<option value="${_esc(value)}" ${value === selectedValue ? 'selected' : ''}>${_esc(m.optionLabel || `${MAJOR_LABEL[m.primary] || m.primary || '기타'} · ${m.nameKo || m.name || m.id} · ${m.equipment_category || '공통'}`)}</option>`;
                    })
                    .join('');
                })()}
              </select>
              ${(() => {
                const selectedValue = selectedOptionValue(b);
                const hasSelected = exerciseOptions.some(m => _benchmarkOptionValue(m) === selectedValue);
                return hasSelected ? '' : '<small class="wt-v4-bench-missing">이 벤치마크는 현재 운동추가 목록에 없습니다. 다른 종목으로 바꾸거나 삭제하세요.</small>';
              })()}
            </label>
            <div class="wt-v4-track-edit">
              ${['M', 'H'].map(track => {
                const spec = _trackSpec(b, track);
                return `
                  <div class="wt-v4-track-edit-row" data-track="${track}">
                    <b>${track === 'H' ? '강도' : '볼륨'}</b>
                    <label>시작 <input data-bench-track="${track}" data-bench-field="startKg" type="number" min="0" max="400" step="${Number(spec.incrementKg) || 2.5}" value="${_esc(spec.startKg)}"></label>
                    <label>목표 <input data-bench-track="${track}" data-bench-field="targetKg" type="number" min="0" max="400" step="${Number(spec.incrementKg) || 2.5}" value="${_esc(spec.targetKg)}"></label>
                    <label>반복 <input data-bench-track="${track}" data-bench-field="targetReps" type="number" min="1" max="30" step="1" value="${_esc(spec.targetReps)}"></label>
                    <label class="wt-v4-track-enabled"><input data-bench-track="${track}" data-bench-field="enabled" type="checkbox" ${spec.enabled === false ? '' : 'checked'}> 사용</label>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="wt-v4-bench-actions">
              <small data-bench-default-note>${_esc(b.benchmarkSourceLabel || '볼륨/강도 트랙을 따로 계산합니다.')}</small>
              <button type="button" data-action="delete-max-benchmark" data-benchmark-id="${_esc(b.id)}">삭제</button>
            </div>
          </div>
        `).join('')}
        <button type="button" class="wt-v4-bench-add" data-action="add-max-benchmark">벤치마크 추가</button>
      </section>
      <section class="wt-v4-plan-card">
        <h4>헬스장</h4>
        <label class="wt-v4-field">
          <span>현재 헬스장</span>
          <select id="max-plan-gym-id">${gymOptions}</select>
        </label>
        <div class="wt-v4-inline-create">
          <input id="max-plan-new-gym-name" type="text" placeholder="새 헬스장 이름">
          <button type="button" data-action="create-max-gym">추가</button>
        </div>
        <p>현재: ${_esc(gym?.name || '헬스장 미선택')}</p>
        <button type="button" data-action="open-equipment-pool">헬스장 / 기구 관리</button>
        <button type="button" data-action="open-max-data-cleanse">데이터 클렌징</button>
      </section>
      <details class="wt-v4-advanced">
        <summary>고급 설정 <span>⌄</span></summary>
        <p>프레임워크: 6주 듀얼 트랙</p>
        <p>정체 2주 후 종목 교체 신호</p>
        <p>Deload: 자동</p>
      </details>
    </div>
  `;
}

export function renderMaxCycleSettle(cycle, snapshot) {
  if (!snapshot) return '';
  return `
    <div class="wt-max-cycle-settle">
      <div class="wt-max-cycle-settle-title">사이클 정산</div>
      ${(snapshot.benchmarks || []).map(b => `
        <div class="wt-max-cycle-settle-row">
          <span>${_esc(b.label)}</span>
          <b>${b.planned.startKg} → ${b.latest?.kg || b.planned.plannedKg}kg</b>
          <small>${b.onPlan === false ? '보류/재시도' : '진행 유지'}</small>
        </div>
      `).join('')}
      <div class="wt-max-cycle-settle-note">다음 사이클은 현재 실측값을 시작값으로 자동 시드합니다.</div>
    </div>
  `;
}
