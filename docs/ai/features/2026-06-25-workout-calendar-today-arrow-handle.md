# 운동 캘린더 오늘 진입 및 sheet 화살표 handle 수정

## 상태

- 상태: `implemented_static_verified`
- 트리거: `/diagnose`
- 요청: 운동 화면 진입 시 캘린더를 현재 시점으로 맞추고, 바텀시트 중앙 상단 슬라이더를 제거한 뒤 좌측 화살표를 중앙 handle로 이동한다.

## 문제

1. 운동 탭 진입 시 캘린더가 현재 월이 아니라 `0.01`, `0-01-01` 같은 비정상 날짜로 표시될 수 있다.
2. 바텀시트 상단 중앙에는 grip 슬라이더가 있고 좌측에는 별도 화살표가 있어 조작 affordance가 분리되어 있다.
3. 사용자는 중앙 상단에서 화살표 하나로 열기/닫기를 조작하기를 원한다.

## 원인

- `applyWorkoutCalendarNavSnapshot()`에서 `Number(null)`을 유효 숫자 `0`으로 처리해 `_viewYear = 0`, `_viewMonth = 0`으로 복원한다.
- 운동 탭 일반 진입 시 nav calendar state가 오늘 기준으로 명시 갱신되지 않아 이전/stale calendar state가 남을 수 있다.
- 중앙 grip과 좌측 arrow가 별도 UI로 렌더링된다.

## 수정 범위

1. 운동 탭 일반 진입 시 `selectedKey`, `viewYear`, `viewMonth`, `selectedSessionIndex`를 오늘 기준으로 설정한다.
2. calendar snapshot 복원에서 `null`/비정상 year/month/date key를 무시하고 오늘 기준 fallback을 사용한다.
3. 중앙 grip DOM을 제거하고, `.cal-workout-day-expand` 버튼을 바텀시트 상단 중앙 affordance로 이동한다.
4. 바텀시트 drag/click 시작점도 중앙 화살표 버튼 기준으로 처리하되 기존 keyboard/click toggle은 유지한다.
5. `STATIC_ASSETS` 변경에 맞춰 `sw.js` `CACHE_VERSION`과 versioned query를 bump한다.

## 검증

- `node --check app.js render-calendar.js workout/navigation-stack.js sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `verify:deploy`, `verify:deployed-markers`

## 실행 결과

1. `applyWorkoutCalendarNavSnapshot()`이 `null` viewYear/viewMonth를 `0`으로 해석하지 않도록 보정했다.
2. 운동 탭 일반 진입 시 오늘 날짜, 현재 연월, 1회차 기준으로 `openWorkoutCalendar()`를 호출하도록 변경했다.
3. `render-calendar.js` 날짜 파서를 4자리 연도와 실제 존재하는 날짜만 허용하도록 강화했다.
4. BottomSheet 중앙 grip DOM/CSS를 제거하고, 기존 좌측 화살표 버튼을 중앙 상단 `data-wt-sheet-handle`로 이동했다.
5. drag/click/key affordance는 중앙 화살표 버튼 기준으로 동작하며, bar 전체는 더 이상 handle처럼 동작하지 않는다.
6. `sw.js` `CACHE_VERSION`과 `index.html` app query를 `20260625z46-workout-today-arrow`로 bump했다.

## 실행 검증

- PASS: `node --check app.js; node --check render-calendar.js; node --check workout/navigation-stack.js; node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 9c9b51786947c28e060c2b8336bce0ec050ac990`
  - 결과: `[deploy-verify] ok 9c9b51786947 tomatofarm-v20260625z46-workout-today-arrow static=215`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "app.js::calendar:tab-today" "render-calendar.js::calendar.viewYear != null" "render-calendar.js::data-wt-sheet-handle data-wt-sheet-toggle" "style.css::translate: -50% 0" "sw.js::tomatofarm-v20260625z46-workout-today-arrow"`

## 남은 검증

- 인증 계정으로 운동 탭 진입 시 현재 월/오늘 선택, 바텀시트 중앙 화살표 click/drag 동작을 실제 UI에서 확인.
