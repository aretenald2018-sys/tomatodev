# 운동 캘린더 압축 및 사이클 레일 계획

## 배경

운동 탭 월간 캘린더에서 상단 연월 영역과 이번 달 운동 요약 카드가 화면을 많이 차지해 실제 월간 그리드가 짧게 보인다. 또한 현재 첫 열은 `23주`, 주간 운동시간, 세트 수를 집계해 보여주지만, 이 공간은 앞으로 다른 방식으로 활용할 예정이므로 기존 집계 텍스트를 제거해야 한다.

첨부 두 번째 화면의 가로 구간선 방식은 방향만 참고하고, 이번 변경에서는 첫 열에 세로 구간선을 세운 뒤 주차별 가지처럼 사이클 운동 처방을 표시하는 구조로 바꾼다.

## 그릴 결과

- 이해한 요구:
  1. 운동 탭 월간 캘린더 상단 연월 영역을 더 위로 붙여 캘린더 세로 공간을 확보한다.
  2. `이번 달 운동` 요약 카드 높이를 대략 절반으로 줄인다.
  3. 첫 열의 `23주`, `1h`, `69s` 같은 주차/운동시간/세트 집계 텍스트는 지운다.
  4. 첫 열 공간에는 세로 사이클 레일을 그리고, 주차별 처방을 생선가시처럼 옆으로 빼서 표시한다.
  5. 웬들러 6주 사이클 종목은 해당 주차의 메인 세트 중 최고중량 세트를 `스쿼트 100kg`처럼 짧게 표시한다.

- 코드에서 확인한 데이터 원천:
  1. 월간 운동 캘린더는 `render-calendar.js`의 `_renderWorkoutCalendar()`와 `_renderWorkoutMonthGrid()`가 만든다.
  2. 첫 열은 `.cal-workout-week-rail`이고 현재 주차, 주간 시간, 세트 수를 렌더한다.
  3. 웬들러 처방은 `workout/test-v2/board-core.js`의 `buildExerciseProgramWorkoutPrescription()`과 `workout/test-v2/wendler.js`의 `wendlerWeekPrescription()`로 주차별 top set을 계산할 수 있다.

- 결정:
  1. 첫 열 사이클 레일의 표시 대상은 `웬들러 + 기본 6주 사이클` 전체로 한다.

## 목표

- 모바일 첫 화면에서 월간 캘린더가 더 길게 보이도록 상단 UI 밀도를 낮춘다.
- 첫 열의 기존 주간 집계 텍스트를 제거한다.
- 첫 열에 주차별 사이클 처방을 짧은 레이블로 노출한다.
- 웬들러는 해당 주차의 메인 top set 기준으로 운동명과 kg를 표시한다.

## 실행 Slice 1 — Calendar density and cycle rail

1. `render-calendar.js`에서 월간 요약 카드 렌더링을 압축형 구조로 변경한다.
2. `style.css`에서 운동 홈 월 헤더와 요약 카드 높이/간격을 줄인다.
3. `_renderWorkoutMonthGrid()`의 `.cal-workout-week-rail` 내용을 기존 주간 집계 대신 사이클 레일 placeholder/branch 구조로 바꾼다.
4. `test_board_v2`의 활성 사이클과 벤치마크에서 주차별 처방 레이블을 만든다.
5. 웬들러 종목은 top main set kg를 `운동명 kg`로 표시하고, 필요하면 reps는 접근성 title 또는 축약 보조 텍스트에만 둔다.
6. 관련 source/DOM/CSS 회귀 테스트를 추가한다.
7. `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

## 제외

- 월간 캘린더의 날짜별 운동 기록 저장/삭제 구조 변경
- 하단 날짜 sheet 동작 변경
- 운동 프로그램 설정 화면 변경
- `www/` 직접 수정
- 인증 계정 데이터 직접 생성 또는 임의 로그인

## 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/test-v2.board-core.test.js`
- 필요 시 신규 테스트 파일 실행
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 인증 계정으로 `운동 탭 -> 월간 캘린더` 진입 후 다음 UI 상태 확인:
  1. 상단 월 헤더와 이번 달 운동 카드가 압축되어 캘린더가 더 길게 보임
  2. 첫 열의 주차/시간/세트 텍스트가 사라짐
  3. 사이클 레일에 웬들러 처방이 `스쿼트 100kg`처럼 표시됨

## 다음 세션 시작 프롬프트

사용자가 사이클 레일 표시 범위를 결정하면 `docs/ai/features/2026-06-26-workout-calendar-cycle-rail-density.md` Slice 1을 실행한다. 변경 범위는 `render-calendar.js`, `style.css`, 관련 테스트, `sw.js`, 문서 갱신으로 제한한다.

## 실행 결과

- 첫 열 사이클 레일 표시 대상은 사용자의 `전체` 결정에 따라 웬들러와 기본 6주 사이클 전체로 확정했다.
- `render-calendar.js`에서 `test_board_v2` 활성 벤치마크와 활성 사이클을 읽어 row의 월요일 기준 주차 처방을 계산한다.
- 웬들러는 top main set 기준으로 `스쿼트 100kg` 같은 짧은 레이블을 만들고, 기본 6주 사이클은 활성 트랙별 계획 kg를 같은 레일에 표시한다.
- 기존 첫 열의 `23주`, 주간 운동시간, 세트 수 출력은 제거했다.
- 운동 홈 상단 월 헤더와 `이번 달 운동` 요약 카드의 padding/margin/font를 줄이고, 요약 통계를 2열로 접어 높이를 줄였다.
- `style.css`에서 레일 폭을 94px로 확보하고, 세로선 + 가지 레이블 형태의 스타일을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z6-calendar-cycle-rail`로 bump했다.

## 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 51 tests passed
- PASS: `node --test .\tests\*.test.js` — 536 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b31e79e`
  - 결과: `[deploy-verify] ok b31e79e91699 tomatofarm-v20260626z6-calendar-cycle-rail static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z6-calendar-cycle-rail" "render-calendar.js::_buildWorkoutCycleRailItems" "render-calendar.js::cal-cycle-branch-text" "style.css::--cal-cycle-rail-width: 94px" "style.css::.cal-cycle-branch.is-wendler"`
- not verified yet: 인증 계정이 없어 실제 `운동 탭 -> 월간 캘린더 -> 문정토마토 계정 사이클 레일 표시` UI 확인은 수동 확인이 필요하다.

## 실행 Slice 2 — Cycle rail continuity and target card settings

### 배경

배포 후 첨부 화면 기준으로 첫 열 레일이 주 row 경계선 때문에 끊겨 보이고, 레일 목표 카드 색상이 주변 캘린더 톤과 다르게 튄다. 또한 목표 카드를 눌렀을 때 해당 운동종목의 6주 계획/목표를 바로 설정할 수 있어야 한다.

### 목표

1. 첫 열에 한해 주별 가로 경계선을 제거해 세로 레일이 끊기지 않게 한다.
2. 레일 선과 목표 카드 색상을 캘린더 주변의 회청색/중립 톤과 맞춘다.
3. 목표 카드를 누르면 해당 벤치마크의 기존 성장보드 종목 설정 시트를 연다.

### 구현 계획

1. `style.css`에서 row 전체 `border-bottom`을 날짜 grid 영역으로 옮겨 첫 열에는 가로 경계가 그려지지 않게 한다.
2. `style.css`에서 `.cal-cycle-branch` 계열 색상을 날짜 기록 chip과 가까운 낮은 채도의 회청색으로 통일한다.
3. `render-calendar.js`의 레일 item에 `benchmarkId`를 포함하고 목표 카드를 button으로 렌더한다.
4. `render-calendar.js`에 capture/direct click handler를 추가해 `data-cal-cycle-target` 클릭 시 이벤트를 소비하고 성장보드 설정 진입 함수를 호출한다.
5. `workout/test-v2/board-render.js`에 `tm2OpenBenchmarkSettings(bmId)` 공개 함수를 추가해 overlay를 열고 `openColumnSheet(bmId)`를 실행한다.
6. `workout/test-v2/entry.js`에서 동적 import 후 `window.tm2OpenBenchmarkSettings()`를 노출한다.
7. 관련 source/CSS 테스트와 cache version 기대값을 갱신한다.
8. `render-calendar.js`, `style.css`, `workout/test-v2/board-render.js`, `workout/test-v2/entry.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 새 목표 설정 UI를 별도로 만들지 않는다. 기존 성장보드 종목 설정 시트를 재사용한다.
- 6주 계획 데이터 구조를 변경하지 않는다.
- 날짜별 운동 기록 sheet 동작은 변경하지 않는다.

### 검증 계획

- `node --check render-calendar.js; node --check workout/test-v2/board-render.js; node --check workout/test-v2/entry.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 인증 계정으로 `운동 탭 -> 월간 캘린더 -> 레일 목표 카드 탭 -> 해당 종목 설정 시트 표시` 확인

### 구현 결과

- 첫 열에 있던 주 row 경계선을 날짜 grid 영역으로 옮겨 사이클 레일이 주 경계에서 끊기지 않게 했다.
- 레일 선과 목표 카드 색상을 월간 캘린더 기록 chip과 가까운 회청색/중립 톤으로 통일했다.
- 레일 목표 카드를 button으로 렌더하고 `benchmarkId`를 `data-cal-cycle-target`에 연결했다.
- 목표 카드 클릭 시 `workout/test-v2/entry.js`를 lazy-load하고 `window.tm2OpenBenchmarkSettings()`를 통해 기존 성장보드 종목 설정 시트를 열도록 했다.
- `workout/test-v2/board-render.js`에 `tm2OpenBenchmarkSettings(benchmarkId)`를 추가해 overlay 진입 후 `openColumnSheet(bmId)`를 호출한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z7-cycle-rail-target-settings`로 bump했다.

### 로컬 검증 결과

- PASS: `node --check render-calendar.js; node --check workout/test-v2/board-render.js; node --check workout/test-v2/entry.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 52 tests passed
- PASS: `node --test .\tests\*.test.js` — 537 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 63624ac`
  - 결과: `[deploy-verify] ok 63624ac3e2e3 tomatofarm-v20260626z7-cycle-rail-target-settings static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z7-cycle-rail-target-settings" "render-calendar.js::data-cal-cycle-target" "render-calendar.js::_openWorkoutCycleTargetSettings" "workout/test-v2/board-render.js::tm2OpenBenchmarkSettings" "workout/test-v2/entry.js::window.tm2OpenBenchmarkSettings" "style.css::.cal-workout-week-row:last-child .cal-workout-week-cells" "style.css::background: #d7e4ed"`
- not verified yet: 인증 계정이 없어 실제 `운동 탭 -> 월간 캘린더 -> 레일 목표 카드 탭 -> 해당 종목 설정 시트 표시` UI 확인은 수동 확인이 필요하다.
