import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSeasonGoalOverview } from '../data/season-overview.js';
import { buildSeasonWorkoutBoard, buildSeasonWorkoutPlan } from '../workout/season-reset.js';
import { activeBenchmarks, paintWeek } from '../workout/test-v2/board-core.js';

const season = { id: 'parallel', name: '병행 시즌', startDate: '2026-07-06', endDate: '2026-07-26' };

test('season overview exposes concurrent exercise windows and weekly goal states', () => {
  const windows = {
    squat: { startDate: '2026-07-06', endDate: '2026-07-19' },
    row: { startDate: '2026-07-13', endDate: '2026-07-26' },
  };
  const board = buildSeasonWorkoutBoard({
    seasonId: season.id,
    startDate: season.startDate,
    endDate: season.endDate,
    registeredExercises: [
      { id: 'squat', name: '스쿼트', movementId: 'back_squat', muscleId: 'lower' },
      { id: 'row', name: '로우', movementId: 'barbell_row', muscleId: 'back' },
    ],
    selectedExerciseIds: ['squat', 'row'],
    exerciseSeasonWindowsByExercise: windows,
    overrides: {
      squat: { program: 'stair', tracks: { volume: { kg: 80, sets: 4, reps: 8, incrementKg: 2.5 } } },
      row: { program: 'stair', tracks: { volume: { kg: 50, sets: 4, reps: 10, incrementKg: 2.5 } } },
    },
  });
  const squat = activeBenchmarks(board).find(item => item.exerciseId === 'squat');
  assert.equal(paintWeek(board, { benchmarkId: squat.id, weekStart: '2026-07-06', log: { at: 1 } }), true);
  const workoutPlan = buildSeasonWorkoutPlan({
    season,
    board,
    registeredExerciseIds: ['squat', 'row'],
    weeklySessionTarget: 1,
    exerciseSeasonWindowsByExercise: windows,
  });
  const cache = {
    '2026-07-08': {
      exercises: [{ exerciseId: 'squat', sets: [{ kg: 80, reps: 8, done: true }] }],
      running: true,
      runDistance: 5,
      runDurationMin: 29,
      runRouteSummary: { avgHeartRateBpm: 151, cadenceSpm: 172 },
    },
  };
  const overview = buildSeasonGoalOverview({
    cache,
    season,
    board,
    workoutPlan,
    runningPlan: {
      paceMode: 'manual', targetPaceSecPerKm: 360, startDate: season.startDate, endDate: season.endDate,
      referenceDistanceKm: 5, paceCheckWeekday: 3, weeklyDistanceKm: 5, weeklySessions: 1,
    },
    todayKey: '2026-07-15',
  });
  assert.equal(overview.state, 'ready');
  assert.equal(overview.weeks.length, 3);
  assert.equal(overview.weeks[0].goals.find(goal => goal.exerciseId === 'squat').state, 'achieved');
  assert.equal(overview.weeks[0].goals.find(goal => goal.exerciseId === 'row').state, 'inactive');
  assert.equal(overview.weeks[0].goals.find(goal => goal.type === 'running').state, 'achieved');
  const weeklyStrength = overview.weeks[0].goals.find(goal => goal.id === 'strength:weekly-sessions');
  assert.equal(weeklyStrength.actual, 1);
  assert.equal(weeklyStrength.target, 1);
  assert.equal(weeklyStrength.state, 'achieved');
  assert.equal(overview.weeks[0].goals.find(goal => goal.id === 'running:weekly-distance').actual, 5);
  assert.equal(overview.weeks[0].goals.find(goal => goal.id === 'running:weekly-distance').state, 'achieved');
  assert.equal(overview.weeks[0].goals.find(goal => goal.id === 'running:weekly-sessions').actual, 1);
  assert.equal(overview.weeks[0].state, 'achieved');
  assert.equal(overview.weeks[1].goals.find(goal => goal.exerciseId === 'row').state, 'planned');
  assert.equal(overview.weeks[1].goals.find(goal => goal.id === 'running:weekly-distance').state, 'planned');
  assert.equal(overview.seasonGoals[1].seasonId, season.id);
  assert.ok(Array.isArray(overview.seasonGoals[1].items));

  const missedDistance = buildSeasonGoalOverview({
    cache,
    season,
    board,
    workoutPlan,
    runningPlan: {
      paceMode: 'manual', targetPaceSecPerKm: 360, startDate: season.startDate, endDate: season.endDate,
      referenceDistanceKm: 5, paceCheckWeekday: 3, weeklyDistanceKm: 6, weeklySessions: 1,
    },
    todayKey: '2026-07-15',
  });
  assert.equal(missedDistance.weeks[0].goals.find(goal => goal.id === 'running:weekly-distance').state, 'missed');
  assert.equal(missedDistance.weeks[0].state, 'missed', 'weekly metric attainment contributes to the overall state');
});

test('a Wendler window that begins after Monday renders its overlapping first week', () => {
  const nonMondaySeason = {
    id: 'wendler-midweek',
    name: '웬들러 병행 시즌',
    startDate: '2026-07-06',
    endDate: '2026-07-26',
  };
  const windows = {
    squat: { startDate: '2026-07-08', endDate: '2026-07-26' },
  };
  const board = buildSeasonWorkoutBoard({
    seasonId: nonMondaySeason.id,
    startDate: nonMondaySeason.startDate,
    endDate: nonMondaySeason.endDate,
    registeredExercises: [
      { id: 'squat', name: '스쿼트', movementId: 'back_squat', muscleId: 'lower' },
    ],
    selectedExerciseIds: ['squat'],
    exerciseSeasonWindowsByExercise: windows,
    overrides: {
      squat: { program: 'wendler', wendler: { oneRmKg: 100, tmKg: 90 } },
    },
  });
  const workoutPlan = buildSeasonWorkoutPlan({
    season: nonMondaySeason,
    board,
    registeredExerciseIds: ['squat'],
    exerciseSeasonWindowsByExercise: windows,
  });

  const overview = buildSeasonGoalOverview({
    season: nonMondaySeason,
    board,
    workoutPlan,
    todayKey: '2026-07-08',
  });

  const firstWeekSquat = overview.weeks[0].goals.find(goal => goal.exerciseId === 'squat');
  assert.equal(firstWeekSquat.program, 'wendler');
  assert.equal(firstWeekSquat.state, 'planned');
  assert.match(firstWeekSquat.detail, /kg/);
});
