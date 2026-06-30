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
- PASS: 커밋 `041f878 fix: widen workout calendar drag surface`를 `origin/main`에 push했다.
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 041f878` — `[deploy-verify] ok 041f878367c6 tomatofarm-v20260630z13-workout-calendar-drag-surface static=233`
- PASS: deployed markers — `sw.js` cache version, `render-calendar.js` `scrollSurfaceAttr`/`data-wt-calendar-scroll-surface`, `style.css` `.cal-workout-surface-home`/`touch-action: pan-y`
- not verified yet: 인증 세션이 없어 실제 캘린더 손가락 드래그 UI는 직접 조작하지 못했다.

## 결정

- 추가 수정 이슈 없음. 배포 검증은 완료했고, 실제 인증 UI 드래그 확인만 사용자 기기에서 남아 있다.
