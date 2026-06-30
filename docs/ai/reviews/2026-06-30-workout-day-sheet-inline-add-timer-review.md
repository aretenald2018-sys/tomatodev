# 운동 하단 시트 종목 추가/타이머 통합 회귀 수정 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-30-workout-day-sheet-inline-add-timer.md`
- 변경 파일:
  - `render-calendar.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/ex-picker-selection-flow.test.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/workout-navigation-stack.test.js`
  - cache marker 테스트 파일들
  - `docs/ai/NEXT_ACTION.md`

## Findings

- 추가 수정 필요 finding 없음.

## 확인한 계약

1. 하단 시트 `+`는 첫 빈 회차가 아니라 현재 선택된 gym 회차를 target으로 사용한다.
2. 하단 시트 `+`는 `wtOpenWorkoutRecord()`/`pushWorkoutRecord` route push 없이 `loadWorkoutDate()`로 상태만 로드한다.
3. picker 기본 선택 흐름은 기존처럼 기록 화면 카드 포커스를 유지한다.
4. 하단 시트에서 연 picker는 `afterSelect` 후처리로 저장 완료 뒤 같은 날짜/회차 하단 시트를 full 상태로 다시 렌더한다.
5. 캘린더 surface에서는 `.workout-tab-content` 전체 편집 UI가 아니라 `#wt-workout-timer-bar`만 예외적으로 보인다.
6. 타이머 바가 열릴 때 하단 시트 스크롤 영역에 여유 padding을 둔다.
7. `STATIC_ASSETS` 변경에 맞춰 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z08-day-sheet-inline-add-timer`로 갱신했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-timer-summary-only.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 6fde447`
  - 결과: `[deploy-verify] ok 6fde447039f3 tomatofarm-v20260630z08-day-sheet-inline-add-timer static=234`
- PASS: Dashboard3 Pages 직접 asset marker 확인
  - `sw.js` HTTP 200, cache version marker 확인
  - `render-calendar.js` HTTP 200, `_loadWorkoutStateForSheetSession`/`workout-day-sheet`/`sheet:add-exercise` marker 확인
  - `workout/exercises.js` HTTP 200, `_pickerAfterSelect`/`wtOpenExercisePicker(options = {})`/`_runPickerAfterSelect` marker 확인
  - `style.css` HTTP 200, 캘린더 surface timer bar marker 확인

## 남은 리스크

- 인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 full -> + -> 종목 선택 -> 1화면에 카드 추가 및 타이머 하단 표시` 흐름은 배포 후 사용자 계정에서 확인이 필요하다.
