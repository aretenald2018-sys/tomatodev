# 2026-07-03 운동 추가/카드 추가 결합 완화 리팩토링 Slice 2 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 실행 슬라이스: Slice 2 `피커 이벤트 바인딩 집중화`
- 변경 파일:
  - `workout/exercises.js`
  - `tests/ex-picker-selection-flow.test.js`

## 결론

- 발견된 P0/P1/P2 이슈: 없음
- 운동 선택 상태 전이는 Slice 1의 `selectWorkoutExerciseEntry()` 계약을 계속 사용한다.
- `_renderPickerList()`는 row마다 선택/edit/delete/hide listener를 붙이지 않고 `data-picker-exercise-id`, `data-picker-row-action`만 렌더한다.
- `_bindPickerListActions(container)`는 container에 한 번만 click/keydown delegate를 붙이며, row action을 먼저 처리해 edit/delete/hide 클릭이 row selection으로 흘러가지 않는다.

## 검증

- PASS: `node --check workout/exercises.js; node --check render-calendar.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
- PASS: `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js tests/stats-picker-ui-polish.test.js tests/workout-navigation-stack.test.js` - 63 pass
- PASS: `node --test tests/*.test.js` - 655 pass
- PASS: `git diff --check`

## 잔여 리스크

- toolbar/category rail/button 생성 경로는 아직 작은 direct listener를 유지한다. 이번 slice는 운동종목 row selection/edit/delete/hide에 집중했다.
- 브라우저 UI 클릭 검증은 운영 배포 전이라 not verified yet.

## 다음 액션

- 변경 파일을 stage한 뒤 `node scripts/verify-runtime-assets.mjs`를 실행한다.
- 이후 commit/push/deploy 후 Tomato Farm 운영계 Pages에서 배포 commit과 운동 피커/운동 카드 흐름을 확인한다.
