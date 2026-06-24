# 운동 캘린더 하단 시트 Open Latch 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 7
- 코드: `render-calendar.js`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- open threshold를 full 확장 거리 기준에서 접힌 bar 높이 기준 10%로 낮춰, 실제 모바일에서 작은 위 drag도 release 시 `full`로 고정될 수 있게 했다.
- `openLatched`가 위 방향 threshold 통과 이후 release 최종 좌표 흔들림을 무시하고 `full`을 선택하므로, 올라갔다가 다시 `bar`로 판정되는 경로를 줄였다.
- `openLatched`는 `bar` 시작 drag에서만 켜지므로, `full` 상태에서 아래로 크게 끌어 닫는 동작은 기존 resolver로 유지된다.
- `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bda8fd26b49e731fc43807844b737ed155fa7ed6`
  - 결과: `[deploy-verify] ok bda8fd26b49e tomatofarm-v20260625z41-workout-day-sheet-open-latch static=210`
- PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `bda8fd26b49e`, z41 cache, bar-height 10% open threshold, `openLatched`, velocity-close 제거를 반환한다.
- not verified yet: 로그인 화면에 막혀 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.
