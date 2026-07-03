# 운동 추가/카드 추가 결합 완화 슬라이스 1 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 슬라이스: 슬라이스 1 `운동 선택 상태 전이 서비스화`
- 변경 파일:
  - `workout/exercise-entry-actions.js`
  - `workout/exercises.js`
  - `tests/workout-exercise-entry-actions.test.js`
  - `tests/ex-picker-selection-flow.test.js`
  - `tests/workout-navigation-stack.test.js`
  - `sw.js`
  - cache marker 테스트 파일들

## 발견 사항

- 심각도 높은 이슈 없음.
- 확인한 위험:
  1. 기존 종목 재선택 경로에서 새 entry가 생성되지 않는가: `selectWorkoutExerciseEntry()`가 existing이면 builder를 호출하지 않고 기존 index를 반환하도록 테스트했다.
  2. 신규 종목 선택에서 기존 `_ensureExpertManualSession()` 순서가 보존되는가: helper의 `buildEntry` callback 내부에서 먼저 호출하도록 유지했다.
  3. 하단시트 `afterSelect` detail이 기존/신규 모두 같은 구조인가: `workoutExerciseSelectionDetail(selection)`으로 통일했다.
  4. service worker cache 누락이 없는가: `STATIC_ASSETS`에 새 모듈을 등록하고 `CACHE_VERSION`을 bump했다. 단, runtime asset 검증은 stage 전 untracked 경고로 아직 통과하지 못했다.

## 검증

- 명령:
  1. `node --check workout/exercises.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
  2. `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js`
  3. `node --test tests/*.test.js`
  4. `git diff --check`
- URL 또는 사용자 흐름:
  - 정적/단위 검증 기준. 실제 UI 흐름은 배포 후 인증 계정에서 `운동 탭 -> + 종목 추가(선택) -> 기존 종목 재선택/신규 종목 선택 -> 카드 focus 또는 하단시트 slide focus` 확인 필요.
- 기대 증거:
  - 기존 종목 선택은 중복 카드 생성 없음.
  - 신규 종목 선택은 카드 1개만 생성.
  - `afterSelect` detail은 기존/신규 모두 `{ entryIdx, exerciseId, exercise, existing }` 구조.
  - 전체 테스트 통과.
- 실제 결과:
  - PASS: syntax check
  - PASS: targeted tests 21 pass
  - PASS: full tests 654 pass
  - PASS: `git diff --check`
  - not verified yet: `node scripts/verify-runtime-assets.mjs`는 새 파일이 stage 전이라 untracked 경고로 실패. stage 후 재실행 필요.

## 결정

- 통과: 슬라이스 1은 리뷰 기준 통과.
- 수정 필요: 없음.
- 후속 계획 필요: 사용자의 확장 목표에 따라 운동 내부 다음 슬라이스로만 가지 않고, 먼저 전체 클릭 경로/전역 함수/무거운 핸들러 인벤토리를 수행한다.

## NEXT_ACTION.md 업데이트

- 리뷰 종료 상태: 통과
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`의 슬라이스 5 `전체 클릭 경로/전역 함수 의존 인벤토리`를 실행한다.
- 차단 사유: 없음
