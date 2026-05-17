# 테스트모드 exerciseId SSOT 보존 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-17-max-picker-regular-catalog-ssot.md`
- 슬라이스: `Slice 2: 등록 운동별 exerciseId 보존`
- 변경 핵심:
  - `workout/expert/max-benchmark-picker.js`
  - `tests/calc.max.test.js`
  - ESM query 갱신 파일과 `sw.js`

## 결과

- 발견된 차단 이슈 없음.
- 테스트모드 운동추가 전용 옵션인 `includeAllRegisteredExercises` 경로에서만 canonical movement dedupe를 끄도록 제한되어 있다.
- 기본 resolver 호출은 기존 `dedupeMaxBenchmarkOptions()` 동작을 유지하므로 이전 중복 정리 테스트가 계속 통과한다.
- benchmark exact exercise는 `seenIds`로 중복 추가되지 않고, 같은 `movementId`의 다른 등록 운동은 일반 운동 entry로 남는다.
- 스샷의 `암컬`/`바벨 컬`처럼 같은 움직임 계열이지만 별도 등록 종목인 케이스를 회귀 테스트로 고정했다.

## 검증

- `node --check workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js workout/load.js workout/expert.js workout/expert/max.js render-workout.js app.js sw.js`
- `node --test tests/calc.max.test.js`
- `git diff --check`

## 남은 검증

- UI 실사용 검증은 프로젝트 규칙상 장기 dev server를 이 세션에서 띄우지 않아 `not verified yet`.
- 로컬 터미널에서 `npm.cmd run dev` 후 일반모드와 테스트모드 운동추가 목록을 같은 계정/헬스장 필터로 비교해야 한다.
