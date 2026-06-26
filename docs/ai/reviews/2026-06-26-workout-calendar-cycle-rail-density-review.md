# 운동 캘린더 압축 및 사이클 레일 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-26-workout-calendar-cycle-rail-density.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache-version 참조 테스트 파일들

## 결과

- 발견된 차단 이슈 없음.

## 확인한 사항

- 첫 열의 기존 주간 집계(`주차`, 주간 운동시간, 주간 세트 수) 렌더링은 제거됐다.
- 운동 홈 월간 grid는 row의 월요일을 기준으로 `test_board_v2` 활성 사이클 처방을 계산한다.
- 웬들러와 기본 6주 사이클 모두 `buildExerciseProgramWorkoutPrescription()`를 통해 같은 처방 원천을 사용한다.
- 사이클 범위 밖의 주는 표시하지 않도록 `weekIndexOf()`로 1~cycle.weeks 범위를 필터링한다.
- `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 bump했다.
- 모바일 레일 폭은 `스쿼트 100kg` 같은 짧은 레이블이 잘리지 않도록 94px로 확보했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 51 tests passed
- PASS: `node --test .\tests\*.test.js` — 536 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b31e79e`
  - 결과: `[deploy-verify] ok b31e79e91699 tomatofarm-v20260626z6-calendar-cycle-rail static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z6-calendar-cycle-rail" "render-calendar.js::_buildWorkoutCycleRailItems" "render-calendar.js::cal-cycle-branch-text" "style.css::--cal-cycle-rail-width: 94px" "style.css::.cal-cycle-branch.is-wendler"`

## 남은 위험

- not verified yet: 인증 계정이 없어 실제 Dashboard3 운동 탭에서 문정토마토 계정의 웬들러/기본 6주 사이클 레일 표시와 모바일 겹침 여부는 수동 확인이 필요하다.
