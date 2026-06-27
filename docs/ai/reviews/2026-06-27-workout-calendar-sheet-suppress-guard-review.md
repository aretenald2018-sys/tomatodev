# 운동 캘린더 바텀시트 Suppression Guard 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- Slice: 후속 Slice 14 — Guard stale sheet click suppression
- 변경 파일:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `sw.js`
  - cache version 참조 테스트들

## Findings

- 발견된 차단 이슈 없음.

## 확인한 계약

- full 상태에서 drag release target이 다시 full이면 click suppression을 걸지 않는다. 따라서 바로 이어지는 상단 tap collapse가 suppression window에 씹히지 않는다.
- deadzone 이내 release는 실제 이동량이 `WORKOUT_HOME_SHEET_MIN_SUPPRESS_MOVE_PX = 4` 이상일 때만 후속 click을 억제한다.
- sheet state 적용 시 두 개의 `[data-wt-sheet-toggle]` 모두 `aria-expanded`/`aria-label`을 갱신한다.
- 날짜 텍스트 버튼은 날짜/기록 내용을 유지하고, 화살표 텍스트 변경은 `[data-wt-sheet-handle]`에만 적용한다.
- `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1a46c473abc3b3b7a55ae76611dfe682a3494548`
  - 결과: `[deploy-verify] ok 1a46c473abc3 tomatofarm-v20260627z5-sheet-suppress-guard static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z5-sheet-suppress-guard" "render-calendar.js::WORKOUT_HOME_SHEET_MIN_SUPPRESS_MOVE_PX = 4" "render-calendar.js::if (targetState !== prevState) _suppressWorkoutHomeSheetClick()" "render-calendar.js::querySelectorAll('[data-wt-sheet-toggle]')" "render-calendar.js::data-wt-sheet-main data-wt-sheet-toggle"`

## 남은 범위

- 인증 계정 실제 UI flow 확인은 아직 미수행.
