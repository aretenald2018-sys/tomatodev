# 현재 사이클 원 클릭 회색 overlay 수정 리뷰

## 리뷰 대상

- `workout/test-v2/board-render.js`
- `test-mode-v2.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache version 참조 테스트들
- `docs/ai/features/2026-06-26-workout-cycle-rail-inert-click-fix.md`

## 결과

- 발견 이슈 없음.
- `#tm2-sheets` layer는 `.tm2-sheet` 내부 클릭을 backdrop close 또는 중복 action routing으로 처리하지 않는다.
- `.tm2-sheet` 내부의 `[data-tm2-col-cycle]` 클릭은 `preventDefault`, `stopPropagation`, `stopImmediatePropagation` 후 no-op 처리된다.
- current cycle 원/화살표는 `pointer-events: none`, `user-select: none`으로 표시 전용화되어 모바일 tap target이 되지 않는다.
- 일반 sheet 버튼은 current cycle 영역 밖에서 기존 `_onAction(event)` 경로를 계속 탄다.
- `board-render.js`와 `test-mode-v2.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version bump가 포함되었다.

## 검증

- PASS: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 53 tests passed
- PASS: `node --test .\tests\*.test.js` — 546 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1b0313b`
  - 결과: `[deploy-verify] ok 1b0313b546e6 tomatofarm-v20260626z12-cycle-rail-inert-click static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z12-cycle-rail-inert-click" "workout/test-v2/board-render.js::event.stopImmediatePropagation()" "workout/test-v2/board-render.js::if (e.target.closest('.tm2-sheet')) return" "workout/test-v2/board-render.js::event.target.closest('[data-tm2-col-cycle]')" "test-mode-v2.css::.tm2-col-cycle-point," "test-mode-v2.css::pointer-events: none" "test-mode-v2.css::user-select: none"`

## 남은 확인

- 인증 계정 세션이 없어 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩 -> 종목 설정 sheet -> 현재 사이클 원 탭` 실제 UI flow는 배포 URL에서 직접 조작하지 못했다.
