# 웬들러 세트 칩과 전용 그래프 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md` Slice 12
- 변경 파일:
  - `calc.js`
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/calc.expert.test.js`
  - `tests/workout-track-graph-delta.test.js`
  - `tests/workout-test-mode-unified.test.js`
  - cache-version 참조 테스트 파일들

## 리뷰 결과

- 이슈 없음.

## 확인한 계약

- 웬들러 entry는 `recommendationMeta.program`, `maxPrescription.program`, `wendlerSignature`, 세트 `wendlerRole`로 판별된다.
- 웬들러 entry는 기존 `getTrackMetricHistory()`와 `getLastTrackSession()`의 볼륨/강도 집계에서 제외된다.
- 웬들러 그래프는 `getWendlerMetricHistory()`의 `W` row만 렌더한다.
- 웬들러 자동 세트 칩은 `wendlerRole`을 우선해 `프리`/`메인`/`BBB`/`FSL`로 표시한다.
- 웬들러 자동 세트의 타입 칩 클릭은 기존 `프리 -> 본 -> 드롭` 순환을 적용하지 않는다.
- `sw.js` `CACHE_VERSION`은 `tomatofarm-v20260626z5-wendler-track-graph`로 bump됐다.

## 검증

- PASS: `node --check calc.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/calc.expert.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js` — 41 tests passed
- PASS: `node --test .\tests\*.test.js` — 534 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1b801bf`
  - 결과: `[deploy-verify] ok 1b801bf5b7a8 tomatofarm-v20260626z5-wendler-track-graph static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z5-wendler-track-graph" "calc.js::getWendlerMetricHistory" "workout/exercises.js::getWendlerMetricHistory" "workout/exercises.js::return 'BBB'"`

## 남은 검증

- not verified yet: 인증 계정이 없어 실제 UI flow `운동 탭 -> + -> 웬들러 설정 종목 추가 -> 프리/메인/BBB 칩과 웬들러 단일 그래프 확인`은 배포 URL에서 수동 확인 필요.
