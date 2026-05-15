# Max 테스트모드 종목 추가 피커 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-05-15-max-picker-benchmark-plus-exercises.md`
- 변경 핵심: `workout/expert/max-benchmark-picker.js`, `workout/exercises.js`, `tests/calc.max.test.js`

## Findings

- 발견된 차단 이슈 없음.

## 확인한 사항

- 벤치마크 항목은 기존처럼 `buildMaxBenchmarkPickerEntry()`를 타서 계획 kg/reps 세트를 유지한다.
- 벤치마크가 아닌 같은 부위 추가 종목은 일반 수동 추가 entry로 들어가므로 특정 벤치마크 종목을 강제하지 않는다.
- `currentGymId`가 있으면 공통 또는 현재 헬스장 종목만 추가 후보에 포함한다.
- 랫풀다운은 등 선택 시 벤치마크가 아니어도 후보에 포함되는 테스트로 고정했다.

## 검증

- `node --check workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js workout/load.js render-workout.js app.js workout-ui.js sw.js` 통과
- `node --test tests/calc.max.test.js` 통과: 44 tests
- `git diff --check` 통과
