import { isExerciseDaySuccess } from '../calc.js';
import {
  activeBenchmarks,
  activeCycleOf,
  mondayOf,
  weekIndexOf,
} from '../workout/test-v2/board-core.js';
import {
  addSeasonDays,
  findSeasonForDate,
  seasonContainsDate,
} from './season-model.js';
import {
  calcSeasonWorkoutStreak,
  selectSeasonRunningStats,
  selectSeasonStrengthStats,
} from './season-selectors.js';
import { buildSeasonGoalOverview } from './season-overview.js';

function _round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function _daysBetween(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 86400000)) : 0;
}

function _weekStatuses(cache, season, todayKey) {
  const start = mondayOf(todayKey);
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = addSeasonDays(start, index);
    return {
      dateKey,
      inSeason: seasonContainsDate(season, dateKey),
      done: dateKey <= todayKey && seasonContainsDate(season, dateKey) && isExerciseDaySuccess(cache?.[dateKey]),
      today: dateKey === todayKey,
      future: dateKey > todayKey,
    };
  });
}

function _boardWeek(board, todayKey) {
  const benchmarks = activeBenchmarks(board || {});
  const cycle = benchmarks.length ? activeCycleOf(board, benchmarks[0].groupId) : null;
  return cycle ? Math.max(1, weekIndexOf(cycle, todayKey)) : null;
}

function _nextPlan(board, runningStats) {
  const benchmark = activeBenchmarks(board || {})[0] || null;
  const health = benchmark
    ? `${benchmark.label || '헬스'}${benchmark.program === 'wendler' ? ' 웬들러' : ''}`
    : '헬스 계획 확인';
  const remainingDistance = Math.max(
    0,
    Number(runningStats?.currentWeek?.distance?.target || 0) - Number(runningStats?.currentWeek?.distance?.actual || 0),
  );
  return {
    health,
    running: remainingDistance > 0 ? `러닝 ${_round(remainingDistance, 1)}km 남음` : '러닝 주간 목표 완료',
  };
}

export function buildSeasonDashboardSnapshot({
  cache = {},
  registry = {},
  todayKey,
  workoutPlan = {},
  runningPlan = {},
  board = null,
  generatedAt = Date.now(),
} = {}) {
  const season = findSeasonForDate(registry, todayKey);
  if (!season) {
    return {
      schemaVersion: 1,
      generatedAt,
      state: 'no-season',
      message: '새 시즌을 설정해 주세요',
    };
  }
  const streak = calcSeasonWorkoutStreak(cache, registry, todayKey);
  const running = selectSeasonRunningStats(cache, registry, todayKey, runningPlan);
  const strength = selectSeasonStrengthStats(cache, registry, todayKey, workoutPlan);
  const readyLiftDeltas = strength.liftDeltas.filter(row => Number.isFinite(row.deltaKg));
  const liftDeltaKg = readyLiftDeltas.length
    ? readyLiftDeltas.sort((left, right) => Math.abs(right.deltaKg) - Math.abs(left.deltaKg))[0].deltaKg
    : null;
  const week = _boardWeek(board, todayKey);
  const overview = buildSeasonGoalOverview({
    cache,
    season,
    board,
    workoutPlan,
    runningPlan,
    todayKey,
  });
  return {
    // Native SeasonWidgetPlugin intentionally accepts schema v1. New fields
    // remain optional additions so older widget parsers keep working.
    schemaVersion: 1,
    generatedAt,
    state: 'ready',
    season: {
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      daysRemaining: _daysBetween(todayKey, season.endDate),
      week,
    },
    streak: {
      current: streak.current,
      best: streak.best,
      todayDone: streak.todayDone,
      week: _weekStatuses(cache, season, todayKey),
    },
    running: {
      distance: running.currentWeek.distance,
      sessions: running.currentWeek.sessions,
      trend: running.trend,
      goal: {
        mode: overview.running?.mode || runningPlan?.paceMode || null,
        targetPaceSecPerKm: overview.running?.targetPaceSecPerKm || runningPlan?.targetPaceSecPerKm || null,
        baselinePaceSecPerKm: overview.running?.baselinePaceSecPerKm || runningPlan?.baselinePaceSecPerKm || null,
        adaptiveRatePct: overview.running?.adaptiveRatePct || runningPlan?.adaptiveRatePct || null,
        actualPaceSecPerKm: overview.running?.actualPaceSecPerKm || null,
        avgHeartRateBpm: overview.running?.avgHeartRateBpm || null,
        heartRateCaution: !!overview.running?.heartRateCaution,
        status: overview.running?.status || 'collecting',
      },
    },
    strength: {
      sessions: strength.currentWeek.sessions,
      totalVolumeKg: strength.currentWeek.totalVolumeKg,
      volumeTrend: strength.volumeTrend,
      liftDeltaKg,
      liftDeltas: strength.liftDeltas,
    },
    nextPlan: _nextPlan(board, running),
    seasonGoals: overview.seasonGoals,
  };
}
