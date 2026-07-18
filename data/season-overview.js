import {
  activeBenchmarks,
  activeCycleOf,
  addDays,
  addWeeks,
  expandColumnCells,
  mondayOf,
  trackSetsOf,
  weeksBetween,
} from '../workout/test-v2/board-core.js';
import { listRunningActivities } from '../workout/running-analytics.js';
import { getWorkoutSessions } from '../workout/sessions.js';
import { evaluateRunningPaceGoal, formatPaceSecPerKm } from './running-pace-goal.js';
import { isSeasonDateKey } from './season-model.js';

function _clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function _statusFromCell(cell, weekStart, todayWeek) {
  if (!cell || cell.kind === 'rest') return 'inactive';
  let raw = cell.state;
  if (cell.kind === 'stair' && Array.isArray(cell.weekStates)) {
    const index = weeksBetween(cell.weekStart, weekStart);
    raw = cell.weekStates[index] || raw;
  }
  if (raw === 'done') return 'achieved';
  if (raw === 'attempted') return 'attempted';
  if (raw === 'miss' || raw === 'past') return 'missed';
  if (weekStart > todayWeek) return 'future';
  if (weekStart < todayWeek) return 'missed';
  return 'planned';
}

function _cellForWeek(cells, weekStart) {
  return cells.find(cell => {
    const offset = weeksBetween(cell.weekStart, weekStart);
    return offset >= 0 && offset < Math.max(1, Number(cell.span) || 1);
  }) || null;
}

function _strengthGoalDetail(benchmark, track, cell) {
  if (benchmark.program === 'wendler') {
    return `${Number(cell?.kg) || 0}kg ${cell?.repsLabel || ''}`.trim();
  }
  const kg = Number(cell?.kg ?? benchmark.seed?.[track]?.kg) || 0;
  const reps = Number(cell?.reps ?? benchmark.seed?.[track]?.reps) || 0;
  return `${kg}kg · ${trackSetsOf(benchmark, track)}세트 × ${reps}회`;
}

function _windowOf(benchmark, workoutPlan, season) {
  return workoutPlan?.exerciseSeasonWindowsByExercise?.[benchmark.exerciseId]
    || benchmark.seasonWindow
    || { startDate: season.startDate, endDate: season.endDate };
}

function _strengthGoalsForWeek(board, workoutPlan, season, weekStart, todayKey) {
  const safeBoard = _clone(board || {});
  const todayWeek = mondayOf(todayKey);
  const weekEnd = addDays(weekStart, 6);
  const goals = [];
  for (const benchmark of activeBenchmarks(safeBoard)) {
    const window = _windowOf(benchmark, workoutPlan, season);
    const active = !(weekEnd < window.startDate || weekStart > window.endDate);
    const tracks = benchmark.program === 'wendler' ? ['volume'] : (benchmark.tracks || ['volume']);
    for (const track of tracks) {
      if (!active) {
        goals.push({
          id: `strength:${benchmark.exerciseId || benchmark.id}:${track}`,
          type: 'strength',
          exerciseId: benchmark.exerciseId || null,
          label: benchmark.label || benchmark.exerciseId || '운동',
          track,
          program: benchmark.program,
          state: 'inactive',
          startDate: window.startDate,
          endDate: window.endDate,
        });
        continue;
      }
      const cycle = activeCycleOf(safeBoard, benchmark.groupId);
      const cells = cycle ? expandColumnCells(safeBoard, benchmark.id, track, cycle.id, todayKey) : [];
      const cell = _cellForWeek(cells, weekStart);
      goals.push({
        id: `strength:${benchmark.exerciseId || benchmark.id}:${track}`,
        type: 'strength',
        exerciseId: benchmark.exerciseId || null,
        label: benchmark.label || benchmark.exerciseId || '운동',
        track,
        program: benchmark.program,
        state: _statusFromCell(cell, weekStart, todayWeek),
        detail: _strengthGoalDetail(benchmark, track, cell),
        startDate: window.startDate,
        endDate: window.endDate,
      });
    }
  }
  return goals;
}

function _runningGoalForWeek(evaluation, weekStart) {
  const week = evaluation?.weeks?.find(item => item.weekStart === weekStart);
  if (!week) return null;
  return {
    id: 'running:pace',
    type: 'running',
    label: '러닝 페이스',
    state: week.state,
    detail: `${formatPaceSecPerKm(week.targetPaceSecPerKm)}${week.actualPaceSecPerKm ? ` · 실제 ${formatPaceSecPerKm(week.actualPaceSecPerKm)}` : ''}`,
    targetPaceSecPerKm: week.targetPaceSecPerKm,
    actualPaceSecPerKm: week.actualPaceSecPerKm,
    avgHeartRateBpm: week.avgHeartRateBpm,
    heartRateCaution: week.heartRateCaution,
    holdReason: week.holdReason,
    adaptiveRatePct: evaluation.adaptiveRatePct,
    mode: evaluation.mode,
    startDate: evaluation.startDate,
    endDate: evaluation.endDate,
  };
}

function _positiveTarget(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function _round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function _planWindow(plan, season) {
  const requestedStart = isSeasonDateKey(plan?.startDate) ? plan.startDate : season.startDate;
  const requestedEnd = isSeasonDateKey(plan?.endDate) ? plan.endDate : season.endDate;
  const startDate = requestedStart < season.startDate ? season.startDate : requestedStart;
  const endDate = requestedEnd > season.endDate ? season.endDate : requestedEnd;
  return startDate <= endDate ? { startDate, endDate } : null;
}

function _intersectWeek(weekStart, weekEnd, window) {
  if (!window) return null;
  const startDate = weekStart < window.startDate ? window.startDate : weekStart;
  const endDate = weekEnd > window.endDate ? window.endDate : weekEnd;
  return startDate <= endDate ? { startDate, endDate } : null;
}

function _hasCompletedStrengthSet(set) {
  if (!set || set.setType === 'warmup') return false;
  if (set.done === true) return true;
  if (set.done === false) return false;
  return Number(set.kg) > 0 && Number(set.reps) > 0;
}

function _strengthSessionDays(cache, range) {
  if (!range) return 0;
  return Object.entries(cache || {}).filter(([dateKey, day]) => (
    range.startDate <= dateKey
    && dateKey <= range.endDate
    && getWorkoutSessions(day).some(session => (
      (Array.isArray(session?.exercises) ? session.exercises : []).some(entry => (
        (Array.isArray(entry?.sets) ? entry.sets : []).some(_hasCompletedStrengthSet)
      ))
    ))
  )).length;
}

function _runningSummary(activities, range) {
  if (!range) return { distanceKm: 0, sessions: 0 };
  const records = activities.filter(activity => (
    range.startDate <= activity.dateKey && activity.dateKey <= range.endDate
  ));
  return {
    distanceKm: _round(records.reduce((sum, activity) => sum + (Number(activity.distanceKm) || 0), 0)),
    sessions: records.length,
  };
}

function _metricState(actual, target, range, todayKey) {
  if (!range) return 'inactive';
  if (actual >= target) return 'achieved';
  if (todayKey < range.startDate) return 'future';
  if (todayKey > range.endDate) return 'missed';
  return 'planned';
}

function _metricGoal({
  id,
  type,
  label,
  actual,
  target,
  unit,
  range,
  window,
  todayKey,
}) {
  const normalizedTarget = _positiveTarget(target);
  if (!normalizedTarget) return null;
  const normalizedActual = Math.max(0, Number(actual) || 0);
  const state = _metricState(normalizedActual, normalizedTarget, range, todayKey);
  return {
    id,
    type,
    label,
    state,
    detail: `${normalizedActual}/${normalizedTarget}${unit}`,
    actual: normalizedActual,
    target: normalizedTarget,
    unit,
    ratio: normalizedTarget > 0 ? normalizedActual / normalizedTarget : null,
    attained: normalizedActual >= normalizedTarget,
    startDate: window?.startDate || null,
    endDate: window?.endDate || null,
    rangeStartDate: range?.startDate || null,
    rangeEndDate: range?.endDate || null,
  };
}

function _overallState(goals, weekStart, todayWeek) {
  const active = goals.filter(goal => goal.state !== 'inactive');
  if (!active.length) return 'inactive';
  if (active.some(goal => goal.state === 'missed')) return 'missed';
  if (active.some(goal => goal.state === 'attempted')) return 'attempted';
  if (active.every(goal => goal.state === 'achieved')) return 'achieved';
  if (weekStart > todayWeek || active.every(goal => goal.state === 'future')) return 'future';
  return 'planned';
}

export function buildSeasonGoalOverview({
  cache = {},
  season,
  board = null,
  workoutPlan = {},
  runningPlan = {},
  todayKey,
} = {}) {
  if (!season?.id || !season?.startDate || !season?.endDate || !todayKey) {
    return { schemaVersion: 1, state: 'no-season', season: null, weeks: [], seasonGoals: [] };
  }
  const activities = listRunningActivities(Object.entries(cache || {}));
  const running = evaluateRunningPaceGoal({ plan: runningPlan, activities, season, todayKey });
  const seasonWindow = { startDate: season.startDate, endDate: season.endDate };
  const runningWindow = _planWindow(runningPlan, season);
  const firstWeek = mondayOf(season.startDate);
  const lastWeek = mondayOf(season.endDate);
  const todayWeek = mondayOf(todayKey);
  const weeks = [];
  for (let weekStart = firstWeek; weekStart <= lastWeek; weekStart = addWeeks(weekStart, 1)) {
    const calendarWeekEnd = addDays(weekStart, 6);
    const weekEnd = calendarWeekEnd > season.endDate ? season.endDate : calendarWeekEnd;
    const strengthRange = _intersectWeek(weekStart, calendarWeekEnd, seasonWindow);
    const runningRange = _intersectWeek(weekStart, calendarWeekEnd, runningWindow);
    const strengthGoals = _strengthGoalsForWeek(board, workoutPlan, season, weekStart, todayKey);
    const runningGoal = _runningGoalForWeek(running, weekStart);
    const runningSummary = _runningSummary(activities, runningRange);
    const metricGoals = [
      _metricGoal({
        id: 'strength:weekly-sessions',
        type: 'strength-weekly',
        label: '주간 헬스 횟수',
        actual: _strengthSessionDays(cache, strengthRange),
        target: workoutPlan?.weeklySessionTarget,
        unit: '회',
        range: strengthRange,
        window: seasonWindow,
        todayKey,
      }),
      _metricGoal({
        id: 'running:weekly-distance',
        type: 'running-distance',
        label: '주간 러닝 거리',
        actual: runningSummary.distanceKm,
        target: runningPlan?.weeklyDistanceKm,
        unit: 'km',
        range: runningRange,
        window: runningWindow,
        todayKey,
      }),
      _metricGoal({
        id: 'running:weekly-sessions',
        type: 'running-sessions',
        label: '주간 러닝 횟수',
        actual: runningSummary.sessions,
        target: runningPlan?.weeklySessions,
        unit: '회',
        range: runningRange,
        window: runningWindow,
        todayKey,
      }),
    ].filter(Boolean);
    const goals = [...strengthGoals, ...metricGoals];
    if (runningGoal) goals.push(runningGoal);
    weeks.push({
      weekStart,
      weekEnd,
      state: _overallState(goals, weekStart, todayWeek),
      goals,
    });
  }
  const seasonGoals = weeks.map(week => ({
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    seasonId: season.id,
    state: week.state,
    items: week.goals,
    runningPace: week.goals.find(goal => goal.type === 'running') || null,
  }));
  return {
    schemaVersion: 1,
    state: 'ready',
    season: _clone(season),
    running,
    weeks,
    seasonGoals,
  };
}
