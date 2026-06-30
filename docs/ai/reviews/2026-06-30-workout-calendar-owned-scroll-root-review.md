# Workout Calendar Owned Scroll Root Review

## 대상

- 계획: `docs/ai/features/2026-06-30-workout-calendar-owned-scroll-root.md`
- Slice: `Slice 1`
- 요청: 운영 PWA에서 캘린더가 바텀시트 영역에서만 드래그되는 증상의 근본 원인 분석 및 해결

## 변경 파일

- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/workout-navigation-stack.test.js`
- cache marker 참조 테스트들
- `docs/ai/features/2026-06-30-workout-calendar-owned-scroll-root.md`
- `docs/ai/NEXT_ACTION.md`

## 리뷰 결과

- 문제 없음.
- `#tab-workout.wt-calendar-home-mode`는 viewport 높이의 독립 화면이 되고 `overflow:hidden`으로 document/body scroll 의존을 끊는다.
- `#workout-calendar-root`는 `overflow-y:auto`, `overscroll-behavior-y:contain`, `-webkit-overflow-scrolling:touch`, `touch-action:pan-y`를 가진 owned scroll root가 됐다.
- `render-calendar.js`의 scroll 저장/복원은 `#workout-calendar-root.scrollTop`을 우선 사용한다. root가 없을 때만 기존 window scroll fallback을 유지한다.
- bottom sheet full 상태의 입력 격리와 sheet 내부 `.wt-day-sheet-scroll` 스크롤 계약은 건드리지 않았다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z16-workout-owned-scroll-root`로 bump했다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 24 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: 커밋 `7445eef fix: give workout calendar an owned scroll root`를 `origin/main`과 `tomatofarm/main`에 push했다.
- PASS: Tomato Farm 운영계 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 7445eef` → `[deploy-verify] ok 7445eef535e6 tomatofarm-v20260630z16-workout-owned-scroll-root static=233`
- PASS: Tomato Farm 운영계 marker 검증 — `sw.js::tomatofarm-v20260630z16-workout-owned-scroll-root`, `style.css::#tab-workout.wt-calendar-home-mode > #workout-calendar-root`, `style.css::overflow-y: auto`, `style.css::overscroll-behavior-y: contain`, `render-calendar.js::function _workoutHomeScrollRoot`, `render-calendar.js::root.scrollTo`, `render-calendar.js::root.scrollTop = top`
- PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 7445eef` → `[deploy-verify] ok 7445eef535e6 tomatofarm-v20260630z16-workout-owned-scroll-root static=233`
- PASS: Dashboard3 Pages marker 검증 — `sw.js` cache version, owned scroll root CSS, root scroll 저장/복원 marker 확인
- not verified yet: 인증 세션이 없어 실제 모바일 PWA 손 조작 flow는 사용자가 확인해야 한다.
