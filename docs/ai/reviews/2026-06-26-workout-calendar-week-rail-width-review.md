# 운동 홈 캘린더 주차 열 폭 확보 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-26-workout-calendar-week-rail-width.md`
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache-version 기대값 테스트

## 리뷰 결과

- PASS: 모바일 운동 홈 캘린더에서 왼쪽 주차 rail과 weekday spacer가 같은 `64px` 폭을 쓴다.
- PASS: 날짜 7열은 남은 폭을 `repeat(7, minmax(0, 1fr))`로 채워 오른쪽 빈 여백을 만들지 않는다.
- PASS: 좁아진 날짜 열에서 기록 chip이 버틸 수 있도록 padding과 font-size를 함께 줄였다.
- PASS: `style.css`는 `STATIC_ASSETS` 대상이며, `sw.js` `CACHE_VERSION` bump가 같은 변경에 포함되었다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-test-mode-unified.test.js` — 14 tests passed
- PASS: `node --test .\tests\*.test.js` — 531 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 6d6be82`
  - 결과: `[deploy-verify] ok 6d6be82c2ad8 tomatofarm-v20260626z3-workout-calendar-rail static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z3-workout-calendar-rail" "style.css::grid-template-columns: 64px repeat(7, minmax(0, 1fr))" "style.css::font-size: 9.5px"`

## 남은 리스크

- not verified yet: 인증 계정이 없어 실제 모바일 브라우저에서 운동 홈 캘린더 시각 상태는 직접 클릭 검증하지 못했다.
