# 운동 캘린더 터치 스크롤 개선 리뷰

## 리뷰 대상

- `docs/ai/features/2026-06-30-workout-calendar-touch-scroll-fix.md`
- `app.js`
- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/workout-navigation-stack.test.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/*` cache marker 기대값 변경

## Findings

- 없음.

## 확인한 사항

- `data-wt-calendar-scroll-surface` 표식은 월간 운동 캘린더 그리드에만 추가되어 날짜 bar, full sheet 내부 스크롤, 운동 상세/기록 화면에는 영향을 주지 않는다.
- `_isWorkoutPullBlockedTarget()`은 해당 표식을 pull-back 차단 대상으로만 사용하므로 기존 route back, picker back, running session back 순서는 변경하지 않는다.
- `.cal-workout-month-grid`의 `touch-action: pan-y`는 세로 pan 허용만 명시하며 grid 크기, 셀 크기, bottom sheet snap 로직을 바꾸지 않는다.
- `style.css`, `app.js`, `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` cache version bump가 필요했고 반영됐다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js` — 21 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `320803395160`, `tomatofarm-v20260630z02-workout-calendar-scroll`
- PASS: Dashboard3 Pages marker 검증 — `app.js`의 `[data-wt-calendar-scroll-surface]`, `render-calendar.js`의 `data-wt-calendar-scroll-surface`, `style.css`의 `touch-action: pan-y`, `sw.js`의 cache version 확인
- not verified yet: 인증 계정 실제 `운동 탭 -> 월간 캘린더 영역에서 아래 방향 스크롤` UI flow 확인이 남아 있다.

## 결정

- 코드 추가 수정 없이 Dashboard3 Pages 배포를 완료했다.
