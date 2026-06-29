# 운동 캘린더 `+` 운동 추가 클릭 수정 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-workout-calendar-add-fab-click-fix.md` Slice 1
- 변경 파일: `render-calendar.js`, `style.css`, `sw.js`, 관련 테스트, 실행/리뷰 문서

## 리뷰 결과

- 발견된 차단 이슈 없음.
- `+` FAB는 inline `onclick` 의존에서 `data-wt-day-add-session` + sheet capture click binding으로 전환되어, sheet 내부 drag/scroll 이벤트 전파와 분리됐다.
- click target이 텍스트 노드로 들어오는 브라우저 케이스도 `parentElement` fallback으로 처리된다.
- `.cal-workout-day-sheet .wt-day-fab`의 `pointer-events: auto`, `touch-action: manipulation` 추가는 기존 위치/크기/색상 토큰을 바꾸지 않는 hit target 보강이라 TDS 시각 회귀 위험이 낮다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 함께 반영됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` — 515 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e119fca1e0398b56406dcaa729cc7c37469cd861`
- PASS: 배포 자산 마커에서 z58 cache, `_bindWorkoutHomeSheetActions`, `data-wt-day-add-session`, `_addWorkoutHomeSession(key)`, `touch-action: manipulation` 확인

## 남은 확인

- not verified yet: 인증 계정에서 `운동 탭 -> 날짜 sheet full -> 우측 하단 + -> 운동 선택 picker 표시` 실제 UI flow 확인이 필요하다.
