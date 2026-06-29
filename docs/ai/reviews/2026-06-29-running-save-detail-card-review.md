# 러닝 저장 후 상세 카드 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-29-running-save-detail-card.md`
- 구현 파일: `app.js`, `workout/running-session.js`, `render-calendar.js`, `style.css`, `sw.js`
- 테스트 파일: `tests/running-entry.test.js`, `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-navigation-stack.test.js` 및 cache marker 테스트들

## Findings

- 발견된 차단/회귀 이슈 없음.

## 확인 내용

- 러닝 저장 후 `wtCloseRunningSession()`만 호출하던 흐름이 같은 날짜/회차의 `window.wtOpenWorkoutDaySheet(..., { action: 'running:save-detail' })` 호출로 이어진다.
- 캘린더 상세의 러닝 카드는 `wt-max-read-card` 골격을 쓰지만 `REP`, `RIR`, `KG`, 세트 row를 렌더하지 않는다.
- 러닝 카드 metric은 기존 저장 schema의 `runDistance`, `runDurationMin/Sec`, `runAvgPaceSecPerKm`, `runRouteSummary`, `runGpsAccuracySummary`만 사용하므로 저장 schema 확장이 없다.
- `sw.js` `STATIC_ASSETS` 대상 파일 변경에 맞춰 `CACHE_VERSION`이 bump됐다.

## 검증

- PASS: `node --check app.js; node --check workout/running-session.js; node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 590 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `refs=853`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e2e3955f42294edc4c6271ba8d3072710d04faec`
- PASS: deployed markers — `sw.js::tomatofarm-v20260629z4-running-save-detail-card`, `app.js::window.wtOpenWorkoutDaySheet = openWorkoutDaySheetFromAction`, `workout/running-session.js::action: 'running:save-detail'`, `render-calendar.js::wt-running-read-card`, `render-calendar.js::평균 페이스`, `style.css::.wt-running-metric-grid`

## 잔여 리스크

- 인증 세션이 없는 배포 브라우저에서는 실제 `러닝 시작 -> 완료 -> 저장 -> 상세 시트` 터치 흐름을 직접 조작할 수 없다. 배포된 commit과 정적 marker는 검증 완료했다.
