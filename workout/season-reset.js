import { MOVEMENTS } from '../config.js';
import {
  activeBenchmarks,
  buildBoardFromOnboarding,
  currentKgOf,
  exerciseGroupId,
  mondayOf,
  roundToPlate,
  TM2_GROUPS,
} from './test-v2/board-core.js';
import {
  W863_ORIGINAL_VERSION,
  normalizeW863OriginalConfig,
} from './w863-original.js';

export const SEASON_NORMAL_INCREMENTS_KG = Object.freeze([1.25, 2.5, 5]);
export const SEASON_NORMAL_PROGRESSION_WEEKS = 3;

export function calculateSeasonWendlerFromTenRm(tenRmKg, roundKg = 2.5) {
  const weight = _positive(tenRmKg);
  if (!weight) return { tenRmKg: 0, estimatedOneRmKg: 0, tmKg: 0 };
  const unit = _positive(roundKg, 2.5);
  const estimatedOneRmKg = Math.round(weight * (1 + (10 / 30)) * 10) / 10;
  return {
    tenRmKg: weight,
    estimatedOneRmKg,
    tmKg: roundToPlate(estimatedOneRmKg * 0.9, unit),
  };
}

function _clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function _positive(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function _nonNegative(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function _normalizedLabel(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, '');
}

function _registeredExerciseRecords(registeredExercises, benchmarks) {
  const source = Array.isArray(registeredExercises) && registeredExercises.length
    ? registeredExercises
    : benchmarks.map(benchmark => ({
      id: benchmark.exerciseId || benchmark.id,
      name: benchmark.label || benchmark.exerciseId || benchmark.id,
      movementId: benchmark.movementId || null,
      muscleId: benchmark.muscleId || benchmark.groupId || null,
      __seasonFallbackGroupId: benchmark.groupId || null,
    }));
  const seen = new Set();
  return source.filter((exercise) => {
    const id = String(exercise?.id || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(exercise => ({ ...exercise, id: String(exercise.id) }));
}

function _mappingCandidates(benchmark, exercises, assignmentByExercise, movements) {
  const available = exercises.filter(exercise => !assignmentByExercise.has(exercise.id));
  if (benchmark.movementId) {
    const movementMatches = available.filter(exercise => exercise.movementId === benchmark.movementId);
    if (movementMatches.length) return movementMatches;
  }
  const groupId = benchmark.groupId || null;
  if (groupId) {
    const groupMatches = available.filter(exercise => (
      (exerciseGroupId(exercise, movements) || exercise.__seasonFallbackGroupId) === groupId
    ));
    if (groupMatches.length) return groupMatches;
  }
  return available;
}

/**
 * 등록 운동 목록을 시즌 설정의 SSOT로 사용한다.
 * 운동 ID가 정확히 일치하면 최우선 연결하고, 레거시 movementId 연결은 후보가 하나일 때만 자동 적용한다.
 */
export function buildSeasonExerciseSetup({
  registeredExercises = [],
  previousBoard = null,
  benchmarkMappings = {},
  movements = MOVEMENTS,
} = {}) {
  const benchmarks = activeBenchmarks(previousBoard || {});
  const exercises = _registeredExerciseRecords(registeredExercises, benchmarks);
  const exerciseById = new Map(exercises.map(exercise => [exercise.id, exercise]));
  const benchmarkById = new Map(benchmarks.map(benchmark => [String(benchmark.id), benchmark]));
  const assignmentByExercise = new Map();
  const assignedBenchmarkIds = new Set();

  const assign = (benchmark, exercise, source) => {
    if (!benchmark || !exercise || assignedBenchmarkIds.has(benchmark.id) || assignmentByExercise.has(exercise.id)) return false;
    assignmentByExercise.set(exercise.id, { benchmark, source });
    assignedBenchmarkIds.add(benchmark.id);
    return true;
  };

  for (const [benchmarkId, exerciseId] of Object.entries(benchmarkMappings || {})) {
    assign(benchmarkById.get(String(benchmarkId)), exerciseById.get(String(exerciseId)), 'manual');
  }
  for (const benchmark of benchmarks) {
    if (benchmark.exerciseId) assign(benchmark, exerciseById.get(String(benchmark.exerciseId)), 'exercise-id');
  }
  for (const benchmark of benchmarks) {
    if (assignedBenchmarkIds.has(benchmark.id)) continue;
    const label = _normalizedLabel(benchmark.label);
    if (!label) continue;
    const matches = exercises.filter(exercise => (
      !assignmentByExercise.has(exercise.id)
      && _normalizedLabel(exercise.name || exercise.label) === label
      && (!benchmark.movementId || !exercise.movementId || exercise.movementId === benchmark.movementId)
    ));
    if (matches.length === 1) assign(benchmark, matches[0], 'label');
  }
  for (const benchmark of benchmarks) {
    if (assignedBenchmarkIds.has(benchmark.id) || !benchmark.movementId) continue;
    const matches = exercises.filter(exercise => (
      !assignmentByExercise.has(exercise.id) && exercise.movementId === benchmark.movementId
    ));
    if (matches.length === 1) assign(benchmark, matches[0], 'movement-id');
  }

  const configurations = exercises.map((exercise, order) => {
    const assigned = assignmentByExercise.get(exercise.id) || null;
    const benchmark = assigned?.benchmark || null;
    return {
      exercise,
      exerciseId: exercise.id,
      label: exercise.name || exercise.label || exercise.id,
      movementId: exercise.movementId || benchmark?.movementId || null,
      muscleId: exercise.muscleId || benchmark?.muscleId || null,
      groupId: exerciseGroupId(exercise, movements) || benchmark?.groupId || exercise.__seasonFallbackGroupId || 'other',
      benchmark,
      benchmarkId: benchmark?.id || null,
      program: benchmark?.program === 'wendler' ? 'wendler' : 'stair',
      mappingSource: assigned?.source || 'new',
      order,
    };
  });

  const unresolvedWendler = benchmarks
    .filter(benchmark => benchmark.program === 'wendler' && !assignedBenchmarkIds.has(benchmark.id))
    .map(benchmark => ({
      benchmark,
      candidates: _mappingCandidates(benchmark, exercises, assignmentByExercise, movements).map(exercise => ({
        exerciseId: exercise.id,
        label: exercise.name || exercise.label || exercise.id,
      })),
    }));

  return {
    configurations,
    unresolvedWendler,
    resolvedMappings: Object.fromEntries(
      [...assignmentByExercise.entries()]
        .filter(([, assignment]) => assignment.source !== 'exercise-id')
        .map(([exerciseId, assignment]) => [assignment.benchmark.id, exerciseId]),
    ),
  };
}

function _overrideFor(overrides, benchmark, exercise) {
  if (!overrides || typeof overrides !== 'object') return {};
  return overrides[exercise?.id]
    || overrides[benchmark?.id]
    || overrides[benchmark?.exerciseId]
    || overrides[benchmark?.movementId]
    || {};
}

function _trackSeed(previousBoard, benchmark, track, override = {}, baselineKg = null) {
  const current = benchmark ? currentKgOf(previousBoard || {}, benchmark, track) : null;
  const requested = override?.tracks?.[track] || override?.[track] || {};
  return {
    kg: _nonNegative(baselineKg,
      _nonNegative(requested.kg ?? requested.startKg,
        _nonNegative(current?.kg, _nonNegative(benchmark?.seed?.[track]?.kg, 0)))),
    reps: Math.max(1, Math.round(_positive(
      requested.reps ?? requested.startReps,
      _positive(current?.reps, _positive(benchmark?.seed?.[track]?.reps, track === 'intensity' ? 8 : 12)),
    ))),
  };
}

function _baselineKg(previousBoard, benchmark, override = {}) {
  const requested = _nonNegative(override.baselineKg);
  if (requested != null) return requested;
  for (const track of (benchmark?.tracks || ['volume'])) {
    const seed = _trackSeed(previousBoard, benchmark, track, override);
    if (seed.kg > 0) return seed.kg;
  }
  return 0;
}

function _normalIncrement(value, benchmark, groupId) {
  const requested = Number(value);
  if (SEASON_NORMAL_INCREMENTS_KG.includes(requested)) return requested;
  const inherited = Number(benchmark?.incrementKg);
  if (SEASON_NORMAL_INCREMENTS_KG.includes(inherited)) return inherited;
  return groupId === 'lower' ? 5 : 2.5;
}

function _wendlerConfig(benchmark, override, startDate, configuration) {
  const requested = override?.wendler || override || {};
  return normalizeW863OriginalConfig({
    ..._clone(benchmark?.wendler || {}),
    ...requested,
    scheme: 'w863',
    templateVersion: W863_ORIGINAL_VERSION,
    cycleNo: 1,
    startWeek: 1,
    programStartDate: startDate,
    tmAnchors: [],
  }, {
    profileId: requested.profileId,
    movementId: configuration.movementId,
    exerciseId: configuration.exerciseId,
    label: configuration.label,
    primaryMajor: configuration.groupId,
  });
}

export function seasonResetPreview(previousBoard = null, selectedExerciseIds = null, options = {}) {
  const selected = selectedExerciseIds == null
    ? null
    : new Set((Array.isArray(selectedExerciseIds) ? selectedExerciseIds : []).map(String));
  if (Array.isArray(options.registeredExercises) && options.registeredExercises.length) {
    const setup = buildSeasonExerciseSetup({
      registeredExercises: options.registeredExercises,
      previousBoard,
      benchmarkMappings: options.benchmarkMappings,
      movements: options.movements || MOVEMENTS,
    });
    const configurations = setup.configurations.filter(configuration => (
      selected == null || selected.has(configuration.exerciseId)
    ));
    const programOf = configuration => {
      const override = _overrideFor(options.overrides, configuration.benchmark, configuration.exercise);
      return override.program === 'wendler' || (override.program == null && configuration.program === 'wendler')
        ? 'wendler'
        : 'stair';
    };
    return {
      registeredPlanCount: configurations.length,
      wendlerCount: configurations.filter(configuration => programOf(configuration) === 'wendler').length,
      trackCount: configurations
        .filter(configuration => programOf(configuration) !== 'wendler')
        .reduce((sum, configuration) => sum + Math.max(1, configuration.benchmark?.tracks?.length || 0), 0),
      preservedExerciseIds: configurations.map(configuration => configuration.exerciseId),
    };
  }
  const benchmarks = activeBenchmarks(previousBoard || {}).filter((benchmark) => (
    selected == null || selected.has(String(benchmark.exerciseId || benchmark.id))
  ));
  const programOf = benchmark => {
    const override = _overrideFor(options.overrides, benchmark, { id: benchmark.exerciseId });
    return override.program === 'wendler' || (override.program == null && benchmark.program === 'wendler')
      ? 'wendler'
      : 'stair';
  };
  return {
    registeredPlanCount: benchmarks.length,
    wendlerCount: benchmarks.filter(benchmark => programOf(benchmark) === 'wendler').length,
    trackCount: benchmarks
      .filter(benchmark => programOf(benchmark) !== 'wendler')
      .reduce((sum, benchmark) => sum + Math.max(1, benchmark.tracks?.length || 0), 0),
    preservedExerciseIds: benchmarks.map(benchmark => benchmark.exerciseId).filter(Boolean),
  };
}

export function buildSeasonWorkoutBoard({
  previousBoard = null,
  seasonId,
  startDate,
  registeredExercises = [],
  selectedExerciseIds = null,
  benchmarkMappings = {},
  overrides = {},
  createdAt = Date.now(),
} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || ''))) {
    throw new TypeError('season startDate must use YYYY-MM-DD');
  }
  const programStartDate = mondayOf(startDate);
  const selected = selectedExerciseIds == null
    ? null
    : new Set((Array.isArray(selectedExerciseIds) ? selectedExerciseIds : []).map(String));
  const setup = buildSeasonExerciseSetup({ registeredExercises, previousBoard, benchmarkMappings });
  const selections = setup.configurations
    .filter(configuration => selected == null || selected.has(configuration.exerciseId))
    .map((configuration) => {
      const { benchmark, exercise } = configuration;
      const override = _overrideFor(overrides, benchmark, exercise);
      const isWendler = override.program === 'wendler'
        || (override.program == null && configuration.program === 'wendler');
      const tracks = {};
      const trackIds = isWendler ? ['volume'] : (benchmark?.tracks?.length ? benchmark.tracks : ['volume']);
      const baselineKg = _baselineKg(previousBoard, benchmark, override);
      const sharedBaselineKg = !isWendler && _nonNegative(override.baselineKg) != null ? baselineKg : null;
      for (const track of trackIds) tracks[track] = _trackSeed(previousBoard, benchmark, track, override, sharedBaselineKg);
      return {
        exerciseId: configuration.exerciseId,
        movementId: configuration.movementId,
        muscleId: configuration.muscleId,
        groupId: configuration.groupId,
        label: configuration.label,
        short: String(configuration.label).slice(0, 5),
        tracks,
        incrementKg: isWendler
          ? _positive(override.incrementKg, _positive(benchmark?.incrementKg))
          : _normalIncrement(override.incrementKg, benchmark, configuration.groupId),
        progressionWeeks: isWendler ? null : SEASON_NORMAL_PROGRESSION_WEEKS,
        progressionStartDate: isWendler ? null : programStartDate,
        meta: _clone(benchmark?.meta || {}),
        ...(isWendler
          ? { wendler: _wendlerConfig(benchmark, override, programStartDate, configuration) }
          : {}),
      };
    });

  const board = buildBoardFromOnboarding({
    selections,
    startDate: programStartDate,
    source: `season:${String(seasonId || 'unknown')}`,
  });
  if (selections.some(selection => selection.groupId === 'other') && !board.groups.some(group => group.id === 'other')) {
    board.groups.push({ id: 'other', label: '기타', bodyRegion: 'upper', order: TM2_GROUPS.length });
  }
  board.seasonId = String(seasonId || '');
  board.programVersion = W863_ORIGINAL_VERSION;
  board.createdAt = createdAt;
  board.lineups = {};
  board.history = [];
  return board;
}

export function buildSeasonWorkoutPlan({
  season,
  board,
  registeredExerciseIds = [],
  weeklySessionTarget = 3,
  createdFromSeasonId = null,
  clientRequestId = null,
  createdAt = Date.now(),
} = {}) {
  const startingOneRmByExercise = {};
  const startingWeightByExercise = {};
  const incrementKgByExercise = {};
  const progressionWeeksByExercise = {};
  const exerciseLabels = {};
  for (const benchmark of activeBenchmarks(board || {})) {
    if (!benchmark.exerciseId) continue;
    exerciseLabels[benchmark.exerciseId] = benchmark.label || benchmark.exerciseId;
    if (benchmark.program === 'wendler' && Number(benchmark.wendler?.oneRmKg) > 0) {
      startingOneRmByExercise[benchmark.exerciseId] = Number(benchmark.wendler.oneRmKg);
    } else {
      startingWeightByExercise[benchmark.exerciseId] = Number(benchmark.seed?.volume?.kg) || 0;
      incrementKgByExercise[benchmark.exerciseId] = Number(benchmark.incrementKg) || 0;
      progressionWeeksByExercise[benchmark.exerciseId] = Number(benchmark.progressionWeeks) || SEASON_NORMAL_PROGRESSION_WEEKS;
    }
  }
  return {
    schemaVersion: 2,
    seasonId: season?.id || board?.seasonId || null,
    createdAt,
    createdFromSeasonId,
    clientRequestId,
    programVersion: W863_ORIGINAL_VERSION,
    weeklySessionTarget: Math.max(1, Math.round(Number(weeklySessionTarget) || 3)),
    registeredExerciseIds: Array.from(new Set((registeredExerciseIds || []).map(String).filter(Boolean))),
    startingOneRmByExercise,
    startingWeightByExercise,
    incrementKgByExercise,
    progressionWeeksByExercise,
    exerciseLabels,
  };
}
