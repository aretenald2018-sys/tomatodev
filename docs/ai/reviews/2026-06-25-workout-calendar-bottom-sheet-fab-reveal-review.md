# 운동 캘린더 하단 시트 Slice 8 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 8
- 구현: `render-calendar.js`, `style.css`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-empty-picker-density.test.js`, cache version 참조 테스트들

## 발견 사항

- 없음.

## 확인한 사항

- [render-calendar.js:59](../../render-calendar.js:59)의 `WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX = 112`와 [render-calendar.js:1846](../../render-calendar.js:1846)의 drag `maxHeight` 계산이 같은 clearance 기준을 사용한다.
- [render-calendar.js:1098](../../render-calendar.js:1098)는 회차 bar에서 `wt-day-edit`/`wt-day-add-inline`을 제거하고 [render-calendar.js:1101](../../render-calendar.js:1101)에 `wt-day-fab` 추가 버튼만 남긴다.
- [style.css:10771](../../style.css:10771)의 full sheet 높이와 [style.css:10804](../../style.css:10804)의 full 상태 파란 아래 화살표 animation이 사용자 요청과 맞는다.
- [style.css:10855](../../style.css:10855)의 sheet 내부 session bar padding과 [style.css:10865](../../style.css:10865)의 FAB bottom 고정이 겹침을 줄인다.
- `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 [sw.js:6](../../sw.js:6) `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정 실제 `운동 탭 -> 날짜 sheet full/open-close/add` UI flow 확인이 남아 있다.

## 결정

- 코드 추가 수정 없이 배포 검증 단계로 진행한다.
