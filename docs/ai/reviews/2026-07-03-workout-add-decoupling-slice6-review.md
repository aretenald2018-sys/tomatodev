# 2026-07-03 운동 추가/카드 추가 결합 완화 리팩토링 Slice 6 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 실행 슬라이스: Slice 6 `render-calendar.js` 운동 day sheet card action delegation
- 변경 파일:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `sw.js`
  - cache marker 테스트

## 결론

- 발견된 P0/P1/P2 이슈: 없음
- `data-wt-sheet-card-action`은 기존 `_bindWorkoutHomeSheetActions()` capture listener 안에서 처리되어 sheet 내부 `stopPropagation`/backdrop delegation 문제와 충돌하지 않는다.
- set done/remove는 기존 direct `data-wt-set-*` 경로를 유지했고, 새 card action은 그 다음 순서에 위치해 기존 세트 토글/삭제 동작을 덮지 않는다.
- 제거한 `window._wtCal*` exports는 source 기준 더 이상 참조되지 않고, 테스트가 negative assertion으로 재도입을 막는다.

## 검증

- PASS: `node --check render-calendar.js; node --check workout/exercises.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
- PASS: `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js` - 52 pass
- PASS: `node --test tests/*.test.js` - 655 pass
- PASS: `git diff --check`

## 잔여 리스크

- 운영 브라우저 UI 클릭 검증은 아직 배포 전이라 not verified yet.
- `render-calendar.js`에는 오늘/월 이동/세션 탭 등 legacy inline `onclick`이 남아 있다. 이번 slice는 운동 card action 묶음만 줄였고, 나머지는 별도 slice로 분리한다.
- `workout/exercises.js` 피커 list에는 여전히 row별 direct click handler가 많다. 다음 slice에서 단일 위임 구조로 줄인다.

## 다음 액션

- Slice 2 `피커 이벤트 바인딩 집중화`를 실행한다.
