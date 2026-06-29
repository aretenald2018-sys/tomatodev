# 운동 캘린더 하단 시트 Snap UX 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 5
- 코드: `render-calendar.js`, `style.css`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- release snap은 `_resolveWorkoutHomeSheetDragTarget(dy, velocityY)`로 분리되어 거리와 속도를 함께 본다.
- `bar` 상태에서는 작은 위 방향 제스처로 쉽게 `full`이 되고, `full` 상태에서는 `96px` 이상 아래 drag 또는 빠른 downward fling에서만 `bar`로 접힌다.
- 열린 상태에서 동일 날짜를 다시 탭하면 no-op 처리되어 불필요한 `bar -> full` 재렌더 flicker가 줄었다.
- sheet 헤더에는 grip pill이 추가됐고, 열린 상태에서는 화살표 pulse가 비활성화되어 덜 산만하다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b872a13e4f24c3460df45e1ef01e553728602709`
  - 결과: `[deploy-verify] ok b872a13e4f24 tomatofarm-v20260624z39-workout-day-sheet-snap-ux static=210`
- not verified yet: 배포 URL은 로그인 화면에서 막혀 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.
