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

## 남은 확인

- Dashboard3 Pages 배포 후 `verify:deploy`와 배포 asset marker 확인이 필요하다.
- 인증 계정 세션이 있으면 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩 -> 종목 설정 sheet -> 현재 사이클 원 탭` 실제 UI flow를 직접 확인한다.
