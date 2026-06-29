# 운동 캘린더 날짜 상세 하단 시트 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md`
- 코드: `render-calendar.js`, `style.css`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache version 기대값 갱신 테스트들

## 결과

- 치명/주요 이슈 없음.
- 기존 하단 날짜 탭(`.cal-workout-day-bar`)이 `.cal-workout-day-sheet`의 헤더로 재사용된다.
- 날짜 클릭은 월간 캘린더를 지우지 않고 sheet를 `bar -> full`로 전환한다.
- drag 중에는 `--wt-day-sheet-drag-height`가 갱신되어 sheet 높이가 손가락 이동을 따라 변하고, release 후 `bar`/`mid`/`full` 상태로 정착한다.
- sheet 내부의 `.wt-day-sessionbar`는 viewport fixed가 아니라 sheet 내부 하단에 배치된다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 3d76b141d0a47b4d60af24e5fc07e147269808f9`
  - 결과: `[deploy-verify] ok 3d76b141d0a4 tomatofarm-v20260624z35-workout-day-sheet static=210`
- not verified yet: 배포 페이지 브라우저 확인은 로그인 화면에서 막혀 인증 계정의 `운동 탭 -> 날짜 탭 -> 하단 시트 drag -> + 버튼` 실제 UI flow를 끝까지 조작하지 못했다.

## 브라우저 확인

- URL: `https://aretenald2018-sys.github.io/dashboard3/`
- 확인 결과: 페이지 title은 `토마토 키우기`, 본문에 `이름으로 로그인하세요`, `로그인`, `처음이신가요? 3초만에 가입하기`가 보여 인증 전 화면으로 판단했다.
- DOM에는 `#workout-calendar-root`가 존재하지만 로그인 전 상태라 `.cal-workout-day-sheet`는 렌더되지 않았다.
