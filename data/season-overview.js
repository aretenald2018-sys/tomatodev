import { isExerciseDaySuccess } from '../calc.js';
import {
  activeBenchmarks,
  buildExerciseProgramWorkoutPrescription,
  isWendlerBenchmark,
  mondayOf,
  normalizeLegacyPrograms,
} from '../workout/test-v2/board-core.js';
import {
  addSeasonDays,
  seasonContainsDate,
} from './season-model.js';
import {
  listRunningActivities,
  summarizeRunningActivities,
} from '../workout/running-analytics.js';

function _number(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// 시즌 주차는 달력 주(월~일)에 맞춘다. 시즌 시작일부터 7일씩 끊으면 시즌이
// 월요일에 시작하지 않는 한 주차 구간과 그 주차를 그릴 달력 행(goalWeekStart =
// 그 구간 시작일의 월요일)이 어긋난다. 7/15(수) 시작 시즌이라면 오늘(7/28)이
// 든 주차는 7/22~7/28인데 앵커는 7/20이라 한 행 위에 그려지고, 오늘이 든
// 달력 행에는 아직 시작도 안 한 다음 주차가 올라온다.
// 색칠 기록(weekLog)도 월요일 키로 저장되므로 월요일 정렬이 유일하게 맞는 기준이다.
// season-selectors의 "이번 주"(startOfSeasonWeek)와 위젯 스트릭도 같은 기준을 쓴다.
function _weekRanges(season) {
  const ranges = [];
  let weekStart = mondayOf(season.startDate);
  while (weekStart <= season.endDate) {
    const weekEnd = addSeasonDays(weekStart, 6);
    ranges.push({
      index: ranges.length + 1,
      // 시즌 밖으로 삐져나온 앞뒤는 잘라 낸다. 앵커는 잘리기 전 월요일 그대로다.
      startDate: weekStart < season.startDate ? season.startDate : weekStart,
      endDate: weekEnd > season.endDate ? season.endDate : weekEnd,
      goalWeekStart: weekStart,
    });
    weekStart = addSeasonDays(weekStart, 7);
  }
  return ranges;
}

function _strengthItems(board = {}, week, todayKey) {
  return activeBenchmarks(board).flatMap(benchmark => {
    const wendler = isWendlerBenchmark(benchmark);
    const tracks = wendler ? ['volume'] : (Array.isArray(benchmark.tracks) && benchmark.tracks.length ? benchmark.tracks : ['volume']);
    return tracks.map(track => {
      const step = (board.steps || [])
        .filter(candidate => candidate.benchmarkId === benchmark.id && candidate.track === track)
        .find(candidate => {
          const start = candidate.weekStart || '';
          const end = start ? addSeasonDays(start, Math.max(1, Number(candidate.span) || 1) * 7 - 1) : '';
          return start <= week.goalWeekStart && week.goalWeekStart <= end;
        });
      // 웬들러(863 포함) 종목은 색칠 기록이 step.weekLog가 아니라 benchmark.wendlerLog에
      // 저장된다(board-core paintWeek). step.weekLog만 보면 웬들러 종목은 아무리 달성해도
      // 영원히 not-achieved로 남는다.
      const log = (wendler
        ? benchmark.wendlerLog?.[week.goalWeekStart]
        : step?.weekLog?.[week.goalWeekStart]) || {};
      // 러닝 항목과 같은 기준을 쓴다. 예전에는 헬스만 goalWeekStart로 판단해서,
      // 아직 시작 안 한 주차가 헬스는 ×(미달)·러닝은 ·(예정)으로 갈렸다.
      const future = week.startDate > todayKey;
      const attempted = log.attempted === true || log.performed === true || !!log.missedAt;
      const state = future ? 'planned' : log.paintedAt || log.done ? 'achieved' : attempted ? 'attempted' : 'not-achieved';
      const program = wendler
        ? buildExerciseProgramWorkoutPrescription(board, benchmark, {
          track,
          weekStart: week.goalWeekStart,
          todayKey,
          includeAlternatives: false,
        })
        : null;
      const target = wendler
        ? (program?.prescription?.label || '웬들러 처방 확인')
        : (step ? `${step.kg || 0}kg × ${step.reps || '-'}회` : '이번 주 처방 없음');
      return {
        kind: 'strength',
        label: benchmark.label || benchmark.exerciseId || '헬스',
        detail: wendler ? target : `${track === 'intensity' ? '강도' : '볼륨'} · ${target}`,
        state,
      };
    });
  });
}

function _runningItem(cache, season, week, runningPlan, todayKey) {
  const entries = Object.entries(cache || {}).filter(([dateKey]) => (
    week.startDate <= dateKey && dateKey <= week.endDate && seasonContainsDate(season, dateKey)
  ));
  const summary = summarizeRunningActivities(listRunningActivities(entries));
  const targetDistance = _number(runningPlan?.weeklyDistanceKm);
  const targetSessions = _number(runningPlan?.weeklySessions);
  const future = week.startDate > todayKey;
  const achieved = !future && summary.distanceKm >= targetDistance && summary.activityCount >= targetSessions;
  return {
    kind: 'running',
    label: '러닝',
    detail: `${summary.distanceKm.toFixed(1)} / ${targetDistance || 0}km · ${summary.activityCount} / ${targetSessions || 0}회`,
    state: future ? 'planned' : achieved ? 'achieved' : 'not-achieved',
  };
}

export function buildSeasonOverview({ cache = {}, season, board = {}, runningPlan = {}, todayKey } = {}) {
  if (!season) return { state: 'missing', weeks: [] };
  normalizeLegacyPrograms(board, { fallbackStartDate: season.startDate });
  const safeToday = String(todayKey || season.startDate);
  const weeks = _weekRanges(season).map(week => {
    const items = [
      ..._strengthItems(board, week, safeToday),
      _runningItem(cache, season, week, runningPlan, safeToday),
    ];
    const due = items.filter(item => item.state !== 'planned');
    const achievedCount = due.filter(item => item.state === 'achieved').length;
    const state = due.length === 0 ? 'planned' : achievedCount === due.length ? 'achieved' : achievedCount > 0 ? 'partial' : 'not-achieved';
    return {
      ...week,
      state,
      achievedCount,
      totalCount: due.length,
      items,
    };
  });
  return {
    state: 'ready',
    season: { ...season, weeks: weeks.length },
    weeks,
    dayCount: weeks.reduce((count, week) => count + (week.endDate >= week.startDate ? 1 : 0), 0),
    workoutDays: Object.entries(cache || {}).filter(([dateKey, day]) => seasonContainsDate(season, dateKey) && isExerciseDaySuccess(day)).length,
  };
}
