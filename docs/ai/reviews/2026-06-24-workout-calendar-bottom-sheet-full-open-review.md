# 운동 캘린더 하단 시트 Full Open Gesture 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 3
- 코드: `render-calendar.js`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- `_stepWorkoutHomeSheet()`가 더 이상 `mid`에 정착하지 않고, 위 방향은 `full`, 아래 방향은 `bar`로만 전환한다.
- drag release 기준이 `12px`로 낮아져 짧은 위 제스처도 즉시 full sheet로 열린다.
- drag preview의 `±180px` 제한이 제거되어, 크게 끌 때도 `maxHeight`까지 높이 미리보기가 따라간다.
- `WORKOUT_HOME_SHEET_CLASS_STATES`는 이전 `is-mid` class를 제거하기 위한 legacy class cleanup 용도로만 사용된다.
- `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a65721dbb3e6423206d505118ead185c7c6f2926`
  - 결과: `[deploy-verify] ok a65721dbb3e6 tomatofarm-v20260624z37-workout-day-sheet-full-open static=210`
- PASS: 배포된 `sw.js`와 `render-calendar.js`에 Slice 3 cache version, full 전이, `12px` release threshold가 반영된 것을 확인했다.
- not verified yet: 배포 URL은 로그인 화면에서 막혀 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.
