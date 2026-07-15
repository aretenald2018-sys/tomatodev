import {
  createWorkoutSeason,
  getExList,
  getSeasonRegistry,
  getTestBoardV2,
} from '../data.js';
import {
  addSeasonDays,
  findSeasonForDate,
  validateSeasonRegistry,
} from '../data/season-model.js';
import {
  activeBenchmarks,
  currentKgOf,
} from './test-v2/board-core.js';
import {
  buildSeasonExerciseSetup,
  SEASON_NORMAL_INCREMENTS_KG,
  SEASON_NORMAL_PROGRESSION_WEEKS,
  seasonResetPreview,
} from './season-reset.js';
import { inferW863Profile, W863_ORIGINAL_PROFILES } from './w863-original.js';
import { showToast } from '../ui/toast.js';

const STEP_LABELS = ['기간', '종목·목표', '러닝', '미리보기'];
const GROUP_LABELS = Object.freeze({
  chest: '가슴', back: '등', shoulder: '어깨', lower: '하체', arm: '팔', abs: '복부', other: '기타',
});
const GROUP_ORDER = Object.freeze(['chest', 'back', 'shoulder', 'lower', 'arm', 'abs', 'other']);
let _state = null;

function _esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function _todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function _seasonName(startDate) {
  const month = Number(String(startDate).slice(5, 7));
  const year = String(startDate).slice(0, 4);
  const label = month >= 3 && month <= 5 ? '봄' : month <= 8 ? '여름' : month <= 11 ? '가을' : '겨울';
  return `${year} ${label} 시즌`;
}

function _requestId() {
  return globalThis.crypto?.randomUUID?.() || `season-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function _normalBaseline(board, benchmark) {
  if (!benchmark) return 0;
  for (const track of (benchmark?.tracks || ['volume'])) {
    const current = currentKgOf(board || {}, benchmark, track);
    if (Number(current?.kg) > 0) return Number(current.kg);
  }
  return 0;
}

function _normalIncrement(benchmark, groupId) {
  const inherited = Number(benchmark?.incrementKg);
  if (SEASON_NORMAL_INCREMENTS_KG.includes(inherited)) return inherited;
  return groupId === 'lower' ? 5 : 2.5;
}

function _syncExerciseSetup(state) {
  const setup = buildSeasonExerciseSetup({
    registeredExercises: state.exercises,
    previousBoard: state.board,
    benchmarkMappings: state.benchmarkMappings,
  });
  const overrides = { ...(state.overrides || {}) };
  for (const configuration of setup.configurations) {
    const id = configuration.exerciseId;
    const previous = overrides[id] || {};
    if (configuration.program === 'wendler') {
      const benchmark = configuration.benchmark;
      const profileId = previous.wendler?.profileId || inferW863Profile({
        ...benchmark,
        exerciseId: id,
        movementId: configuration.movementId,
        label: configuration.label,
      });
      const profile = W863_ORIGINAL_PROFILES[profileId] || Object.values(W863_ORIGINAL_PROFILES)[0];
      overrides[id] = {
        ...previous,
        benchmarkId: benchmark.id,
        wendler: {
          profileId,
          oneRmKg: Number(previous.wendler?.oneRmKg)
            || Number(benchmark.wendler?.oneRmKg)
            || Number(benchmark.wendler?.tmKg) / 0.9
            || profile.reference1RmKg,
          incrementKg: Number(previous.wendler?.incrementKg)
            || Number(benchmark.wendler?.incrementKg)
            || profile.defaultIncrementKg,
          roundKg: Number(previous.wendler?.roundKg) || Number(benchmark.wendler?.roundKg) || 5,
        },
      };
    } else {
      overrides[id] = {
        ...previous,
        benchmarkId: configuration.benchmarkId,
        baselineKg: Number.isFinite(Number(previous.baselineKg))
          ? Number(previous.baselineKg)
          : _normalBaseline(state.board, configuration.benchmark),
        incrementKg: SEASON_NORMAL_INCREMENTS_KG.includes(Number(previous.incrementKg))
          ? Number(previous.incrementKg)
          : _normalIncrement(configuration.benchmark, configuration.groupId),
        progressionWeeks: SEASON_NORMAL_PROGRESSION_WEEKS,
      };
    }
  }
  state.exerciseSetup = setup;
  state.overrides = overrides;
}

function _initialState() {
  const registry = getSeasonRegistry();
  const board = getTestBoardV2();
  const exercises = getExList().filter(exercise => exercise?.id);
  const latest = registry.seasons.at(-1) || null;
  const today = _todayKey();
  const startDate = latest && latest.endDate >= today ? addSeasonDays(latest.endDate, 1) : today;
  const benchmarks = activeBenchmarks(board || {});
  const state = {
    step: 0,
    registry,
    board,
    exercises,
    benchmarks,
    selectedExerciseIds: new Set(exercises.map(exercise => String(exercise.id))),
    season: { name: _seasonName(startDate), startDate, endDate: addSeasonDays(startDate, 83) },
    benchmarkMappings: {},
    exerciseSetup: null,
    overrides: {},
    weeklySessionTarget: 3,
    runningPlan: { weeklyDistanceKm: 20, weeklySessions: 3, optionalDurationMin: 120 },
    clientRequestId: _requestId(),
    saving: false,
  };
  _syncExerciseSetup(state);
  return state;
}

function _modal() {
  let modal = document.getElementById('workout-season-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'workout-season-modal';
  modal.className = 'modal-backdrop workout-season-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="modal-sheet workout-season-sheet" role="dialog" aria-modal="true" aria-labelledby="workout-season-title"></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if (event.target === modal && !_state?.saving) closeWorkoutSeasonWizard();
  });
  const sheet = modal.querySelector('.workout-season-sheet');
  sheet.addEventListener('click', _handleClick);
  sheet.addEventListener('input', _handleInput);
  sheet.addEventListener('change', _handleInput);
  return modal;
}

function _stepper() {
  return `<div class="season-stepper" aria-label="시즌 설정 단계">${STEP_LABELS.map((label, index) => (
    `<span class="${index === _state.step ? 'is-current' : index < _state.step ? 'is-done' : ''}"><b>${index + 1}</b>${_esc(label)}</span>`
  )).join('')}</div>`;
}

function _periodStep() {
  const existing = _state.registry.seasons.length
    ? `<div class="season-existing-list">${_state.registry.seasons.map(season => `<span>${_esc(season.name)} · ${season.startDate}–${season.endDate}</span>`).join('')}</div>`
    : '<p class="season-empty-copy">등록된 시즌이 없습니다. 첫 시즌을 오늘부터 시작할 수 있어요.</p>';
  return `
    <div class="season-step-copy"><strong>새 시즌 기간</strong><p>기록은 그대로 두고, 이 날짜 범위 안에서만 새 목표와 스트릭을 계산합니다.</p></div>
    ${existing}
    <label class="season-field"><span>시즌 이름</span><input data-season-field="name" value="${_esc(_state.season.name)}" maxlength="40"></label>
    <div class="season-field-row">
      <label class="season-field"><span>시작일</span><input type="date" data-season-field="startDate" value="${_esc(_state.season.startDate)}"></label>
      <label class="season-field"><span>종료일</span><input type="date" data-season-field="endDate" value="${_esc(_state.season.endDate)}"></label>
    </div>`;
}

function _exerciseStep() {
  const configurations = _state.exerciseSetup.configurations;
  const unresolved = _state.exerciseSetup.unresolvedWendler;
  const mappingHtml = unresolved.length ? `<div class="season-mapping-alert">
    <strong>웬들러 기록 종목 연결</strong>
    <p>같은 동작의 등록 종목이 여러 개라 자동 선택하지 않았습니다. 실제 기록에 사용할 종목을 선택하세요.</p>
    ${unresolved.map(({ benchmark, candidates }) => `<label><span>${_esc(benchmark.label || '웬들러 종목')}</span><select data-season-wendler-map="${_esc(benchmark.id)}"><option value="">기록 종목 선택</option>${candidates.map(candidate => `<option value="${_esc(candidate.exerciseId)}">${_esc(candidate.label)}</option>`).join('')}</select></label>`).join('')}
  </div>` : '';
  const grouped = GROUP_ORDER.map(groupId => ({
    groupId,
    items: configurations.filter(configuration => configuration.groupId === groupId),
  })).filter(group => group.items.length);
  return `
    <div class="season-step-copy"><strong>부위별 종목 · 새 시즌 목표</strong><p>등록 운동의 ID와 이름을 그대로 사용합니다. 체크한 종목만 새 시즌 W1 또는 3주 증량 목표로 시작합니다.</p></div>
    ${mappingHtml}
    <div class="season-exercise-groups">${grouped.map(({ groupId, items }) => `<section class="season-exercise-group">
      <header><strong>${GROUP_LABELS[groupId] || groupId}</strong><span>${items.length}종목</span></header>
      <div class="season-exercise-list">${items.map((configuration) => {
        const id = configuration.exerciseId;
        const selected = _state.selectedExerciseIds.has(id);
        const config = _state.overrides[id];
        const isWendler = configuration.program === 'wendler';
        return `<section class="season-exercise-card${selected ? '' : ' is-disabled'}" data-season-exercise-card="${_esc(id)}">
          <header>
            <label><input type="checkbox" data-season-exercise="${_esc(id)}" ${selected ? 'checked' : ''}><span><b>${_esc(configuration.label)}</b><small>${isWendler ? '등록 종목에 연결된 8/6/3 원본' : '일반 3주 증량'}</small></span></label>
            <em class="${isWendler ? 'is-wendler' : ''}">${isWendler ? 'W1' : '+ 목표'}</em>
          </header>
          ${isWendler ? `<div class="season-card-settings season-wendler-settings">
            <div class="season-ssot-link"><span>기록 종목</span><strong>${_esc(configuration.label)}</strong><small>ID · ${_esc(id)}</small></div>
            <div class="season-field-row season-field-row-4">
              <label class="season-field"><span>리프트</span><select data-season-wendler="profileId" ${selected ? '' : 'disabled'}>${Object.values(W863_ORIGINAL_PROFILES).map(profile => `<option value="${profile.id}" ${profile.id === config.wendler.profileId ? 'selected' : ''}>${_esc(profile.label)}</option>`).join('')}</select></label>
              <label class="season-field"><span>현재 1RM</span><input type="number" inputmode="decimal" min="1" step="0.5" data-season-wendler="oneRmKg" value="${config.wendler.oneRmKg}" ${selected ? '' : 'disabled'}></label>
              <label class="season-field"><span>증량 kg</span><input type="number" inputmode="decimal" min="0.5" step="0.5" data-season-wendler="incrementKg" value="${config.wendler.incrementKg}" ${selected ? '' : 'disabled'}></label>
              <label class="season-field"><span>반올림 kg</span><input type="number" inputmode="decimal" min="0.5" step="0.5" data-season-wendler="roundKg" value="${config.wendler.roundKg}" ${selected ? '' : 'disabled'}></label>
            </div>
          </div>` : `<div class="season-card-settings season-normal-settings">
            <label class="season-baseline-field"><span>최초 기준중량</span><span class="season-input-unit"><input type="number" inputmode="decimal" min="0" step="0.25" data-season-normal="baselineKg" value="${config.baselineKg}" ${selected ? '' : 'disabled'}><b>kg</b></span></label>
            <fieldset ${selected ? '' : 'disabled'}><legend>3주마다 증량</legend><div class="season-increment-options">${SEASON_NORMAL_INCREMENTS_KG.map(increment => `<label><input type="radio" name="season-increment-${_esc(id)}" data-season-normal="incrementKg" value="${increment}" ${Number(config.incrementKg) === increment ? 'checked' : ''}><span>+${increment}kg</span></label>`).join('')}</div></fieldset>
          </div>`}
        </section>`;
      }).join('')}</div>
    </section>`).join('')}</div>`;
}

function _runningStep() {
  return `
    <div class="season-step-copy"><strong>주간 계획</strong><p>위젯의 달성률은 이 목표를 기준으로 계산합니다.</p></div>
    <div class="season-field-row season-field-row-4">
      <label class="season-field"><span>헬스 횟수/주</span><input type="number" min="1" max="14" data-season-plan="weeklySessionTarget" value="${_state.weeklySessionTarget}"></label>
      <label class="season-field"><span>러닝 km/주</span><input type="number" min="1" step="0.5" data-season-running="weeklyDistanceKm" value="${_state.runningPlan.weeklyDistanceKm}"></label>
      <label class="season-field"><span>러닝 횟수/주</span><input type="number" min="1" max="14" data-season-running="weeklySessions" value="${_state.runningPlan.weeklySessions}"></label>
      <label class="season-field"><span>선택 시간/주</span><input type="number" min="0" step="5" data-season-running="optionalDurationMin" value="${_state.runningPlan.optionalDurationMin || ''}"></label>
    </div>`;
}

function _previewStep() {
  const selected = [..._state.selectedExerciseIds];
  const preview = seasonResetPreview(_state.board, selected, {
    registeredExercises: _state.exercises,
    benchmarkMappings: _state.benchmarkMappings,
  });
  const current = findSeasonForDate(_state.registry, addSeasonDays(_state.season.startDate, -1));
  return `
    <div class="season-step-copy"><strong>영향 미리보기</strong><p>저장 후 원본 운동 기록과 사진·러닝 경로는 바뀌지 않습니다.</p></div>
    <div class="season-impact-grid">
      <section><span>유지</span><strong>${selected.length}개 등록 종목</strong><small>과거 운동·사진·러닝 경로·운동 목록</small></section>
      <section><span>재시작</span><strong>W1 ${preview.wendlerCount}개</strong><small>8/6/3 원본 · 과거 웬들러 로그 제외</small></section>
      <section><span>새 목표</span><strong>트랙 ${preview.trackCount}개</strong><small>헬스 ${_state.weeklySessionTarget}회 · 러닝 ${_state.runningPlan.weeklyDistanceKm}km</small></section>
      <section><span>시즌</span><strong>${_esc(_state.season.name)}</strong><small>${_state.season.startDate}–${_state.season.endDate}${current ? ` · ${_esc(current.name)} 다음` : ''}</small></section>
    </div>
    <div class="season-final-note">시즌 시작 후 달력·통계·APK 위젯은 이 시즌 범위만 기본값으로 사용합니다.</div>`;
}

function _stepBody() {
  return [_periodStep, _exerciseStep, _runningStep, _previewStep][_state.step]();
}

function _render() {
  const modal = _modal();
  const sheet = modal.querySelector('.workout-season-sheet');
  sheet.innerHTML = `
    <header class="season-sheet-head"><div><span>WORKOUT SEASON</span><h2 id="workout-season-title">새 시즌 시작</h2></div><button type="button" data-season-action="close" aria-label="닫기">×</button></header>
    ${_stepper()}
    <div class="season-sheet-body">${_stepBody()}</div>
    <footer class="season-sheet-actions">
      <button type="button" class="season-secondary" data-season-action="${_state.step ? 'back' : 'close'}">${_state.step ? '이전' : '취소'}</button>
      <button type="button" class="season-primary" data-season-action="${_state.step === STEP_LABELS.length - 1 ? 'save' : 'next'}" ${_state.saving ? 'disabled' : ''}>${_state.saving ? '시즌 생성 중…' : _state.step === STEP_LABELS.length - 1 ? '이 설정으로 시즌 시작' : '다음'}</button>
    </footer>`;
}

function _handleInput(event) {
  if (!_state) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  const seasonField = target.getAttribute('data-season-field');
  if (seasonField) {
    _state.season[seasonField] = target.value;
    if (seasonField === 'startDate' && !_state.season.name.trim()) _state.season.name = _seasonName(target.value);
    return;
  }
  const exerciseId = target.getAttribute('data-season-exercise');
  if (exerciseId) {
    target.checked ? _state.selectedExerciseIds.add(exerciseId) : _state.selectedExerciseIds.delete(exerciseId);
    const card = target.closest('[data-season-exercise-card]');
    card?.classList.toggle('is-disabled', !target.checked);
    card?.querySelectorAll('.season-card-settings input, .season-card-settings select, .season-card-settings fieldset').forEach(input => {
      input.disabled = !target.checked;
    });
    return;
  }
  const mapBenchmarkId = target.getAttribute('data-season-wendler-map');
  if (mapBenchmarkId) {
    if (target.value) _state.benchmarkMappings[mapBenchmarkId] = target.value;
    else delete _state.benchmarkMappings[mapBenchmarkId];
    _syncExerciseSetup(_state);
    _render();
    return;
  }
  const exerciseRoot = target.closest('[data-season-exercise-card]');
  const configuredExerciseId = exerciseRoot?.getAttribute('data-season-exercise-card');
  const wendlerField = target.getAttribute('data-season-wendler');
  if (configuredExerciseId && wendlerField) {
    _state.overrides[configuredExerciseId].wendler[wendlerField] = wendlerField === 'profileId' ? target.value : Number(target.value);
    return;
  }
  const normalField = target.getAttribute('data-season-normal');
  if (configuredExerciseId && normalField) {
    _state.overrides[configuredExerciseId][normalField] = Number(target.value);
    return;
  }
  const planField = target.getAttribute('data-season-plan');
  if (planField) _state[planField] = Number(target.value);
  const runningField = target.getAttribute('data-season-running');
  if (runningField) _state.runningPlan[runningField] = Number(target.value) || null;
}

function _validateCurrentStep() {
  if (_state.step === 0) {
    if (!_state.season.name.trim()) return '시즌 이름을 입력해 주세요.';
    const result = validateSeasonRegistry({
      ..._state.registry,
      seasons: [..._state.registry.seasons, { id: 'preview-season', ..._state.season }],
    });
    if (!result.valid) return result.errors.some(error => error.includes('overlap'))
      ? '기존 시즌과 날짜가 겹칩니다.'
      : '시작일과 종료일을 확인해 주세요.';
  }
  if (_state.step === 1) {
    if (!_state.selectedExerciseIds.size) return '이번 시즌에 사용할 종목을 하나 이상 선택해 주세요.';
    if (_state.exerciseSetup.unresolvedWendler.length) return '웬들러 종목의 실제 기록 종목을 먼저 연결해 주세요.';
  }
  return null;
}

async function _save() {
  if (_state.saving) return;
  const error = _validateCurrentStep();
  if (error) return showToast(error, 2400, 'error');
  _state.saving = true;
  _render();
  try {
    const result = await createWorkoutSeason({
      season: _state.season,
      clientRequestId: _state.clientRequestId,
      selectedExerciseIds: [..._state.selectedExerciseIds],
      registeredExerciseIds: [..._state.selectedExerciseIds],
      registeredExercises: _state.exercises,
      benchmarkMappings: _state.benchmarkMappings,
      overrides: _state.overrides,
      weeklySessionTarget: _state.weeklySessionTarget,
      runningPlan: _state.runningPlan,
      todayKey: _todayKey(),
    });
    closeWorkoutSeasonWizard();
    showToast(result.duplicate ? '이미 생성된 시즌을 불러왔어요.' : `${result.season.name}을 시작했어요.`, 2600, 'success');
    document.dispatchEvent(new CustomEvent('season:changed', { detail: { seasonId: result.season.id } }));
  } catch (error) {
    console.warn('[season] create failed:', error);
    _state.saving = false;
    _render();
    showToast(error?.message?.includes('overlap') ? '기존 시즌과 날짜가 겹칩니다.' : '시즌 저장에 실패했어요.', 2600, 'error');
  }
}

function _handleClick(event) {
  event.stopPropagation();
  const button = event.target.closest?.('[data-season-action]');
  if (!button || !_state) return;
  const action = button.getAttribute('data-season-action');
  if (action === 'close') return closeWorkoutSeasonWizard();
  if (action === 'back') {
    _state.step = Math.max(0, _state.step - 1);
    return _render();
  }
  if (action === 'next') {
    const error = _validateCurrentStep();
    if (error) return showToast(error, 2400, 'error');
    _state.step = Math.min(STEP_LABELS.length - 1, _state.step + 1);
    return _render();
  }
  if (action === 'save') void _save();
}

export function openWorkoutSeasonWizard() {
  _state = _initialState();
  const modal = _modal();
  modal.hidden = false;
  modal.classList.add('open');
  document.body.classList.add('wt-modal-scroll-lock');
  _render();
}

export function closeWorkoutSeasonWizard() {
  const modal = document.getElementById('workout-season-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.hidden = true;
  }
  document.body.classList.remove('wt-modal-scroll-lock');
  _state = null;
}
