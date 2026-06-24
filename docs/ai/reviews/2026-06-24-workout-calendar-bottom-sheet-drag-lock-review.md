# 운동 캘린더 하단 시트 Drag Lock 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 4
- 코드: `render-calendar.js`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- 드래그 release 뒤 `full`로 열린 sheet가 지연 click 때문에 다시 `bar`로 접힐 수 있던 1회성 boolean suppress를 제거했다.
- `_workoutHomeSuppressSheetClickUntil` timestamp window가 `900ms` 동안 유지되어 여러 click handler가 들어와도 모두 무시된다.
- 일반 탭으로 sheet를 여는 흐름은 suppress를 설정하지 않으므로 기존 `_toggleWorkoutHomeSheet()`/`_openWorkoutHomeDay()` 동작을 유지한다.
- `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.
