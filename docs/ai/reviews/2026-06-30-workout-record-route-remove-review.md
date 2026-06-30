# 운동 기록 record UI 렌더 경로 제거 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-30-workout-record-route-remove.md`
- 변경 파일:
  - `app.js`
  - `render-calendar.js`
  - `index.html`
  - `style.css`
  - `sw.js`
  - 관련 테스트 파일

## 결과

문제 없음. legacy 운동 record 화면을 렌더하던 route/surface 경로를 제거했고, 호환 함수 `wtOpenWorkoutRecord`가 호출되어도 결과는 하단 시트 open으로 정규화된다.

## 확인한 회귀 방지 포인트

1. `app.js`에서 `pushWorkoutRecord` import와 호출을 제거했다.
2. `WORKOUT_ROUTES.RECORD` 또는 `DETAIL` route가 들어오면 `_redirectWorkoutRecordRouteToDaySheet()`가 하단 시트로 바꾼다.
3. `_setWorkoutSurface('record')`, `wt-workout-record-mode`, `wt-calendar-edit-mode` 실행 코드/CSS 경로가 제거됐다.
4. `render-calendar.js`에서 `_openWorkoutEditorForSession()`과 `_loadWorkoutEditorForSession()`를 제거했다.
5. 운동 탭의 legacy `workout-date-nav` row와 `wt-record-back-btn` DOM/CSS를 제거했다.
6. `sw.js` cache version을 `tomatofarm-v20260630z11-record-route-removed`로 갱신했다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-timer-summary-only.test.js tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`

## 남은 리스크

인증 세션이 없어 실제 모바일 UI에서 `운동 탭 -> 오늘 하단 시트 -> 편집하기` 흐름을 직접 클릭 확인하지 못했다. 배포 asset 검증 후 사용자 계정에서 확인해야 한다.
