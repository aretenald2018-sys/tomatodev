import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  backfillSeasonGoalPaints,
  collectSeasonGoalBackfillPaints,
  seasonGoalTargetForEntry,
} from '../workout/season-goal-backfill.js';
import { isWeekPainted } from '../workout/test-v2/board-core.js';

const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function boardWithSquatStep(weekLog = {}) {
  return {
    benchmarks: [{ id: 'squat-1', label: '스쿼트(와이드)', status: 'active', tracks: ['volume'] }],
    steps: [{ benchmarkId: 'squat-1', track: 'volume', weekStart: '2026-07-27', span: 4, kg: 103.8, reps: 3, weekLog }],
  };
}

function completedSquatEntry({ completedAt = 1_700_000_000_000, sets = null } = {}) {
  return {
    name: '스쿼트(와이드)',
    exerciseCompletedAt: completedAt,
    recommendationMeta: {
      source: 'test_board_v2',
      track: 'M',
      boardV2BenchmarkId: 'squat-1',
      boardV2WeekStart: '2026-07-27',
    },
    maxPrescription: { benchmarkId: 'squat-1', track: 'M', startKg: 103.8, repsLow: 3, repsHigh: 3 },
    sets: sets || [
      { kg: 46.3, reps: 5, setType: 'warmup', done: true },
      { kg: 103.8, reps: 3, done: true },
      { kg: 126.3, reps: 1, done: true },
    ],
  };
}

function cacheWith(entry, dateKey = '2026-07-28') {
  return { [dateKey]: { exercises: [entry] } };
}

test('보드 카드가 아닌 기록은 색칠 대상이 아니다', () => {
  assert.equal(seasonGoalTargetForEntry(null), null);
  assert.equal(seasonGoalTargetForEntry({ sets: [] }), null);
  // 추천 엔진이 붙인 처방은 보드 칸과 무관하다.
  assert.equal(seasonGoalTargetForEntry({
    recommendationMeta: { source: 'max_recommendation' },
    maxPrescription: { startKg: 100, repsLow: 5 },
  }), null);
  // 처방 수치가 없으면 판정 기준이 없다.
  assert.equal(seasonGoalTargetForEntry({
    recommendationMeta: { source: 'test_board_v2', boardV2BenchmarkId: 'squat-1', boardV2WeekStart: '2026-07-27' },
    maxPrescription: { startKg: 0, repsLow: 0 },
  }), null);

  const target = seasonGoalTargetForEntry(completedSquatEntry());
  assert.deepEqual(target, {
    benchmarkId: 'squat-1',
    track: 'volume',
    weekStart: '2026-07-27',
    plan: { kg: 103.8, reps: 3 },
  });
  // 'H' 코드는 강도 트랙이다.
  assert.equal(seasonGoalTargetForEntry({
    recommendationMeta: { source: 'test_board_v2', track: 'H', boardV2BenchmarkId: 'b', boardV2WeekStart: '2026-07-27' },
    maxPrescription: { startKg: 100, repsLow: 3 },
  }).track, 'intensity');
});

test('완료된 기록 중 계획을 채운 주차만 모은다', () => {
  const board = boardWithSquatStep();

  // 계획(103.8kg×3)을 채운 세트가 있다. 헤비 싱글 때문에 떨어지면 안 된다.
  const hit = collectSeasonGoalBackfillPaints({ cache: cacheWith(completedSquatEntry()), board, todayKey: '2026-07-28' });
  assert.equal(hit.length, 1);
  assert.equal(hit[0].benchmarkId, 'squat-1');
  assert.equal(hit[0].weekStart, '2026-07-27');
  assert.equal(hit[0].dateKey, '2026-07-28');

  // 완료 도장이 없으면 입력 중인 기록이다. 건드리지 않는다.
  const draft = completedSquatEntry();
  delete draft.exerciseCompletedAt;
  assert.deepEqual(collectSeasonGoalBackfillPaints({ cache: cacheWith(draft), board, todayKey: '2026-07-28' }), []);

  // 계획 미달이면 모으지 않는다.
  const missed = completedSquatEntry({ sets: [{ kg: 90, reps: 3, done: true }, { kg: 126.3, reps: 1, done: true }] });
  assert.deepEqual(collectSeasonGoalBackfillPaints({ cache: cacheWith(missed), board, todayKey: '2026-07-28' }), []);

  // 미래 기록은 보지 않는다.
  assert.deepEqual(
    collectSeasonGoalBackfillPaints({ cache: cacheWith(completedSquatEntry(), '2026-08-05'), board, todayKey: '2026-07-28' }),
    [],
  );

  // 시즌 밖 날짜도 보지 않는다.
  assert.deepEqual(
    collectSeasonGoalBackfillPaints({ cache: cacheWith(completedSquatEntry()), board, todayKey: '2026-07-28', isInSeason: () => false }),
    [],
  );

  // 이미 색칠된 칸은 건너뛴다.
  const painted = boardWithSquatStep({ '2026-07-27': { paintedAt: 123 } });
  assert.deepEqual(
    collectSeasonGoalBackfillPaints({ cache: cacheWith(completedSquatEntry()), board: painted, todayKey: '2026-07-28' }),
    [],
  );
});

test('같은 주차의 같은 종목은 한 번만 색칠한다', () => {
  const board = boardWithSquatStep();
  const cache = {
    '2026-07-27': { exercises: [completedSquatEntry()] },
    '2026-07-28': { exercises: [completedSquatEntry()] },
  };
  assert.equal(collectSeasonGoalBackfillPaints({ cache, board, todayKey: '2026-07-28' }).length, 1);
});

test('소급 색칠은 보드에 기록을 남기고 한 번만 저장한다', async () => {
  const board = boardWithSquatStep();
  const saved = [];
  const result = await backfillSeasonGoalPaints({
    seasons: [{ id: 'season-1' }],
    cache: cacheWith(completedSquatEntry()),
    todayKey: '2026-07-28',
    getBoard: () => board,
    saveBoard: async (next) => { saved.push(next); },
    now: 1_700_000_000_000,
  });

  assert.equal(result.painted, 1);
  assert.deepEqual(result.seasons, [{ seasonId: 'season-1', painted: 1 }]);
  assert.equal(saved.length, 1);
  assert.equal(isWeekPainted(board, { benchmarkId: 'squat-1', track: 'volume', weekStart: '2026-07-28' }), true);
  // 로그에는 웜업을 뺀 수행 세트가 남는다(103.8×3, 126.3×1).
  const log = board.steps[0].weekLog['2026-07-27'];
  assert.equal(log.paintedAt, 1_700_000_000_000);
  assert.equal(log.actualReps, '3 · 1');

  // 두 번째 실행은 이미 칠해져 있으므로 아무것도 하지 않는다.
  const again = await backfillSeasonGoalPaints({
    seasons: [{ id: 'season-1' }],
    cache: cacheWith(completedSquatEntry()),
    todayKey: '2026-07-28',
    getBoard: () => board,
    saveBoard: async () => { throw new Error('저장이 다시 일어나면 안 된다'); },
  });
  assert.equal(again.painted, 0);
});

test('보드 저장이 실패해도 던지지 않고 다음 실행에 다시 시도한다', async () => {
  const board = boardWithSquatStep();
  const result = await backfillSeasonGoalPaints({
    seasons: [{ id: 'season-1' }],
    cache: cacheWith(completedSquatEntry()),
    todayKey: '2026-07-28',
    getBoard: () => board,
    saveBoard: async () => { throw new Error('network'); },
  });
  assert.equal(result.painted, 0);
  assert.deepEqual(result.seasons, []);
});

test('소급 색칠은 자동 실행하지 않는다 — 시즌을 가려 저장하는 경로가 없다', () => {
  // data.js saveTestBoardV2는 저장 대상 시즌을 인자가 아니라 "오늘이 속한 시즌"으로
  // 정한다. 지난 시즌 보드를 넘기면 현재 시즌 슬롯을 덮어써서 등록해 둔 종목·계획이
  // 사라진다. 시즌 인자를 받는 저장 경로가 생기기 전까지 앱은 이걸 부르지 않는다.
  assert.doesNotMatch(appJs, /backfillSeasonGoalPaints/);
  assert.doesNotMatch(appJs, /_backfillSeasonGoalsOnce/);
  assert.match(appJs, /소급 색칠은 중단됐다/);
});
