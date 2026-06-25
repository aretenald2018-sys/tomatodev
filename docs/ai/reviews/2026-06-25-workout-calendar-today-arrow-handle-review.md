# 운동 캘린더 오늘 진입 및 sheet 화살표 handle 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-workout-calendar-today-arrow-handle.md`
- 변경 파일:
  - `app.js`
  - `render-calendar.js`
  - `style.css`
  - `index.html`
  - `sw.js`
  - `workout/navigation-stack.js`
  - 관련 테스트

## 리뷰 결과

차단 이슈 없음.

## 확인한 점

1. 운동 탭 일반 진입은 오늘 날짜와 현재 연월을 navigation state에 명시한다.
2. calendar snapshot 복원은 `null`을 `0`으로 변환하지 않고, 비정상 연월은 오늘 기준으로 보정한다.
3. `_parseDateKey()`는 4자리 연도와 실제 존재하는 날짜만 허용해 `0-01-01`류 표시를 차단한다.
4. 바텀시트 중앙 grip DOM/CSS는 제거됐고, 중앙 상단 화살표 버튼이 `data-wt-sheet-handle` 역할을 맡는다.
5. bar 전체가 아니라 화살표 버튼만 drag/click/key affordance가 된다.
6. `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260625z46-workout-today-arrow`로 bump됐다.

## 검증

- PASS: `node --check app.js; node --check render-calendar.js; node --check workout/navigation-stack.js; node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 9c9b51786947c28e060c2b8336bce0ec050ac990`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "app.js::calendar:tab-today" "render-calendar.js::calendar.viewYear != null" "render-calendar.js::data-wt-sheet-handle data-wt-sheet-toggle" "style.css::translate: -50% 0" "sw.js::tomatofarm-v20260625z46-workout-today-arrow"`

## 남은 리스크

- 인증 계정이 필요한 실제 모바일 UI flow는 자동화하지 못했다.
