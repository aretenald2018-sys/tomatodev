# 운동 캘린더 하단 시트 10 Percent Open 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 6
- 코드: `render-calendar.js`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- `bar` 상태에서 full까지 남은 확장 거리의 10%를 계산해 open threshold로 사용한다.
- 10% 지점을 넘는 순간 drag preview도 `maxHeight`로 고정되어 손을 떼기 전부터 끝까지 펼쳐지는 느낌을 준다.
- release snap도 같은 `openThresholdPx`를 사용하므로 preview와 최종 상태 기준이 어긋나지 않는다.
- 열린 sheet는 아래 방향 속도만으로 닫히지 않고, `max(220px, dragTravel * 0.35)` 이상 실제로 아래로 끌 때만 닫힌다.
- snap 기준 미만의 작은 pointer move도 후속 click을 suppress하므로, drag release가 header toggle click으로 오인되어 sheet가 다시 닫히는 경로를 막는다.
- 최소 open threshold는 `10px`로 유지해 아주 작은 화면이나 잘못된 height 계산에서 과민 반응을 줄인다.
- `render-calendar.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d6606731f076a0ba8540c6b2b82d6f570e2417f0`
  - 결과: `[deploy-verify] ok d6606731f076 tomatofarm-v20260624z40-workout-day-sheet-open-10pct static=210`
- PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `d6606731f076`, z40 cache, 10% open ratio, `hasMoved` click suppression, velocity-close 제거를 반환한다.
- not verified yet: 로그인 화면에 막혀 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.
