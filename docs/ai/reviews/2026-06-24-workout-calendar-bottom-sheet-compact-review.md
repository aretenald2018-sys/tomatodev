# 운동 캘린더 하단 시트 Compact/Drag Fix 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 2
- 코드: `render-calendar.js`, `style.css`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- 접힌 sheet 높이는 기존 `132~206px` 수준에서 `64~96px` 수준으로 줄었다.
- 하단 bar는 `30px minmax(0, 1fr) auto` 한 행 grid로 유지되며, 날짜/기록/회차/오늘/루틴 정보가 한 행에 들어간다.
- 좌측 화살표는 `wt-sheet-arrow-pulse` animation과 glow 색상으로 상향 drag affordance를 갖는다.
- drag 불가 원인이던 `closest('button')` 차단을 제거했고, 실제 action 버튼만 `data-wt-sheet-action`으로 제외한다.
- drag release 뒤 click 이벤트가 뒤늦게 실행되어 sheet 상태를 되돌릴 수 있는 문제는 `_workoutHomeSuppressNextSheetClick`으로 막았다.
- `style.css`, `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.
