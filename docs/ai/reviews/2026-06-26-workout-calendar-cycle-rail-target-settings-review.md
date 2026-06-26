# 운동 캘린더 사이클 레일 목표 카드 설정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-26-workout-calendar-cycle-rail-density.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `workout/test-v2/board-render.js`
  - `workout/test-v2/entry.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache-version 참조 테스트 파일들

## 결과

- 발견된 차단 이슈 없음.

## 확인한 사항

- `.cal-workout-week-row`의 row 전체 `border-bottom`을 제거하고 `.cal-workout-week-cells`에만 경계선을 적용해 첫 열 레일이 주별 경계에서 끊기지 않는다.
- `.cal-cycle-branch`와 웬들러/강도 variant 색상을 같은 회청색 계열로 통일해 월간 캘린더 기록 chip 톤과 맞췄다.
- 레일 목표 카드는 `button[data-cal-cycle-target]`으로 렌더되고 capture click handler에서 날짜 셀 클릭으로 전파되지 않게 처리한다.
- `render-calendar.js`는 성장보드 entry 모듈을 lazy-load한 뒤 `window.tm2OpenBenchmarkSettings()`를 호출한다.
- `workout/test-v2/board-render.js`의 `tm2OpenBenchmarkSettings(benchmarkId)`는 기존 overlay를 열고 해당 benchmark의 `openColumnSheet(bmId)`를 실행하므로 새 데이터 구조나 새 설정 UI를 만들지 않는다.
- `render-calendar.js`, `style.css`, `workout/test-v2/entry.js`, `workout/test-v2/board-render.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 bump했다.

## 검증

- PASS: `node --check render-calendar.js; node --check workout/test-v2/board-render.js; node --check workout/test-v2/entry.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 52 tests passed
- PASS: `node --test .\tests\*.test.js` — 537 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 63624ac`
  - 결과: `[deploy-verify] ok 63624ac3e2e3 tomatofarm-v20260626z7-cycle-rail-target-settings static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z7-cycle-rail-target-settings" "render-calendar.js::data-cal-cycle-target" "render-calendar.js::_openWorkoutCycleTargetSettings" "workout/test-v2/board-render.js::tm2OpenBenchmarkSettings" "workout/test-v2/entry.js::window.tm2OpenBenchmarkSettings" "style.css::.cal-workout-week-row:last-child .cal-workout-week-cells" "style.css::background: #d7e4ed"`

## 남은 위험

- not verified yet: 인증 계정이 없어 실제 Dashboard3 운동 탭에서 `월간 캘린더 -> 레일 목표 카드 탭 -> 해당 종목 설정 시트 표시`는 수동 확인이 필요하다.
