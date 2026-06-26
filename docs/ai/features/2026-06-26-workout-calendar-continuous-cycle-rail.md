# 운동 캘린더 cycle rail 실선 연결

## 배경

운동 홈 캘린더 좌측 cycle rail은 각 주 row 안에서 `cal-cycle-rail-line`을 따로 렌더한다. 현재 CSS가 `top: 10px`, `bottom: 10px`로 선을 안쪽에서 끊어 그리기 때문에 연속 주차에 목표 카드가 있어도 주 경계에서 세로 실선이 끊겨 보인다.

사용자는 좌측 실선을 연결하고, 주 단위 구분은 선을 끊는 대신 색을 약간 다르게 주는 방식을 요청했다.

## 목표

1. 좌측 cycle rail의 세로 실선이 주 row 경계에서 끊겨 보이지 않게 한다.
2. 주 단위 구분은 선의 미세한 색상 차이로 표현한다.
3. 기존 생선가시형 branch와 목표 카드 클릭 동작은 유지한다.
4. 색상은 현재 주변 톤과 통일해 과하게 튀지 않게 한다.

## 구현 계획

1. `style.css`에서 `.cal-cycle-rail-line`의 `top/bottom` inset을 제거해 row 전체 높이를 채우게 한다.
2. `.cal-workout-week-row:nth-child(...)`에 `--cal-cycle-rail-color` CSS 변수를 부여한다.
   - 예: 기본 #aeb9c5, 인접 주는 #b4bec8, #a8b5c1처럼 아주 작은 차이만 둔다.
3. `.cal-cycle-branch::before`도 같은 변수 또는 가까운 파생색을 사용해 세로선과 가로 가지의 색이 어긋나지 않게 한다.
4. `.cal-cycle-rail-line`의 border radius는 row 경계 접합부에서 틈이 보이지 않도록 제거하거나 최소화한다.
5. `style.css`는 `sw.js` `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.
6. `tests/workout-calendar-bottom-sheet.test.js`에 회귀 테스트를 추가/수정한다.

## 제외

- 캘린더 레이아웃, 카드 크기, branch 텍스트, 클릭 동작 변경
- 성장보드 데이터 모델 변경
- 웬들러/기본 계단 처방 계산 변경

## 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 `운동 탭 -> 월간 캘린더` 진입 후 좌측 cycle rail 실선이 주 경계에서 이어지고, 주별 색만 약간 달라지는지 확인

## 실행 결과

- `.cal-cycle-rail-line`의 `top/bottom` inset을 `0`으로 바꿔 주 row 전체 높이를 채우게 했다.
- `.cal-workout-week-row:nth-child(...)`에 `--cal-cycle-rail-color`를 부여해 주차별로 미세한 색 차이를 준다.
- 세로 rail line과 branch 가로선이 같은 색 변수를 공유하도록 했다.
- `style.css` 변경에 따라 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z9-cycle-rail-continuous`로 bump했다.
- `tests/workout-calendar-bottom-sheet.test.js`에 rail line 연속성과 색 변수 회귀 테스트를 추가했다.

## 로컬 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 13 tests passed
- PASS: `node --test .\tests\*.test.js` - 545 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=835`
- PASS: `git diff --check`

## 다음 세션 시작 지침

`docs/ai/NEXT_ACTION.md`가 `ready_for_review`이면 이 문서의 변경분을 리뷰하고, 문제가 없으면 Dashboard3 Pages 배포 검증으로 넘긴다.
