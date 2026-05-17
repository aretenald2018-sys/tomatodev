# 테스트모드 일반 운동종목 SSOT 복구 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-17-max-picker-regular-catalog-ssot.md`
- 슬라이스: `Slice 1: 테스트모드 후보의 등록 운동 카탈로그 SSOT화`
- 변경 핵심:
  - `workout/expert/max-benchmark-picker.js`
  - `workout/exercises.js`
  - `tests/calc.max.test.js`
  - ESM query 갱신 파일과 `sw.js`

## 결과

- 발견된 차단 이슈 없음.
- 리뷰 중 `workout/load.js`가 변경됐는데 `workout/index.js`의 `load.js` import query가 오래된 상태인 점을 발견해 `20260517v1`로 수정했다.
- 테스트모드 운동추가 resolver는 기본 호출에서는 기존처럼 선택/벤치마크 부위 기준 필터를 유지한다.
- 실제 테스트모드 picker 호출에서는 `includeAllRegisteredExercises: true`를 사용해 일반모드 등록 운동 카탈로그가 후보 풀에 유지된다.
- benchmark canonical key와 겹치는 운동은 기존처럼 benchmark entry로 남고, 나머지 등록 운동은 일반 수동 entry로 추가된다.
- 계획 조정 select의 등록 운동 노출은 기존 `buildMaxPlanMovementOptionSeeds` 테스트가 계속 보장한다.

## 검증

- `node --check workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js workout/load.js workout/expert.js workout/expert/max.js render-workout.js app.js sw.js`
- `node --test tests/calc.max.test.js`
- `git diff --check`

## 남은 검증

- UI 실사용 검증은 프로젝트 규칙상 장기 dev server를 이 세션에서 띄우지 않아 `not verified yet`.
- 로컬 터미널에서 `npm.cmd run dev` 후 일반모드 운동추가와 테스트모드 운동추가/계획 조정 후보를 같은 계정 데이터로 확인해야 한다.
