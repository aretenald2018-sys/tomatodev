import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildRecoveredBenchmarks,
  mergeRecoveredBoard,
  needsSeasonBoardRecovery,
  recoverSeasonBoardOnce,
  verifyRecoveredBoard,
} from '../workout/season-board-recovery.js';
import { buildExerciseProgramWorkoutPrescription } from '../workout/test-v2/board-core.js';

const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const SEASON_ID = 'season-2026-07-15-140256dac0';

// 덮어쓰기로 들어온 지난 시즌 보드. 현재 시즌 종목이 없다.
function clobberedBoard() {
  return {
    version: 2,
    groups: [{ id: 'lower', label: '하체', order: 3, bodyRegion: 'lower' }],
    benchmarks: [
      { id: 'bm_mqu788xj_0', label: '스모데드', exerciseId: 'custom_1778990759855', status: 'active', program: 'wendler', groupId: 'lower', tracks: ['volume'] },
      { id: 'bm_mr1efooy_0', label: '로프풀다운', exerciseId: 'momc2tnopjh08mkg5xf', status: 'active', program: 'stair', groupId: 'arm', tracks: ['volume'] },
    ],
    cycles: [{ id: 'cy_arm_mr1efooy_1', groupId: 'arm', status: 'active', startDate: '2026-06-29', weeks: 6 }],
    steps: [],
  };
}

// 기록에 남은 실제 처방. 이 셋이 재현돼야 복구본을 신뢰할 수 있다.
const OBSERVED = [
  { id: 'bm_mrm55nct_1', name: '스모데드', weekStart: '2026-07-13', kg: 95, reps: 8 },
  { id: 'bm_mrr8n0zq_2', name: '스쿼트(와이드)', weekStart: '2026-07-13', kg: 92.5, reps: 8 },
  { id: 'bm_mrr8n0zq_2', name: '스쿼트(와이드)', weekStart: '2026-07-27', kg: 103.8, reps: 3 },
];

test('복구본은 기록에 남은 실제 처방을 그대로 재현한다', () => {
  const board = buildRecoveredBenchmarks();
  for (const observed of OBSERVED) {
    const benchmark = board.benchmarks.find(item => item.id === observed.id);
    assert.ok(benchmark, `${observed.name} 벤치마크가 있어야 한다`);
    const built = buildExerciseProgramWorkoutPrescription(board, benchmark, {
      track: 'volume', weekStart: observed.weekStart, todayKey: observed.weekStart, includeAlternatives: false,
    });
    assert.equal(Number(built?.prescription?.startKg), observed.kg, `${observed.name} ${observed.weekStart} 무게`);
    assert.equal(Number(built?.prescription?.repsLow), observed.reps, `${observed.name} ${observed.weekStart} 횟수`);
  }
  // 반올림 단위가 원래 값이어야 3주차가 103.8로 떨어진다. 기본값 2.5면 102.5가 된다.
  for (const benchmark of board.benchmarks) assert.equal(benchmark.wendler.roundKg, 1.25);
  assert.equal(verifyRecoveredBoard(board), true);
});

test('검증은 처방이 어긋나면 거짓을 돌려준다', () => {
  const board = buildRecoveredBenchmarks();
  board.benchmarks.find(item => item.id === 'bm_mrr8n0zq_2').wendler.roundKg = 2.5;
  assert.equal(verifyRecoveredBoard(board), false);
  // 벤치마크가 통째로 없어도 거짓이다.
  assert.equal(verifyRecoveredBoard({ benchmarks: [] }), false);
});

test('합칠 때 같은 종목의 낡은 벤치마크만 걷어내고 나머지는 남긴다', () => {
  const merged = mergeRecoveredBoard(clobberedBoard(), buildRecoveredBenchmarks());
  const ids = merged.benchmarks.map(item => item.id);
  // 기록이 가리키는 id로 복구된다.
  assert.ok(ids.includes('bm_mrm55nct_1'));
  assert.ok(ids.includes('bm_mrr8n0zq_2'));
  // 같은 종목의 낡은 벤치마크는 빠진다(중복 매칭 방지).
  assert.ok(!ids.includes('bm_mqu788xj_0'));
  // 관계없는 종목은 그대로 둔다. 사용자가 새로 넣은 것도 지우면 안 된다.
  assert.ok(ids.includes('bm_mr1efooy_0'));
  assert.ok(merged.cycles.some(cycle => cycle.id === 'cy_arm_mr1efooy_1'));
  assert.ok(merged.cycles.some(cycle => cycle.id === 'cy_lower_mrr8n0zr_8'));
  assert.equal(merged.seasonId, SEASON_ID);
  assert.equal(verifyRecoveredBoard(merged), true);
});

test('복구가 필요한 상태에서만 동작한다', () => {
  assert.equal(needsSeasonBoardRecovery(SEASON_ID, clobberedBoard()), true);
  // 다른 시즌은 건드리지 않는다.
  assert.equal(needsSeasonBoardRecovery('season_20260322_legacy', clobberedBoard()), false);
  // 이미 복구됐으면 다시 하지 않는다.
  const restored = mergeRecoveredBoard(clobberedBoard(), buildRecoveredBenchmarks());
  assert.equal(needsSeasonBoardRecovery(SEASON_ID, restored), false);
});

test('한 번만 저장하고, 두 번째 실행은 아무것도 하지 않는다', async () => {
  let board = clobberedBoard();
  const saved = [];
  const io = { getBoard: () => board, saveBoard: async (next) => { saved.push(next); board = next; } };

  const first = await recoverSeasonBoardOnce({ seasonId: SEASON_ID, ...io });
  assert.equal(first.done, true);
  assert.deepEqual(first.restored, ['스모데드', '스쿼트(와이드)']);
  assert.equal(saved.length, 1);

  const second = await recoverSeasonBoardOnce({ seasonId: SEASON_ID, ...io });
  assert.equal(second.done, false);
  assert.equal(second.reason, 'not-needed');
  assert.equal(saved.length, 1);
});

test('보드가 비어 있어도 두 종목을 세우고 저장한다', async () => {
  const empty = { ...clobberedBoard(), benchmarks: [] };
  let saveCalls = 0;
  let savedBoard = null;
  const result = await recoverSeasonBoardOnce({
    seasonId: SEASON_ID,
    getBoard: () => empty,
    saveBoard: async (next) => { saveCalls += 1; savedBoard = next; },
    todayKey: '2026-07-28',
  });
  assert.equal(result.done, true);
  assert.equal(saveCalls, 1);
  assert.equal(verifyRecoveredBoard(savedBoard), true);
});

test('다른 시즌이면 읽기만 하고 저장하지 않는다', async () => {
  let saveCalls = 0;
  const result = await recoverSeasonBoardOnce({
    seasonId: 'season_20260322_legacy',
    getBoard: () => clobberedBoard(),
    saveBoard: async () => { saveCalls += 1; },
  });
  assert.equal(result.done, false);
  assert.equal(result.reason, 'not-needed');
  assert.equal(saveCalls, 0);
});

test('앱은 로그인 후 한 번 복구를 시도하고, 실패해도 부팅을 막지 않는다', () => {
  assert.match(appJs, /async function _recoverSeasonBoardOnce\(\)/);
  assert.match(appJs, /void _recoverSeasonBoardOnce\(\);/);
  assert.match(appJs, /recoverSeasonBoardOnce\(\{[\s\S]*?seasonId: season\.id/);
  // 오늘 날짜의 시즌만 대상으로 삼는다. 사고를 낸 "모든 시즌 순회"를 다시 하지 않는다.
  assert.match(appJs, /findSeasonForDate\(data\.getSeasonRegistry\(\), todayKey\)/);
  assert.doesNotMatch(appJs, /registry\?\.seasons\s*\|\|\s*\[\]/);
  assert.match(appJs, /catch \(error\) \{\s*console\.warn\('\[season-board-recovery\]/);
});
