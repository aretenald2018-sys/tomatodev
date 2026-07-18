import test from 'node:test';
import assert from 'node:assert/strict';
import { activeBenchmarks, buildBoardFromOnboarding, paintWeek } from '../workout/test-v2/board-core.js';
import { prepareWorkoutSeasonCreation, prepareWorkoutSeasonUpdate } from '../data/season-creation.js';

function board() {
  return buildBoardFromOnboarding({
    startDate: '2026-05-04',
    selections: [{
      exerciseId: 'bench', movementId: 'barbell_bench', groupId: 'chest', label: '벤치프레스',
      tracks: { volume: { kg: 60, reps: 8 } },
      wendler: { scheme: 'w531', oneRmKg: 95 },
    }],
  });
}

test('시즌 생성 payload는 레지스트리와 세 계획 문서를 같은 request id로 만든다', () => {
  const result = prepareWorkoutSeasonCreation({
    season: { name: '여름 시즌', startDate: '2026-07-15', endDate: '2026-09-30' },
    clientRequestId: 'req-summer-1',
    registry: { schemaVersion: 2, seasons: [] },
    previousBoard: board(),
    registeredExercises: [{ id: 'bench', name: '벤치프레스(중간그립)', movementId: 'barbell_bench', muscleId: 'chest' }],
    registeredExerciseIds: ['bench', 'row'],
    selectedExerciseIds: ['bench'],
    weeklySessionTarget: 4,
    runningPlan: { weeklyDistanceKm: 25, weeklySessions: 3, optionalDurationMin: 120 },
    createdAt: 123,
  });
  assert.equal(result.duplicate, false);
  assert.equal(result.registry.seasons.length, 1);
  assert.equal(result.workoutPlan.clientRequestId, 'req-summer-1');
  assert.equal(result.runningPlan.clientRequestId, 'req-summer-1');
  assert.equal(result.runningPlan.weeklyDistanceKm, 25);
  assert.equal(result.runningPlan.schemaVersion, 3);
  assert.equal(result.workoutPlan.schemaVersion, 4);
  assert.equal(result.workoutPlan.weeklySessionTarget, 4);
  assert.equal(result.board.benchmarks[0].wendler.startWeek, 1);
  assert.equal(result.board.benchmarks[0].exerciseId, 'bench');
  assert.equal(result.board.benchmarks[0].label, '벤치프레스(중간그립)');
});

test('시즌 수정 payload는 기간·러닝 메트릭을 갱신하고 기존 보드 수행 로그를 보존한다', () => {
  const previousBoard = board();
  previousBoard.history.push({ id: 'history-1', dateKey: '2026-07-20' });
  previousBoard.benchmarks[0].wendlerLog = { '2026-05-04': { paintedAt: 123 } };
  const existing = {
    id: 'season-existing', name: '기존', startDate: '2026-07-15', endDate: '2026-08-25',
    clientRequestId: 'same-request', createdAt: 100,
  };
  const result = prepareWorkoutSeasonUpdate({
    season: { ...existing, name: '수정 시즌', endDate: '2026-09-01' },
    registry: { schemaVersion: 2, seasons: [existing] },
    previousBoard,
    existingWorkoutPlan: { createdAt: 100, clientRequestId: 'same-request' },
    existingRunningPlan: { createdAt: 100, weeklyDistanceKm: 20, weeklySessions: 3 },
    registeredExercises: [{ id: 'bench', name: '벤치프레스', movementId: 'barbell_bench', muscleId: 'chest' }],
    registeredExerciseIds: ['bench'],
    selectedExerciseIds: ['bench'],
    overrides: { bench: { program: 'stair', tracks: { volume: { kg: 65, sets: 4, incrementKg: 2.5 } } } },
    runningPlan: {
      goalType: '10k', completionGoal: 'time', raceDistanceKm: 10, targetTimeMin: 50,
      baselineWeeklyDistanceKm: 15, weeklyDistanceKm: 28, weeklySessions: 4,
      longestRunKm: 12, speedSessionsPerWeek: 1,
    },
    updatedAt: 200,
  });
  assert.equal(result.season.name, '수정 시즌');
  assert.equal(result.runningPlan.goalType, 'pace');
  assert.equal(result.runningPlan.targetPaceSecPerKm, null, 'legacy race time is not silently migrated into a pace goal');
  assert.equal(result.runningPlan.paceMode, 'adaptive-weekly');
  assert.equal('raceDistanceKm' in result.runningPlan, false);
  assert.equal('targetTimeMin' in result.runningPlan, false);
  assert.equal(result.runningPlan.longestRunKm, 12);
  assert.deepEqual(result.board.history, previousBoard.history);
  assert.deepEqual(result.board.benchmarks[0].wendlerLog, previousBoard.benchmarks[0].wendlerLog);
});

test('같은 clientRequestId는 새 시즌을 만들지 않고 기존 시즌을 반환한다', () => {
  const existing = {
    id: 'season-existing', name: '기존', startDate: '2026-07-01', endDate: '2026-08-31',
    clientRequestId: 'same-request',
  };
  const result = prepareWorkoutSeasonCreation({
    season: { name: '중복', startDate: '2026-09-01', endDate: '2026-10-01' },
    clientRequestId: 'same-request',
    registry: { schemaVersion: 2, seasons: [existing] },
    previousBoard: board(),
  });
  assert.equal(result.duplicate, true);
  assert.equal(result.season.id, 'season-existing');
});

test('겹치는 시즌 생성은 저장 payload 단계에서 거부한다', () => {
  assert.throws(() => prepareWorkoutSeasonCreation({
    season: { name: '겹침', startDate: '2026-08-01', endDate: '2026-10-01' },
    clientRequestId: 'overlap-request',
    registry: {
      schemaVersion: 2,
      seasons: [{ id: 'summer', name: '여름', startDate: '2026-07-01', endDate: '2026-08-31' }],
    },
    previousBoard: board(),
  }), /overlap/);
});

test('종목별·러닝 기간은 전체 시즌 밖으로 벗어날 수 없다', () => {
  const common = {
    season: { name: '경계', startDate: '2026-07-01', endDate: '2026-08-31' },
    clientRequestId: 'boundary-request',
    registry: { schemaVersion: 2, seasons: [] },
    previousBoard: board(),
    registeredExercises: [{ id: 'bench', name: '벤치프레스', movementId: 'barbell_bench', muscleId: 'chest' }],
    registeredExerciseIds: ['bench'],
    selectedExerciseIds: ['bench'],
  };
  assert.throws(() => prepareWorkoutSeasonCreation({
    ...common,
    exerciseSeasonWindowsByExercise: { bench: { startDate: '2026-06-30', endDate: '2026-08-01' } },
  }), /exercise season window/);
  assert.throws(() => prepareWorkoutSeasonCreation({
    ...common,
    clientRequestId: 'running-boundary-request',
    runningPlan: { startDate: '2026-07-10', endDate: '2026-09-01' },
  }), /running season window/);
});

test('종목 window 시작 주를 바꿔도 같은 달력 주차의 stair 달성 로그를 보존한다', () => {
  const season = {
    id: 'shifted-window', name: '기간 변경', startDate: '2026-07-06', endDate: '2026-08-16',
  };
  const common = {
    registeredExercises: [{ id: 'squat', name: '스쿼트', movementId: 'back_squat', muscleId: 'lower' }],
    registeredExerciseIds: ['squat'],
    selectedExerciseIds: ['squat'],
    overrides: {
      squat: { program: 'stair', tracks: { volume: { kg: 80, sets: 4, reps: 8, incrementKg: 2.5 } } },
    },
  };
  const created = prepareWorkoutSeasonCreation({
    ...common,
    season,
    clientRequestId: 'shifted-window-request',
    registry: { schemaVersion: 2, seasons: [] },
    exerciseSeasonWindowsByExercise: {
      squat: { startDate: '2026-07-06', endDate: season.endDate },
    },
  });
  const originalSquat = activeBenchmarks(created.board).find(benchmark => benchmark.exerciseId === 'squat');
  assert.equal(paintWeek(created.board, {
    benchmarkId: originalSquat.id,
    track: 'volume',
    weekStart: '2026-07-06',
    log: { at: 555, note: '이전 window 주차 기록' },
  }), true);
  assert.equal(paintWeek(created.board, {
    benchmarkId: originalSquat.id,
    track: 'volume',
    weekStart: '2026-07-13',
    log: { at: 777, actualReps: 9, note: '같은 주차 기록' },
  }), true);

  const updated = prepareWorkoutSeasonUpdate({
    ...common,
    season: created.season,
    registry: created.registry,
    previousBoard: created.board,
    existingWorkoutPlan: created.workoutPlan,
    existingRunningPlan: created.runningPlan,
    exerciseSeasonWindowsByExercise: {
      squat: { startDate: '2026-07-13', endDate: season.endDate },
    },
  });
  const updatedSquat = activeBenchmarks(updated.board).find(benchmark => benchmark.exerciseId === 'squat');
  const coveringStep = updated.board.steps.find(step => (
    step.benchmarkId === updatedSquat.id
    && step.track === 'volume'
    && step.weekStart === '2026-07-13'
  ));

  assert.deepEqual(coveringStep.weekLog['2026-07-13'], {
    paintedAt: 777,
    actualReps: 9,
    rir: null,
    note: '같은 주차 기록',
  });
  const allPreservedWeekLogs = Object.assign({}, ...updated.board.steps
    .filter(step => step.benchmarkId === updatedSquat.id && step.track === 'volume')
    .map(step => step.weekLog || {}));
  assert.equal(allPreservedWeekLogs['2026-07-06'].paintedAt, 555, 'window 밖 과거 로그도 손실하지 않는다');
});
