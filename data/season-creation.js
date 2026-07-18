import {
  SEASON_REGISTRY_SCHEMA_VERSION,
  addSeasonDays,
  assertSeasonRegistry,
  findSeasonById,
  findSeasonForDate,
  isSeasonDateKey,
  normalizeExerciseSeasonWindows,
  normalizeSeasonRegistry,
  startOfSeasonWeek,
} from './season-model.js';
import { normalizeRunningPacePlan } from './running-pace-goal.js';
import {
  buildSeasonWorkoutBoard,
  buildSeasonWorkoutPlan,
} from '../workout/season-reset.js';
import { W863_ORIGINAL_VERSION } from '../workout/w863-original.js';

function _clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function normalizeSeasonRequestId(value) {
  const id = String(value || '').trim();
  if (!id) throw new TypeError('clientRequestId is required');
  return id.slice(0, 160);
}

function _generatedSeasonId(season, clientRequestId) {
  const requested = String(season?.id || '').trim();
  if (requested) return requested;
  const tail = String(clientRequestId).replace(/[^a-zA-Z0-9]/g, '').slice(-10) || Date.now().toString(36);
  return `season-${season.startDate}-${tail}`;
}

export function buildSeasonRunningPlan(seasonId, value = {}, metadata = {}) {
  const distance = Number(value.weeklyDistanceKm);
  const sessions = Number(value.weeklySessions);
  const duration = Number(value.optionalDurationMin);
  const baselineDistance = Number(value.baselineWeeklyDistanceKm);
  const longestRun = Number(value.longestRunKm);
  const speedSessions = Number(value.speedSessionsPerWeek);
  const pace = normalizeRunningPacePlan(value, metadata.season || {});
  const seasonStartDate = String(metadata.season?.startDate || '');
  const seasonEndDate = String(metadata.season?.endDate || '');
  if (seasonStartDate && seasonEndDate && (
    !pace.startDate
    || !pace.endDate
    || pace.startDate > pace.endDate
    || pace.startDate < seasonStartDate
    || pace.endDate > seasonEndDate
  )) {
    throw new RangeError('running season window must stay within the season');
  }
  return {
    schemaVersion: 3,
    seasonId,
    createdAt: metadata.createdAt ?? value.createdAt ?? Date.now(),
    ...(metadata.updatedAt ? { updatedAt: metadata.updatedAt } : {}),
    clientRequestId: metadata.clientRequestId ?? value.clientRequestId ?? null,
    goalType: 'pace',
    paceMode: pace.paceMode,
    targetPaceSecPerKm: pace.targetPaceSecPerKm,
    baselinePaceSecPerKm: pace.baselinePaceSecPerKm,
    adaptiveRatePct: pace.adaptiveRatePct,
    referenceDistanceKm: pace.referenceDistanceKm,
    startDate: pace.startDate,
    endDate: pace.endDate,
    recoveryEveryWeeks: pace.recoveryEveryWeeks,
    paceCheckWeekday: pace.paceCheckWeekday,
    heartRateCautionBpm: pace.heartRateCautionBpm,
    baselineWeeklyDistanceKm: Number.isFinite(baselineDistance) && baselineDistance >= 0
      ? Math.round(baselineDistance * 10) / 10
      : null,
    weeklyDistanceKm: Number.isFinite(distance) && distance > 0 ? Math.round(distance * 10) / 10 : 20,
    weeklySessions: Number.isFinite(sessions) && sessions > 0 ? Math.round(sessions) : 3,
    longestRunKm: Number.isFinite(longestRun) && longestRun > 0 ? Math.round(longestRun * 10) / 10 : null,
    speedSessionsPerWeek: Number.isFinite(speedSessions) && speedSessions >= 0 ? Math.round(speedSessions) : 1,
    optionalDurationMin: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
  };
}

function _benchmarkExerciseKey(benchmark = {}) {
  return String(benchmark.exerciseId || benchmark.movementId || benchmark.id || '');
}

function _stepTrackKey(exerciseKey, track) {
  return `${exerciseKey}|${String(track || 'volume')}`;
}

function _indexPreviousWeekLogs(previousBoard, previousBenchmarkKeyById) {
  const logsByTrack = new Map();
  for (const step of (previousBoard.steps || [])) {
    const exerciseKey = previousBenchmarkKeyById.get(step.benchmarkId) || step.benchmarkId;
    const trackKey = _stepTrackKey(exerciseKey, step.track);
    const indexed = logsByTrack.get(trackKey) || new Map();
    for (const [rawWeekStart, rawLog] of Object.entries(step.weekLog || {})) {
      if (!isSeasonDateKey(rawWeekStart) || rawLog == null) continue;
      const weekStart = startOfSeasonWeek(rawWeekStart);
      indexed.set(weekStart, {
        ...(indexed.get(weekStart) || {}),
        ..._clone(rawLog),
      });
    }
    logsByTrack.set(trackKey, indexed);
  }
  return logsByTrack;
}

function _stepContainsWeek(step, weekStart) {
  if (!isSeasonDateKey(step?.weekStart) || !isSeasonDateKey(weekStart)) return false;
  const span = Math.max(0, Math.round(Number(step.span) || 0));
  return span > 0
    && step.weekStart <= weekStart
    && weekStart < addSeasonDays(step.weekStart, span * 7);
}

export function preserveSeasonBoardProgress(nextBoard = {}, previousBoard = {}) {
  const previousBenchmarks = new Map((previousBoard.benchmarks || []).map(benchmark => [
    _benchmarkExerciseKey(benchmark),
    benchmark,
  ]));
  const previousBenchmarkKeyById = new Map((previousBoard.benchmarks || []).map(benchmark => [
    benchmark.id,
    _benchmarkExerciseKey(benchmark),
  ]));
  const previousWeekLogs = _indexPreviousWeekLogs(previousBoard, previousBenchmarkKeyById);
  const benchmarks = (nextBoard.benchmarks || []).map(benchmark => {
    const previous = previousBenchmarks.get(_benchmarkExerciseKey(benchmark));
    if (!previous) return benchmark;
    return {
      ...benchmark,
      ...(previous.wendlerLog ? { wendlerLog: _clone(previous.wendlerLog) } : {}),
    };
  });

  const previousSteps = new Map((previousBoard.steps || []).map(step => {
    const exerciseKey = previousBenchmarkKeyById.get(step.benchmarkId) || step.benchmarkId;
    return [`${exerciseKey}|${step.track}|${step.weekStart}`, step];
  }));
  const nextBenchmarkKeyById = new Map(benchmarks.map(benchmark => [benchmark.id, _benchmarkExerciseKey(benchmark)]));
  const nextStepsByTrack = new Map();
  for (const step of (nextBoard.steps || [])) {
    const exerciseKey = nextBenchmarkKeyById.get(step.benchmarkId) || step.benchmarkId;
    const trackKey = _stepTrackKey(exerciseKey, step.track);
    const trackSteps = nextStepsByTrack.get(trackKey) || [];
    trackSteps.push(step);
    nextStepsByTrack.set(trackKey, trackSteps);
  }
  for (const trackSteps of nextStepsByTrack.values()) {
    trackSteps.sort((left, right) => left.weekStart.localeCompare(right.weekStart));
  }
  const steps = (nextBoard.steps || []).map(step => {
    const exerciseKey = nextBenchmarkKeyById.get(step.benchmarkId) || step.benchmarkId;
    const previous = previousSteps.get(`${exerciseKey}|${step.track}|${step.weekStart}`);
    const trackKey = _stepTrackKey(exerciseKey, step.track);
    const indexedLogs = previousWeekLogs.get(trackKey) || new Map();
    const trackSteps = nextStepsByTrack.get(trackKey) || [];
    const isFirstTrackStep = trackSteps[0]?.id === step.id;
    const weekLog = Object.fromEntries(
      [...indexedLogs.entries()]
        .filter(([weekStart]) => (
          _stepContainsWeek(step, weekStart)
          || (isFirstTrackStep && !trackSteps.some(candidate => _stepContainsWeek(candidate, weekStart)))
        ))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([weekStart, log]) => [weekStart, _clone(log)]),
    );
    const sameCoverage = previous && Number(previous.span) === Number(step.span);
    return {
      ...step,
      weekLog,
      ...(sameCoverage && previous.state ? { state: previous.state } : {}),
    };
  });

  const previousCycles = new Map((previousBoard.cycles || []).map(cycle => [
    `${cycle.groupId}|${cycle.startDate}`,
    cycle,
  ]));
  const cycles = (nextBoard.cycles || []).map(cycle => {
    const previous = previousCycles.get(`${cycle.groupId}|${cycle.startDate}`);
    if (!previous) return cycle;
    return {
      ...cycle,
      ...(previous.status ? { status: previous.status } : {}),
      ...(previous.settledAt ? { settledAt: previous.settledAt } : {}),
    };
  });

  return {
    ...nextBoard,
    benchmarks,
    steps,
    cycles,
    lineups: _clone(previousBoard.lineups || nextBoard.lineups || {}),
    history: _clone(previousBoard.history || nextBoard.history || []),
    createdAt: previousBoard.createdAt ?? nextBoard.createdAt,
    updatedAt: Date.now(),
  };
}

export function prepareWorkoutSeasonCreation({
  season: rawSeason,
  clientRequestId: rawRequestId,
  registry = { schemaVersion: 2, seasons: [] },
  previousBoard = null,
  registeredExercises = [],
  registeredExerciseIds = [],
  selectedExerciseIds = null,
  benchmarkMappings = {},
  overrides = {},
  weeklySessionTarget = 3,
  runningPlan = {},
  exerciseSeasonWindowsByExercise = {},
  createdAt = Date.now(),
} = {}) {
  const clientRequestId = normalizeSeasonRequestId(rawRequestId);
  const season = {
    ...rawSeason,
    id: _generatedSeasonId(rawSeason || {}, clientRequestId),
    createdAt,
    sourceVersion: W863_ORIGINAL_VERSION,
    clientRequestId,
  };
  const existing = normalizeSeasonRegistry(registry).seasons.find(item => item.clientRequestId === clientRequestId);
  if (existing) return { duplicate: true, season: existing };
  const nextRegistry = assertSeasonRegistry({
    ...registry,
    schemaVersion: SEASON_REGISTRY_SCHEMA_VERSION,
    seasons: [...normalizeSeasonRegistry(registry).seasons, season],
  });
  const createdFromSeason = findSeasonForDate(registry, addSeasonDays(season.startDate, -1));
  const exerciseWindows = normalizeExerciseSeasonWindows(
    exerciseSeasonWindowsByExercise,
    season,
    selectedExerciseIds || registeredExerciseIds,
  );
  for (const exerciseId of (selectedExerciseIds || registeredExerciseIds || []).map(String)) {
    if (!exerciseWindows[exerciseId]) {
      throw new RangeError(`exercise season window must stay within the season: ${exerciseId}`);
    }
  }
  const board = buildSeasonWorkoutBoard({
    previousBoard,
    seasonId: season.id,
    startDate: season.startDate,
    endDate: season.endDate,
    exerciseSeasonWindowsByExercise: exerciseWindows,
    registeredExercises,
    selectedExerciseIds,
    benchmarkMappings,
    overrides,
    createdAt,
  });
  const workoutPlan = buildSeasonWorkoutPlan({
    season,
    board,
    registeredExerciseIds,
    weeklySessionTarget,
    exerciseSeasonWindowsByExercise: exerciseWindows,
    createdFromSeasonId: createdFromSeason?.id || null,
    clientRequestId,
    createdAt,
  });
  return {
    duplicate: false,
    season: findSeasonById(nextRegistry, season.id),
    registry: nextRegistry,
    board,
    workoutPlan,
    runningPlan: buildSeasonRunningPlan(season.id, runningPlan, { createdAt, clientRequestId, season }),
  };
}

export function prepareWorkoutSeasonUpdate({
  season: rawSeason,
  registry = { schemaVersion: 2, seasons: [] },
  previousBoard = null,
  existingWorkoutPlan = null,
  existingRunningPlan = null,
  registeredExercises = [],
  registeredExerciseIds = [],
  selectedExerciseIds = null,
  benchmarkMappings = {},
  overrides = {},
  weeklySessionTarget = 3,
  runningPlan = {},
  exerciseSeasonWindowsByExercise = null,
  updatedAt = Date.now(),
} = {}) {
  const seasonId = String(rawSeason?.id || '').trim();
  const current = findSeasonById(registry, seasonId);
  if (!current) throw new RangeError('season not found');
  const season = {
    ...current,
    ...rawSeason,
    id: current.id,
    createdAt: current.createdAt,
    clientRequestId: current.clientRequestId,
    sourceVersion: current.sourceVersion || W863_ORIGINAL_VERSION,
    updatedAt,
  };
  const nextRegistry = assertSeasonRegistry({
    ...registry,
    schemaVersion: SEASON_REGISTRY_SCHEMA_VERSION,
    seasons: normalizeSeasonRegistry(registry).seasons.map(item => item.id === seasonId ? season : item),
  });
  const exerciseWindows = normalizeExerciseSeasonWindows(
    exerciseSeasonWindowsByExercise || existingWorkoutPlan?.exerciseSeasonWindowsByExercise || {},
    season,
    selectedExerciseIds || registeredExerciseIds,
  );
  for (const exerciseId of (selectedExerciseIds || registeredExerciseIds || []).map(String)) {
    if (!exerciseWindows[exerciseId]) {
      throw new RangeError(`exercise season window must stay within the season: ${exerciseId}`);
    }
  }
  const rebuiltBoard = buildSeasonWorkoutBoard({
    previousBoard,
    seasonId,
    startDate: season.startDate,
    endDate: season.endDate,
    exerciseSeasonWindowsByExercise: exerciseWindows,
    registeredExercises,
    selectedExerciseIds,
    benchmarkMappings,
    overrides,
    createdAt: previousBoard?.createdAt ?? current.createdAt ?? updatedAt,
  });
  const board = preserveSeasonBoardProgress(rebuiltBoard, previousBoard || {});
  const workoutPlan = buildSeasonWorkoutPlan({
    season,
    board,
    registeredExerciseIds,
    weeklySessionTarget,
    exerciseSeasonWindowsByExercise: exerciseWindows,
    createdFromSeasonId: existingWorkoutPlan?.createdFromSeasonId || null,
    clientRequestId: current.clientRequestId || existingWorkoutPlan?.clientRequestId || null,
    createdAt: existingWorkoutPlan?.createdAt || current.createdAt || updatedAt,
  });
  workoutPlan.updatedAt = updatedAt;
  return {
    season: findSeasonById(nextRegistry, seasonId),
    registry: nextRegistry,
    board,
    workoutPlan,
    runningPlan: buildSeasonRunningPlan(seasonId, { ...existingRunningPlan, ...runningPlan }, {
      createdAt: existingRunningPlan?.createdAt || current.createdAt || updatedAt,
      updatedAt,
      clientRequestId: current.clientRequestId || existingRunningPlan?.clientRequestId || null,
      season,
    }),
  };
}
