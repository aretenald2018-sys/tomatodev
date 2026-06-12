// ================================================================
// max-wendler.test.js — 웬들러 프로그램 엔진 단위 테스트
// 실행: `node --test tests/max-wendler.test.js`
// ================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WENDLER_SCHEMES,
  defaultWendlerIncrement,
  isWendlerAllowedMajor,
  normalizeWendlerConfig,
  roundToPlate,
  suggestWendlerTm,
  weekMapMatchesScheme,
  wendlerCycleOverview,
  wendlerWeekPrescription,
} from '../workout/expert/max-wendler.js';
import { renderMaxPlanEditor } from '../workout/expert/max-cycle.js';

test('프리셋: 5/3/1과 8/6/3은 6주(3주 웨이브 ×2) weekMap을 가진다', () => {
  for (const id of ['w531', 'w863']) {
    const preset = WENDLER_SCHEMES[id];
    assert.equal(preset.weekMap.length, 6);
    assert.deepEqual(preset.weekMap[0], preset.weekMap[3]); // 웨이브 반복
    for (const week of preset.weekMap) {
      assert.equal(week.sets.length, 3);
      assert.equal(week.sets[2].amrap, true); // 마지막 세트 AMRAP
    }
  }
  assert.equal(WENDLER_SCHEMES.w531.weekMap[2].sets[2].pct, 95); // 5/3/1 W3 톱세트
  assert.equal(WENDLER_SCHEMES.w863.weekMap[0].sets[0].reps, 8);
});

test('처방: %TM × TM을 라운딩 단위로 환산한다', () => {
  const rx = wendlerWeekPrescription({ tmKg: 152.5, scheme: 'w531', roundKg: 2.5 }, 1);
  // 65% = 99.1 → 100, 75% = 114.4 → 115, 85% = 129.6 → 130
  assert.deepEqual(rx.sets.map(s => s.kg), [100, 115, 130]);
  assert.equal(rx.topSet.kg, 130);
  assert.equal(rx.topSet.amrap, true);
});

test('처방: BBB 보조는 %TM 고정 볼륨 세트를 만든다', () => {
  const rx = wendlerWeekPrescription({
    tmKg: 152.5, scheme: 'w531', roundKg: 2.5,
    supplemental: { kind: 'bbb', pct: 50, sets: 5, reps: 10 },
  }, 1);
  assert.equal(rx.supplemental.kind, 'bbb');
  assert.equal(rx.supplemental.kg, 77.5); // 76.25 → 77.5 (경계값은 위로)
  assert.equal(rx.supplemental.sets, 5);
  assert.equal(rx.supplemental.reps, 10);
});

test('처방: FSL 보조는 첫 세트 무게를 재사용한다', () => {
  const rx = wendlerWeekPrescription({
    tmKg: 152.5, scheme: 'w531', roundKg: 2.5,
    supplemental: { kind: 'fsl', sets: 3, reps: 5 },
  }, 2);
  assert.equal(rx.supplemental.kind, 'fsl');
  assert.equal(rx.supplemental.kg, rx.sets[0].kg);
  assert.equal(rx.supplemental.pct, 70);
});

test('처방: 보조 없음이면 supplemental=null', () => {
  const rx = wendlerWeekPrescription({ tmKg: 100, supplemental: { kind: 'none' } }, 1);
  assert.equal(rx.supplemental, null);
});

test('weekMap 셀 편집 시 scheme이 custom으로 정규화된다', () => {
  const base = normalizeWendlerConfig({ tmKg: 100, scheme: 'w863' });
  assert.equal(base.scheme, 'w863');
  const edited = JSON.parse(JSON.stringify(base));
  edited.weekMap[5].sets[2].pct = 72.5; // W6 톱세트 % 직접 수정
  const normalized = normalizeWendlerConfig(edited);
  assert.equal(normalized.scheme, 'custom');
  assert.equal(normalized.weekMap[5].sets[2].pct, 72.5);
  assert.equal(weekMapMatchesScheme(normalized.weekMap, 'w863'), false);
});

test('TM 제안: 실측 e1RM × 0.9, 없으면 트랙 시작값으로 추정', () => {
  // 165×1 → e1rm 165 → TM 148.5 → 147.5 (2.5 라운딩)
  assert.equal(suggestWendlerTm({ latest: { kg: 165, reps: 1 }, roundKg: 2.5 }), 147.5);
  // 140×5 → e1rm 163.3 → TM 147 → 147.5
  assert.equal(suggestWendlerTm({ latest: { kg: 140, reps: 5 }, roundKg: 2.5 }), 147.5);
  // 실측 없음 → M트랙 100×12 → e1rm 140 → TM 126 → 125
  assert.equal(suggestWendlerTm({ trackSpec: { startKg: 100, startReps: 12 }, roundKg: 2.5 }), 125);
});

test('normalize: 빈 설정도 기본값(w531 + BBB + 부위별 증량)으로 채운다', () => {
  const cfg = normalizeWendlerConfig({}, { primaryMajor: 'lower', trackSpec: { startKg: 100, startReps: 12 } });
  assert.equal(cfg.scheme, 'w531');
  assert.equal(cfg.incrementKg, 5); // 하체 기본 증량
  assert.equal(cfg.roundKg, 2.5);
  assert.equal(cfg.weekMap.length, 6);
  assert.equal(cfg.supplemental.kind, 'bbb');
  assert.ok(cfg.tmKg > 0); // 트랙 기반 추정
  assert.equal(defaultWendlerIncrement('chest'), 2.5);
});

test('주차표 요약: 톱세트와 %/반복 라벨을 만든다', () => {
  const overview = wendlerCycleOverview({ tmKg: 152.5, scheme: 'w531', roundKg: 2.5 });
  assert.equal(overview.length, 6);
  assert.equal(overview[0].pctLabel, '65·75·85');
  assert.equal(overview[0].repsLabel, '5/5/5+');
  assert.equal(overview[2].repsLabel, '5/3/1+');
  assert.equal(overview[2].topSet.kg, 145); // 95% of 152.5 = 144.9 → 145
});

test('웬들러 허용 부위: 대근육 컴파운드만', () => {
  assert.equal(isWendlerAllowedMajor('chest'), true);
  assert.equal(isWendlerAllowedMajor('lower'), true);
  assert.equal(isWendlerAllowedMajor('bicep'), false);
  assert.equal(isWendlerAllowedMajor('abs'), false);
});

test('roundToPlate: 가장 가까운 플레이트 단위로 라운딩', () => {
  assert.equal(roundToPlate(99.1, 2.5), 100);
  assert.equal(roundToPlate(98.7, 2.5), 97.5);
  assert.equal(roundToPlate(98.7, 5), 100);
  assert.equal(roundToPlate(96.2, 5), 95);
});

test('플랜 시트: 웬들러 벤치마크는 모듈 에디터를 렌더한다 (onclick 금지)', () => {
  const cycle = {
    startDate: '2026-06-01',
    weeks: 6,
    benchmarks: [{
      id: 'bm_lower_squat',
      exerciseId: null,
      movementId: 'back_squat',
      label: '스쿼트',
      primaryMajor: 'lower',
      program: 'wendler',
      wendler: { tmKg: 152.5, incrementKg: 5, roundKg: 2.5, scheme: 'w531', supplemental: { kind: 'bbb', pct: 50, sets: 5, reps: 10 } },
      startKg: 100, targetKg: 105, incrementKg: 5,
    }],
  };
  const html = renderMaxPlanEditor({ cycle, movements: [], cache: {}, exList: [], todayKey: '2026-06-08' });
  assert.match(html, /data-action="set-max-benchmark-program"/);
  assert.match(html, /data-program="wendler"/);
  assert.match(html, /data-action="set-wendler-scheme"/);
  assert.match(html, /data-wendler-field="tmKg"/);
  assert.match(html, /data-wendler-week="6"/); // 주차표 6주 전부 편집 가능
  assert.match(html, /data-action="suggest-wendler-tm"/);
  assert.match(html, /data-wendler-field="suppKind"/);
  assert.doesNotMatch(html, /onclick=/, '플랜 시트 버튼은 lazy module 전역 onclick에 의존하지 않는다');
  // 웬들러 카드는 기본 트랙 입력을 렌더하지 않는다
  assert.doesNotMatch(html, /data-bench-track="M"/);
});

test('플랜 시트: linear 벤치마크는 기존 트랙 입력 + 프로그램 토글을 함께 렌더한다', () => {
  const cycle = {
    startDate: '2026-06-01',
    weeks: 6,
    benchmarks: [{
      id: 'bm_chest_bench',
      movementId: 'barbell_bench',
      label: '벤치프레스',
      primaryMajor: 'chest',
      startKg: 100, targetKg: 105, incrementKg: 2.5,
    }],
  };
  const html = renderMaxPlanEditor({ cycle, movements: [], cache: {}, exList: [], todayKey: '2026-06-08' });
  assert.match(html, /data-bench-track="M"/); // 기존 트랙 입력 유지
  assert.match(html, /data-action="set-max-benchmark-program"/);
  assert.match(html, /data-program="linear"/);
  assert.doesNotMatch(html, /data-wendler-field/);
});

test('플랜 시트: 볼륨 전용 부위(이두 등)는 웬들러 토글이 비활성화된다', () => {
  const cycle = {
    startDate: '2026-06-01',
    weeks: 6,
    benchmarks: [{
      id: 'bm_bicep_curl',
      movementId: 'barbell_curl',
      label: '바벨 컬',
      primaryMajor: 'bicep',
      startKg: 30, targetKg: 32.5, incrementKg: 2.5,
    }],
  };
  const html = renderMaxPlanEditor({ cycle, movements: [], cache: {}, exList: [], todayKey: '2026-06-08' });
  assert.match(html, /data-program="wendler" disabled/);
});
