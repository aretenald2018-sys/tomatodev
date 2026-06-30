# Workout Calendar Owned Scroll Root

## 배경

- 요청: 운영 PWA에서 운동 캘린더 드래그가 여전히 되지 않고, 바텀시트 영역에서 손가락을 움직일 때만 캘린더가 움직이는 증상이 반복된다.
- 이전 조치:
  - `data-wt-calendar-scroll-surface`를 월간 grid에서 surface wrapper까지 확장했다.
  - PWA Service Worker 자동 갱신을 보강했다.
  - bottom sheet backdrop을 bar 상태에서 `hidden`/`display:none` 처리했다.
- 결과: 운영 asset marker는 모두 반영됐지만 사용자 기기 PWA 증상은 계속된다.

## 읽은 관련 코드

- `index.html`
  - `#tab-workout` 안에 `#workout-calendar-root`와 legacy `.workout-tab-content`가 형제 DOM으로 있다.
- `app.js`
  - `_setWorkoutSurface()`, `_renderWorkoutCalendarRoute()`, `switchTab()`
  - `_isWorkoutPullBlockedTarget()`, `_nearestWorkoutScroller()`, `_workoutPageScrollTop()`, `_canStartWorkoutPullBack()`, `initWorkoutPullBackGesture()`
  - 전역 `window.wtOpenWorkoutDaySheet`, `window.wtHandleWorkoutBack`, `window.openWorkoutTab`
- `render-calendar.js`
  - 전역 상태: `_viewYear`, `_viewMonth`, `_workoutHomeSelectedKey`, `_workoutHomeView`, `_workoutHomeSheetState`, `_workoutHomeSessionIndex`
  - `_workoutHomeScrollTop()`, `_syncWorkoutHomeNavState()`, `applyWorkoutCalendarNavSnapshot()`
  - `_renderWorkoutCalendar()`, `_renderWorkoutHomeBottomSheet()`, `renderWorkoutCalendarHome()`
  - `_applyWorkoutHomeSheetState()`, `_setWorkoutHomeSheetState()`, `_toggleWorkoutHomeSheet()`
  - `_bindWorkoutHomeSheetActions()`, `_bindWorkoutHomeSheetInputIsolation()`, `_bindWorkoutCycleRailActions()`
  - `_openWorkoutHomeDay()`, `_backWorkoutHomeMonth()`, `_goTodayWorkoutDetail()`
- `workout/navigation-stack.js`
  - `calendar.scrollTop`, `openWorkoutCalendar()`, `openWorkoutDaySheet()`, `closeWorkoutDaySheet()`, `handleWorkoutBack()`, `enableWorkoutPwaHistory()`
- `navigation.js`
  - `initSwipeNavigation()` body touchstart/touchmove/touchend path. 수평 swipe만 panel transform을 수행하고 세로 이동은 tracking을 중단한다. `preventDefault()`는 없다.
- `style.css`, `styles/components.css`
  - `.tab-panel`, `body`, `body.wt-workout-tab-active`, `#tab-workout.wt-calendar-home-mode`
  - `.workout-calendar-root`, `.cal-workout-surface-home`, `.cal-workout-month-grid`
  - `.cal-workout-day-backdrop`, `.cal-workout-day-sheet`, `.wt-day-sheet-scroll`
- `pwa-register.js`, `pwa-fcm.js`, `manifest.json`
  - PWA 전용 분기는 설치/서비스워커/업데이트 중심이며 캘린더 터치를 직접 가로채지 않는다.

## 원인 분석

1. 운동 캘린더 본문은 독립 스크롤 컨테이너가 아니다.
   - `.workout-calendar-root`는 `padding`, `background`, `min-height`, `scrollbar-gutter`만 갖고 `overflow-y:auto`가 없다.
   - `.cal-workout-surface-home`과 `.cal-workout-month-grid`는 `touch-action: pan-y`만 있고 실제 scroll owner가 아니다.
   - 따라서 캘린더 드래그는 최종적으로 `document/body` 스크롤에 의존한다.

2. 같은 화면에는 fixed 계층이 많다.
   - top nav, bottom nav, workout timer bar, bottom sheet가 fixed/sticky로 붙는다.
   - bottom sheet 내부 `.wt-day-sheet-scroll`은 별도 `overflow-y:auto`와 `-webkit-overflow-scrolling: touch`를 갖는다.
   - 그래서 PWA WebView가 body pan보다 sheet 영역 pan을 더 안정적으로 시작할 수 있다.

3. 전역 workout pull-back은 캘린더 표식 아래 touch를 예외 처리하지만, scroll owner 문제는 해결하지 못한다.
   - `data-wt-calendar-scroll-surface`는 pull-back `preventDefault()` 회피에는 유효하다.
   - 하지만 캘린더 자체가 scroll container가 아니면 PWA WebView의 gesture ownership은 여전히 body/fixed layer 조합에 맡겨진다.

4. 이전 backdrop 패치는 필요한 방어였지만 근본 원인은 아니었다.
   - bar 상태 backdrop은 이제 DOM/CSS에서 숨지만, 증상이 남았으므로 투명 backdrop 단독 원인은 아니다.

## Slice 1

1. `#tab-workout.wt-calendar-home-mode`를 viewport 높이의 독립 화면으로 만들고 `overflow:hidden`을 적용한다.
2. `#workout-calendar-root`를 명시적 세로 scroll owner로 만든다.
   - `height:100%`
   - `overflow-y:auto`
   - `overscroll-behavior-y:contain`
   - `-webkit-overflow-scrolling:touch`
   - `touch-action:pan-y`
3. `render-calendar.js`의 scroll 저장/복원을 `document/body`가 아니라 `#workout-calendar-root` 우선으로 바꾼다.
4. 기존 bottom sheet full 상태의 내부 스크롤/배경 입력 차단은 유지한다.
5. 회귀 테스트로 owned scroll root 계약과 `scrollTop` 저장/복원을 고정한다.
6. `style.css`, `render-calendar.js`가 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`을 bump한다.

## 제외 범위

- 바텀시트 drag/snap 기능 재도입
- 월간 캘린더 디자인/행 높이 변경
- 전역 탭 swipe 제거
- PWA manifest display mode 변경
- `www/` 직접 수정

## 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. `node --test --test-reporter=dot tests/*.test.js`
7. 운영계 push 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
8. 운영 marker 확인: `workout-calendar-root` owned scroll CSS, `_workoutHomeScrollTop`, root scroll restore, 새 `CACHE_VERSION`

