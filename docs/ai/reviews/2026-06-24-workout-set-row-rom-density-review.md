# 운동 기록 set row ROM 밀도 조정 리뷰

## 리뷰 범위

- 계획: `docs/ai/features/2026-06-24-workout-set-row-rom-density.md` Slice 1
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/workout-card-layout-css.test.js`
  - `tests/workout-test-mode-unified.test.js`

## 결과

- PASS: `.ex-max-v2-main-row`에서 ROM 열 최소 폭을 `42px`에서 기본 `52px`, 360px 이하 `50px`로 늘렸다.
- PASS: KG/REP/RIR/버튼/드래그 핸들 열의 최소 폭을 소폭 줄여 ROM 확장 후에도 한 줄 구조를 유지한다.
- PASS: KG/REP/RIR/ROM 입력 숫자 폰트를 `12px/16px`에서 `11px/15px`로 낮췄다.
- PASS: `.ex-max-v2-rom-field` 내부 input 최소 폭과 `/10` 텍스트 열을 늘려 `10/10` 표시가 덜 끼도록 했다.
- PASS: 360px 이하 media rule을 추가하고, source-level 테스트에서 기본 row 최소폭 `<=266px`, 좁은 화면 row 최소폭 `<=240px`을 검증한다.
- PASS: `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z26-set-row-rom-density`로 bump했다.

## TDS 리뷰

- 발견 1: 기본 grid 최소폭이 271px으로 커져 360px 전후 카드 내부에서 overflow가 날 수 있다는 지적이 있었다.
- 처리: 기본 row 최소폭을 265px 수준으로 낮추고, 360px 이하에서는 232px 수준의 별도 grid를 적용했다.
- 발견 2: 테스트가 선언값만 고정하고 실제 layout budget을 방어하지 못한다는 지적이 있었다.
- 처리: `gridMinBudgetPx()`를 추가해 기본/좁은 화면 row 최소폭 예산을 source-level로 검증한다.
- 확인: 입력 폰트 `11px`은 Seed/TDS 최소 text token과 충돌하지 않는다. 뷰포트 기반 font scaling이나 negative letter-spacing은 추가하지 않았다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-card-layout-css.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: read-only TDS review completed; overflow and test-budget findings addressed.
- PASS: `npm.cmd run deploy:dashboard3`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- PASS: Dashboard3 Pages가 `tomatofarm-v20260624z26-set-row-rom-density` 캐시 버전을 서빙한다.

## 남은 리스크

- not verified yet: 배포 URL은 로그인 화면에 막혀 인증 계정으로 `운동 탭 -> 운동 기록 카드 -> 세트 row` 실제 UI flow를 확인해야 한다.
