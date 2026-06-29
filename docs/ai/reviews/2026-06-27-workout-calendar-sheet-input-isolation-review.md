# 운동 캘린더 full sheet 입력 격리 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` 후속 Slice 16
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 참조 테스트들

## 결론

차단 이슈 없음.

## 확인한 계약

- 바텀시트 여닫기 계약은 여전히 tap-only `bar`/`full` 두 상태다.
- pointer drag, suppression, deadzone, preview height 계산은 다시 추가하지 않았다.
- full 상태에서만 투명 backdrop이 sheet 밖 캘린더 영역 입력을 받아 배경 캘린더 drag/scroll chain을 막는다.
- sheet 내부 스크롤러는 정상 스크롤을 허용하되, top/bottom boundary에서만 touch/wheel 기본 동작을 차단해 배경으로 넘기지 않는다.
- `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z9-workout-sheet-input-isolation`로 bump했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 19 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 553 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 03ff6f8` — `[deploy-verify] ok 03ff6f8e7d39 tomatofarm-v20260627z9-workout-sheet-input-isolation static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z9-workout-sheet-input-isolation" "render-calendar.js::data-wt-sheet-backdrop" "render-calendar.js::_bindWorkoutHomeSheetInputIsolation" "render-calendar.js::_workoutHomeSheetTouchWouldChain" "render-calendar.js::_workoutHomeSheetWheelWouldChain" "style.css::.cal-workout-day-backdrop" "style.css::touch-action: none"`

## 남은 확인

- not verified yet: 인증 계정 실제 `운동 탭 -> 바텀시트 full -> sheet 밖 캘린더 영역 drag`, `sheet 내부 목록 끝에서 추가 drag` UI flow 확인이 남아 있다.
