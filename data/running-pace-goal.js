import { addSeasonDays, isSeasonDateKey, startOfSeasonWeek } from './season-model.js';

export const RUNNING_PACE_PLAN_SCHEMA_VERSION = 3;
export const RUNNING_ADAPTIVE_RATE_OPTIONS = Object.freeze([0.5, 1, 1.5]);
export const RUNNING_ADAPTIVE_MAX_STEP_SEC = 5;
export const RUNNING_BASELINE_MIN_SAMPLES = 3;
export const RUNNING_BASELINE_LOOKBACK_DAYS = 28;

function _positive(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function _median(values = []) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function _referenceDistance(plan = {}) {
  return Math.max(1, _positive(plan.referenceDistanceKm, 5));
}

export function isComparablePaceActivity(activity = {}, referenceDistanceKm = 5) {
  const distance = _positive(activity.distanceKm);
  const pace = _positive(activity.avgPaceSecPerKm);
  const reference = Math.max(1, _positive(referenceDistanceKm, 5));
  return !!distance && !!pace && distance >= reference * 0.75 && distance <= reference * 1.25;
}

export function deriveComparablePaceBaseline(activities = [], options = {}) {
  const referenceDistanceKm = Math.max(1, _positive(options.referenceDistanceKm, 5));
  const asOfDate = isSeasonDateKey(options.asOfDate)
    ? options.asOfDate
    : [...activities].map(item => item?.dateKey).filter(isSeasonDateKey).sort().at(-1);
  if (!asOfDate) return { status: 'collecting', sampleCount: 0, paceSecPerKm: null, activities: [] };
  const fromDate = addSeasonDays(asOfDate, -(RUNNING_BASELINE_LOOKBACK_DAYS - 1));
  const comparable = (Array.isArray(activities) ? activities : []).filter(activity => (
    isSeasonDateKey(activity?.dateKey)
    && fromDate <= activity.dateKey
    && activity.dateKey <= asOfDate
    && isComparablePaceActivity(activity, referenceDistanceKm)
  ));
  const paceSecPerKm = _median(comparable.map(activity => activity.avgPaceSecPerKm));
  return {
    status: comparable.length >= RUNNING_BASELINE_MIN_SAMPLES ? 'ready' : 'collecting',
    sampleCount: comparable.length,
    paceSecPerKm: comparable.length >= RUNNING_BASELINE_MIN_SAMPLES ? paceSecPerKm : null,
    referenceDistanceKm,
    fromDate,
    throughDate: asOfDate,
    activities: comparable,
  };
}

export function normalizeRunningPacePlan(value = {}, season = {}) {
  const paceMode = value.paceMode === 'manual' ? 'manual' : 'adaptive-weekly';
  const adaptiveRate = Number(value.adaptiveRatePct);
  const adaptiveRatePct = RUNNING_ADAPTIVE_RATE_OPTIONS.includes(adaptiveRate) ? adaptiveRate : 1;
  const baseline = _positive(value.baselinePaceSecPerKm);
  const target = _positive(value.targetPaceSecPerKm, baseline);
  const startDate = isSeasonDateKey(value.startDate) ? value.startDate : season.startDate;
  const endDate = isSeasonDateKey(value.endDate) ? value.endDate : season.endDate;
  return {
    paceMode,
    targetPaceSecPerKm: target ? Math.round(target) : null,
    baselinePaceSecPerKm: baseline ? Math.round(baseline) : null,
    adaptiveRatePct,
    referenceDistanceKm: Math.round(_referenceDistance(value) * 100) / 100,
    startDate,
    endDate,
    recoveryEveryWeeks: Math.max(0, Math.round(Number(value.recoveryEveryWeeks) || 4)),
    paceCheckWeekday: Math.max(0, Math.min(6, Math.round(Number(value.paceCheckWeekday ?? 3)))),
    heartRateCautionBpm: _positive(value.heartRateCautionBpm),
  };
}

function _weekRange(weekStart, plan) {
  return {
    startDate: weekStart < plan.startDate ? plan.startDate : weekStart,
    endDate: addSeasonDays(weekStart, 6) > plan.endDate ? plan.endDate : addSeasonDays(weekStart, 6),
  };
}

function _weekActivities(activities, range) {
  return activities.filter(activity => range.startDate <= activity.dateKey && activity.dateKey <= range.endDate);
}

function _weekday(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function _paceCheck(activities, referenceDistanceKm, paceCheckWeekday) {
  const comparable = activities.filter(activity => isComparablePaceActivity(activity, referenceDistanceKm));
  const explicit = comparable.filter(activity => activity.paceCheck === true || activity.runPaceCheck === true);
  const scheduled = comparable.filter(activity => _weekday(activity.dateKey) === paceCheckWeekday);
  const source = explicit.length ? explicit : scheduled;
  if (!source.length) return null;
  return [...source].sort((left, right) => (
    Number(left.avgPaceSecPerKm) - Number(right.avgPaceSecPerKm)
    || String(left.dateKey).localeCompare(String(right.dateKey))
  ))[0];
}

function _weekDistance(activities = []) {
  return Math.round(activities.reduce((sum, activity) => sum + (Number(activity.distanceKm) || 0), 0) * 100) / 100;
}

function _weeklyDistanceLoad(activities = [], weekStart, plan = {}) {
  const previousStart = addSeasonDays(weekStart, -7);
  const previousEnd = addSeasonDays(weekStart, -1);
  const previousWeekComplete = isSeasonDateKey(plan.startDate)
    && isSeasonDateKey(plan.endDate)
    && plan.startDate <= previousStart
    && previousEnd <= plan.endDate;
  const previousDistanceKm = _weekDistance(_weekActivities(activities, {
    startDate: previousStart,
    endDate: previousEnd,
  }));
  const currentDistanceKm = _weekDistance(_weekActivities(activities, {
    startDate: weekStart,
    endDate: addSeasonDays(weekStart, 6),
  }));
  return {
    previousDistanceKm,
    currentDistanceKm,
    previousWeekComplete,
    spike: previousWeekComplete
      && previousDistanceKm > 0
      && currentDistanceKm > previousDistanceKm * 1.1,
  };
}

function _hasSingleRunDistanceSpike(activities = [], weekActivities = []) {
  return weekActivities.some((activity) => {
    const distanceKm = _positive(activity.distanceKm);
    if (!distanceKm || !isSeasonDateKey(activity.dateKey)) return false;
    const lookbackStart = addSeasonDays(activity.dateKey, -30);
    const priorLongestKm = activities
      .filter(prior => (
        isSeasonDateKey(prior?.dateKey)
        && lookbackStart <= prior.dateKey
        && prior.dateKey < activity.dateKey
      ))
      .reduce((longest, prior) => Math.max(longest, _positive(prior.distanceKm) || 0), 0);
    return priorLongestKm > 0 && distanceKm > priorLongestKm * 1.1;
  });
}

function _recentComparableMedian(activities, referenceDistanceKm, throughDate) {
  return deriveComparablePaceBaseline(activities, { referenceDistanceKm, asOfDate: throughDate }).paceSecPerKm;
}

export function evaluateRunningPaceGoal({ plan: rawPlan = {}, activities = [], season = {}, todayKey } = {}) {
  const plan = normalizeRunningPacePlan(rawPlan, season);
  const windowValid = isSeasonDateKey(plan.startDate) && isSeasonDateKey(plan.endDate) && plan.startDate <= plan.endDate;
  const sorted = (Array.isArray(activities) ? activities : [])
    .filter(activity => isSeasonDateKey(activity?.dateKey))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
  const baselineResult = deriveComparablePaceBaseline(sorted, {
    referenceDistanceKm: plan.referenceDistanceKm,
    asOfDate: isSeasonDateKey(plan.startDate) ? addSeasonDays(plan.startDate, -1) : todayKey,
  });
  const baselinePaceSecPerKm = plan.baselinePaceSecPerKm || baselineResult.paceSecPerKm;
  let targetPaceSecPerKm = plan.targetPaceSecPerKm || baselinePaceSecPerKm;
  if (!windowValid || !isSeasonDateKey(todayKey) || !targetPaceSecPerKm) {
    return {
      schemaVersion: RUNNING_PACE_PLAN_SCHEMA_VERSION,
      mode: plan.paceMode,
      status: 'collecting',
      baseline: baselineResult,
      targetPaceSecPerKm: targetPaceSecPerKm || null,
      weeks: [],
    };
  }

  const firstWeek = startOfSeasonWeek(plan.startDate);
  const currentWeek = startOfSeasonWeek(todayKey);
  const weeks = [];
  let cursor = firstWeek;
  let consecutiveMisses = 0;
  let weekNumber = 1;
  while (cursor <= plan.endDate) {
    const range = _weekRange(cursor, plan);
    const records = _weekActivities(sorted, range);
    const check = _paceCheck(records, plan.referenceDistanceKm, plan.paceCheckWeekday);
    const distanceKm = _weekDistance(records);
    const completed = addSeasonDays(cursor, 6) < currentWeek || cursor < currentWeek;
    const future = cursor > currentWeek;
    const recovery = plan.paceMode === 'adaptive-weekly'
      && plan.recoveryEveryWeeks > 0
      && weekNumber % plan.recoveryEveryWeeks === 0;
    const loadSpike = _hasSingleRunDistanceSpike(sorted, records);
    const weeklyDistanceLoad = _weeklyDistanceLoad(sorted, cursor, plan);
    const weekTargetPaceSecPerKm = Math.round(targetPaceSecPerKm);
    let state = future ? 'future' : completed ? 'missed' : 'planned';
    let holdReason = null;
    const actualPaceSecPerKm = check ? Math.round(Number(check.avgPaceSecPerKm)) : null;
    if (check) state = actualPaceSecPerKm <= weekTargetPaceSecPerKm ? 'achieved' : 'attempted';
    else if (completed) state = 'missed';

    if (plan.paceMode === 'adaptive-weekly' && completed) {
      if (recovery) {
        holdReason = 'recovery-week';
        consecutiveMisses = 0;
      } else if (loadSpike) {
        holdReason = 'single-run-distance-spike';
        consecutiveMisses = 0;
      } else if (weeklyDistanceLoad.spike) {
        holdReason = 'weekly-distance-spike';
        consecutiveMisses = 0;
      } else if (!check) {
        holdReason = 'insufficient-sample';
      } else if (state === 'achieved') {
        const improvement = Math.min(
          RUNNING_ADAPTIVE_MAX_STEP_SEC,
          Math.max(1, Math.round(weekTargetPaceSecPerKm * (plan.adaptiveRatePct / 100))),
        );
        targetPaceSecPerKm = Math.max(1, weekTargetPaceSecPerKm - improvement);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses += 1;
        holdReason = 'target-missed';
        if (consecutiveMisses >= 2) {
          const resetPace = _recentComparableMedian(sorted, plan.referenceDistanceKm, range.endDate);
          if (resetPace) targetPaceSecPerKm = Math.max(targetPaceSecPerKm, resetPace);
          holdReason = 'two-miss-reset';
          consecutiveMisses = 0;
        }
      }
    }

    const avgHeartRateBpm = _positive(check?.avgHeartRateBpm);
    weeks.push({
      weekStart: cursor,
      weekEnd: range.endDate,
      weekNumber,
      state,
      recovery,
      holdReason,
      targetPaceSecPerKm: weekTargetPaceSecPerKm,
      nextTargetPaceSecPerKm: Math.round(targetPaceSecPerKm),
      actualPaceSecPerKm,
      avgHeartRateBpm: avgHeartRateBpm ? Math.round(avgHeartRateBpm) : null,
      heartRateCaution: !!(avgHeartRateBpm && plan.heartRateCautionBpm && avgHeartRateBpm >= plan.heartRateCautionBpm),
      distanceKm,
      previousWeekDistanceKm: weeklyDistanceLoad.previousDistanceKm,
      previousWeekComplete: weeklyDistanceLoad.previousWeekComplete,
      weeklyDistanceSpike: weeklyDistanceLoad.spike,
      sampleCount: records.filter(activity => isComparablePaceActivity(activity, plan.referenceDistanceKm)).length,
      inferredPaceCheck: !!check && !(check.paceCheck === true || check.runPaceCheck === true),
    });
    cursor = addSeasonDays(cursor, 7);
    weekNumber += 1;
  }

  const current = weeks.find(week => week.weekStart === currentWeek)
    || weeks.find(week => week.weekStart > currentWeek)
    || weeks.at(-1)
    || null;
  return {
    schemaVersion: RUNNING_PACE_PLAN_SCHEMA_VERSION,
    mode: plan.paceMode,
    status: current?.state || 'collecting',
    startDate: plan.startDate,
    endDate: plan.endDate,
    referenceDistanceKm: plan.referenceDistanceKm,
    adaptiveRatePct: plan.adaptiveRatePct,
    paceCheckWeekday: plan.paceCheckWeekday,
    baselinePaceSecPerKm,
    targetPaceSecPerKm: current?.targetPaceSecPerKm || targetPaceSecPerKm,
    nextTargetPaceSecPerKm: current?.nextTargetPaceSecPerKm || targetPaceSecPerKm,
    actualPaceSecPerKm: current?.actualPaceSecPerKm || null,
    avgHeartRateBpm: current?.avgHeartRateBpm || null,
    heartRateCaution: !!current?.heartRateCaution,
    baseline: baselineResult,
    weeks,
  };
}

export function formatPaceSecPerKm(value) {
  const seconds = Math.round(Number(value));
  if (!(seconds > 0)) return '설정 전';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}/km`;
}
