# 운동 타이머 요약 카드 단일 표시

## 상태

- 상태: `implemented_static_verified`
- 요청: 운동 타이머가 별도 카드로 생성되지 않게 하고, 항상 우측 상단 요약 카드 안의 `운동시간`에만 표시한다.
- 적용 트리거: `/grill-me`. 스크린샷과 코드에서 원인이 확인되어 추가 질문 없이 진행한다.

## 그릴 결과

- 결정: `workoutDuration`은 운동 기록 여부와 상단 요약 카드 계산에는 계속 포함한다.
- 결정: `workoutDuration`만 있는 날/회차에 별도 `운동 타이머` 활동 카드 또는 `운동 시간` 본문 섹션을 만들지 않는다.
- 결정: 운동 세트가 있는 날에도 본문에 `운동 타이머 ...` 줄을 따로 출력하지 않는다. 시간은 요약 카드의 `운동시간`만 신뢰한다.

## Slice 1: render-calendar 타이머 전용 카드 제거

### 구현 범위

1. `render-calendar.js`의 `_renderWorkoutDetailCards()`에서 duration-only `운동 타이머` 카드 fallback을 제거한다.
2. `render-calendar.js`의 day modal/detail 본문에서 `timerOnlyHtml`과 `cal-workout-timer-line` 출력도 제거한다.
3. 상단 summary card의 `운동시간` 값은 유지한다.
4. `render-calendar.js`가 `sw.js` 정적 자산이므로 `CACHE_VERSION`을 bump한다.
5. Source-level 회귀 테스트를 추가한다.

### 제외 범위

- 운동 시간 계산 로직 변경.
- 회차 탭 dot/기록 여부 판정 변경.
- 운동 종료/리포트 로직 변경.

### 검증

1. `node --check render-calendar.js; node --check sw.js`
2. `node --test`로 신규 회귀 테스트 및 캐시 버전 관련 테스트 실행.
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. UI 직접 검증은 인증 화면에 막히면 `not verified yet`로 기록한다.

### 실행 결과

1. `render-calendar.js`의 duration-only `운동 타이머` activity card fallback을 제거했다.
2. day detail modal 본문의 `timerOnlyHtml`과 `cal-workout-timer-line` 출력을 제거했다.
3. `_renderWorkoutDetailSummaryCard()`의 `운동시간` 표시는 유지했다.
4. 죽은 `.cal-workout-timer-line` CSS와 삭제 확인용 `timer: '운동 타이머'` 라벨 매핑도 정리했다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z34-workout-timer-summary-only`로 bump했다.
6. `tests/workout-timer-summary-only.test.js`를 추가해 요약 카드 유지와 별도 타이머 카드/본문 미렌더링을 고정했다.

### 정적 검증 결과

1. PASS: `node --check render-calendar.js; node --check sw.js`
2. PASS: `node --test tests/workout-timer-summary-only.test.js tests/stats-picker-ui-polish.test.js tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-test-mode-unified.test.js tests/stats-muscle-fatigue-insight.test.js`
3. PASS: `node scripts/verify-runtime-assets.mjs`
4. PASS: `git diff --check`
5. not verified yet: Dashboard3 Pages 배포 및 인증 후 UI 직접 확인 필요.

## 다음 세션 시작 지시

Dashboard3 Pages 배포 후 `운동 탭 -> 날짜 상세`에서 운동 타이머가 우측 상단 요약 카드에만 표시되고 별도 카드가 생성되지 않는지 확인한다.
