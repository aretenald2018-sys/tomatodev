# 운동 캘린더 navigation stack 재설계

## 요청

월간 캘린더에서 날짜/운동 기록을 누르면 캘린더 위에 바텀시트가 overlay로 열리고, 바텀시트의 운동 아이콘을 누르면 운동 기록 화면으로, 운동 기록 화면의 운동 항목을 누르면 세트 입력 상세 화면으로 이동한다.

Android 시스템 뒤로가기는 다음 순서로 동작해야 한다.

1. `WorkoutDetailScreen` -> `WorkoutRecordScreen`
2. `WorkoutRecordScreen` -> `CalendarScreen` + 기존 `BottomSheet` 열린 상태
3. `CalendarScreen` + `BottomSheet` 열림 -> `BottomSheet`만 닫음
4. `CalendarScreen` + `BottomSheet` 닫힘 -> 앱 기본 뒤로가기

선택 날짜, 선택 운동, 현재 탭, 바텀시트 open/close 상태, 캘린더 스크롤 위치는 화면 전환 중 초기화하지 않는다.

## 현재 코드 진단

- 이 프로젝트는 Jetpack Compose 앱이 아니라 vanilla JS/PWA다. 따라서 `ViewModel`, `NavController`, `BackHandler` 요구사항은 다음과 같이 대응한다.
  - `ViewModel` -> 운동 탭 전용 JS 상태 모델
  - `NavController back stack` -> 명시적 `workoutNavState.stack`
  - `BackHandler` -> Capacitor `App.addListener('backButton', ...)`와 browser `popstate` fallback
- `app.js`는 운동 탭 내부 표면을 `_workoutSurface = 'home' | 'edit'`로만 구분한다.
- `style.css`는 `#tab-workout.wt-calendar-home-mode`에서 편집 UI를 숨기고, `wt-calendar-edit-mode`에서 캘린더 루트를 숨긴다.
- `render-calendar.js`의 바텀시트 액션은 `_loadWorkoutEditorForSession()` 또는 `window.openWorkoutTab()`을 통해 `switchTab('workout', { workoutDate })`를 호출한다. 즉 바텀시트에서 운동 기록으로 이동할 때 내부 stack push가 아니라 탭 재진입/편집 표면 전환으로 처리된다.
- 바텀시트 상태는 `_workoutHomeSelectedKey`, `_workoutHomeSheetState`, `_workoutHomeSessionIndex` 같은 module-local 변수에 흩어져 있다.
- 운동 기록 화면의 세트 입력 UI는 `workout/exercises.js`에서 운동 카드 아래 inline으로 렌더링된다. 현재 별도 `WorkoutDetailScreen` 개념은 없다.
- 현재 구조로는 `WorkoutRecordScreen -> CalendarScreen + 기존 BottomSheet 열린 상태` 복귀를 안정적으로 구현하기 어렵다. 화면 이동을 탭 전환이 아니라 운동 탭 내부 route stack으로 바꿔야 한다.

## 그릴 결과

### 핵심 질문 1. Compose Navigation을 실제로 도입해야 하는가?

- 답: 아니다. 현재 앱은 Compose/Android native가 아니라 PWA 구조다.
- 결정: Compose 용어는 개념만 반영하고, 구현은 기존 vanilla JS 구조 위에 명시적 navigation stack으로 한다.
- 남은 가정: Capacitor Android shell에서 PWA가 실행될 수 있으므로 Android hardware back은 Capacitor `backButton` 이벤트를 우선 처리한다.

### 핵심 질문 2. BottomSheet를 route로 볼 것인가, CalendarScreen 상태로 볼 것인가?

- 답: BottomSheet는 별도 screen route가 아니라 `CalendarScreen` 위 overlay 상태로 둔다.
- 결정: stack에는 `CalendarScreen`, `WorkoutRecordScreen`, `WorkoutDetailScreen`만 넣고, sheet open/close/full/bar 상태는 `calendar.sheet`에 저장한다.
- 이유: 뒤로가기 규칙상 `WorkoutRecordScreen`에서 back하면 `CalendarScreen + BottomSheet open`으로 복귀해야 하므로 sheet는 CalendarScreen의 saved state여야 한다.

### 핵심 질문 3. WorkoutRecordScreen은 기존 편집 UI를 재사용할 것인가?

- 답: 첫 구현에서는 재사용한다.
- 결정: `WorkoutRecordScreen`은 현재 `.workout-tab-content` 기반 운동 기록 화면을 route로 승격한다.
- 단, `switchTab('workout', { workoutDate })`로 새로 진입하지 않고 `pushWorkoutRecord(dateKey, sessionIndex)`가 날짜/회차만 보정한 뒤 surface를 전환한다.

### 핵심 질문 4. WorkoutDetailScreen은 modal인가, 화면인가?

- 답: 화면이어야 한다.
- 결정: 운동 카드 클릭 시 별도 detail surface로 push하고, 세트 목록/입력 UI를 그 화면에서 보여준다.
- 남은 가정: 기존 카드 내 inline 세트 입력은 detail screen으로 점진 이동하되, 첫 슬라이스에서는 기존 inline 렌더를 깨지 않는 어댑터를 둔다.

## 목표 구조

### Route

```js
const WORKOUT_ROUTES = {
  CALENDAR: 'CalendarScreen',
  RECORD: 'WorkoutRecordScreen',
  DETAIL: 'WorkoutDetailScreen',
};
```

### 상태 모델

`workout/navigation-stack.js`를 새로 두고, 운동 탭 내부 navigation과 보존 상태를 한곳에서 관리한다.

```js
const workoutNavState = {
  stack: [
    { name: 'CalendarScreen' },
  ],
  calendar: {
    viewYear: null,
    viewMonth: null,
    selectedKey: null,
    selectedSessionIndex: 0,
    sheetOpen: false,
    sheetState: 'bar', // 'bar' | 'full'
    scrollTop: 0,
    activeTab: 'summary',
  },
  record: {
    dateKey: null,
    sessionIndex: 0,
    scrollTop: 0,
  },
  detail: {
    dateKey: null,
    sessionIndex: 0,
    exerciseKey: null,
    entryIdx: null,
  },
};
```

### 공개 API

```js
openWorkoutCalendar({ preserve } = {})
openWorkoutDaySheet(dateKey, options)
closeWorkoutDaySheet()
pushWorkoutRecord({ dateKey, sessionIndex })
pushWorkoutDetail({ dateKey, sessionIndex, exerciseKey, entryIdx })
popWorkoutRoute()
handleWorkoutBack()
getWorkoutNavSnapshot()
```

기존 전역 함수와의 연결은 호환 레이어로 유지한다.

- `window.openWorkoutTab(y, m, d)`는 외부 탭 진입용으로 남긴다.
- 바텀시트 내부 운동 아이콘은 더 이상 `openWorkoutTab()`을 직접 호출하지 않고 `pushWorkoutRecord()`를 호출한다.
- 운동 카드 클릭은 `pushWorkoutDetail()`을 호출한다.

## 화면 전환 규칙

### 1. CalendarScreen

- `#workout-calendar-root`는 유지한다.
- 날짜 또는 기록 클릭 시 `calendar.selectedKey`, `calendar.selectedSessionIndex`, `calendar.sheetOpen`, `calendar.sheetState`를 갱신하고 sheet를 overlay로 렌더한다.
- sheet가 열려도 캘린더 DOM과 scroll position은 유지한다.
- sheet의 `bar/full` drag snap 상태는 `calendar.sheetState`에 저장한다.

### 2. BottomSheet

- BottomSheet는 route가 아니라 `CalendarScreen`의 overlay다.
- 날짜 요약, 회차 탭, 아이콘 메뉴를 보여준다.
- 운동 아이콘 클릭 시:
  1. 현재 캘린더 scroll position 저장
  2. 선택 날짜와 session index 저장
  3. `pushWorkoutRecord({ dateKey, sessionIndex })`
  4. `WorkoutRecordScreen` 표시
- 이때 `calendar.sheetOpen`은 true로 유지한다. 그래야 back 시 기존 sheet 열린 상태로 복귀한다.

### 3. WorkoutRecordScreen

- 기존 운동 기록 편집 UI를 route surface로 표시한다.
- 진입 시 날짜가 다르면 `loadWorkoutDate(y, m, d)`를 호출하되, 같은 날짜/회차면 불필요한 초기화를 피한다.
- `window.__wtTargetSessionIndex` 같은 임시 전역은 navigation state로 대체하거나 호환 wrapper 내부에서만 사용한다.
- record 화면의 scroll position은 `record.scrollTop`으로 저장/복원한다.
- 운동 항목 클릭 시 기존 접기/펼치기와 충돌하지 않도록 클릭 영역을 정리한다.
  - 카드 본문/타이틀 클릭: detail push
  - 체크, 세트 완료, 삭제, 추가, drag handle, picker 버튼: 기존 액션 유지

### 4. WorkoutDetailScreen

- 선택 운동 1개를 중심으로 세트 목록/입력 UI를 보여준다.
- 기존 `wtAddSet`, `wtUpdateSet`, `wtToggleSetDone`, `wtRemoveSet`, set drag move 로직을 재사용한다.
- route 인자는 `entryIdx`만 의존하지 않는다. 운동 삭제/정렬 후 index가 바뀔 수 있으므로 가능한 안정 식별자를 둔다.
  - 우선순위: `entry.instanceId` 또는 새로 부여하는 `entry.uid`
  - fallback: `{ dateKey, sessionIndex, entryIdx, exerciseId }`
- detail에서 운동이 삭제되어 현재 route 대상이 사라지면 `WorkoutRecordScreen`으로 pop한다.

## 뒤로가기 처리

### 우선순위

운동 탭에서만 내부 back을 처리한다.

```js
function handleWorkoutBack() {
  if (getActiveTabId() !== 'workout') return false;

  if (isWorkoutBlockingModalOpen()) {
    closeTopWorkoutModal();
    return true;
  }

  const route = currentWorkoutRoute();
  if (route.name === 'WorkoutDetailScreen') {
    popToWorkoutRecord();
    return true;
  }

  if (route.name === 'WorkoutRecordScreen') {
    popToWorkoutCalendar({ reopenSheet: true });
    return true;
  }

  if (route.name === 'CalendarScreen' && workoutNavState.calendar.sheetOpen) {
    closeWorkoutDaySheet();
    return true;
  }

  return false;
}
```

### Android

- Capacitor가 있으면 `App.addListener('backButton', handler)`를 등록한다.
- `handleWorkoutBack()`이 true를 반환하면 기본 back을 막는다.
- false면 앱의 기존 기본 back 정책을 따른다.

### Browser fallback

- route push 시 `history.pushState({ workoutRoute })`를 최소 단위로 반영한다.
- `popstate`에서는 `handleWorkoutBack()`과 route snapshot을 맞춘다.
- PWA/브라우저에서 뒤로가기 버튼을 눌러도 Android 규칙과 같은 순서를 갖게 한다.

## 구현 슬라이스

### Slice 1. 운동 탭 navigation state/router 도입

범위:

1. `workout/navigation-stack.js` 추가
2. `CalendarScreen`, `WorkoutRecordScreen`, `WorkoutDetailScreen` route 상수와 stack reducer 구현
3. state snapshot getter/setter 및 scroll 저장/복원 hook 추가
4. route push/pop 단위 테스트 추가

건드리지 않을 것:

- 실제 UI 전환 로직
- 바텀시트 DOM/CSS
- 세트 입력 UI

검증:

- `node --check workout/navigation-stack.js`
- `node --test tests/workout-navigation-stack.test.js`
- `git diff --check`

### Slice 2. BottomSheet -> WorkoutRecordScreen 전환을 stack push로 교체

범위:

1. `render-calendar.js`의 운동 아이콘/기록 진입 액션을 `pushWorkoutRecord()`로 연결
2. 선택 날짜, session index, sheet open/full/bar 상태를 navigation state에 저장
3. `app.js`의 `_workoutSurface`를 `home/edit`에서 최소 `calendar/record` 대응으로 확장하거나 router current route를 바라보게 변경
4. back 시 `CalendarScreen + sheet open` 복귀 테스트 추가

건드리지 않을 것:

- 운동 카드 detail 화면
- Android hardware back 등록

검증:

- `node --check app.js render-calendar.js workout/navigation-stack.js sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`

### Slice 3. WorkoutRecordScreen 상태 보존

범위:

1. `loadWorkoutDate()` 호출 경로가 같은 날짜/회차에서 화면을 불필요하게 초기화하지 않도록 router와 연결
2. record scroll position 저장/복원
3. 회차 변경 시 navigation state와 `S.workout.sessionIndex` 동기화
4. `WorkoutRecordScreen -> back -> CalendarScreen + BottomSheet open` UI 상태 회귀 테스트 추가

건드리지 않을 것:

- 운동 상세 화면
- 세트 UI 구조 변경

검증:

- `node --check app.js workout/load.js workout/navigation-stack.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-active-session-recovery.test.js`
- `git diff --check`

### Slice 4. WorkoutDetailScreen 추가

범위:

1. detail surface DOM 추가
2. 운동 카드 클릭 -> `pushWorkoutDetail()` 연결
3. 선택 운동의 세트 목록/입력 UI를 detail surface에 렌더
4. 기존 세트 추가/수정/완료/삭제/정렬 함수 재사용
5. `WorkoutDetailScreen -> back -> WorkoutRecordScreen` 테스트 추가

주의:

- 입력, 체크, 삭제, drag handle 클릭이 detail push로 오인되지 않도록 event target guard를 둔다.
- 기존 inline 세트 UI를 즉시 제거하지 말고, detail 전환이 안정화된 뒤 축소한다.

검증:

- `node --check workout/exercises.js workout/navigation-stack.js app.js style.css sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`

### Slice 5. Android/system back 통합

범위:

1. Capacitor `backButton` listener 등록
2. browser `popstate` fallback 추가
3. modal/picker가 열린 경우의 우선순위 정리
4. hardware back route 순서 테스트 또는 static source test 추가

검증:

- `node --check app.js navigation.js workout/navigation-stack.js`
- `node --test tests/workout-navigation-stack.test.js`
- Android shell 또는 배포 PWA에서 실제 뒤로가기 수동 확인

### Slice 6. 배포 및 실제 UI 검증

범위:

1. `sw.js` `STATIC_ASSETS` 대상 변경이 있으면 `CACHE_VERSION` bump 확인
2. Dashboard3 Pages 배포
3. 배포 URL에서 인증 계정으로 다음 흐름 확인
   - 운동 탭 -> 월간 캘린더 날짜 클릭 -> BottomSheet 표시
   - 운동 아이콘 클릭 -> WorkoutRecordScreen
   - 운동 카드 클릭 -> WorkoutDetailScreen
   - Android back -> Record
   - Android back -> Calendar + 기존 BottomSheet open
   - Android back -> BottomSheet close
   - Android back -> 앱 기본 동작

검증:

- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL HTTP 200
- 최신 commit/build-info 확인
- 인증 계정 실제 UI flow 확인

## 완료 기준

- 날짜/운동 기록 클릭 시 캘린더 위에 BottomSheet가 overlay로 열린다.
- BottomSheet 운동 아이콘 클릭 시 화면이 새로고침처럼 초기화되지 않고 `WorkoutRecordScreen`으로 이동한다.
- 운동 카드 클릭 시 `WorkoutDetailScreen`에서 해당 운동의 세트 목록/입력 UI가 보인다.
- Android 시스템 뒤로가기 순서가 요청 규칙과 일치한다.
- `WorkoutRecordScreen`에서 돌아오면 선택 날짜, 선택 회차, sheet open/full/bar 상태, 캘린더 스크롤 위치가 유지된다.
- `WorkoutDetailScreen`에서 돌아오면 기록 화면의 날짜, 회차, 운동 목록, scroll position이 유지된다.

## 비범위

- Jetpack Compose로 재작성하지 않는다.
- Firebase schema를 바꾸지 않는다.
- `data.js`를 우회해 Firestore를 직접 호출하지 않는다.
- 기존 운동 picker, 루틴 생성, Max V4 plan sheet 동작은 route 전환에 필요한 최소 연결만 변경한다.
- 바텀시트 시각 디자인 재작업은 이번 stack 안정화 이후 별도 계획으로 다룬다.

## 다음 실행 프롬프트

`docs/ai/features/2026-06-25-workout-navigation-stack-redesign.md`의 Slice 1을 실행해줘. 앱 UI를 바꾸지 말고 `workout/navigation-stack.js`와 단위 테스트만 추가해서 `CalendarScreen -> WorkoutRecordScreen -> WorkoutDetailScreen` stack, sheet 상태 보존, back pop 규칙의 순수 상태 로직을 먼저 고정해줘.

## 실행 결과

상태: 2026-06-25 전체 Slice 1-6 구현 완료.

구현 내용:

1. `workout/navigation-stack.js`를 추가해 `CalendarScreen`, `WorkoutRecordScreen`, `WorkoutDetailScreen` stack과 `calendar/record/detail` saved state를 관리한다.
2. PWA 환경에서는 route/sheet 상태를 `history.pushState` snapshot으로 저장하고 `popstate`에서 복원한다.
3. Capacitor `window.Capacitor?.Plugins?.App`가 있으면 Android `backButton`을 내부 workout stack에 먼저 넘긴다.
4. 캘린더 바텀시트의 날짜 선택, sheet full/bar, 회차 선택, record 진입 상태를 navigation state에 동기화했다.
5. 바텀시트의 운동 편집/추가 진입은 기존 `switchTab` 직접 전환 대신 `wtOpenWorkoutRecord()`와 `pushWorkoutRecord()`를 탄다.
6. 기존 운동 기록 UI는 `WorkoutRecordScreen` surface로 유지하고, `wt-exercise-detail-root`를 추가해 `WorkoutDetailScreen`을 분리했다.
7. 운동 카드의 운동명/성공 기준 영역을 누르면 detail route로 이동하고, detail 화면은 기존 set CRUD 렌더러를 재사용한다.
8. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z44-workout-nav-stack`로 bump하고 새 `workout/navigation-stack.js`를 `STATIC_ASSETS`에 추가했다.

검증:

- PASS: `node --check app.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check workout/navigation-stack.js`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/index.js`
- PASS: `node --check workout/load.js; node --check render-workout.js; node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/stats-picker-ui-polish.test.js`

남은 검증:

- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` 실행
- 인증 계정으로 실제 UI flow 확인: `운동 탭 -> 날짜 클릭 -> BottomSheet -> 운동 진입 -> 운동 상세 -> Android/PWA back 순서`
