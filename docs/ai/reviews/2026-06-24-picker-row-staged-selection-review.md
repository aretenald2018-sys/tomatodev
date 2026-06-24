# picker row staged selection 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 6
- 증상: picker의 운동 row 선택 즉시 기존 오늘 운동 카드 화면으로 닫히는 회귀
- 변경 파일: `modals/ex-picker-modal.js`, `workout/exercises.js`, `style.css`, `sw.js`, `tests/ex-picker-selection-flow.test.js`

## 리뷰 결과

- Blocking finding 없음.
- row click handler에서 운동 추가 직후 `wtCloseExercisePicker()`를 호출하던 흐름이 제거됐다.
- picker 하단 `완료` 버튼이 명시적으로 닫기 동작을 담당하므로 reference UI처럼 선택과 닫기가 분리됐다.
- `tests/ex-picker-selection-flow.test.js`가 row 선택 handler 안에 `wtCloseExercisePicker()`가 재도입되는 회귀를 차단한다.
- `style.css`, `workout/exercises.js`, `modals/ex-picker-modal.js`가 서비스워커 정적 자산 범위에 있으므로 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check modals/ex-picker-modal.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3de3708`
- PASS: 배포 URL 원격 파일 확인: `ex-picker-done`, `_syncPickerDoneButton`, `tomatofarm-v20260624z19-picker-staged-done`

## 남은 리스크

- 배포 브라우저는 로그인 화면에 막혀 인증된 실제 row tap -> picker 유지 -> `완료` tap 흐름을 끝까지 확인하지 못했다.
