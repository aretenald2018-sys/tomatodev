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
