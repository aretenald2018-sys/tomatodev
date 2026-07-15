import {
  SEASON_REGISTRY_SCHEMA_VERSION,
  addSeasonDays,
  assertSeasonRegistry,
  findSeasonById,
  findSeasonForDate,
  normalizeSeasonRegistry,
} from './season-model.js';
import {
  buildSeasonWorkoutBoard,
  buildSeasonWorkoutPlan,
} from '../workout/season-reset.js';
import { W863_ORIGINAL_VERSION } from '../workout/w863-original.js';

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

function _runningPlan(seasonId, value = {}, metadata = {}) {
  const distance = Number(value.weeklyDistanceKm);
  const sessions = Number(value.weeklySessions);
  const duration = Number(value.optionalDurationMin);
  return {
    schemaVersion: 1,
    seasonId,
    createdAt: metadata.createdAt,
    clientRequestId: metadata.clientRequestId,
    weeklyDistanceKm: Number.isFinite(distance) && distance > 0 ? Math.round(distance * 10) / 10 : 20,
    weeklySessions: Number.isFinite(sessions) && sessions > 0 ? Math.round(sessions) : 3,
    optionalDurationMin: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
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
  const board = buildSeasonWorkoutBoard({
    previousBoard,
    seasonId: season.id,
    startDate: season.startDate,
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
    runningPlan: _runningPlan(season.id, runningPlan, { createdAt, clientRequestId }),
  };
}
