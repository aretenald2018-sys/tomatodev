// TomatoDev-only Firestore setting keys for workout seasons.
// Legacy Tomato Farm keys may be read as an in-memory seed, but every write
// must use one of the keys exported from this module.

export const TOMATODEV_SEASON_REGISTRY_KEY = 'tomatodev_season_registry_v3';
export const TOMATODEV_ACTIVE_SEASON_BOARD_KEY = 'tomatodev_test_board_v3';

function _seasonId(value) {
  const id = String(value || '').trim();
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new TypeError('invalid season id');
  return id;
}

export function tomatoDevSeasonWorkoutPlanKey(seasonId) {
  return `tomatodev_season_${_seasonId(seasonId)}_workout_plan_v4`;
}

export function tomatoDevSeasonBoardKey(seasonId) {
  return `tomatodev_season_${_seasonId(seasonId)}_test_board_v3`;
}

export function tomatoDevSeasonRunningPlanKey(seasonId) {
  return `tomatodev_season_${_seasonId(seasonId)}_running_plan_v3`;
}

export function legacySeasonWorkoutPlanKey(seasonId) {
  return `season_${_seasonId(seasonId)}_workout_plan`;
}

export function legacySeasonBoardKey(seasonId) {
  return `season_${_seasonId(seasonId)}_test_board_v2`;
}

export function legacySeasonRunningPlanKey(seasonId) {
  return `season_${_seasonId(seasonId)}_running_plan`;
}

export function isTomatoDevSeasonSettingKey(key) {
  return key === TOMATODEV_SEASON_REGISTRY_KEY
    || key === TOMATODEV_ACTIVE_SEASON_BOARD_KEY
    || /^tomatodev_season_.+_(?:workout_plan_v4|test_board_v3|running_plan_v3)$/.test(String(key || ''));
}

function _hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function _positive(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function _nonNegative(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function _sanitizeMigratedRunningPlan(value = {}, season = {}) {
  const explicitTargetPace = _positive(value.targetPaceSecPerKm);
  const explicitBaselinePace = _positive(value.baselinePaceSecPerKm);
  const seasonStartDate = String(season.startDate || '');
  const seasonEndDate = String(season.endDate || '');
  const requestedStartDate = /^\d{4}-\d{2}-\d{2}$/.test(String(value.startDate || ''))
    ? String(value.startDate)
    : seasonStartDate;
  const requestedEndDate = /^\d{4}-\d{2}-\d{2}$/.test(String(value.endDate || ''))
    ? String(value.endDate)
    : seasonEndDate;
  const startDate = requestedStartDate >= seasonStartDate && requestedStartDate <= seasonEndDate
    ? requestedStartDate
    : seasonStartDate;
  const endDate = requestedEndDate >= startDate && requestedEndDate <= seasonEndDate
    ? requestedEndDate
    : seasonEndDate;
  const adaptiveRate = Number(value.adaptiveRatePct);
  return {
    schemaVersion: 3,
    seasonId: String(value.seasonId || season.id || ''),
    createdAt: value.createdAt ?? season.createdAt ?? null,
    ...(value.updatedAt != null ? { updatedAt: value.updatedAt } : {}),
    clientRequestId: value.clientRequestId ?? season.clientRequestId ?? null,
    goalType: 'pace',
    paceMode: value.paceMode === 'manual' ? 'manual' : 'adaptive-weekly',
    targetPaceSecPerKm: explicitTargetPace ? Math.round(explicitTargetPace) : null,
    baselinePaceSecPerKm: explicitBaselinePace ? Math.round(explicitBaselinePace) : null,
    adaptiveRatePct: [0.5, 1, 1.5].includes(adaptiveRate) ? adaptiveRate : 1,
    referenceDistanceKm: Math.round(_positive(value.referenceDistanceKm, 5) * 100) / 100,
    startDate,
    endDate,
    recoveryEveryWeeks: Math.max(0, Math.round(Number(value.recoveryEveryWeeks) || 4)),
    paceCheckWeekday: Math.max(0, Math.min(6, Math.round(Number(value.paceCheckWeekday ?? 3)))),
    heartRateCautionBpm: _positive(value.heartRateCautionBpm),
    baselineWeeklyDistanceKm: _nonNegative(value.baselineWeeklyDistanceKm),
    weeklyDistanceKm: Math.round(_positive(value.weeklyDistanceKm, 20) * 10) / 10,
    weeklySessions: Math.max(1, Math.round(_positive(value.weeklySessions, 3))),
    longestRunKm: _positive(value.longestRunKm),
    speedSessionsPerWeek: Math.max(0, Math.round(_nonNegative(value.speedSessionsPerWeek, 1))),
    optionalDurationMin: _positive(value.optionalDurationMin),
  };
}

/**
 * Plans a one-way, create-if-missing copy from legacy season settings into
 * TomatoDev-only keys. The caller must still re-check destination existence
 * inside a transaction before writing any entry.
 */
export function buildMissingTomatoDevSeasonMigrationEntries(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const entries = {};
  const copyMissing = (targetKey, sourceKey, transform = value => value) => {
    if (_hasOwn(source, targetKey) || !_hasOwn(source, sourceKey) || source[sourceKey] == null) return;
    entries[targetKey] = transform(source[sourceKey]);
  };

  copyMissing(TOMATODEV_SEASON_REGISTRY_KEY, 'season_registry');
  copyMissing(TOMATODEV_ACTIVE_SEASON_BOARD_KEY, 'test_board_v2');

  const registry = _hasOwn(source, TOMATODEV_SEASON_REGISTRY_KEY)
    ? source[TOMATODEV_SEASON_REGISTRY_KEY]
    : source.season_registry;
  for (const season of (Array.isArray(registry?.seasons) ? registry.seasons : [])) {
    const seasonId = String(season?.id || '').trim();
    if (!seasonId || !/^[a-zA-Z0-9_-]+$/.test(seasonId)) continue;
    copyMissing(tomatoDevSeasonWorkoutPlanKey(seasonId), legacySeasonWorkoutPlanKey(seasonId));
    copyMissing(tomatoDevSeasonBoardKey(seasonId), legacySeasonBoardKey(seasonId));
    copyMissing(
      tomatoDevSeasonRunningPlanKey(seasonId),
      legacySeasonRunningPlanKey(seasonId),
      value => _sanitizeMigratedRunningPlan(value, season),
    );
  }
  return entries;
}
