# 운동 하단 시트 종목 추가/타이머 통합 회귀 수정 계획

## 문제

- 운동 캘린더 하단 시트(1화면)에서 `+`로 종목을 추가하면 현재 시트에 추가되지 않고 기존 `WorkoutRecordScreen`(2화면)으로 전환된다.
- 이 전환 때문에 오늘 운동 기록이 화면별로 분기된 것처럼 보이고, 하단 운동 타이머도 1화면에서 확인되지 않거나 초기화된 것처럼 보인다.
- 현재 `_addWorkoutHomeSession()`은 빈 회차를 우선 선택하고 `_loadWorkoutEditorForSession()`을 호출하는데, 이 함수가 `wtOpenWorkoutRecord()`를 통해 기록 화면 route를 push한다.

## 진단

1. `render-calendar.js`의 하단 시트 `+` 액션은 현재 회차가 아니라 첫 빈 회차를 target으로 잡을 수 있다.
2. 같은 액션이 데이터 로드 목적에도 기록 화면 전환 함수를 사용하고 있다.
3. `workout/exercises.js`의 picker 선택 핸들러는 선택 후 항상 `wtFocusWorkoutEntryCard()`를 호출해 기록 편집 화면의 카드 리스트를 대상으로 포커스한다.
4. 타이머 DOM은 `index.html`의 `.workout-tab-content` 안에 있는데, 캘린더 surface에서는 `.workout-tab-content` 전체가 `display:none`이라 1화면에서 보일 수 없다.

## 실행 슬라이스

1. `render-calendar.js`
   - 하단 시트 `+` target을 첫 빈 회차가 아니라 현재 선택된 gym 회차로 고정한다.
   - picker를 열기 전에는 route push 없이 `loadWorkoutDate()`만 호출하는 시트 전용 로드 함수를 사용한다.
   - picker 선택 완료 후 `openWorkoutDaySheet()`와 `renderWorkoutCalendarHome()`로 같은 날짜/회차의 하단 시트를 full 상태로 다시 렌더한다.

2. `workout/exercises.js`
   - `wtOpenExercisePicker(options)`가 선택 후처리 콜백을 받을 수 있게 한다.
   - 기본 기록 화면에서는 기존처럼 선택 후 카드 포커스를 유지한다.
   - 하단 시트 context에서는 저장 완료 후 콜백만 실행하고 기록 화면 카드 포커스는 하지 않는다.

3. `style.css`
   - 캘린더 surface에서도 `.workout-tab-content` 안의 `#wt-workout-timer-bar`만 노출 가능하게 한다.
   - 타이머가 열렸을 때 하단 시트 회차 bar와 겹치지 않도록 캘린더 surface 전용 bottom 위치를 둔다.

4. 테스트/캐시
   - picker 선택 flow, workout navigation/calendar bottom sheet, timer CSS 회귀 테스트를 갱신한다.
   - `render-calendar.js`, `workout/exercises.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump하고 cache marker 테스트를 갱신한다.

## 제외

- 하단 시트 카드 자체를 완전 편집형 카드로 바꾸는 작업.
- 러닝 세션 저장 플로우 변경.
- `www/` 직접 수정.
- 인증 계정이 필요한 실제 모바일 UI 조작 검증. 배포 asset/route 검증은 수행하고, 실제 로그인 UI flow는 남은 검증으로 명시한다.

