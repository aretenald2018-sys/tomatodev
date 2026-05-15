// ================================================================
// tests/data.load-save.test.js — R4 split 회귀 방지
// ================================================================
// 대상: data/data-load.js 의 pure 함수 — _sanitizeTabList, isActiveWorkoutDayData.
// 이유: loadAll/_mergeWorkoutTwinCache 는 Firebase 모킹이 필요해 본 파일에서 제외.
//       사이드이펙트 없는 두 함수만 빠르게 검증해 "탭 정리 / 활성일 판정" 회귀를 잡는다.
// ================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExerciseCatalogSeedPlan,
  buildMaxCycleCanonicalPlan,
  inferEquipmentMovementIds,
  inferExerciseMovementId,
  normalizeEquipmentCategory,
  normalizeExerciseMovementRecord,
  removeExerciseFromMaxCycle,
  selectMaxCycleForExerciseCleanup,
  _sanitizeTabList,
  isActiveWorkoutDayData,
} from '../data/data-pure.js';

// ── _sanitizeTabList ──────────────────────────────────────────────
test('_sanitizeTabList: 배열 아닌 입력은 DEFAULT_TAB_ORDER 반환', () => {
  const out = _sanitizeTabList(null);
  assert.deepEqual(out, ['home','diet','workout','calendar','cooking','stats']);
});

test('_sanitizeTabList: 레거시 탭(finance/wine/movie/monthly/dev) 필터링', () => {
  const out = _sanitizeTabList(['home','diet','workout','calendar','finance','wine','movie','monthly','dev']);
  assert.deepEqual(out, ['home','diet','workout','calendar']);
});

test('_sanitizeTabList: live 탭만 통과 (home/diet/workout/cooking/stats/calendar/admin)', () => {
  const out = _sanitizeTabList(['home','diet','workout','calendar','cooking','stats','admin']);
  assert.deepEqual(out, ['home','diet','workout','calendar','cooking','stats','admin']);
});

test('_sanitizeTabList: required prefix [home,diet,workout,calendar] 순서 깨지면 DEFAULT 복원', () => {
  // home 이 첫번째 아니면 → 복원
  const out1 = _sanitizeTabList(['diet','home','workout','calendar']);
  assert.deepEqual(out1, ['home','diet','workout','calendar','cooking','stats']);
  // calendar 가 4번째 아니면 → 복원
  const out2 = _sanitizeTabList(['home','diet','workout','stats']);
  assert.deepEqual(out2, ['home','diet','workout','calendar','cooking','stats']);
});

test('_sanitizeTabList: 모든 탭이 레거시면 DEFAULT 복원 (cleaned 빈 배열)', () => {
  const out = _sanitizeTabList(['monthly','finance','wine','movie']);
  assert.deepEqual(out, ['home','diet','workout','calendar','cooking','stats']);
});

// ── Equipment movement inference ─────────────────────────────────
test('inferEquipmentMovementIds: movementIds 없는 머신 기구는 이름으로 movement를 연결한다', () => {
  const movements = [
    { id: 'lat_pulldown', nameKo: '랫풀다운', equipment_category: 'machine' },
    { id: 'arm_pulldown', nameKo: '암풀다운', equipment_category: 'machine' },
    { id: 'barbell_bench', nameKo: '바벨 벤치프레스', equipment_category: 'barbell' },
  ];
  const out = inferEquipmentMovementIds({
    name: '파나타 랫풀다운 머신',
    category: 'machine',
    movementIds: [],
  }, movements);
  assert.deepEqual(out, ['lat_pulldown']);
});

test('inferEquipmentMovementIds: 한국어 머신 category도 표준 category로 해석한다', () => {
  const out = inferEquipmentMovementIds({
    name: '랫풀다운',
    category: '핀머신',
    movementIds: [],
  }, [
    { id: 'lat_pulldown', nameKo: '랫풀다운', equipment_category: 'machine' },
    { id: 'barbell_bench', nameKo: '바벨 벤치프레스', equipment_category: 'barbell' },
  ]);
  assert.equal(normalizeEquipmentCategory('핀머신'), 'machine');
  assert.deepEqual(out, ['lat_pulldown']);
});

test('inferEquipmentMovementIds: 명시 movementIds가 있으면 이름 추론보다 저장값을 우선한다', () => {
  const out = inferEquipmentMovementIds({
    name: '랫풀다운',
    category: 'machine',
    movementIds: ['custom_move'],
  }, [{ id: 'lat_pulldown', nameKo: '랫풀다운', equipment_category: 'machine' }]);
  assert.deepEqual(out, ['custom_move']);
});

test('inferExerciseMovementId: movementId 없는 등록 종목은 이름으로 movement를 복원한다', () => {
  const movements = [
    { id: 'deadlift', nameKo: '데드리프트', equipment_category: 'barbell' },
    { id: 'rdl', nameKo: '루마니안 데드리프트', equipment_category: 'barbell' },
    { id: 'lat_pulldown', nameKo: '랫풀다운', equipment_category: 'machine' },
  ];
  assert.equal(inferExerciseMovementId({ name: '랫풀다운', movementId: 'unknown' }, movements), 'lat_pulldown');
  assert.equal(inferExerciseMovementId({ name: '루마니안 데드리프트' }, movements), 'rdl');
  assert.deepEqual(
    normalizeExerciseMovementRecord({ id: 'ex_lat', name: '랫풀다운', movementId: 'unknown' }, movements),
    { id: 'ex_lat', name: '랫풀다운', movementId: 'lat_pulldown' },
  );
});

// ── Exercise catalog SSOT seed ──────────────────────────────────
test('buildExerciseCatalogSeedPlan: seed marker 없으면 기본 운동을 Firestore seed 대상으로 만든다', () => {
  const out = buildExerciseCatalogSeedPlan({
    defaultExercises: [{ id: 'bench', name: '벤치' }, { id: 'lat', name: '랫풀다운' }],
    storedExercises: [],
    seedState: null,
    now: 123,
  });
  assert.equal(out.needsSeed, true);
  assert.deepEqual(out.seedExercises.map(ex => ex.id), ['bench', 'lat']);
  assert.deepEqual(out.exercises.map(ex => ex.id), ['bench', 'lat']);
  assert.equal(out.seedMarker.status, 'completed');
});

test('buildExerciseCatalogSeedPlan: 완료 marker 이후에는 코드 기본 운동을 다시 합치지 않는다', () => {
  const out = buildExerciseCatalogSeedPlan({
    defaultExercises: [{ id: 'bench', name: '벤치' }, { id: 'lat', name: '랫풀다운' }],
    storedExercises: [{ id: 'bench', name: '벤치' }],
    seedState: { version: 1, status: 'completed' },
    now: 456,
  });
  assert.equal(out.needsSeed, false);
  assert.deepEqual(out.seedExercises, []);
  assert.deepEqual(out.exercises.map(ex => ex.id), ['bench']);
});

test('buildExerciseCatalogSeedPlan: 기존 저장 운동은 덮지 않고 누락 기본 운동만 seed한다', () => {
  const out = buildExerciseCatalogSeedPlan({
    defaultExercises: [{ id: 'bench', name: '기본 벤치' }, { id: 'lat', name: '랫풀다운' }],
    storedExercises: [{ id: 'bench', name: '내 벤치' }, { id: 'custom', name: '커스텀' }],
    seedState: null,
    now: 789,
  });
  assert.deepEqual(out.seedExercises.map(ex => ex.id), ['lat']);
  assert.deepEqual(out.exercises.map(ex => ex.id), ['lat', 'bench', 'custom']);
  assert.equal(out.exercises.find(ex => ex.id === 'bench').name, '내 벤치');
});

// ── Max cycle exercise cleanup ──────────────────────────────────
test('removeExerciseFromMaxCycle: 삭제된 exerciseId를 참조하는 벤치마크만 제거한다', () => {
  const out = removeExerciseFromMaxCycle({
    id: 'cycle',
    updatedAt: 100,
    benchmarks: [
      { id: 'bm_keep', exerciseId: 'bench', movementId: 'barbell_bench' },
      { id: 'bm_remove', exerciseId: 'lat', movementId: 'lat_pulldown' },
      { id: 'bm_movement', movementId: 'rdl' },
    ],
  }, 'lat', 200);
  assert.equal(out.changed, true);
  assert.equal(out.removed, 1);
  assert.deepEqual(out.cycle.benchmarks.map(b => b.id), ['bm_keep', 'bm_movement']);
  assert.equal(out.cycle.updatedAt, 200);
});

test('removeExerciseFromMaxCycle: 삭제 대상이 없으면 같은 cycle을 유지한다', () => {
  const cycle = { id: 'cycle', benchmarks: [{ id: 'bm_keep', exerciseId: 'bench' }] };
  const out = removeExerciseFromMaxCycle(cycle, 'lat', 200);
  assert.equal(out.changed, false);
  assert.equal(out.removed, 0);
  assert.equal(out.cycle, cycle);
});

test('selectMaxCycleForExerciseCleanup: 최신 저장소를 기준으로 삭제 정리를 시작한다', () => {
  const preset = { updatedAt: 100, benchmarks: [{ id: 'old', exerciseId: 'lat' }] };
  const setting = { updatedAt: 200, benchmarks: [{ id: 'new', exerciseId: 'lat' }] };
  assert.equal(selectMaxCycleForExerciseCleanup(preset, setting), setting);
});

test('buildMaxCycleCanonicalPlan: legacy expert_preset.maxCycle만 있으면 max_cycle로 승격하고 preset에서 제거한다', () => {
  const out = buildMaxCycleCanonicalPlan({
    expertPreset: {
      mode: 'max',
      maxCycle: { id: 'legacy', benchmarks: [{ id: 'bm' }] },
    },
    settingCycle: null,
    now: 300,
  });
  assert.equal(out.shouldWriteMaxCycle, true);
  assert.equal(out.shouldWriteExpertPreset, true);
  assert.equal(out.canonicalCycle.id, 'legacy');
  assert.equal(out.canonicalCycle.updatedAt, 300);
  assert.equal(Object.prototype.hasOwnProperty.call(out.cleanedPreset, 'maxCycle'), false);
});

test('buildMaxCycleCanonicalPlan: canonical max_cycle이 있으면 legacy는 정리만 한다', () => {
  const settingCycle = { id: 'canonical', benchmarks: [{ id: 'new' }], updatedAt: 500 };
  const out = buildMaxCycleCanonicalPlan({
    expertPreset: {
      mode: 'max',
      maxCycle: { id: 'legacy', benchmarks: [{ id: 'old' }] },
    },
    settingCycle,
    now: 600,
  });
  assert.equal(out.shouldWriteMaxCycle, false);
  assert.equal(out.shouldWriteExpertPreset, true);
  assert.equal(out.canonicalCycle, settingCycle);
  assert.equal(Object.prototype.hasOwnProperty.call(out.cleanedPreset, 'maxCycle'), false);
});

// ── isActiveWorkoutDayData ───────────────────────────────────────
test('isActiveWorkoutDayData: null/undefined → false', () => {
  assert.equal(isActiveWorkoutDayData(null), false);
  assert.equal(isActiveWorkoutDayData(undefined), false);
});

test('isActiveWorkoutDayData: 빈 객체 → false', () => {
  assert.equal(isActiveWorkoutDayData({}), false);
});

test('isActiveWorkoutDayData: 완료 세트가 있는 exercises → true', () => {
  assert.equal(isActiveWorkoutDayData({ exercises: [{ muscleId:'chest', sets:[{ kg:80, reps:8, done:true }] }] }), true);
});

test('isActiveWorkoutDayData: 테스트모드 초안 exercises만 있으면 false', () => {
  assert.equal(isActiveWorkoutDayData({
    exercises: [{ muscleId:'chest', sets:[{ kg:80, reps:8, done:false }], recommendationMeta:{ mode:'max' } }],
    maxMeta: { mode:'max', selectedMajors:['chest'] },
  }), false);
});

test('isActiveWorkoutDayData: cf/swimming/running/stretching boolean → true', () => {
  assert.equal(isActiveWorkoutDayData({ cf: true }), true);
  assert.equal(isActiveWorkoutDayData({ swimming: true }), true);
  assert.equal(isActiveWorkoutDayData({ running: true }), true);
  assert.equal(isActiveWorkoutDayData({ stretching: true }), true);
});

test('isActiveWorkoutDayData: runDistance/workoutDuration 양수 → true', () => {
  assert.equal(isActiveWorkoutDayData({ runDistance: 3 }), true);
  assert.equal(isActiveWorkoutDayData({ workoutDuration: 600 }), true);
});

test('isActiveWorkoutDayData: 식단 기록 (bKcal/bFoods/breakfast) → true', () => {
  assert.equal(isActiveWorkoutDayData({ bKcal: 300 }), true);
  assert.equal(isActiveWorkoutDayData({ bFoods: [{ name:'사과' }] }), true);
  assert.equal(isActiveWorkoutDayData({ breakfast: '김밥' }), true);
});

test('isActiveWorkoutDayData: 간식 기록 (sKcal/sFoods/snack) → true', () => {
  assert.equal(isActiveWorkoutDayData({ sKcal: 150 }), true);
  assert.equal(isActiveWorkoutDayData({ sFoods: [{ name:'바나나' }] }), true);
  assert.equal(isActiveWorkoutDayData({ snack: '초콜릿' }), true);
});

test('isActiveWorkoutDayData: 사진 필드(bPhoto/lPhoto/dPhoto/sPhoto/workoutPhoto) 하나라도 → true', () => {
  assert.equal(isActiveWorkoutDayData({ bPhoto: 'data:image/...' }), true);
  assert.equal(isActiveWorkoutDayData({ lPhoto: 'data:image/...' }), true);
  assert.equal(isActiveWorkoutDayData({ dPhoto: 'data:image/...' }), true);
  assert.equal(isActiveWorkoutDayData({ sPhoto: 'data:image/...' }), true);
  assert.equal(isActiveWorkoutDayData({ workoutPhoto: 'data:image/...' }), true);
});

test('isActiveWorkoutDayData: swimStroke/cfWod 문자열 trim 후 비어있으면 false', () => {
  assert.equal(isActiveWorkoutDayData({ swimStroke: '' }), false);
  assert.equal(isActiveWorkoutDayData({ swimStroke: '   ' }), false);
  assert.equal(isActiveWorkoutDayData({ swimStroke: 'freestyle' }), true);
  assert.equal(isActiveWorkoutDayData({ cfWod: 'Fran' }), true);
});

test('isActiveWorkoutDayData: 0 값 필드는 활성 아님 (boolean short-circuit)', () => {
  assert.equal(isActiveWorkoutDayData({ bKcal: 0, lKcal: 0, dKcal: 0 }), false);
  assert.equal(isActiveWorkoutDayData({ runDistance: 0, workoutDuration: 0 }), false);
});
