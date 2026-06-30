# 운동 캘린더 드래그 Surface 회귀 수정 리뷰

## 리뷰 대상

- `docs/ai/features/2026-06-30-workout-calendar-drag-surface-fix.md`
- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/workout-navigation-stack.test.js`
- cache marker 기대값 변경 테스트들

## Findings

- 없음.

## 확인한 사항

- `data-wt-calendar-scroll-surface`는 운동 홈 surface wrapper에 조건부로 추가되어 일반 캘린더 surface에는 확장되지 않는다.
- 기존 grid-level `data-wt-calendar-scroll-surface`는 유지되어 이전 회귀 테스트 계약을 깨지 않는다.
- `.cal-workout-surface-home`의 `touch-action: pan-y`는 월간 surface 세로 pan 의도만 명시하며, bottom sheet `bar`/`full` 탭 토글 계약과 `pointerdown` drag 금지 테스트는 그대로 유지된다.
- `render-calendar.js`, `style.css`, `sw.js`가 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js` — 24 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- not verified yet: Dashboard3 Pages 배포 및 인증 계정 실제 UI 드래그 확인이 남아 있다.

## 결정

- 추가 수정 이슈 없음. 배포 검증 후 `NEXT_ACTION.md`를 완료 상태로 갱신한다.
