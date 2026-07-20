import { calcDietMetrics, calcWeeklyDietMacroChange, isExerciseDaySuccess } from '../calc.js';
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


function _dietTotal(day, suffix) {
  return ["b", "l", "d", "s"].reduce((sum, prefix) => sum + (Number(day?.[prefix + suffix]) || 0), 0);
}

function _dietMealCount(rawDay = {}) {
  const rows = [
    ["breakfast", "b"],
    ["lunch", "l"],
    ["dinner", "d"],
    ["snack", "s"],
  ];
  return rows.reduce((count, [slot, prefix]) => {
    const foods = Array.isArray(rawDay[prefix + "Foods"]) ? rawDay[prefix + "Foods"].length : 0;
    const hasMeal = Boolean(
      rawDay[slot] ||
      Number(rawDay[prefix + "Kcal"]) > 0 ||
      foods > 0 ||
      rawDay[prefix + "Photo"] ||
      rawDay[slot + "_skipped"] ||
      rawDay[prefix + "Skipped"]
    );
    return count + (hasMeal ? 1 : 0);
  }, 0);
}

function _dietProgress(actual, target) {
  return target > 0 ? Math.max(0, Math.min(100, Math.round((actual / target) * 100))) : 0;
}

function _buildDietSummary(input = {}) {
  const plan = input.plan || {};
  if (plan._userSet === false || !input.plan) {
    return { state: "no-plan", message: "\uBAA9\uD45C\uB97C \uC124\uC815\uD574\uC8FC\uC138\uC694" };
  }
  const metrics = calcDietMetrics(plan);
  const dateParts = String(input.todayKey || "").split("-").map(Number);
  const dow = dateParts.length === 3
    ? new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])).getUTCDay()
    : 0;
  const target = (plan.refeedDays || []).includes(dow) ? metrics.refeed : metrics.deficit;
  const today = input.todayDiet || {};
  const actual = {
    kcal: _dietTotal(today, "Kcal"),
    carbsG: _dietTotal(today, "Carbs"),
    proteinG: _dietTotal(today, "Protein"),
    fatG: _dietTotal(today, "Fat"),
    mealCount: _dietMealCount(input.todayRawDay || {}),
  };
  const targetValues = {
    kcal: Number(target?.kcal) || 0,
    carbsG: Number(target?.carbG) || 0,
    proteinG: Number(target?.proteinG) || 0,
    fatG: Number(target?.fatG) || 0,
    mealCount: 4,
  };
  return {
    state: "ready",
    today: {
      actual,
      target: targetValues,
      progress: {
        kcal: _dietProgress(actual.kcal, targetValues.kcal),
        carbs: _dietProgress(actual.carbsG, targetValues.carbsG),
        protein: _dietProgress(actual.proteinG, targetValues.proteinG),
        fat: _dietProgress(actual.fatG, targetValues.fatG),
        mealCount: _dietProgress(actual.mealCount, targetValues.mealCount),
      },
    },
    proteinChange: calcWeeklyDietMacroChange(
      input.thisWeekDietDays,
      input.lastWeekDietDays
    ),
  };
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
  diet = null,
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
  const paceGoalMode = runningPlan?.paceGoalMode === 'adaptive' ? 'adaptive' : 'fixed';
  const actualPaceSecPerKm = Number(running.currentWeek?.summary?.avgPaceSecPerKm) || null;
  const baselinePaceSecPerKm = Number(running.trend?.recent?.avgPaceSecPerKm)
    || Number(running.trend?.previous?.avgPaceSecPerKm)
    || null;
  const targetPaceSecPerKm = paceGoalMode === 'adaptive'
    ? (baselinePaceSecPerKm && Number(runningPlan?.adaptiveRatePct) > 0
      ? Math.round(baselinePaceSecPerKm * (1 - Math.min(10, Number(runningPlan.adaptiveRatePct)) / 100))
      : null)
    : (Number(runningPlan?.targetPaceSecPerKm) > 0 ? Number(runningPlan.targetPaceSecPerKm) : null);
  const dietSummary = _buildDietSummary({ ...(diet || {}), todayKey });
  const benchmarkCount = activeBenchmarks(board || {}).length;
  const week = _boardWeek(board, todayKey);
  return {
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
        mode: paceGoalMode,
        targetPaceSecPerKm,
        baselinePaceSecPerKm,
        actualPaceSecPerKm,
        adaptiveRatePct: paceGoalMode === 'adaptive' ? Number(runningPlan?.adaptiveRatePct) || 2 : null,
      },
    },
    strength: {
      benchmarkCount,
      sessions: strength.currentWeek.sessions,
      totalVolumeKg: strength.currentWeek.totalVolumeKg,
      volumeTrend: strength.volumeTrend,
      liftDeltaKg,
      liftDeltas: strength.liftDeltas,
    },
    diet: dietSummary,
    nextPlan: _nextPlan(board, running),
  };
}
