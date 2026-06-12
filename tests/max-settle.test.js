// ================================================================
// max-settle.test.js — 테스트모드 정산(6주 1회 성장) 순수 로직 회귀 테스트
//   규칙: 성장은 정산 시에만, 성장폭은 설정 증량폭 그대로.
//   미달(onPlan!==true)은 유지 기본. 정산 시 다음 사이클 생성 + 히스토리 요약.
// 실행: `node --test tests/max-settle.test.js`
// ================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRenderedMaxCycleSnapshot,
  buildMaxCycleSettleResult,
  buildMaxCycleHistoryEntry,
  buildNextMaxCycleFromSettle,
  buildMaxGrowthStairs,
  renderMaxCycleDashboard,
  renderMaxCycleSettle,
} from '../workout/expert/max-cycle.js';

const EX_LIST = [
  { id: 'ex_bench', movementId: 'barbell_bench' },
  { id: 'ex_squat', movementId: 'back_squat' },
];

function makeCycle(overrides = {}) {
  return {
    id: 'max_cycle_20260601',
    status: 'active',
    framework: 'dual_track_progression_v2',
    startDate: '2026-06-01', // 월요일
    weeks: 6,
    benchmarks: [
      {
        id: 'bm_chest_bench',
        exerciseId: 'ex_bench',
        movementId: 'barbell_bench',
        label: '바벨 벤치프레스',
        primaryMajor: 'chest',
        tracks: {
          M: { startKg: 100, targetKg: 110, incrementKg: 2.5, startReps: 12, targetReps: 12, enabled: true },
          H: { startKg: 105, targetKg: 115, incrementKg: 2.5, startReps: 8, targetReps: 6, enabled: true },
        },
        startKg: 100, targetKg: 110, incrementKg: 2.5, startReps: 12, targetReps: 12,
      },
    ],
    todayOverrides: { '2026-06-08': { 'bm_chest_bench:M': { kg: 100 } } },
    todayTracks: { '2026-06-08': { bm_chest_bench: 'M' } },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeCache({ kg = 105, reps = 12, dateKey = '2026-06-08' } = {}) {
  return {
    [dateKey]: {
      exercises: [
        { exerciseId: 'ex_bench', movementId: 'barbell_bench', sets: [{ kg, reps, done: true }] },
      ],
    },
  };
}

const TODAY = '2026-06-08'; // W2

function settleWith({ cache = {}, decisions = {} } = {}) {
  const cycle = makeCycle();
  const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache, exList: EX_LIST, todayKey: TODAY });
  return { cycle, snapshot, settle: buildMaxCycleSettleResult(cycle, snapshot, { decisions }) };
}

test('정산: 계획 달성(onPlan=true) 벤치마크는 양 트랙 모두 +증량폭 성장', () => {
  const { settle } = settleWith({ cache: makeCache({ kg: 105 }) }); // W2 계획 102.5 이상
  assert.equal(settle.grown, 1);
  assert.equal(settle.held, 0);
  const row = settle.rows[0];
  assert.equal(row.decision, 'grow');
  assert.equal(row.tracks.M.startKg, 102.5);
  assert.equal(row.tracks.M.targetKg, 112.5);
  assert.equal(row.tracks.H.startKg, 107.5);
  assert.equal(row.tracks.H.targetKg, 117.5);
  assert.deepEqual(row.representative, { kind: 'startKg', before: 100, after: 102.5, incrementKg: 2.5 });
});

test('정산: 실측 미달 벤치마크는 유지(무게 변화 없음)가 기본', () => {
  const { settle } = settleWith({ cache: makeCache({ kg: 95 }) }); // W2 계획 102.5 미달
  assert.equal(settle.grown, 0);
  assert.equal(settle.held, 1);
  const row = settle.rows[0];
  assert.equal(row.decision, 'hold');
  assert.equal(row.tracks.M.startKg, 100);
  assert.equal(row.tracks.M.targetKg, 110);
  assert.equal(row.representative.after, 100);
});

test('정산: 실측이 아예 없으면(onPlan=null) 유지', () => {
  const { settle } = settleWith({ cache: {} });
  assert.equal(settle.rows[0].decision, 'hold');
  assert.equal(settle.rows[0].onPlan, null);
});

test('정산: decisions 오버라이드로 미달 벤치마크도 성장 확정 가능', () => {
  const { settle } = settleWith({ cache: makeCache({ kg: 95 }), decisions: { bm_chest_bench: 'grow' } });
  assert.equal(settle.rows[0].decision, 'grow');
  assert.equal(settle.rows[0].tracks.M.startKg, 102.5);
});

test('다음 사이클: id/시작일/상태 갱신 + 당일 상태 초기화 + 벤치마크 id 보존', () => {
  const { cycle, settle } = settleWith({ cache: makeCache({ kg: 105 }) });
  const next = buildNextMaxCycleFromSettle(cycle, settle, { todayKey: TODAY, now: 1234 });
  assert.equal(next.startDate, '2026-06-15'); // 다음 주 월요일
  assert.equal(next.id, 'max_cycle_20260615');
  assert.equal(next.status, 'active');
  assert.equal(next.weeks, 6);
  assert.equal(next.todayOverrides, undefined);
  assert.equal(next.todayTracks, undefined);
  assert.equal(next.nextSeed, undefined);
  const b = next.benchmarks[0];
  assert.equal(b.id, 'bm_chest_bench'); // 계단 시리즈 연결을 위해 id 유지
  assert.equal(b.exerciseId, 'ex_bench');
  assert.equal(b.tracks.M.startKg, 102.5);
  assert.equal(b.tracks.H.startKg, 107.5);
  // 레거시 미러 필드 동기화
  assert.equal(b.startKg, 102.5);
  assert.equal(b.targetKg, 112.5);
  assert.equal(b.incrementKg, 2.5);
});

test('히스토리 엔트리: 사이클 요약 + 벤치마크별 대표 무게 before/after', () => {
  const { cycle, settle } = settleWith({ cache: makeCache({ kg: 105 }) });
  const entry = buildMaxCycleHistoryEntry(cycle, settle, { settledAt: 9999, todayKey: TODAY });
  assert.equal(entry.cycleId, 'max_cycle_20260601');
  assert.equal(entry.startDate, '2026-06-01');
  assert.equal(entry.endDate, TODAY);
  assert.equal(entry.settledAt, 9999);
  assert.equal(entry.grown, 1);
  const b = entry.benchmarks[0];
  assert.equal(b.movementId, 'barbell_bench');
  assert.equal(b.decision, 'grow');
  assert.deepEqual(b.representative, { kind: 'startKg', before: 100, after: 102.5, incrementKg: 2.5 });
  assert.equal(b.latest.kg, 105);
});

test('성장 계단: 히스토리 정산 포인트 + 현재 사이클 + 예약 성장 포인트', () => {
  const history = [
    {
      cycleId: 'c1', startDate: '2026-04-20', endDate: '2026-05-31', weeks: 6, settledAt: 1, grown: 1, held: 0,
      benchmarks: [{
        id: 'bm_chest_bench', movementId: 'barbell_bench', label: '바벨 벤치프레스', primaryMajor: 'chest',
        program: 'linear', decision: 'grow',
        representative: { kind: 'startKg', before: 97.5, after: 100, incrementKg: 2.5 },
        latest: null,
      }],
    },
  ];
  const lanes = buildMaxGrowthStairs(history, makeCycle());
  assert.equal(lanes.length, 1);
  const lane = lanes[0];
  assert.equal(lane.label, '바벨 벤치프레스');
  assert.equal(lane.points.length, 2);
  assert.equal(lane.points[0].kind, 'settled');
  assert.equal(lane.points[0].kg, 97.5);
  assert.equal(lane.points[0].afterKg, 100);
  assert.equal(lane.points[1].kind, 'current');
  assert.equal(lane.points[1].kg, 100); // 현재 사이클 대표 무게(M startKg)
  assert.equal(lane.points[1].afterKg, 102.5); // 정산 시 예약 성장
});

test('성장 계단: 웬들러 벤치마크는 TM을 대표 무게로 사용', () => {
  const cycle = makeCycle();
  cycle.benchmarks = [{
    ...cycle.benchmarks[0],
    program: 'wendler',
    wendler: { tmKg: 152.5, incrementKg: 5, roundKg: 2.5, scheme: 'w531' },
  }];
  const lanes = buildMaxGrowthStairs([], cycle);
  assert.equal(lanes[0].points[0].kg, 152.5);
  assert.equal(lanes[0].points[0].afterKg, 157.5);
});

test('정산 시트: 벤치마크별 성장/유지 선택과 확정 액션을 렌더한다 (onclick 금지)', () => {
  const cycle = makeCycle();
  const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache: makeCache({ kg: 105 }), exList: EX_LIST, todayKey: TODAY });
  const settle = buildMaxCycleSettleResult(cycle, snapshot, {});
  const html = renderMaxCycleSettle(cycle, snapshot, settle);
  assert.match(html, /data-settle-benchmark="bm_chest_bench"/);
  assert.match(html, /data-decision="grow"/);
  assert.match(html, /data-action="set-settle-decision"/);
  assert.match(html, /data-action="confirm-max-settle"/);
  assert.match(html, /100 → 102\.5kg \(\+2\.5\)/);
  assert.doesNotMatch(html, /onclick=/);
  // 유지 결정이면 무게 변화 없는 표기
  const held = buildMaxCycleSettleResult(cycle, snapshot, { decisions: { bm_chest_bench: 'hold' } });
  const heldHtml = renderMaxCycleSettle(cycle, snapshot, held);
  assert.match(heldHtml, /100 → 100kg/);
});

test('진입 카드: 웬들러 벤치마크 행은 %TM 처방으로 렌더된다', () => {
  const cycle = makeCycle();
  cycle.benchmarks = [{
    ...cycle.benchmarks[0],
    program: 'wendler',
    wendler: { tmKg: 152.5, incrementKg: 5, roundKg: 2.5, scheme: 'w531', supplemental: { kind: 'bbb', pct: 50, sets: 5, reps: 10 } },
  }];
  const html = renderMaxCycleDashboard({ cycle, cache: {}, exList: EX_LIST, todayKey: TODAY });
  assert.match(html, /is-wendler/);
  assert.match(html, /웬들러 · TM 152\.5kg/);
  assert.match(html, /BBB 77\.5kg × 10 × 5세트/); // 50%TM 라운딩
  assert.match(html, /정산 시 TM \+5kg/);
  // 웬들러 행에는 볼륨/강도 트랙 토글이 없다
  assert.doesNotMatch(html, /data-action="set-max-benchmark-track"/);
});

test('정산: 웬들러 벤치마크 성장은 TM에 적용', () => {
  const cycle = makeCycle();
  cycle.benchmarks = [{
    ...cycle.benchmarks[0],
    program: 'wendler',
    wendler: { tmKg: 152.5, incrementKg: 5, roundKg: 2.5, scheme: 'w531' },
  }];
  const snapshot = buildRenderedMaxCycleSnapshot({ cycle, cache: makeCache({ kg: 160 }), exList: EX_LIST, todayKey: TODAY });
  const settle = buildMaxCycleSettleResult(cycle, snapshot, { decisions: { bm_chest_bench: 'grow' } });
  const row = settle.rows[0];
  assert.equal(row.program, 'wendler');
  assert.equal(row.wendler.tmKg, 157.5);
  assert.deepEqual(row.representative, { kind: 'tm', before: 152.5, after: 157.5, incrementKg: 5 });
  const next = buildNextMaxCycleFromSettle(cycle, settle, { todayKey: TODAY, now: 1 });
  assert.equal(next.benchmarks[0].wendler.tmKg, 157.5);
});
