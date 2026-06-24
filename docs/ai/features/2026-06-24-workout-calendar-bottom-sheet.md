# 운동 캘린더 날짜 상세 하단 시트 계획

## 배경

운동 탭 월간 캘린더 하단에는 이미 선택 날짜를 보여주는 탭(`.cal-workout-day-bar`)이 있다. 현재는 특정 날짜를 누르면 `renderWorkoutCalendarHome()`이 월간 캘린더를 지우고 `.wt-day-detail` 상세 화면으로 전환한다. 사용자는 새 모달을 따로 붙이는 것이 아니라, 이 하단 탭 자체가 아래에서 위로 올라오는 bottom sheet 헤더처럼 동작하고 드래그로 올렸다 내릴 수 있길 원한다.

## 그릴 결과

- 핵심 질문: 날짜를 누른 직후 운동 추가 페이지로 이동해야 하는가, 아니면 날짜 상세를 먼저 띄워야 하는가?
- 답변/결정: 날짜 탭은 페이지 자체를 운동 추가/편집 화면으로 랜딩시키지 않는다. 선택한 날짜의 상세를 하단 시트로 열고, `+`나 편집 버튼을 누를 때만 기존 운동 추가/편집 흐름으로 들어간다.
- 추가 확인: 사용자가 명시한 핵심은 "기존에 구현된 하단부 탭"을 올렸다 내리는 것이다. 날짜 클릭 시에는 해당 탭이 애니메이션으로 꽉 차게 올라오는 느낌이어야 한다.
- 남은 가정: 드래그 상태는 `bar`/`mid`/`full` 3단계면 충분하다. 닫기는 기존 탭 상태(`bar`)로 내려가는 방식이다.

## 목표

- 운동 탭 월간 캘린더에서 날짜를 탭해도 캘린더 화면이 사라지지 않게 한다.
- 기존 하단 날짜 탭을 캘린더 위 fixed bottom sheet의 헤더로 재사용한다.
- 시트 상단 탭/handle을 드래그해 `bar`/`mid`/`full` 상태로 열고 내릴 수 있게 한다.
- 특정 날짜를 클릭하면 `bar -> full`로 올라오는 애니메이션을 적용한다.
- 기존 회차 탭, 편집, `+` 운동 추가 동작은 유지한다.

## 범위

### 포함

- `render-calendar.js`
  - `_workoutHomeView === 'detail'`일 때 전체 root를 상세 화면으로 교체하지 않고 월간 캘린더와 하단 날짜 sheet를 함께 렌더한다.
  - 기존 `.cal-workout-day-bar`를 `.cal-workout-day-sheet`의 헤더로 재사용한다.
  - 날짜 클릭, 오늘 상세 진입, 뒤로가기/닫기 상태 전환을 시트 모델에 맞춘다.
  - 날짜 클릭 시 `bar -> full` 애니메이션으로 sheet를 올린다.
  - 시트 handle pointer drag로 `bar`/`mid`/`full` 상태 전환을 구현한다.
- `style.css`
  - `.cal-workout-day-sheet` fixed bottom sheet, drag state, 3단계 높이, transition 스타일을 추가한다.
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
