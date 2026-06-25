# 운동 캘린더 `+` 운동 추가 클릭 수정 계획

## 배경

운동 탭 캘린더 하단 sheet에서 우측 하단 `+` 운동 추가 버튼이 보이지만 모바일에서 눌러도 운동 선택 picker가 열리지 않는 증상이 보고됐다. 첨부 화면 기준으로 버튼은 full sheet 안에서 렌더되어 있으므로, 표시 문제가 아니라 터치/클릭 전달 또는 핸들러 연결 문제로 본다.

## 진단

- 현재 `+` 버튼은 `.wt-day-fab`에 inline `onclick="window._wtCalAddSession(...)"`만 붙어 있다.
- sheet는 drag, scroll guard, post-drag click suppression을 직접 관리한다.
- sheet body는 bar 상태에서 `pointer-events: none`이 되고, full 상태에서는 내부 scroll 영역과 session bar/FAB가 겹치는 레이어 구조다.
- 재현 후보:
  1. 모바일 터치가 inline click까지 도달하지 않는다.
  2. sheet 내부 stop/capture 흐름에서 FAB 클릭이 선점된다.
  3. full sheet scroll guard 또는 session bar 레이어가 FAB hit target을 약화한다.
  4. `_wtCalAddSession()`은 실행되지만 record 전환 직후 picker 호출 타이밍이 깨진다.

## 목표

- `+` 버튼을 누르면 선택 날짜/회차 기준으로 record 화면을 로드하고 `wtOpenExercisePicker()`를 연다.
- sheet drag/click suppression과 독립적으로 FAB 클릭이 직접 처리되게 한다.
- 모바일에서 버튼 hit target이 session bar/scroll 영역에 가려지지 않게 한다.
- 운동 추가 picker 디자인이나 저장 데이터 구조는 변경하지 않는다.

## 실행 Slice 1 — Add FAB click routing hardening

1. `render-calendar.js`에서 `.wt-day-fab`를 inline handler 의존 대신 `data-wt-day-add-session` 버튼으로 렌더한다.
2. `renderWorkoutCalendarHome()` 이후 sheet root에 FAB click capture/direct handler를 바인딩해 `event.preventDefault()`, `event.stopPropagation()` 후 `_addWorkoutHomeSession()`을 호출한다.
3. 필요 시 `_addWorkoutHomeSession()` 호출을 `Promise.resolve(...).catch(...)`로 보호해 실패 시 기존 editor fallback이 유지되게 한다.
4. `style.css`에서 `.cal-workout-day-sheet .wt-day-fab`에 명시적 `pointer-events: auto`와 모바일 터치 정책을 추가한다.
5. `tests/workout-calendar-bottom-sheet.test.js`와 `tests/workout-empty-picker-density.test.js`에 inline handler 제거, data action, direct binding, FAB hit target 계약을 추가/갱신한다.
6. `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

## 제외

- 운동 선택 picker 내부 UX 개편
- 운동 저장/삭제 구조 변경
- 월간 캘린더 sheet drag threshold 재조정
- 인증 계정 데이터 생성 또는 임의 로그인

## 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-navigation-stack.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 인증 계정으로 `운동 탭 -> 오늘/날짜 sheet full -> 우측 하단 + -> 운동 선택 picker 표시` 확인

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-06-25-workout-calendar-add-fab-click-fix.md` Slice 1을 실행한다. 변경 범위는 `render-calendar.js`, `style.css`, 관련 테스트, `sw.js` 캐시 버전으로 제한한다.

## 실행 결과

- `.wt-day-fab`의 inline `onclick` 의존을 제거하고 `data-wt-day-add-session` / `data-date-key` 기반 버튼으로 바꿨다.
- `renderWorkoutCalendarHome()` 후 `_bindWorkoutHomeSheetActions(root)`를 호출해 sheet capture click 단계에서 `+` 버튼을 직접 처리한다.
- 클릭 target이 텍스트 노드로 들어오는 모바일 브라우저 케이스를 고려해 `parentElement` fallback을 추가했다.
- `.cal-workout-day-sheet .wt-day-fab`에 `pointer-events: auto`와 `touch-action: manipulation`을 명시했다.
- 관련 테스트에 direct binding, inline handler 제거, FAB touch target 계약을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z58-workout-add-fab-click`로 bump했다.

## 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` — 515 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e119fca1e0398b56406dcaa729cc7c37469cd861`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z58-workout-add-fab-click" "render-calendar.js::_bindWorkoutHomeSheetActions" "render-calendar.js::data-wt-day-add-session" "render-calendar.js::Promise.resolve(_addWorkoutHomeSession(key))" "style.css::touch-action: manipulation"`
- not verified yet: 인증 계정 실제 `운동 탭 -> 날짜 sheet full -> + -> 운동 선택 picker 표시` UI flow 확인은 수동 확인이 필요하다.
