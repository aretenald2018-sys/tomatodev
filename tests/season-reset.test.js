import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardFromOnboarding, activeBenchmarks } from '../workout/test-v2/board-core.js';
import { buildSeasonWorkoutBoard, buildSeasonWorkoutPlan, seasonResetPreview } from '../workout/season-reset.js';
import { W863_ORIGINAL_VERSION } from '../workout/w863-original.js';

function previousBoard() {
  const board = buildBoardFromOnboarding({
    startDate: '2026-05-04',
    selections: [
      {
        exerciseId: 'squat', movementId: 'back_squat', groupId: 'lower', label: '스쿼트',
        tracks: { volume: { kg: 80, reps: 8 } },
        wendler: { scheme: 'w531', tmKg: 90, oneRmKg: 100, cycleNo: 4, startWeek: 5 },
      },
      {
        exerciseId: 'row', movementId: 'barbell_row', groupId: 'back', label: '바벨로우',
        tracks: { volume: { kg: 50, reps: 10 }, intensity: { kg: 60, reps: 6 } },
      },
    ],
  });
  board.history.push({ settledAt: 1 });
  board.lineups['2026-06-01'] = [{ benchmarkId: board.benchmarks[0].id }];
  board.benchmarks[0].wendlerLog['2026-05-04'] = { paintedAt: 1 };
  board.steps.find(step => step.benchmarkId === board.benchmarks[1].id).weekLog['2026-05-04'] = { paintedAt: 1 };
  return board;
}

test('새 시즌 보드는 과거 로그를 분리하고 웬들러를 8/6/3 원본 W1로 재생성한다', () => {
  const previous = previousBoard();
  const next = buildSeasonWorkoutBoard({
    previousBoard: previous,
    seasonId: 'summer-2026',
    startDate: '2026-07-15',
    selectedExerciseIds: ['squat', 'row'],
    overrides: {
      squat: { wendler: { oneRmKg: 115, profileId: 'squat', incrementKg: 5, roundKg: 5 } },
      row: { tracks: { volume: { kg: 55, reps: 10 }, intensity: { kg: 65, reps: 6 } } },
    },
    createdAt: 123,
  });

  assert.equal(next.seasonId, 'summer-2026');
  assert.equal(next.createdAt, 123);
  assert.deepEqual(next.history, []);
  assert.deepEqual(next.lineups, {});
  const [squat, row] = activeBenchmarks(next);
  assert.equal(squat.program, 'wendler');
  assert.equal(squat.wendler.templateVersion, W863_ORIGINAL_VERSION);
  assert.equal(squat.wendler.scheme, 'w863');
  assert.equal(squat.wendler.cycleNo, 1);
  assert.equal(squat.wendler.startWeek, 1);
  assert.equal(squat.wendler.oneRmKg, 115);
  assert.deepEqual(squat.wendlerLog, {});
  assert.equal(next.cycles.find(cycle => cycle.groupId === 'lower').weeks, 7);
  assert.deepEqual(row.seed.volume, { kg: 55, reps: 10 });
  assert.deepEqual(row.seed.intensity, { kg: 65, reps: 6 });
  assert.ok(next.steps.every(step => Object.keys(step.weekLog).length === 0));
  assert.equal(previous.history.length, 1);
});

test('선택 종목과 시즌 운동 계획은 등록 목록 및 시작 1RM을 별도로 보존한다', () => {
  const previous = previousBoard();
  assert.deepEqual(seasonResetPreview(previous, ['squat']), {
    registeredPlanCount: 1,
    wendlerCount: 1,
    trackCount: 0,
    preservedExerciseIds: ['squat'],
  });
  const board = buildSeasonWorkoutBoard({
    previousBoard: previous,
    seasonId: 'summer-2026',
    startDate: '2026-07-15',
    selectedExerciseIds: ['squat'],
  });
  const plan = buildSeasonWorkoutPlan({
    season: { id: 'summer-2026' },
    board,
    registeredExerciseIds: ['squat', 'row', 'squat'],
    weeklySessionTarget: 4,
    clientRequestId: 'req-1',
    createdAt: 123,
  });
  assert.deepEqual(plan.registeredExerciseIds, ['squat', 'row']);
  assert.equal(plan.weeklySessionTarget, 4);
  assert.equal(plan.startingOneRmByExercise.squat, 100);
  assert.equal(plan.programVersion, W863_ORIGINAL_VERSION);
});
