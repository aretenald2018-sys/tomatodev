# 운동 캘린더 바텀시트 탭 토글 재작성 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` 후속 Slice 15
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 참조 테스트들

## 결론

차단 이슈 없음.

## 확인한 계약

- 바텀시트 상태는 `bar`/`full` 두 상태만 남았다.
- sheet toggle click은 `bar -> full`, `full -> bar`만 수행한다.
- pointer drag, suppression window, deadzone, drag preview CSS 변수, `is-mid`/`is-dragging` 잔재를 제거했다.
- 날짜 클릭과 오늘 상세 진입도 중간 animation frame 없이 직접 `full` 상태로 렌더한다.
- `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z7-workout-sheet-tap-toggle`로 bump했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 18 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 551 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d95bcff` — `[deploy-verify] ok d95bcff37343 tomatofarm-v20260627z7-workout-sheet-tap-toggle static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z7-workout-sheet-tap-toggle" "render-calendar.js::const WORKOUT_HOME_SHEET_CLASS_STATES = ['bar', 'full'];" "render-calendar.js::function _toggleWorkoutHomeSheet" "render-calendar.js::_workoutHomeSheetState = 'full'" "render-calendar.js::sheetState: 'full'" "render-calendar.js::_setWorkoutHomeSheetState('bar')" "style.css::height: var(--wt-day-sheet-height)"`

## 남은 확인

- not verified yet: 인증 계정 실제 `운동 탭 -> 접힌 바텀시트 탭 -> full -> 상단 탭 -> bar` UI flow 확인이 남아 있다.
