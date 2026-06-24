# picker row 선택 즉시 닫힘 회귀 진단

## 증상

- 운동 picker의 부위 목록에서 운동 row를 누르면 picker가 즉시 닫히고 오늘 운동 카드 화면으로 전환된다.
- 사용자는 이 전환을 `회귀 UI`로 인식한다.

## 원인

- `workout/exercises.js`의 picker row click handler가 운동 추가 직후 `wtCloseExercisePicker()`를 호출했다.
- reference 흐름은 picker 안에서 선택 상태를 보여주고 사용자가 `완료`를 누를 때 닫는 구조인데, 기존 구현은 선택과 닫기를 한 동작으로 묶었다.

## 수정

- picker footer와 `완료` 버튼을 추가했다.
- row 선택 시 운동을 추가하고 row를 `already`/`✓` 상태로 바꾸되 picker는 유지한다.
- `완료` 버튼을 누를 때만 picker를 닫는다.
- `tests/ex-picker-selection-flow.test.js`로 row 선택 handler 안의 `wtCloseExercisePicker()` 재도입을 막는다.

## 검증

- PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
