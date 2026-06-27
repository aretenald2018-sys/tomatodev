# 운동 캘린더 바텀시트 Header Toggle 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- Slice: 후속 Slice 13 — Full sheet header tap collapses to bar
- 변경 파일:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `sw.js`
  - cache version 참조 테스트들

## Findings

- 발견된 차단 이슈 없음.

## 확인한 계약

- full 상태에서 상단 날짜/기록 영역 `.cal-workout-day-main`은 `_wtCalOpenDay()` no-op이 아니라 sheet toggle 경로를 탄다.
- 상단 화살표와 날짜/기록 영역은 같은 `[data-wt-sheet-toggle]` capture binding을 공유한다.
- `오늘`, `루틴`처럼 `[data-wt-sheet-action]`이 붙은 버튼은 collapse handler에서 제외된다.
- drag 후 click suppression과 `_openWorkoutHomeDay()`의 같은 날짜 full no-op은 유지된다.
- `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check workout/test-v2/board-core.js render-calendar.js sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test .\tests\*.test.js`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b0336a8`
- PASS: deployed marker 확인 — `sw.js`, `render-calendar.js`

## 남은 범위

- 인증 계정 실제 UI flow 확인은 아직 미수행.
