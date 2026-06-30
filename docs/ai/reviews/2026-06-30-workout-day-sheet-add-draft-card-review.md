# 운동 하단 시트 종목 추가 초안 카드 회귀 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-workout-day-sheet-add-draft-card.md`
- 변경 파일:
  - `render-calendar.js`
  - `workout/exercises.js`
  - `workout/save.js`
  - `sw.js`
  - 관련 source-contract 테스트

## 결과

추가 수정 이슈 없음.

## 확인 내용

1. 하단 시트 피커 `afterSelect` 경로는 `saveWorkoutDay({ silent: true, keepDraftExercises: !!afterSelect })`를 사용해 초안 종목이 저장 정리 단계에서 제거되지 않는다.
2. `saveWorkoutDay`의 `keepDraftExercises` 옵션은 운동 저장 경로에만 적용되며, 식단 자동저장 경로는 변경하지 않았다.
3. `_workoutMetrics()`의 draft 포함 옵션은 하단 시트 상세 렌더에서만 사용한다. 월간 캘린더/통계 집계 기본 기준은 기존처럼 실제 세트/메모 기반이다.
4. 초안 카드의 성공 기준 표시는 `-kg × -회` 대신 `세트 입력 대기`로 보정되어 사용자가 추가 성공 여부를 구분할 수 있다.
5. `STATIC_ASSETS` 포함 파일 변경에 맞춰 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z09-day-sheet-draft-add`로 bump했다.

## 검증

1. PASS: `node --check render-calendar.js`
2. PASS: `node --check workout/exercises.js`
3. PASS: `node --check workout/save.js`
4. PASS: `node --check sw.js`
5. PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-save-mode-guard.test.js`
6. PASS: `node --test tests/workout-timer-summary-only.test.js`
7. PASS: `node --test --test-reporter=dot tests/*.test.js`
8. PASS: `node scripts/verify-runtime-assets.mjs`
9. PASS: `git diff --check`

## 남은 확인

- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 필요.
- 인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 full -> + -> 종목 선택 -> 같은 1화면에 초안 카드 표시`는 사용자 계정에서 직접 확인 필요.
