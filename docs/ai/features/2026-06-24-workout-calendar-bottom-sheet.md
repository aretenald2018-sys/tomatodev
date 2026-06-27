# 운동 캘린더 날짜 상세 하단 시트 계획

## 배경

운동 탭 월간 캘린더 하단에는 이미 선택 날짜를 보여주는 탭(`.cal-workout-day-bar`)이 있다. 현재는 특정 날짜를 누르면 `renderWorkoutCalendarHome()`이 월간 캘린더를 지우고 `.wt-day-detail` 상세 화면으로 전환한다. 사용자는 새 모달을 따로 붙이는 것이 아니라, 이 하단 탭 자체가 아래에서 위로 올라오는 bottom sheet 헤더처럼 동작하고 드래그로 올렸다 내릴 수 있길 원한다.

## 그릴 결과

- 핵심 질문: 날짜를 누른 직후 운동 추가 페이지로 이동해야 하는가, 아니면 날짜 상세를 먼저 띄워야 하는가?
- 답변/결정: 날짜 탭은 페이지 자체를 운동 추가/편집 화면으로 랜딩시키지 않는다. 선택한 날짜의 상세를 하단 시트로 열고, `+`나 편집 버튼을 누를 때만 기존 운동 추가/편집 흐름으로 들어간다.
- 추가 확인: 사용자가 명시한 핵심은 "기존에 구현된 하단부 탭"을 올렸다 내리는 것이다. 날짜 클릭 시에는 해당 탭이 애니메이션으로 꽉 차게 올라오는 느낌이어야 한다.
- 남은 가정: Slice 3 이후 사용자 제스처의 정착 상태는 `bar`/`full` 2단계로 둔다. 닫기는 기존 탭 상태(`bar`)로 내려가는 방식이다.

## 목표

- 운동 탭 월간 캘린더에서 날짜를 탭해도 캘린더 화면이 사라지지 않게 한다.
- 기존 하단 날짜 탭을 캘린더 위 fixed bottom sheet의 헤더로 재사용한다.
- 시트 상단 탭/handle을 드래그해 `bar`/`full` 상태로 열고 내릴 수 있게 한다.
- 특정 날짜를 클릭하면 `bar -> full`로 올라오는 애니메이션을 적용한다.
- 기존 회차 탭, 편집, `+` 운동 추가 동작은 유지한다.

## 범위

### 포함

- `render-calendar.js`
  - `_workoutHomeView === 'detail'`일 때 전체 root를 상세 화면으로 교체하지 않고 월간 캘린더와 하단 날짜 sheet를 함께 렌더한다.
  - 기존 `.cal-workout-day-bar`를 `.cal-workout-day-sheet`의 헤더로 재사용한다.
  - 날짜 클릭, 오늘 상세 진입, 뒤로가기/닫기 상태 전환을 시트 모델에 맞춘다.
  - 날짜 클릭 시 `bar -> full` 애니메이션으로 sheet를 올린다.
  - 시트 handle pointer drag로 `bar`/`full` 상태 전환을 구현한다.
- `style.css`
  - `.cal-workout-day-sheet` fixed bottom sheet, drag state, `bar`/`full` 높이, transition 스타일을 추가한다.
  - 시트 안의 `.wt-day-detail`과 `.wt-day-sessionbar`가 viewport 전체가 아니라 sheet 안에서 안정적으로 배치되게 조정한다.
- `tests/`
  - 날짜 상세가 월간 캘린더와 함께 bottom sheet로 렌더되는 계약을 추가한다.
  - sheet drag state와 session bar positioning CSS 회귀 테스트를 추가한다.
- `sw.js`
  - `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

### 제외

- 운동 추가 picker 자체의 디자인 변경
- 운동 저장/삭제 데이터 구조 변경
- 캘린더 탭의 일반 식단/점수 일자 상세 모달 변경
- Dashboard3 인증 계정 데이터 생성 또는 임의 로그인

## 실행 슬라이스

### Slice 1 — Workout calendar day bottom sheet

1. 운동 홈 월간 렌더에서 상세 화면 조기 return을 제거하고, 기존 `.cal-workout-day-bar`를 헤더로 쓰는 `.cal-workout-day-sheet`를 캘린더 surface 내부에 렌더한다.
2. `_openWorkoutHomeDay()`, `_backWorkoutHomeMonth()`, `_goTodayWorkoutDetail()` 상태 전환을 하단 시트 기준으로 정리한다.
3. 날짜 클릭 시 `bar -> full`로 올라오는 애니메이션을 적용한다.
4. 시트 handle pointer drag를 직접 바인딩해 `bar`/`mid`/`full` 상태를 전환한다.
5. 시트 안에서 상세 본문과 하단 회차/session action bar가 겹치지 않도록 CSS를 조정한다.
6. source/CSS 회귀 테스트와 `sw.js` cache version을 갱신한다.
7. 정적 검증 후 Dashboard3 Pages 배포 검증을 수행한다. 인증 화면 때문에 실제 계정 UI 조작이 막히면 `not verified yet`과 차단 사유를 남긴다.

## 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 인증 계정으로 `운동 탭 -> 날짜 탭 -> 하단 시트 표시 -> handle 위/아래 드래그 -> + 버튼` 흐름 확인

## 실행 결과

- 기존 `.cal-workout-day-bar`를 `.cal-workout-day-sheet`의 헤더로 감싸 하단 날짜 탭 자체가 sheet처럼 움직이게 했다.
- 날짜 클릭과 오늘 상세 진입은 `bar` 상태로 렌더한 뒤 다음 animation frame에서 `full`로 전환해 꽉 차게 올라오는 transition을 만든다.
- 드래그 중에는 `--wt-day-sheet-drag-height`를 직접 조정해 sheet 높이가 손가락 이동을 따라 변하고, release 시 `bar`/`mid`/`full` 상태로 정착한다.
- sheet 내부 상세는 기존 `.wt-day-detail` 렌더를 재사용하되, `.wt-day-sessionbar`는 viewport fixed가 아니라 sheet 내부 하단에 배치한다.
- `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z35-workout-day-sheet`로 bump했다.

## 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포와 인증 계정의 실제 `운동 탭 -> 날짜 탭 -> drag` UI flow 확인이 남아 있다.

## 후속 Slice 2 — Compact bar and drag hit area fix

### 배경

배포 화면에서 접힌 하단 sheet가 너무 높고, 정보가 2행으로 보여 캘린더를 많이 가린다. 또한 사용자가 sheet를 위로 끌어올릴 수 없다고 피드백했다.

### 진단

1. 접힌 sheet 높이는 `clamp(132px~206px)` 수준이라 모바일 화면에서 하단 공간을 과하게 차지한다.
2. `.cal-workout-day-bar` 내부 날짜 본문이 `button`이고 `_startWorkoutHomeSheetDrag()`가 `event.target.closest('button')`이면 즉시 return한다. 그래서 사용자가 실제로 잡는 날짜 영역/화살표 영역에서는 drag가 시작되지 않는다.
3. 화살표는 일반 텍스트 상태라 사용자가 sheet를 올릴 수 있다는 affordance가 약하다.

### 포함

- 접힌 sheet 높이를 절반 수준으로 줄이고 `.cal-workout-day-bar`를 한 행 compact grid로 조정한다.
- 날짜/기록/회차/오늘/루틴 정보를 한 행에 담되 좁은 폭에서는 텍스트 overflow로 안정화한다.
- 맨왼쪽 위 화살표에 glow/pulse affordance를 추가한다.
- drag 시작 로직에서 화살표/날짜 본문은 drag 가능하게 하고, `오늘`/`루틴` action 버튼만 drag 제외한다.
- 회귀 테스트를 갱신하고 `sw.js` cache version을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- 접힌 sheet 높이를 `clamp(72px, 10dvh, 96px)`로 줄이고, 모바일에서는 `clamp(64px, 9dvh, 84px)`로 더 줄였다.
- `.cal-workout-day-bar`를 1행 grid로 유지하고 날짜/기록/회차/오늘/루틴 정보를 한 행에 배치했다.
- 좌측 화살표에 파란 glow/pulse animation을 추가해 올릴 수 있는 affordance를 강화했다.
- drag hit area에서 `button` 전체 제외를 제거하고 `data-wt-sheet-action`이 붙은 `오늘`/`루틴` 버튼만 제외했다.
- drag 후 발생하는 click이 sheet 상태를 되돌리지 않도록 `_workoutHomeSuppressNextSheetClick` 방어를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z36-workout-day-sheet-compact`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0f061f103c69150688c80e284ce5b53ae54c601a`
  - 결과: `[deploy-verify] ok 0f061f103c69 tomatofarm-v20260624z36-workout-day-sheet-compact static=210`
- not verified yet: 인증 계정의 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인이 남아 있다.

## 후속 Slice 3 — Upward gesture opens full sheet

### 배경

배포 화면에서 sheet를 최대로 올려도 중간 높이에 멈추는 것처럼 보인다는 피드백이 있었다. 사용자는 아주 조금만 위로 올리거나 탭해도 sheet가 위로 끝까지 올라가길 원한다.

### 진단

1. 현재 상태 배열은 `bar`/`mid`/`full` 3단계이고, `_stepWorkoutHomeSheet()`는 짧은 위 드래그에서 한 단계만 이동한다.
2. 따라서 접힌 `bar` 상태에서 짧게 위로 끌면 `mid`에 정착한다. 사용자가 기대하는 동작은 중간 정착이 아니라 즉시 `full`이다.
3. 날짜 탭/화살표 탭은 이미 `_toggleWorkoutHomeSheet()`와 `_openWorkoutHomeDay()` 경로에서 `full` 애니메이션을 사용하므로, drag/key step 전이를 같은 정책으로 맞추면 된다.

### 포함

- 위 방향 drag/key step은 거리와 무관하게 `full`로 정착한다.
- 아래 방향 drag/key step은 `bar`로 접는다.
- 회귀 테스트를 갱신하고 `sw.js` cache version을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `_stepWorkoutHomeSheet()`를 방향 기반 `full`/`bar` 전환으로 단순화해 짧은 위 드래그와 `ArrowUp`이 즉시 `full`로 열리게 했다.
- drag release 기준을 `36px`에서 `12px`로 낮춰 살짝 올리는 제스처도 동작하게 했다.
- drag preview의 `±180px` 제한을 제거하고 `startHeight`/`maxHeight` 기반으로 계산해 손가락으로 크게 끌 때도 full 높이까지 따라가게 했다.
- 기존 `is-mid` class는 legacy 제거용으로만 정리하고, 사용자 정착 상태는 `bar`/`full`만 사용한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z37-workout-day-sheet-full-open`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a65721dbb3e6423206d505118ead185c7c6f2926`
  - 결과: `[deploy-verify] ok a65721dbb3e6 tomatofarm-v20260624z37-workout-day-sheet-full-open static=210`
- PASS: 배포 URL `https://aretenald2018-sys.github.io/dashboard3/`는 HTTP 200이고, 배포된 `sw.js`에는 `tomatofarm-v20260624z37-workout-day-sheet-full-open`, `render-calendar.js`에는 `direction > 0 ? 'full' : 'bar'`와 `Math.abs(dy) < 12`가 포함되어 있다.
- not verified yet: 배포 URL은 로그인 화면(`이름으로 로그인하세요`)에서 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인은 남아 있다.

## 후속 Slice 4 — Keep opened sheet from collapsing after drag

### 배경

사용자가 sheet를 열어도 열린 채로 고정되지 않고 다시 아래로 내려간다고 보고했다.

### 진단

1. 드래그 release 직후에는 `_stepWorkoutHomeSheet(1)`로 `full` 전환된다.
2. 하지만 하단 bar의 화살표/날짜 영역은 `onclick`을 가지고 있고, 모바일 브라우저의 지연 click이 release 뒤 늦게 도착할 수 있다.
3. 기존 `_workoutHomeSuppressNextSheetClick`은 `250ms`만 유지되고 첫 소비 시 바로 false로 돌아가므로, 늦게 도착한 click이 `_toggleWorkoutHomeSheet()`를 다시 호출해 `bar`로 접을 수 있다.

### 포함

- 드래그 후 click suppression을 boolean 1회성에서 timestamp window 방식으로 변경한다.
- suppression window 동안 여러 click handler가 들어와도 모두 무시되게 한다.
- 회귀 테스트를 갱신하고 `sw.js` cache version을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `_workoutHomeSuppressNextSheetClick` 1회성 boolean을 `_workoutHomeSuppressSheetClickUntil` timestamp window로 교체했다.
- drag release 후 suppression window를 `900ms`로 두어 모바일 지연 click이 늦게 도착해도 `_toggleWorkoutHomeSheet()`가 sheet를 다시 접지 못하게 했다.
- suppression window 동안은 첫 click에서 방어가 해제되지 않고, 여러 click handler가 들어와도 모두 무시된다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z38-workout-day-sheet-drag-lock`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 684c6fc2025dbf20f3be4c52ab14b41cc6528831`
  - 결과: `[deploy-verify] ok 684c6fc2025d tomatofarm-v20260624z38-workout-day-sheet-drag-lock static=210`
- not verified yet: 배포 URL은 로그인 화면에서 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인은 남아 있다.

## 후속 Slice 5 — Bottom sheet snap UX polish

### 배경

사용자가 하단 sheet를 올렸다 내리는 UX가 좋지 않다고 피드백했다. 단순히 열림/닫힘 여부만 맞추는 것보다, 제스처가 예측 가능하고 실수로 접히지 않으며 잡을 수 있는 표식이 분명해야 한다.

### 그릴 결과

- 전문가식 bottom sheet는 작은 위 제스처로는 쉽게 열리고, 아래로 접는 동작은 충분히 길게 끌거나 빠르게 내릴 때만 실행되어야 한다.
- drag release는 거리와 속도를 함께 보고 snap target을 결정해야 한다.
- 열린 상태에서 아주 작은 아래 움직임 때문에 바로 접히면 안 된다.
- grab affordance는 화살표 pulse만으로 부족하므로 상단 grip pill을 추가한다.
- 날짜 본문을 열린 상태에서 다시 탭해도 `bar -> full` 재렌더 flicker가 없어야 한다.

### 포함

- drag release target을 `dy`와 velocity 기반으로 계산하는 snap resolver를 추가한다.
- `bar`에서 위 방향은 작은 제스처도 `full`로 열고, `full`에서 아래 방향은 collapse threshold/velocity를 만족할 때만 `bar`로 접는다.
- 열린 상태의 동일 날짜 탭은 no-op 처리해 재렌더 flicker를 줄인다.
- 하단 sheet 헤더에 grip pill을 추가하고 열린 상태에서는 화살표 pulse를 줄인다.
- 회귀 테스트를 갱신하고 `sw.js` cache version을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `_resolveWorkoutHomeSheetDragTarget(dy, velocityY)`를 추가해 release 시 거리와 속도를 함께 보고 `bar`/`full` snap target을 결정한다.
- 접힌 상태(`bar`)에서는 `10px` 이상 위로 올리거나 위 방향 fling이면 `full`로 쉽게 열린다.
- 열린 상태(`full`)에서는 아래로 `96px` 이상 끌거나 빠르게 내릴 때만 `bar`로 접고, 작은 아래 움직임은 다시 `full`로 복귀한다.
- drag 중 `velocityY`를 샘플링해 긴 거리 drag뿐 아니라 빠른 fling도 반영한다.
- 이미 열린 동일 날짜를 다시 탭하면 no-op 처리해 `bar -> full` 재렌더 flicker를 줄였다.
- 하단 sheet 헤더에 `cal-workout-day-grip` pill을 추가하고, 열린 상태의 화살표 pulse를 제거했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z39-workout-day-sheet-snap-ux`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b872a13e4f24c3460df45e1ef01e553728602709`
  - 결과: `[deploy-verify] ok b872a13e4f24 tomatofarm-v20260624z39-workout-day-sheet-snap-ux static=210`
- not verified yet: 배포 URL은 로그인 화면에서 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인은 남아 있다.

## 후속 Slice 6 — Open full after 10 percent upward drag

### 배경

사용자가 sheet를 누른 채 10%만 올려도 끝까지 펼쳐지게 하길 원한다. 이전 Slice 5는 작은 위 방향 제스처를 쉽게 열도록 했지만, 기준이 `10px` deadzone이라 사용자가 말한 10% 기준과 다르다.

### 포함

- `bar` 상태에서 drag 가능한 전체 확장 거리의 10%를 계산한다.
- 위로 끌다가 10% 지점을 넘으면 drag preview도 즉시 full 높이로 보여준다.
- release snap도 동일한 10% 기준으로 `full`을 선택한다.
- 작은 pointer move 뒤 release가 snap 기준 미만이어도 뒤따르는 click이 header toggle로 오인되지 않게 막는다.
- 회귀 테스트를 갱신하고 `sw.js` cache version을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `WORKOUT_HOME_SHEET_DRAG_OPEN_RATIO = 0.1`을 추가해 `bar`에서 full까지 남은 확장 거리의 10%를 open threshold로 계산한다.
- `openThresholdPx = max(10px, dragTravel * 0.1)`로 극단적으로 작은 화면에서도 최소 조작 거리를 유지한다.
- 드래그 중 위로 10% 지점을 넘으면 `shouldPreviewFull`이 `maxHeight`를 적용해 손을 떼기 전에도 full 높이 preview가 보이게 했다.
- release snap도 같은 `openThresholdPx`를 `_resolveWorkoutHomeSheetDragTarget()`에 넘겨 10% 이상 위로 올리면 `full`로 정착한다.
- 열린 뒤 자동으로 접히는 문제를 줄이기 위해 닫힘은 아래 방향 속도가 아니라 `collapseThresholdPx = max(220px, dragTravel * 0.35)` 거리 기준으로만 처리한다.
- `hasMoved`를 추적해 snap 기준 미만의 작은 drag도 후속 click을 suppress하므로, drag가 토글 click으로 오인되어 열린 sheet를 다시 닫는 경로를 막았다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260624z40-workout-day-sheet-open-10pct`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d6606731f076a0ba8540c6b2b82d6f570e2417f0`
  - 결과: `[deploy-verify] ok d6606731f076 tomatofarm-v20260624z40-workout-day-sheet-open-10pct static=210`
- PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `d6606731f076`, z40 cache, 10% open ratio, `hasMoved` click suppression, velocity-close 제거를 반환한다.
- not verified yet: 배포 URL은 로그인 화면에서 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인은 남아 있다.

## 후속 Slice 7 — Latch open intent on tiny upward drag

### 배경

사용자가 sheet를 위로 올려도 열린 상태로 고정되지 않고 다시 내려간다고 재차 보고했다. Slice 6은 전체 확장 거리의 10%를 기준으로 했지만, 실제 모바일에서는 이 값이 접힌 bar 기준으로는 과하게 커서 사용자가 "조금 올린" 제스처가 release 시 `bar`로 돌아갈 수 있다.

### 포함

- open threshold를 full 확장 거리 기준이 아니라 접힌 bar 높이 기준 10%로 낮춘다.
- `bar`에서 위 방향 drag가 threshold를 한 번이라도 넘으면 `openLatched`를 true로 고정한다.
- `openLatched`가 true이면 손가락이 release 직전에 흔들려도 release snap은 무조건 `full`을 선택한다.
- 아래 방향 닫힘은 기존처럼 큰 거리 기준으로만 허용한다.
- 회귀 테스트와 `sw.js` cache version을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- open threshold를 `dragTravel * 0.1`에서 `minHeight * 0.1` 기준으로 바꿔 접힌 bar 높이의 10%, 최소 8px만 위로 움직여도 open intent가 잡히게 했다.
- `openLatched`를 추가해 `bar` 상태에서 위 방향 threshold를 한 번 넘으면 release 시 최종 좌표 흔들림과 무관하게 `full`로 고정한다.
- `openLatched`는 `bar` 시작 drag에서만 켜지며, `full` 시작 drag는 기존 distance resolver를 타게 해서 큰 아래 drag로 닫을 수 있게 유지했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z41-workout-day-sheet-open-latch`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ bda8fd26b49e731fc43807844b737ed155fa7ed6`
  - 결과: `[deploy-verify] ok bda8fd26b49e tomatofarm-v20260625z41-workout-day-sheet-open-latch static=210`
- PASS: 배포 URL의 `build-info.json`, `sw.js`, `render-calendar.js`가 `bda8fd26b49e`, z41 cache, bar-height 10% open threshold, `openLatched`, velocity-close 제거를 반환한다.
- not verified yet: 배포 URL은 로그인 화면에서 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag` UI flow 확인은 남아 있다.

## 후속 Slice 8 — Full sheet top reveal and floating add affordance

### 배경

첨부 화면에서 sheet를 끝까지 올려도 날짜/오늘/루틴 헤더가 앱 상단바 아래로 잘려 보인다. 사용자는 full 상태에서도 두번째 예시처럼 헤더 전체가 드러나고, 열린 상태에서는 다시 내릴 수 있음을 파란 아래 화살표로 보여주길 원한다. 추가로 하단 회차 bar의 연필 편집 버튼은 삭제하고, `+` 추가 버튼은 다시 우측 하단 floating button으로 보이길 원한다.

### 진단

1. `.cal-workout-day-sheet.is-full` 높이가 `100dvh - 64px` 수준이라 모바일 브라우저/앱 헤더 조합에서는 sheet 상단이 상단바 뒤에 붙어 날짜 bar 일부가 가려질 수 있다.
2. 열린 상태의 `.cal-workout-day-expand`는 회색/animation none으로 바뀌어 "아래로 내릴 수 있음" affordance가 약하다.
3. `_renderWorkoutHomeDetailHtml()`은 `.wt-day-sessionbar` 안에 `wt-day-edit`과 `wt-day-add-inline`을 함께 렌더해 하단 bar가 액션 버튼까지 차지한다.

### 포함

- full sheet 높이에 상단 여유를 더 둬 날짜 bar 전체가 앱 상단 아래로 드러나게 한다.
- 열린 상태의 toggle 화살표도 파란색/펄스 affordance를 유지하되 방향은 아래로 표시한다.
- `.wt-day-sessionbar`에서는 회차 탭만 남기고 연필 편집 버튼을 제거한다.
- `+` 추가 버튼은 `.wt-day-fab`로 분리해 sheet 우측 하단 floating button으로 배치한다.
- 회귀 테스트와 `sw.js` cache version을 bump한다.

### 제외

- 운동 편집 진입 경로 자체 변경
- 회차 생성/저장 데이터 구조 변경
- 운동 추가 picker 디자인 변경

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX = 112`를 추가하고 drag preview `maxHeight`와 full sheet CSS 높이를 같은 상단 여유 기준으로 맞췄다.
- `.cal-workout-day-sheet.is-full`은 `--wt-day-sheet-full-clearance: 112px`를 빼서 앱 상단 아래에 날짜/오늘/루틴 헤더가 드러나게 했다.
- full 상태의 `.cal-workout-day-expand`도 파란색과 `wt-sheet-arrow-pulse-down` animation을 사용해 아래로 내릴 수 있음을 표시한다.
- `.wt-day-sessionbar`에서 `wt-day-edit`과 `wt-day-add-inline`을 제거하고, 운동 추가는 `.wt-day-fab` floating button으로 분리했다.
- `.wt-day-sessionbar`는 우측 padding을 넓혀 floating `+`와 회차 탭이 겹치지 않게 했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z42-workout-day-sheet-fab-reveal`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1fca224816f59b9bce1257bcf2c652d4dd065fcd`
  - 결과: `[deploy-verify] ok 1fca224816f5 tomatofarm-v20260625z42-workout-day-sheet-fab-reveal static=210`
- PASS: 배포 URL의 `render-calendar.js`, `style.css`, `sw.js`가 `wt-day-fab`, `WORKOUT_HOME_SHEET_FULL_CLEARANCE_PX`, `--wt-day-sheet-full-clearance: 112px`, `wt-sheet-arrow-pulse-down`, z42 cache marker를 반환한다.
- not verified yet: 배포 URL은 로그인 화면에 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet full/open-close/add` UI flow 확인이 남아 있다.

## 후속 Slice 9 — Drag release settles to the intended sheet state

### 배경

사용자가 하단 sheet를 짧게 클릭하면 `bar`/`full` 전환은 잘 안착하지만, 손으로 드래그하면 release 후 의도한 위치에 안착하지 않고 원래 상태로 돌아간다고 보고했다.

### 진단

1. drag preview는 `pointermove`에서 clamp된 `dy`로 계산하지만, release snap은 `pointerup`의 raw `lastY - startY`를 다시 계산해 사용한다.
2. full 상태에서 아래로 닫는 threshold가 `max(220px, dragTravel * 0.35)`라 모바일 handle drag 기준으로는 너무 커서 사용자가 내렸다고 느껴도 `full`로 복귀하기 쉽다.
3. open 방향은 `openLatched`가 있지만 close 방향은 latch가 없어, 드래그 중 이미 bar에 가까워 보였던 상태도 release에서 되돌아갈 수 있다.

### 포함

- `pointermove`에서 계산한 clamp된 drag distance를 release snap의 단일 기준으로 사용한다.
- `bar` 시작 위 드래그와 `full` 시작 아래 드래그를 각각 latch해 release 직전 흔들림과 무관하게 의도한 상태로 안착시킨다.
- 아래 방향 close threshold를 handle drag에 맞는 작은 거리로 낮춘다.
- 회귀 테스트와 `sw.js` cache version을 bump한다.

### 제외

- sheet body 내부 scroll 정책 변경
- 추가/회차 UI 디자인 변경
- 운동 데이터 저장 구조 변경

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `WORKOUT_HOME_SHEET_DRAG_COLLAPSE_DISTANCE_PX`를 `220`에서 `28`로 낮춰 full 상태에서 handle을 아래로 드래그했을 때 의도한 close snap이 잡히게 했다.
- drag 중 clamp된 `dy`를 `lastDragY`에 보관하고 release에서도 같은 값을 사용해 preview 위치와 snap 판단 기준을 맞췄다.
- `closeLatched`를 추가해 `full`에서 아래 방향 threshold를 한 번 넘으면 release 직전 흔들림과 무관하게 `bar`로 안착한다.
- close threshold 계산을 전체 drag travel이 아니라 `minHeight * WORKOUT_HOME_SHEET_DRAG_COLLAPSE_RATIO` 기준으로 바꿔 handle 조작 거리와 맞췄다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z43-workout-day-sheet-drag-settle`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-empty-picker-density.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ da94c74f943735f54c04ef74199da060c3939c26`
  - 결과: `[deploy-verify] ok da94c74f9437 tomatofarm-v20260625z43-workout-day-sheet-drag-settle static=210`
- PASS: 배포 URL의 `render-calendar.js`, `sw.js`가 `closeLatched`, `lastDragY`, `const dy = lastDragY`, z43 cache marker를 반환한다.
- not verified yet: 로그인 화면에 막혀 인증 계정 실제 `운동 탭 -> 날짜 sheet drag up/down settle` UI flow 확인이 남아 있다.

## 후속 Slice 10 — Release through CSS state transition only

### 배경

사용자가 클로드 진단을 전달했다. 핵심은 release 후 `settleDragPreview()`가 `requestAnimationFrame`에서 inline `--wt-day-sheet-drag-height`를 다시 세팅하면서, 이미 적용된 `is-full`/`is-bar` class 기반 높이를 무시하고 드래그한 지점에 시트를 고정시킬 수 있다는 것이다.

### 진단

1. `height: var(--wt-day-sheet-drag-height, var(--wt-day-sheet-height))` 구조에서는 inline drag height가 살아 있는 동안 class 기반 height가 사용되지 않는다.
2. `_setWorkoutHomeSheetState(targetState)`로 class를 바꾼 뒤 `requestAnimationFrame`에서 inline drag height를 다시 세팅하면 class transition이 무시될 수 있다.
3. settle timer와 rAF cleanup은 Android Chrome/PWA pointer release 타이밍에서 중복 실행 또는 지연 cleanup 가능성을 만든다.

### 포함

- `settleDragPreview`, settle timer, cleanup timeout을 제거한다.
- `pointerup` target 확정 후 `is-dragging`을 제거하고 inline drag CSS 변수를 먼저 지운다.
- 그 다음 `_setWorkoutHomeSheetState(targetState)`를 호출해 CSS class transition만으로 `bar/full` 끝점에 안착시킨다.
- 회귀 테스트가 rAF/timer settle 구조의 재도입을 막게 한다.
- `sw.js` cache version을 bump한다.

### 제외

- drag threshold/velocity 정책 변경
- sheet body scroll 정책 변경
- 운동 기록/회차 데이터 구조 변경

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `settleDragPreview()`, `_workoutHomeSheetSettleTimer`, `WORKOUT_HOME_SHEET_SETTLE_CLEANUP_MS`를 제거했다.
- `pointerup`에서 target state를 정한 뒤 `is-dragging`을 제거하고, inline `--wt-day-sheet-drag-height`/`--wt-day-sheet-drag-y`를 먼저 지운 다음 `_setWorkoutHomeSheetState(targetState)`를 호출하게 했다.
- 회귀 테스트는 rAF/timer settle 구조가 다시 들어오지 못하게 `doesNotMatch` 기준으로 바꿨다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z55-workout-sheet-release-css`로 bump했다.

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 `운동 탭 -> 날짜 sheet drag up/down settle` UI flow 확인이 남아 있다.

## 후속 Slice 11 — Workout tab pull-down routes through back stack

### 배경

사용자가 운동탭에서 아래로 당기는 동작이 브라우저/PWA 새로고침과 충돌한다고 보고했다. 운동탭 안에서는 새로고침보다 앱 내부 뒤로가기 또는 캘린더 복귀로 동작해야 한다.

### 진단

1. Android Chrome/PWA는 문서 최상단에서 아래로 당기는 touch gesture를 pull-to-refresh로 해석한다.
2. 운동탭은 바텀시트 닫기, record/detail 뒤로가기, 캘린더 복귀 모두 아래/뒤로가기 계열 제스처와 연결된다.
3. 기존 `handleWorkoutBack()` stack은 준비되어 있지만, root pull-down을 운동탭 navigation으로 흡수하는 guard가 없다.

### 포함

- 운동탭 활성 상태에만 `body.wt-workout-tab-active` class를 적용한다.
- 운동탭 활성 상태에서 root overscroll chaining을 차단한다.
- 운동탭 최상단에서 아래로 당기는 touch gesture를 passive false capture listener로 받아 pull-to-refresh를 막는다.
- threshold를 넘으면 `_handleWorkoutOverlayBack()` 또는 `handleWorkoutBack({ action: 'pull:back' })`를 호출한다.
- 회귀 테스트와 `sw.js` cache version을 bump한다.

### 제외

- 다른 탭의 pull-to-refresh 정책 변경
- workout navigation stack 순서 변경
- 바텀시트 drag threshold 변경

### 검증 계획

- `node --check app.js; node --check sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

### 실행 결과

- `switchTab()`에서 운동탭 활성 상태에만 `body.wt-workout-tab-active`를 붙이게 했다.
- `body.wt-workout-tab-active`와 `#tab-workout.active`에 overscroll guard를 추가해 운동탭에서 root pull-to-refresh 체인을 막았다.
- `initWorkoutPullBackGesture()`를 추가해 운동탭 최상단 아래 방향 touch gesture를 passive false capture listener로 흡수한다.
- gesture가 threshold를 넘으면 `_handleWorkoutOverlayBack()` 또는 `handleWorkoutBack({ activeTab: _currentTab, preferHistory: true, action: 'pull:back' })`를 호출한다.
- nested scroll 영역이 아직 위로 스크롤될 수 있으면 gesture를 가로채지 않도록 root/scroller top 조건을 둔다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z56-workout-pull-back`로 bump했다.

### 실행 검증

- PASS: `node --check app.js; node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a8461e8`
  - 결과: `[deploy-verify] ok a8461e8504b6 tomatofarm-v20260625z56-workout-pull-back static=217`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z56-workout-pull-back" "app.js::WORKOUT_PULL_BACK_THRESHOLD_PX = 72" "app.js::initWorkoutPullBackGesture" "app.js::action: 'pull:back'" "style.css::body.wt-workout-tab-active" "style.css::overscroll-behavior-y: none"`
- not verified yet: 인증 계정 실제 `운동 탭 -> pull down -> back/calendar` UI flow 확인이 남아 있다.

## 후속 Slice 12 — Separate calendar and full sheet scrolling

### 진단

사용자가 바텀시트와 캘린더 스크롤이 분리되지 않아 스크롤을 올렸다 내리면 둘 다 움직인다고 보고했다. 또한 full 상태에서 바텀시트를 아래로 내리는 gesture는 여전히 손가락으로 내린 좌표까지만 내려가고 bar 끝점으로 완전히 닫히지 않는다고 보고했다.

이전 Slice 10/11은 drag release inline CSS와 root pull-to-refresh 충돌을 다뤘지만, full sheet 상태에서 document/window 스크롤 자체를 잠그는 계약은 추가하지 않았다. 따라서 모바일 브라우저의 scroll chaining에서는 `.wt-day-sheet-scroll`과 배경 캘린더가 같은 touch chain에 반응할 수 있다.

진단 문서: `docs/ai/diagnoses/2026-06-25-workout-calendar-sheet-scroll-lock.md`

### 범위

- `render-calendar.js`
  - sheet state 적용 시 full 상태에서만 body scroll lock을 켜고, bar/close/render 없음 상태에서는 해제한다.
  - full sheet body touchmove는 내부 scroller가 더 스크롤 가능한 경우만 통과시키고 경계 전파는 막는다.
  - full 상태의 아래 방향 drag는 닫힘 의도를 빠르게 latch해서 release 시 `bar` 끝점으로 정착한다.
- `app.js`
  - 전역 운동탭 pull-down back listener가 `[data-wt-day-sheet]` 내부 gesture를 먼저 가로채지 않게 제외한다.
- `style.css`
  - full sheet scroll-lock class에서 document background scroll을 차단한다.
  - full sheet 내부 scroller는 momentum scroll을 유지한다.
- `tests/workout-calendar-bottom-sheet.test.js`
  - full/bar scroll ownership 계약과 hard-close source contract를 직접 검증한다.
- `sw.js`
  - `STATIC_ASSETS`에 포함된 파일 변경이므로 `CACHE_VERSION`을 bump한다.

### 제외

- 운동 record/detail navigation stack 변경
- 캘린더 월간 그리드 레이아웃 변경
- 바텀시트 헤더/버튼 디자인 변경
- 전체 테스트 500개 전수 실행을 완료 기준으로 삼는 것

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 인증 계정 실제 flow: `운동 탭 -> 날짜 sheet full -> sheet 내부 스크롤`, `sheet full -> 아래로 당겨 bar 닫힘`, `sheet bar -> 캘린더 스크롤`

### 실행 결과

- `app.js` 전역 운동탭 pull-down back listener에서 `[data-wt-day-sheet]` 내부 gesture를 제외했다.
- `render-calendar.js`에서 full sheet 상태에만 `body.wt-workout-sheet-scroll-lock`을 동기화하고, sheet 내부 `.wt-day-sheet-scroll` touch boundary guard를 추가했다.
- full 상태 아래 방향 drag는 `WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX = 8`을 넘으면 `closeLatched`로 바로 `bar` target에 정착한다.
- `style.css`에서 full sheet scroll lock은 운동탭 활성 상태에만 적용하고, sheet 내부 scroller는 momentum scroll과 `touch-action: pan-y`를 유지한다.
- `tests/workout-calendar-bottom-sheet.test.js`에 full/bar scroll ownership, background scroll chaining 차단, hard-close source contract 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z57-workout-sheet-scroll-lock`로 bump하고 cache marker 테스트를 갱신했다.

### 실행 검증

- PASS: `node --check app.js; node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js tests/workout-active-session-recovery.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 514개 통과
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d23ca4cd775936b4acdb53d662d7c71c8d22b8c2`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z57-workout-sheet-scroll-lock" "render-calendar.js::wt-workout-sheet-scroll-lock" "render-calendar.js::WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX = 8" "render-calendar.js::_bindWorkoutHomeSheetScrollGuard" "app.js::[data-wt-day-sheet]" "style.css::body.wt-workout-tab-active.wt-workout-sheet-scroll-lock"`
- not verified yet: 인증 계정 실제 `운동 탭 -> 날짜 sheet full/bar scroll` UI flow 확인이 남아 있다.

## 후속 Slice 13 — Full sheet header tap collapses to bar

### 진단

사용자가 full 상태까지 올라온 운동 캘린더 바텀시트에서 상단 날짜/기록 영역을 클릭해도 내려가지 않는다고 보고했다. 올리는 동작과 drag close는 동작하지만, full 상태 상단 탭 click collapse 계약이 없다.

현재 구조:

- 상단 화살표는 `data-wt-sheet-toggle` + `_wtCalToggleSheet()`로 접기/열기 경로를 탄다.
- 넓은 날짜/기록 영역 `.cal-workout-day-main`은 `onclick="window._wtCalOpenDay(...)"`로 연결되어 있다.
- `_openWorkoutHomeDay()`는 같은 날짜가 이미 full이면 재렌더 flicker 방지를 위해 즉시 `return`한다.
- 따라서 full 상태의 상단 날짜/기록 영역 click은 toggle이 아니라 no-op이다.
- `오늘`, `루틴` 등 `data-wt-sheet-action` 버튼은 collapse 대상이 아니어야 한다.

### 범위

- `render-calendar.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `sw.js`
- cache-version 참조 테스트들

### 구현

- `.cal-workout-day-main`을 날짜 열기 함수가 아니라 sheet toggle/collapse 계약으로 바꾼다.
- 가능하면 sheet header의 click 처리를 직접 binding으로 모아 inline handler 의존을 줄인다.
- full 상태에서 sheet header main/handle/toggle click은 `_setWorkoutHomeSheetState('bar')` 또는 `_toggleWorkoutHomeSheet()` 경로로 `bar`에 정착해야 한다.
- bar 상태에서 같은 영역 click은 기존처럼 full로 연다.
- `[data-wt-sheet-action]` 버튼은 collapse handler에서 제외한다.
- `_openWorkoutHomeDay()`의 "같은 날짜 full no-op"은 month grid/date cell 재렌더 방어로만 남기고, sheet header click이 이 함수로 들어가지 않게 한다.
- drag 후 click suppression은 유지한다.
- `render-calendar.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 검증 계획

- `node --check render-calendar.js sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 인증 계정 실제 flow: `운동 탭 -> 날짜 클릭 -> sheet full -> 상단 날짜/기록 영역 탭 -> bar로 접힘 -> 상단/화살표 탭 -> full`

### 실행 결과

- `.cal-workout-day-main`을 `data-wt-sheet-main data-wt-sheet-toggle` 버튼으로 바꿔 full 상태 상단 날짜/기록 영역 click이 `_wtCalOpenDay()` no-op으로 빠지지 않게 했다.
- sheet 내부 capture click handler에서 `[data-wt-sheet-action]`은 제외하고, `[data-wt-sheet-toggle]`은 `_toggleWorkoutHomeSheet()` 경로로 처리한다.
- 상단 화살표의 inline `onclick`도 제거하고 동일한 direct binding 경로를 쓰게 했다.
- `_openWorkoutHomeDay()`의 같은 날짜 full no-op은 month grid/date cell 재렌더 방어로 남겨 두었다.
- `tests/workout-calendar-bottom-sheet.test.js`에 full header tap collapse 계약 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z2-workout-sheet-header-toggle`로 bump하고 cache marker 테스트를 갱신했다.
- 리뷰: `docs/ai/reviews/2026-06-27-workout-calendar-sheet-header-toggle-review.md`

### 실행 검증

- PASS: `node --check workout/test-v2/board-core.js render-calendar.js sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test .\tests\*.test.js` — 550개 통과
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b0336a8`
  - 결과: `[deploy-verify] ok b0336a8d3c2e tomatofarm-v20260627z2-workout-sheet-header-toggle static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z2-workout-sheet-header-toggle" "render-calendar.js::data-wt-sheet-main data-wt-sheet-toggle" "render-calendar.js::_toggleWorkoutHomeSheet(toggle.getAttribute('data-date-key') || _workoutHomeSelectedKey)"`
- not verified yet: 인증 계정 실제 `운동 탭 -> 날짜 sheet full -> 상단 탭 collapse` UI flow 확인은 아직 남아 있다.

## 후속 Slice 14 — Guard stale sheet click suppression

### 진단

사용자가 Claude 진단을 전달했다. full 상태에서 상단을 드래그했다가 같은 full 상태로 release되는 경우에도 `_suppressWorkoutHomeSheetClick()`이 무조건 걸려, suppression window 동안 바로 이어지는 상단 click collapse가 씹힌다.

추가로 `_applyWorkoutHomeSheetState()`가 첫 번째 `[data-wt-sheet-toggle]`만 갱신해 날짜 텍스트 토글의 `aria-label`/`aria-expanded`가 stale 상태로 남을 수 있다. 단, 날짜 텍스트 버튼까지 `textContent`를 화살표로 바꾸면 날짜 표시가 사라지므로, 모든 토글에는 접근성 속성만 갱신하고 화살표 텍스트는 handle 버튼에만 적용한다.

deadzone 이내 1px 수준 pointer move도 `hasMoved=true`로 처리되어 다음 tap이 900ms 억제될 수 있다. 실제 drag로 볼 최소 이동 거리 guard가 필요하다.

### 범위

- `render-calendar.js`
  - drag release 전 현재 sheet state를 저장하고 target state가 실제로 바뀔 때만 click suppression을 건다.
  - deadzone branch는 최소 이동 거리 이상 움직였을 때만 suppression을 건다.
  - 모든 `[data-wt-sheet-toggle]`에 `aria-expanded`/`aria-label`을 동기화하고, handle button의 화살표 텍스트만 갱신한다.
- `tests/workout-calendar-bottom-sheet.test.js`
  - suppression guard, 최소 이동 거리, 다중 toggle aria 동기화 source contract를 검증한다.
- `sw.js`와 cache-version 참조 테스트들
  - `render-calendar.js`가 `STATIC_ASSETS`에 포함되므로 `CACHE_VERSION`을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 인증 계정 실제 flow: `운동 탭 -> 날짜 sheet full -> 상단을 살짝 drag/release -> 상단 tap -> bar로 접힘`

### 실행 결과

- `render-calendar.js`에서 drag release target 적용 직전 `prevState`를 저장하고, `targetState !== prevState`일 때만 `_suppressWorkoutHomeSheetClick()`을 호출하게 했다.
- deadzone branch는 `WORKOUT_HOME_SHEET_MIN_SUPPRESS_MOVE_PX = 4` 이상 움직였을 때만 suppression을 걸어 1px 수준의 미세 pointer move 후 다음 tap이 씹히지 않게 했다.
- `_applyWorkoutHomeSheetState()`는 모든 `[data-wt-sheet-toggle]`의 `aria-expanded`/`aria-label`을 갱신한다. 날짜 텍스트 버튼의 내용을 보존하기 위해 화살표 `textContent`는 `[data-wt-sheet-handle]`에만 적용한다.
- `.cal-workout-day-main` 초기 렌더에도 `aria-expanded`/`aria-label`을 추가해 apply 전후 상태가 일관되게 보이게 했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z5-sheet-suppress-guard`로 bump하고 cache marker 테스트를 갱신했다.
- 리뷰: `docs/ai/reviews/2026-06-27-workout-calendar-sheet-suppress-guard-review.md`

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 19 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 552 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 1a46c473abc3b3b7a55ae76611dfe682a3494548`
  - 결과: `[deploy-verify] ok 1a46c473abc3 tomatofarm-v20260627z5-sheet-suppress-guard static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z5-sheet-suppress-guard" "render-calendar.js::WORKOUT_HOME_SHEET_MIN_SUPPRESS_MOVE_PX = 4" "render-calendar.js::if (targetState !== prevState) _suppressWorkoutHomeSheetClick()" "render-calendar.js::querySelectorAll('[data-wt-sheet-toggle]')" "render-calendar.js::data-wt-sheet-main data-wt-sheet-toggle"`
- not verified yet: 인증 계정 실제 `운동 탭 -> 날짜 sheet full -> 상단 살짝 drag/release -> 상단 tap collapse` UI flow 확인이 남아 있다.

## 후속 Slice 15 — Rebuild sheet as tap-only two-state toggle

### 진단

사용자가 바텀시트 drag/suppression/deadzone 계층이 stale 상태로 누적되어 실제 동작 개선이 되지 않는다고 보고했다. 필요한 계약은 두 가지뿐이다.

1. 접힌 바텀시트를 누르면 끝까지 올라간다.
2. 끝까지 올라간 상태에서 상단 부분을 누르면 끝까지 내려온다.

따라서 기존 pointer drag, suppression window, deadzone, drag preview height 계산, `is-mid` 잔재를 제거하고, 상단 sheet toggle click을 단일 2상태 전환으로 다시 작성한다.

### 범위

- `render-calendar.js`
  - sheet state는 `bar`/`full`만 유지한다.
  - `_toggleWorkoutHomeSheet()`는 suppression 없이 `bar -> full`, `full -> bar`만 수행한다.
  - `_bindWorkoutHomeSheetDrag()`, `_startWorkoutHomeSheetDrag()`, `_resolveWorkoutHomeSheetDragTarget()`, `_consumeWorkoutHomeSuppressedClick()`, `_suppressWorkoutHomeSheetClick()`, key step/drag 관련 상수를 제거한다.
  - `[data-wt-sheet-action]`과 `+` 추가 버튼은 기존 direct action binding을 유지한다.
- `style.css`
  - drag preview CSS 변수와 `.is-dragging` 규칙을 제거한다.
  - fixed bottom sheet의 `bar`/`full` 높이와 header tap hit area는 유지한다.
- `tests/workout-calendar-bottom-sheet.test.js`
  - drag/suppression 계약 테스트를 제거하고 tap-only 2상태 계약을 검증한다.
- `sw.js`와 cache marker 테스트들
  - `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되므로 `CACHE_VERSION`을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 인증 계정 실제 flow: `운동 탭 -> 접힌 바텀시트 탭 -> full`, `full 상단 날짜/기록 영역 탭 -> bar`

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 18 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 551 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ d95bcff` — `[deploy-verify] ok d95bcff37343 tomatofarm-v20260627z7-workout-sheet-tap-toggle static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z7-workout-sheet-tap-toggle" "render-calendar.js::const WORKOUT_HOME_SHEET_CLASS_STATES = ['bar', 'full'];" "render-calendar.js::function _toggleWorkoutHomeSheet" "render-calendar.js::_workoutHomeSheetState = 'full'" "render-calendar.js::sheetState: 'full'" "render-calendar.js::_setWorkoutHomeSheetState('bar')" "style.css::height: var(--wt-day-sheet-height)"`
- not verified yet: 인증 계정 실제 `운동 탭 -> 접힌 바텀시트 탭 -> full -> 상단 탭 -> bar` UI flow 확인이 남아 있다.

## 후속 Slice 16 — Isolate background calendar while full sheet is open

### 진단

Slice 15에서 sheet drag/suppression/preview 계층을 제거하고 tap-only 2상태 토글로 단순화했다. 다만 full 상태에서도 sheet 상단 clearance 때문에 뒤쪽 캘린더가 일부 보이고, 모바일에서 해당 영역 또는 sheet header/summary를 드래그하면 배경 캘린더 scroll chain이 반응할 수 있다.

필요한 계약은 sheet를 다시 드래그 가능하게 만드는 것이 아니라, full 상태에서 배경 캘린더가 입력 대상이 되지 않게 격리하는 것이다.

### 범위

- `render-calendar.js`
  - full 상태에서만 동작하는 투명 backdrop을 bottom sheet 뒤에 렌더한다.
  - backdrop touch/wheel 입력은 기본 동작과 전파를 차단한다.
  - sheet 내부 스크롤러는 정상 스크롤을 허용하되, top/bottom boundary에서 배경으로 chain되는 입력만 차단한다.
  - pointer drag, suppression, drag preview, sheet settle 로직은 다시 추가하지 않는다.
- `style.css`
  - backdrop은 sheet 바로 뒤 z-index에 두고, full 상태에서만 pointer/touch 입력을 받는다.
  - full 상태 sheet header는 tap은 유지하되 vertical pan이 배경으로 전달되지 않게 한다.
- `tests/workout-calendar-bottom-sheet.test.js`
  - tap-only 계약을 유지하면서 full 상태 배경 입력 격리 계약을 source contract로 검증한다.
- `sw.js`와 cache marker 테스트들
  - `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 포함되므로 `CACHE_VERSION`을 bump한다.

### 검증 계획

- `node --check render-calendar.js; node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 배포 시 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 인증 계정 실제 flow: `운동 탭 -> 바텀시트 full -> sheet 밖 캘린더 영역 drag`, `sheet 내부 목록 끝에서 추가 drag`

### 실행 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 19 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 553 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=834`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 `운동 탭 -> 바텀시트 full -> sheet 밖 캘린더 영역 drag`, `sheet 내부 목록 끝에서 추가 drag` UI flow 확인이 남아 있다.
