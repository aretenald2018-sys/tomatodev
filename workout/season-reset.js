import {
  activeBenchmarks,
  buildBoardFromOnboarding,
  currentKgOf,
  mondayOf,
} from './test-v2/board-core.js';
import {
  W863_ORIGINAL_VERSION,
  normalizeW863OriginalConfig,
} from './w863-original.js';

function _clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function _positive(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function _overrideFor(overrides, benchmark) {
  if (!overrides || typeof overrides !== 'object') return {};
  return overrides[benchmark.id]
    || overrides[benchmark.exerciseId]
    || overrides[benchmark.movementId]
    || {};
}

function _trackSeed(previousBoard, benchmark, track, override = {}) {
  const current = currentKgOf(previousBoard, benchmark, track);
  const requested = override?.tracks?.[track] || override?.[track] || {};
  return {
    kg: _positive(requested.kg ?? requested.startKg, _positive(current?.kg, _positive(benchmark.seed?.[track]?.kg))),
    reps: Math.max(1, Math.round(_positive(
      requested.reps ?? requested.startReps,
      _positive(current?.reps, _positive(benchmark.seed?.[track]?.reps, track === 'intensity' ? 8 : 12)),
    ))),
  };
}

function _wendlerConfig(benchmark, override, startDate) {
  const requested = override?.wendler || override || {};
  return normalizeW863OriginalConfig({
    ..._clone(benchmark.wendler || {}),
    ...requested,
    scheme: 'w863',
    templateVersion: W863_ORIGINAL_VERSION,
    cycleNo: 1,
    startWeek: 1,
    programStartDate: startDate,
    tmAnchors: [],
  }, {
    profileId: requested.profileId,
    movementId: benchmark.movementId,
    exerciseId: benchmark.exerciseId,
    label: benchmark.label,
    primaryMajor: benchmark.groupId,
  });
}

export function seasonResetPreview(previousBoard = null, selectedExerciseIds = null) {
  const selected = selectedExerciseIds == null
    ? null
    : new Set((Array.isArray(selectedExerciseIds) ? selectedExerciseIds : []).map(String));
  const benchmarks = activeBenchmarks(previousBoard || {}).filter((benchmark) => (
    selected == null || selected.has(String(benchmark.exerciseId || benchmark.id))
  ));
  return {
    registeredPlanCount: benchmarks.length,
    wendlerCount: benchmarks.filter(benchmark => benchmark.program === 'wendler').length,
    trackCount: benchmarks
      .filter(benchmark => benchmark.program !== 'wendler')
      .reduce((sum, benchmark) => sum + Math.max(1, benchmark.tracks?.length || 0), 0),
    preservedExerciseIds: benchmarks.map(benchmark => benchmark.exerciseId).filter(Boolean),
  };
}

export function buildSeasonWorkoutBoard({
  previousBoard = null,
  seasonId,
  startDate,
  selectedExerciseIds = null,
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
  const selections = activeBenchmarks(previousBoard || {})
    .filter((benchmark) => selected == null || selected.has(String(benchmark.exerciseId || benchmark.id)))
    .map((benchmark) => {
      const override = _overrideFor(overrides, benchmark);
      const tracks = {};
      for (const track of (benchmark.program === 'wendler' ? ['volume'] : (benchmark.tracks || ['volume']))) {
        tracks[track] = _trackSeed(previousBoard, benchmark, track, override);
      }
      return {
        exerciseId: benchmark.exerciseId || null,
        movementId: benchmark.movementId || null,
        muscleId: benchmark.muscleId || null,
        groupId: benchmark.groupId,
        label: benchmark.label,
        short: benchmark.short,
        tracks,
        incrementKg: _positive(override.incrementKg, _positive(benchmark.incrementKg)),
        meta: _clone(benchmark.meta || {}),
        ...(benchmark.program === 'wendler'
          ? { wendler: _wendlerConfig(benchmark, override, programStartDate) }
          : {}),
      };
    });

  const board = buildBoardFromOnboarding({
    selections,
    startDate: programStartDate,
    source: `season:${String(seasonId || 'unknown')}`,
  });
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
  const exerciseLabels = {};
  for (const benchmark of activeBenchmarks(board || {})) {
    if (!benchmark.exerciseId) continue;
    exerciseLabels[benchmark.exerciseId] = benchmark.label || benchmark.exerciseId;
    if (benchmark.program === 'wendler' && Number(benchmark.wendler?.oneRmKg) > 0) {
      startingOneRmByExercise[benchmark.exerciseId] = Number(benchmark.wendler.oneRmKg);
    }
  }
  return {
    schemaVersion: 1,
    seasonId: season?.id || board?.seasonId || null,
    createdAt,
    createdFromSeasonId,
    clientRequestId,
    programVersion: W863_ORIGINAL_VERSION,
    weeklySessionTarget: Math.max(1, Math.round(Number(weeklySessionTarget) || 3)),
    registeredExerciseIds: Array.from(new Set((registeredExerciseIds || []).map(String).filter(Boolean))),
    startingOneRmByExercise,
    exerciseLabels,
  };
}
