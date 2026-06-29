# 운동 캘린더 cycle rail 실선 연결 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-26-workout-calendar-continuous-cycle-rail.md`
- 구현 커밋: `e023967`
- 변경 파일:
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache version 참조 테스트들
  - `docs/ai/features/2026-06-26-workout-calendar-continuous-cycle-rail.md`

## 발견된 문제

없음.

## 확인한 동작

- `.cal-cycle-rail-line`이 `top: 0`, `bottom: 0`으로 주 row 전체 높이를 채워 row 경계에서 선이 끊기지 않게 됐다.
- `.cal-workout-week-row:nth-child(...)`가 `--cal-cycle-rail-color`를 주별로 다르게 부여한다.
- 세로 rail line과 branch 가로선이 같은 CSS 변수를 사용해 색상 톤이 맞는다.
- 기존 목표 카드 스타일과 클릭 대상은 그대로 유지된다.
- `style.css`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` 캐시 버전을 함께 bump했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 13 tests passed
- PASS: `node --test .\tests\*.test.js` - 545 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `git diff --cached --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ e023967`
  - 결과: `[deploy-verify] ok e02396785814 tomatofarm-v20260626z9-cycle-rail-continuous static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z9-cycle-rail-continuous" "style.css::--cal-cycle-rail-color: #aeb9c5" "style.css::.cal-workout-week-row:nth-child(6n + 2)" "style.css::border-left: 2px solid var(--cal-cycle-rail-color" "style.css::border-top: 2px solid var(--cal-cycle-rail-color"`

## 남은 리스크

- not verified yet: 인증 계정 세션이 없어 배포 URL에서 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 시각 상태` 실제 UI flow는 직접 조작하지 못했다.
