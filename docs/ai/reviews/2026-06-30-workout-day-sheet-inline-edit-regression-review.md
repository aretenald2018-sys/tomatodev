# 운동 하단 시트 편집 버튼 회귀 수정 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-30-workout-day-sheet-inline-edit-regression.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 테스트 파일들
  - `docs/ai/NEXT_ACTION.md`

## 결과

문제 없음. 하단 시트 헬스 카드의 `편집하기` 버튼은 더 이상 `_wtCalEditSession()`을 통해 기록 편집 route로 빠지지 않는다. 버튼은 `_wtCalEditExerciseCard()`로 inline edit mode를 열고, 세트 값 수정/완료 토글/추가/삭제는 기존 `upsertWorkoutSession()` 및 `saveDay(..., { mode: 'merge' })` 경로로 저장된다.

## 확인한 회귀 방지 포인트

1. `_editWorkoutHomeSession()`에서 `_openWorkoutEditorForSession()` 호출을 제거했다.
2. 하단 시트 헬스 카드 렌더링에서 `편집하기` 버튼이 `_wtCalEditExerciseCard()`를 호출한다.
3. inline edit mode는 `rawSetDetails`를 사용해 원본 세트 index를 유지한다.
4. 저장은 기존 `workoutSessions` aggregate 경로를 사용해 오늘 기록과 타이머 흐름을 분기하지 않는다.
5. `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version을 `tomatofarm-v20260630z10-day-sheet-inline-edit`로 갱신했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-save-mode-guard.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 84de7cc`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260630z10-day-sheet-inline-edit" "render-calendar.js::window._wtCalEditExerciseCard = _editWorkoutExerciseCard" "render-calendar.js::action: 'sheet:edit-inline'" "style.css::.wt-max-rom-inline.is-editing input"`

## 남은 리스크

인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 full -> 종목 카드 편집하기 -> 세트 수정/추가/삭제` 클릭 흐름은 직접 확인하지 못했다. 배포 asset 검증 후 사용자가 동일 흐름을 확인해야 한다.
