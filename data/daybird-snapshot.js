import { listRunningActivities } from '../workout/running-analytics.js';

function _finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function _nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function buildTomatoDevNutritionSnapshot({ dayData = {}, targetKcal = 0 } = {}) {
  const sum = suffix => ['b', 'l', 'd', 's'].reduce(
    (total, prefix) => total + _nonNegative(dayData?.[`${prefix}${suffix}`]),
    0,
  );
  const actualKcal = Math.round(sum('Kcal'));
  const normalizedTargetKcal = Math.round(_nonNegative(targetKcal));
  return {
    actualKcal,
    targetKcal: normalizedTargetKcal,
    progress: normalizedTargetKcal > 0
      ? Math.min(100, Math.round((actualKcal / normalizedTargetKcal) * 100))
      : 0,
    proteinG: Math.round(sum('Protein') * 10) / 10,
    carbsG: Math.round(sum('Carbs') * 10) / 10,
    fatG: Math.round(sum('Fat') * 10) / 10,
  };
}

export function buildTomatoDevDaybirdSnapshot({
  seasonSnapshot = {},
  cache = {},
  nutrition = {},
  generatedAt = Date.now(),
  reason = 'scheduled',
} = {}) {
  const recent = listRunningActivities(Object.entries(cache || {}))
    .slice()
    .sort((left, right) => (
      right.dateKey.localeCompare(left.dateKey)
      || Number(right.startedAt || 0) - Number(left.startedAt || 0)
      || Number(right.sessionIndex || 0) - Number(left.sessionIndex || 0)
    ))
    .slice(0, 5)
    .map(activity => ({
      dateKey: activity.dateKey,
      distanceKm: Math.round((Number(activity.distanceKm) || 0) * 100) / 100,
      paceSecPerKm: _finiteOrNull(activity.avgPaceSecPerKm),
      avgHeartRateBpm: _finiteOrNull(activity.avgHeartRateBpm),
      cadenceSpm: _finiteOrNull(activity.cadenceSpm),
    }));
  const rawGoal = seasonSnapshot?.running?.goal || {};
  return {
    schemaVersion: 1,
    sourceEnvironment: 'tomatodev',
    generatedAt: Number(generatedAt) || Date.now(),
    reason: String(reason || 'scheduled').slice(0, 80),
    state: seasonSnapshot?.state === 'ready' ? 'ready' : 'no-season',
    season: seasonSnapshot?.season || null,
    seasonGoals: Array.isArray(seasonSnapshot?.seasonGoals) ? seasonSnapshot.seasonGoals : [],
    running: {
      ...(seasonSnapshot?.running || {}),
      goal: {
        mode: String(rawGoal.mode || 'collecting'),
        targetPaceSecPerKm: rawGoal.targetPaceSecPerKm ?? null,
        baselinePaceSecPerKm: rawGoal.baselinePaceSecPerKm ?? null,
        adaptiveRatePct: rawGoal.adaptiveRatePct ?? null,
        actualPaceSecPerKm: rawGoal.actualPaceSecPerKm ?? null,
        avgHeartRateBpm: rawGoal.avgHeartRateBpm ?? null,
        heartRateCaution: !!rawGoal.heartRateCaution,
        status: String(rawGoal.status || 'collecting'),
      },
      recent,
    },
    nutrition: buildTomatoDevNutritionSnapshot(nutrition),
    ...(seasonSnapshot?.strength ? { strength: seasonSnapshot.strength } : {}),
    ...(seasonSnapshot?.streak ? { streak: seasonSnapshot.streak } : {}),
    ...(seasonSnapshot?.nextPlan ? { nextPlan: seasonSnapshot.nextPlan } : {}),
  };
}
