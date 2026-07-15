import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoardFromOnboarding } from '../workout/test-v2/board-core.js';
import { prepareWorkoutSeasonCreation } from '../data/season-creation.js';

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
  assert.equal(result.workoutPlan.weeklySessionTarget, 4);
  assert.equal(result.board.benchmarks[0].wendler.startWeek, 1);
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
