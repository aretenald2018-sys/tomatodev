// ================================================================
// test-v2.board-core.test.js — 테스트모드 v2 성장 보드 순수 로직 테스트
// 실행: `node --test tests/test-v2.board-core.test.js`
// 계약 기준: docs/ai/features/2026-06-12-test-mode-v2-board.md
// ================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TM2_DEFAULTS, TM2_GROUPS,
  mondayOf, addWeeks, weeksBetween, weekIndexOf, isCycleFinished, shortDate,
  groupForMajor, defaultIncrementForGroup,
  buildOnboardingCandidates, buildBoardFromOnboarding,
  activeBenchmarks, activeCycleOf, benchmarkById, currentKgOf,
  expandColumnCells, paintWeek, recordMiss, previewAdjust,
  getLineup, toggleLineup,
  isSettleDue, buildSettleRows, applySettle,
  archiveBenchmark, addBenchmark,
  buildMinimapData, recentPaintLogs, cloneBoard,
} from '../workout/test-v2/board-core.js';
import { wendlerWeekPrescription, WENDLER_SCHEMES, defaultWendlerIncrement } from '../workout/test-v2/wendler.js';

// 공통 픽스처 — 2026-06-08(월) 시작, 오늘 2026-06-12(금)
const TODAY = '2026-06-12';
const START = '2026-06-08';

function fixtureBoard() {
  const selections = [
    { movementId: 'barbell_bench', label: '벤치프레스', groupId: 'chest',
      tracks: { volume: { kg: 80, reps: 12 }, intensity: { kg: 90, reps: 8 } } },
    { movementId: 'chest_fly', label: '플라이', groupId: 'chest',
      tracks: { volume: { kg: 27.5, reps: 15 }, intensity: null } },
    { movementId: 'back_squat', label: '백스쿼트', groupId: 'lower',
      tracks: { volume: { kg: 100, reps: 12 }, intensity: null },
      wendler: { tmKg: 150, scheme: 'w863', roundKg: 2.5, incrementKg: 10,
                 supplemental: { kind: 'bbb', pct: 50, sets: 5, reps: 10 } } },
    { movementId: 'leg_press', label: '레그프레스', groupId: 'lower',
      tracks: { volume: { kg: 140, reps: 12 }, intensity: null } },
  ];
  return buildBoardFromOnboarding({ selections, startDate: START, source: 'test' });
}

// ----------------------------------------------------------------
// 날짜/기본값
// ----------------------------------------------------------------

test('날짜: mondayOf는 주의 월요일을 돌려준다 (일요일 포함)', () => {
  assert.equal(mondayOf('2026-06-12'), '2026-06-08'); // 금
  assert.equal(mondayOf('2026-06-08'), '2026-06-08'); // 월
  assert.equal(mondayOf('2026-06-14'), '2026-06-08'); // 일
  assert.equal(mondayOf('2026-06-15'), '2026-06-15'); // 다음 월
});

test('날짜: weeksBetween/weekIndexOf/사이클 종료 판정', () => {
  assert.equal(weeksBetween(START, '2026-07-13'), 5);
  const cycle = { startDate: START, weeks: 6 };
  assert.equal(weekIndexOf(cycle, TODAY), 1);
  assert.equal(weekIndexOf(cycle, '2026-07-13'), 6);
  assert.equal(isCycleFinished(cycle, '2026-07-19'), false); // 6주차 일요일
  assert.equal(isCycleFinished(cycle, '2026-07-20'), true);  // 7주차 월요일
  assert.equal(shortDate(START), '6/8');
});

test('기본값: 6주 증량 — 상체 +2.5 / 하체 +10 (계약 11)', () => {
  assert.equal(TM2_DEFAULTS.incrementUpperKg, 2.5);
  assert.equal(TM2_DEFAULTS.incrementLowerKg, 10);
  assert.equal(defaultIncrementForGroup('chest'), 2.5);
  assert.equal(defaultIncrementForGroup('lower'), 10);
  assert.equal(groupForMajor('glute').id, 'lower');
  assert.equal(groupForMajor('tricep').id, 'arm');
  assert.equal(groupForMajor('abs'), null); // 그룹 외
  assert.equal(defaultWendlerIncrement('lower'), 10);
  assert.equal(defaultWendlerIncrement('chest'), 2.5);
});

// ----------------------------------------------------------------
// 보드 생성 / 온보딩
// ----------------------------------------------------------------

test('보드 생성: 그룹별 사이클 + 사이클당 1스텝(6주 유지) 기본 계획', () => {
  const b = fixtureBoard();
  assert.equal(b.version, 2);
  assert.equal(b.cycles.length, 2); // chest, lower
  const chest = activeCycleOf(b, 'chest');
  assert.equal(chest.startDate, START);
  assert.equal(chest.weeks, 6);
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  assert.deepEqual(bench.tracks, ['volume', 'intensity']);
  assert.equal(bench.incrementKg, 2.5); // 상체 기본
  const benchSteps = b.steps.filter(s => s.benchmarkId === bench.id);
  assert.equal(benchSteps.length, 2); // 트랙당 1스텝
  assert.equal(benchSteps[0].span, 6);
  // 웬들러 종목은 스텝 없음 (파생)
  const squat = b.benchmarks.find(x => x.movementId === 'back_squat');
  assert.equal(squat.program, 'wendler');
  assert.equal(squat.wendler.incrementKg, 10); // 하체 기본
  assert.equal(b.steps.filter(s => s.benchmarkId === squat.id).length, 0);
});

test('온보딩 후보: v1 벤치마크 우선 + 라이브러리 보충, abs 제외, 기록 없으면 manual', () => {
  const v1Cycle = {
    benchmarks: [
      { id: 'bm_chest_x', movementId: 'barbell_bench', label: '바벨 벤치프레스', primaryMajor: 'chest',
        tracks: { M: { enabled: true, startKg: 77.5, startReps: 12 }, H: { enabled: true, startKg: 87.5, startReps: 8 } } },
      { id: 'bm_abs_x', movementId: 'cable_crunch', label: '케이블 크런치', primaryMajor: 'abs',
        tracks: { M: { enabled: true, startKg: 20, startReps: 15 } } },
    ],
  };
  const movements = [
    { id: 'barbell_bench', nameKo: '바벨 벤치프레스', primary: 'chest' },
    { id: 'chest_fly', nameKo: '플라이', primary: 'chest' },
    { id: 'plank', nameKo: '플랭크', primary: 'abs' },
  ];
  const cands = buildOnboardingCandidates({ v1Cycle, movements });
  const bench = cands.find(c => c.movementId === 'barbell_bench');
  assert.equal(bench.source, 'v1');
  assert.equal(bench.defaultOn, true);
  assert.equal(bench.tracks.volume.kg, 77.5);   // 기록 상속
  assert.equal(bench.tracks.intensity.kg, 87.5);
  assert.ok(!cands.some(c => c.movementId === 'cable_crunch')); // abs 제외
  assert.ok(!cands.some(c => c.movementId === 'plank'));
  const fly = cands.find(c => c.movementId === 'chest_fly');
  assert.equal(fly.source, 'library');
  assert.equal(fly.tracks.volume.manual, true); // 기록 없음 → 직접 입력
});

// ----------------------------------------------------------------
// 셀 전개
// ----------------------------------------------------------------

test('셀 전개(stair): 1스텝=span6 + 이번 주 포함이면 now', () => {
  const b = fixtureBoard();
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  const cy = activeCycleOf(b, 'chest');
  const cells = expandColumnCells(b, bench.id, 'volume', cy.id, TODAY);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].kind, 'stair');
  assert.equal(cells[0].span, 6);
  assert.equal(cells[0].kg, 80);
  assert.equal(cells[0].state, 'now');
  assert.equal(cells[0].dots.length, 6);
  assert.equal(cells[0].dots[0].on, false);
});

test('셀 전개(wendler): 주당 1칸, 8/6/3 톱세트 %TM 환산 (TM150 → 105/112.5/120)', () => {
  const b = fixtureBoard();
  const squat = b.benchmarks.find(x => x.movementId === 'back_squat');
  const cy = activeCycleOf(b, 'lower');
  const cells = expandColumnCells(b, squat.id, 'volume', cy.id, TODAY);
  assert.equal(cells.length, 6);
  assert.deepEqual(cells.map(c => c.kg), [105, 112.5, 120, 105, 112.5, 120]);
  assert.equal(cells[0].repsLabel, '×8+');
  assert.match(cells[0].subLabel, /70%/);
  assert.match(cells[0].subLabel, /BBB 75/); // 50%TM
  assert.equal(cells[0].state, 'now');
  assert.equal(cells[1].state, 'plan');
});

// ----------------------------------------------------------------
// 색칠 / 못 채움 / 조정
// ----------------------------------------------------------------

test('색칠(계약 4): paintWeek → weekLog 기록, 전 주 색칠 시 스텝 done', () => {
  const b = fixtureBoard();
  const fly = b.benchmarks.find(x => x.movementId === 'chest_fly');
  const cy = activeCycleOf(b, 'chest');
  for (let w = 0; w < 6; w++) {
    const ok = paintWeek(b, { benchmarkId: fly.id, track: 'volume', weekStart: addWeeks(START, w), log: { at: 1, actualReps: '15', rir: 2 } });
    assert.equal(ok, true);
  }
  const cells = expandColumnCells(b, fly.id, 'volume', cy.id, TODAY);
  assert.equal(cells[0].state, 'done');
  assert.equal(cells[0].dots.every(d => d.on), true);
  const recents = recentPaintLogs(b, fly.id, 'volume', addWeeks(START, 6));
  assert.equal(recents.length, 2);
  assert.equal(recents[0].weekStart, addWeeks(START, 5)); // 최신 우선
});

test('색칠(wendler): wendlerLog에 한계 세트 횟수 기록', () => {
  const b = fixtureBoard();
  const squat = b.benchmarks.find(x => x.movementId === 'back_squat');
  paintWeek(b, { benchmarkId: squat.id, weekStart: TODAY, log: { at: 1, amrapReps: 11, suppDone: true } });
  assert.equal(squat.wendlerLog[START].amrapReps, 11);
  const cy = activeCycleOf(b, 'lower');
  const cells = expandColumnCells(b, squat.id, 'volume', cy.id, TODAY);
  assert.equal(cells[0].state, 'done');
});

test('못 채움 + 한 주 더 도전(계약 5): 다중 스텝에서 뒤 칸이 밀리고 사이클 끝에서 클립', () => {
  const b = fixtureBoard();
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  const cy = activeCycleOf(b, 'chest');
  // 수동으로 2스텝 구성: 80×12 (3주) + 82.5×12 (3주)
  const step = b.steps.find(s => s.benchmarkId === bench.id && s.track === 'volume');
  step.span = 3;
  b.steps.push({ ...step, id: 'st_manual2', weekStart: addWeeks(START, 3), span: 3, kg: 82.5, weekLog: {} });

  recordMiss(b, { benchmarkId: bench.id, track: 'volume', weekStart: addWeeks(START, 2), choice: 'extend', log: { actualReps: '9' } });
  const cells = expandColumnCells(b, bench.id, 'volume', cy.id, TODAY);
  const stair = cells.filter(c => c.kind === 'stair');
  assert.equal(stair[0].span, 4);                 // 80×12 한 주 연장
  assert.equal(stair[0].state, 'miss');
  assert.equal(stair[1].weekStart, addWeeks(START, 4)); // 뒤 칸 1주 밀림
  assert.equal(stair[1].span, 2);                 // 사이클 끝 클립 (6주 안)
  assert.equal(stair[0].span + stair[1].span, 6);
});

test('못 채움 + 무게 내리기/횟수 낮추기', () => {
  const b = fixtureBoard();
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  recordMiss(b, { benchmarkId: bench.id, track: 'volume', weekStart: TODAY, choice: 'lowerKg', params: { deltaKg: 2.5 } });
  let step = b.steps.find(s => s.benchmarkId === bench.id && s.track === 'volume');
  assert.equal(step.kg, 77.5);
  assert.equal(step.state, 'planned'); // 재도전 상태
  recordMiss(b, { benchmarkId: bench.id, track: 'volume', weekStart: TODAY, choice: 'lowerReps', params: { reps: 10 } });
  step = b.steps.find(s => s.benchmarkId === bench.id && s.track === 'volume');
  assert.equal(step.reps, 10);
});

test('previewAdjust: 원본 보드는 변형하지 않는다', () => {
  const b = fixtureBoard();
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  const { before, after } = previewAdjust(b, {
    benchmarkId: bench.id, track: 'volume', weekStart: TODAY, choice: 'lowerKg', params: { deltaKg: 2.5 },
  }, TODAY);
  assert.equal(before[0].kg, 80);
  assert.equal(after[0].kg, 77.5);
  assert.equal(b.steps.find(s => s.benchmarkId === bench.id && s.track === 'volume').kg, 80); // 원본 보존
});

// ----------------------------------------------------------------
// 오늘의 배열 (계약 13)
// ----------------------------------------------------------------

test('오늘의 배열: 담기/빼기 토글 + 순서 유지', () => {
  const b = fixtureBoard();
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  const fly = b.benchmarks.find(x => x.movementId === 'chest_fly');
  toggleLineup(b, TODAY, bench.id, 'volume');
  toggleLineup(b, TODAY, fly.id, 'volume');
  toggleLineup(b, TODAY, bench.id, 'intensity');
  let lineup = getLineup(b, TODAY);
  assert.equal(lineup.length, 3);
  assert.deepEqual(lineup.map(x => x.order), [0, 1, 2]);
  // 가운데 빼기 → 순서 재계산
  toggleLineup(b, TODAY, fly.id, 'volume');
  lineup = getLineup(b, TODAY);
  assert.equal(lineup.length, 2);
  assert.deepEqual(lineup.map(x => `${x.benchmarkId}:${x.track}`), [`${bench.id}:volume`, `${bench.id}:intensity`]);
  assert.deepEqual(lineup.map(x => x.order), [0, 1]);
});

// ----------------------------------------------------------------
// 정산 (계약 6·7·8)
// ----------------------------------------------------------------

test('정산: 성장폭=종목 설정값(상체 2.5/하체 10), 못 채운 종목은 유지 기본', () => {
  const b = fixtureBoard();
  const afterCycle = '2026-07-20'; // 6주 종료 후
  assert.equal(isSettleDue(b, 'chest', TODAY), false);
  assert.equal(isSettleDue(b, 'chest', afterCycle), true);

  const fly = b.benchmarks.find(x => x.movementId === 'chest_fly');
  recordMiss(b, { benchmarkId: fly.id, track: 'volume', weekStart: addWeeks(START, 4), choice: 'none' });

  const rows = buildSettleRows(b, 'chest');
  const benchVol = rows.find(r => r.trackLabel === '볼륨' && r.label === '벤치프레스');
  assert.equal(benchVol.nextKg, 82.5);          // 80 + 2.5
  assert.equal(benchVol.defaultDecision, 'grow');
  const flyRow = rows.find(r => r.label === '플라이');
  assert.equal(flyRow.defaultDecision, 'hold'); // 못 채움 → 유지 기본
  assert.equal(flyRow.missedCount > 0, true);

  const res = applySettle(b, 'chest', { [benchVol.key]: 'grow', [flyRow.key]: 'hold' }, afterCycle, 123);
  assert.ok(res.entry);
  assert.equal(b.history.length, 1);
  const bench = b.benchmarks.find(x => x.movementId === 'barbell_bench');
  assert.equal(currentKgOf(b, bench, 'volume').kg, 82.5); // 성장 반영
  assert.equal(currentKgOf(b, fly, 'volume').kg, 27.5);   // 유지
  // 다음 사이클 + 새 스텝 생성
  const next = activeCycleOf(b, 'chest');
  assert.notEqual(next.id, res.entry.cycleId);
  assert.equal(next.startDate, '2026-07-20');
  const newCells = expandColumnCells(b, bench.id, 'volume', next.id, afterCycle);
  assert.equal(newCells[0].kg, 82.5);
  assert.equal(newCells[0].span, 6);
});

test('정산(wendler): 성장 시 TM + 증량폭(하체 +10)', () => {
  const b = fixtureBoard();
  const afterCycle = '2026-07-20';
  const rows = buildSettleRows(b, 'lower');
  const squatRow = rows.find(r => r.program === 'wendler');
  assert.equal(squatRow.currentKg, 150);
  assert.equal(squatRow.nextKg, 160); // +10
  applySettle(b, 'lower', { [squatRow.key]: 'grow' }, afterCycle, 1);
  const squat = b.benchmarks.find(x => x.movementId === 'back_squat');
  assert.equal(squat.wendler.tmKg, 160);
  // 다음 사이클 W1 처방도 새 TM 기준
  const next = activeCycleOf(b, 'lower');
  const cells = expandColumnCells(b, squat.id, 'volume', next.id, afterCycle);
  assert.equal(cells[0].kg, 112.5); // 160×70% = 112 → 112.5
});

// ----------------------------------------------------------------
// 종목 추가/삭제 (계약 12)
// ----------------------------------------------------------------

test('종목 빼기=보관(기록 보존) → 재추가 시 마지막 무게에서 이어서', () => {
  const b = fixtureBoard();
  const fly = b.benchmarks.find(x => x.movementId === 'chest_fly');
  paintWeek(b, { benchmarkId: fly.id, track: 'volume', weekStart: START, log: { at: 1 } });
  archiveBenchmark(b, fly.id);
  assert.equal(fly.status, 'archived');
  assert.equal(activeBenchmarks(b, 'chest').some(x => x.id === fly.id), false);
  assert.ok(b.steps.some(s => s.benchmarkId === fly.id)); // 기록/스텝 보존

  const restored = addBenchmark(b, { movementId: 'chest_fly', label: '플라이', groupId: 'chest', tracks: { volume: { kg: 27.5, reps: 15 } } }, TODAY);
  assert.equal(restored.id, fly.id); // 같은 종목 복원
  assert.equal(restored.status, 'active');
  assert.equal(currentKgOf(b, restored, 'volume').kg, 27.5); // 이어서
});

test('새 종목 추가: 다음 주 월요일부터 남은 주만큼 스텝 생성', () => {
  const b = fixtureBoard();
  const added = addBenchmark(b, {
    movementId: 'dips', label: '딥스', groupId: 'chest', tracks: { volume: { kg: 5, reps: 12 } },
  }, TODAY); // 오늘 = W1 금요일 → 다음 주 월 = W2
  const cy = activeCycleOf(b, 'chest');
  const cells = expandColumnCells(b, added.id, 'volume', cy.id, TODAY);
  assert.equal(cells[0].kind, 'rest');  // W1은 쉼
  assert.equal(cells[0].span, 1);
  assert.equal(cells[1].kind, 'stair');
  assert.equal(cells[1].weekStart, addWeeks(START, 1));
  assert.equal(cells[1].span, 5);
  assert.equal(added.incrementKg, 2.5); // 상체 기본 시드
});

// ----------------------------------------------------------------
// 미니맵
// ----------------------------------------------------------------

test('미니맵: 그룹×열 세그먼트 + 오늘 오프셋', () => {
  const b = fixtureBoard();
  const mm = buildMinimapData(b, TODAY);
  assert.equal(mm.fromKey, START);
  assert.equal(mm.totalWeeks, 6);
  assert.equal(mm.todayOffset, 0);
  const chest = mm.groups.find(g => g.id === 'chest');
  assert.equal(chest.cols.length, 3); // 벤치 볼륨/강도 + 플라이 볼륨
  assert.equal(chest.cols[0].segs[0].span, 6);
  const lower = mm.groups.find(g => g.id === 'lower');
  const squatCol = lower.cols.find(c => c.label.includes('백스') || c.label.includes('스쿼') || true);
  assert.equal(squatCol.segs.length >= 6, true); // 웬들러 주당 1칸
});

// ----------------------------------------------------------------
// 직렬화 안전성
// ----------------------------------------------------------------

test('보드는 JSON 직렬화 가능(Firestore 저장 안전) + cloneBoard 독립', () => {
  const b = fixtureBoard();
  const json = JSON.stringify(b);
  assert.ok(json.length > 100);
  const c = cloneBoard(b);
  c.benchmarks[0].seed.volume.kg = 999;
  assert.notEqual(b.benchmarks[0].seed.volume.kg, 999);
});
