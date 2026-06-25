# 운동 캘린더 하단 시트 Slice 9 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 9
- 진단: `docs/ai/diagnoses/2026-06-25-workout-calendar-sheet-drag-settle.md`
- 구현: `render-calendar.js`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js`, cache version 참조 테스트들

## 발견 사항

- 없음.

## 확인한 사항

- [render-calendar.js](../../render-calendar.js)의 drag release는 `lastDragY`를 사용해 preview와 snap 판단 기준이 분리되지 않는다.
- `openLatched`와 `closeLatched`가 각각 `bar -> full`, `full -> bar` 의도 드래그를 고정한다.
- close threshold가 `minHeight` 기준으로 낮아져 handle drag 거리와 맞는다.
- [sw.js](../../sw.js) `CACHE_VERSION`이 `tomatofarm-v20260625z43-workout-day-sheet-drag-settle`로 갱신됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ da94c74f943735f54c04ef74199da060c3939c26`
  - 결과: `[deploy-verify] ok da94c74f9437 tomatofarm-v20260625z43-workout-day-sheet-drag-settle static=210`
- PASS: 배포 URL asset marker 직접 조회에서 `closeLatched`, `lastDragY`, `const dy = lastDragY`, z43 cache marker를 확인했다.
- not verified yet: 로그인 화면 때문에 인증 계정 실제 `운동 탭 -> 날짜 sheet drag up/down settle` UI flow 확인은 남아 있다.

## 결정

- 코드 추가 수정 없이 완료한다. 인증 계정 실제 UI flow만 수동 확인 대상으로 남긴다.
