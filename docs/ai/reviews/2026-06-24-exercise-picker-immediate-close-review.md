# 운동 picker row 즉시 닫힘 Slice 8 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-exercise-picker-category-entry.md` Slice 8
- 변경 파일:
  - `workout/exercises.js`
  - `sw.js`
  - `tests/ex-picker-selection-flow.test.js`
  - `tests/workout-test-mode-unified.test.js`

## 결과

- PASS: picker row click handler는 운동을 `S.workout.exercises`에 추가하고 `_renderExerciseList()`를 호출한 뒤 `wtCloseExercisePicker()`로 즉시 닫는다.
- PASS: picker 내부에서 row를 회색조/선택 상태로 남기는 `btn.classList.add('already')`와 이름 `✓` 업데이트를 제거했다.
- PASS: timer bar open/start 흐름과 `saveWorkoutDay({ silent: true })` 저장 호출은 유지했다.
- PASS: 저장 payload, 세트 스키마, `setDoc` 경로는 변경하지 않았다.
- PASS: `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z27-picker-immediate-close`로 bump했다.

## 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run deploy:dashboard3`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- PASS: Dashboard3 Pages가 `tomatofarm-v20260624z27-picker-immediate-close` 캐시 버전을 서빙한다.

## 남은 리스크

- not verified yet: 배포 URL은 로그인 화면에 막혀 인증 계정으로 `운동 탭 -> + -> 가슴 선택 -> 운동 row 클릭` 실제 UI flow를 확인해야 한다.
