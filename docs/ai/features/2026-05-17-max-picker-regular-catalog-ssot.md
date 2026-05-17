# 테스트모드 일반 운동종목 SSOT 복구 계획

## 요청

일반모드에서 활용하는 운동종목이 테스트모드의 `벤치마크` 선택과 `운동종목 추가` 피커에도 같은 SSOT 기준으로 나타나야 한다.

중요한 정정:

- 문제는 테스트모드에 일반모드에 없는 항목이 보이는 것이 아니다.
- 문제는 일반모드에서 쓰는 등록 운동종목이 테스트모드에 빠지는 것이다.

## /diagnose

### 재현 루프

- `tests/calc.max.test.js`에 순수 테스트를 추가한다.
- 같은 `exList`에서 일반 피커라면 보이는 등록 운동이 테스트모드 resolver에서도 나오는지 확인한다.
- 계획 조정의 `renderMaxPlanEditor` option HTML과 오늘 운동추가의 `resolveMaxBenchmarkPickerItems` 결과를 함께 확인한다.

### 관찰

- `workout/exercises.js`의 `_getPickerExercisePool()`은 테스트모드 벤치마크 풀이 있으면 `getExList()` 전체를 반환하지 않고 `_getMaxBenchmarkPickerPool()` 결과만 반환한다.
- `_getMaxBenchmarkPickerPool()`은 `resolveMaxBenchmarkPickerItems()`에 의존한다.
- `resolveMaxBenchmarkPickerItems()`는 추가 운동을 `selectedMajors` 또는 저장된 benchmark major 기준으로 좁힌다.
- 결과적으로 일반모드 카탈로그에는 있는 종목도 테스트모드의 현재 벤치마크/선택 부위 기준을 통과하지 못하면 피커에서 빠진다.
- 계획 조정 벤치마크 select는 `buildMaxPlanMovementOptionSeeds()`와 `_movementsForPlanEditor()` 경로를 쓰며, 오늘 운동추가 picker와 등록 운동 카탈로그 기준이 완전히 같은 함수로 고정되어 있지 않다.

### 가설

1. 테스트모드 운동추가 picker가 일반 `getExList()` 카탈로그를 확장하는 대신 별도 benchmark resolver 결과로 대체한다.
2. `resolveMaxBenchmarkPickerItems()`의 `targetMajorSet` 필터가 등록 운동종목 SSOT보다 우선되어 일반모드 활용 종목을 누락시킨다.
3. 계획 조정 벤치마크 select와 오늘 운동추가 picker가 각각 후보를 조립해 같은 등록 운동을 다르게 판단한다.
4. 일부 등록 운동은 `movementId`/`muscleId`가 불완전해도 일반모드에서는 보이지만, 테스트모드 resolver에서는 부위 복원에 실패해 누락될 수 있다.

## 목표

- 테스트모드 `운동종목 추가` 피커는 일반모드와 같은 `getExList()` 등록 운동 카탈로그를 기본 풀로 사용한다.
- 벤치마크 운동은 등록 운동 카탈로그 위에 `benchmark` 메타와 계획 세트를 붙여 우선 표시한다.
- 벤치마크가 아닌 등록 운동은 테스트모드에서도 일반 수동 운동 entry로 추가된다.
- 계획 조정 `벤치마크 추가/연결 종목` select도 등록 운동 카탈로그를 우선 후보로 삼는다.
- `movement` fallback이나 active equipment fallback은 등록 운동 누락을 보강하는 보조 후보로만 남기고, 등록 운동 카탈로그를 대체하지 않는다.

## 실행 슬라이스

### Slice 1: 테스트모드 후보의 등록 운동 카탈로그 SSOT화

- 상태: 완료
- 실행:
  - `workout/expert/max-benchmark-picker.js`에서 오늘 운동추가 후보를 만들 때 `getExList()` 기반 등록 운동 전체를 후보 풀로 유지한다.
  - 벤치마크와 같은 canonical key를 가진 등록 운동에는 기존처럼 benchmark 계획 세트를 붙인다.
  - 벤치마크가 아닌 등록 운동은 `buildMaxPickerExerciseEntry()`의 일반 수동 entry 경로를 유지한다.
  - 계획 조정 select는 기존 `buildMaxPlanMovementOptionSeeds()`의 등록 운동 우선 테스트를 유지해, 오늘 운동추가 picker와 같은 `getExList()` 카탈로그 기준을 깨뜨리지 않는다.
  - 정적 asset 변경에 맞춰 ESM query와 `sw.js` `CACHE_VERSION`을 갱신한다.
- 테스트:
  - 일반모드에 보이는 등록 운동이 테스트모드 운동추가 picker에도 포함되는 회귀 테스트.
  - 저장된 benchmark와 같은 운동은 여전히 benchmark entry로 추가되는 테스트.
  - benchmark가 아닌 등록 운동은 일반 수동 entry로 추가되는 테스트.
  - 계획 조정 select가 등록 운동을 누락하지 않는 기존 테스트를 함께 실행한다.

#### 실행 결과

- `resolveMaxBenchmarkPickerItems()`에 `includeAllRegisteredExercises` 옵션을 추가했다.
- 실제 테스트모드 운동추가 경로인 `_getMaxBenchmarkPickerPool()`에서 이 옵션을 켜, 벤치마크가 있어도 일반 `getExList()` 등록 운동 전체가 후보 풀에 유지되도록 했다.
- 벤치마크와 같은 canonical key는 기존처럼 benchmark entry로 남기고, 나머지 등록 운동은 일반 수동 entry로 추가되는 경로를 유지했다.
- `workout/exercises.js`와 상위 import query, `sw.js` `CACHE_VERSION`을 갱신했다.

#### 검증

- `node --check workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js workout/load.js workout/expert.js workout/expert/max.js render-workout.js app.js sw.js`
- `node --test tests/calc.max.test.js`
- `git diff --check`
- UI 실사용 검증은 프로젝트 규칙상 장기 dev server를 이 세션에서 띄우지 않아 아직 `not verified yet`이다.

## 제외

- Firestore 저장 구조 변경은 하지 않는다.
- `users/{uid}/exercises` SSOT 자체를 다시 seed하거나 마이그레이션하지 않는다.
- 기구 관리 UX나 active equipment 모델은 바꾸지 않는다.
- 테스트모드에 어떤 부위를 기본으로 펼칠지 같은 디자인 변경은 하지 않는다.
- 배포/푸시는 사용자가 명시적으로 요청할 때만 진행한다.

## 검증

- `node --check workout/expert/max-benchmark-picker.js workout/expert/max-cycle-core.js workout/expert/max.js workout/exercises.js workout/index.js render-workout.js app.js sw.js`
- `node --test tests/calc.max.test.js`
- `git diff --check`
- 로컬 UI 검증:
  - `npm.cmd run dev`
  - 운동 탭 → 일반모드 운동추가에서 보이는 등록 운동 확인
  - 운동 탭 → 테스트모드 → 운동종목 추가에서 같은 등록 운동이 보이는지 확인
  - 테스트모드 → 계획 조정 → 벤치마크 추가/연결 종목에서 같은 등록 운동이 후보로 보이는지 확인
  - benchmark 운동을 선택하면 계획 kg/reps 세트가 유지되고, benchmark가 아닌 운동은 일반 수동 entry로 추가되는지 확인

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-05-17-max-picker-regular-catalog-ssot.md`를 읽고 Slice 1만 실행한다. 일반모드 등록 운동 카탈로그를 테스트모드 후보의 SSOT로 맞추되, 벤치마크 계획 세트 보존과 기존 dedupe 규칙은 깨뜨리지 않는다. `STATIC_ASSETS` 변경 시 `sw.js` `CACHE_VERSION`을 함께 범프한다.
