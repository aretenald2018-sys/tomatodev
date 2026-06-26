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
