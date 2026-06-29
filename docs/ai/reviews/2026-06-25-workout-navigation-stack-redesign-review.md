# 운동 navigation stack 재설계 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-workout-navigation-stack-redesign.md`
- 구현 파일:
  - `workout/navigation-stack.js`
  - `app.js`
  - `render-calendar.js`
  - `workout/exercises.js`
  - `index.html`
  - `style.css`
  - `render-workout.js`
  - `workout/index.js`
  - `workout/load.js`
  - `sw.js`
  - 관련 테스트

## 리뷰 결과

차단 이슈 없음.

## 확인한 점

1. `BottomSheet`는 route가 아니라 `CalendarScreen`의 saved state로 유지된다.
2. `WorkoutRecordScreen`과 `WorkoutDetailScreen`은 `workout/navigation-stack.js` stack으로 push/pop된다.
3. `WorkoutRecordScreen -> back -> CalendarScreen + sheet open`, `CalendarScreen + sheet open -> back -> sheet close` 순수 상태 테스트가 있다.
4. PWA 환경은 `history.pushState` snapshot과 `popstate` 복원으로 같은 back 순서를 따른다.
5. Android shell에서는 `window.Capacitor?.Plugins?.App`가 제공될 때 `backButton`을 먼저 workout stack에 전달한다.
6. `sw.js` `CACHE_VERSION`이 `tomatofarm-v20260625z44-workout-nav-stack`로 bump됐고, 새 `workout/navigation-stack.js`가 `STATIC_ASSETS`에 포함됐다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check workout/navigation-stack.js`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/index.js`
- PASS: `node --check workout/load.js; node --check render-workout.js; node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js`
- PASS: `node --test tests/workout-active-session-recovery.test.js tests/workout-test-mode-unified.test.js tests/workout-timer-summary-only.test.js tests/workout-track-graph-delta.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/stats-picker-ui-polish.test.js`

## 남은 리스크

- 인증 계정이 필요한 실제 UI flow는 자동화 검증하지 못했다.
- Capacitor `App` plugin이 Android 런타임에 노출되지 않는 경우 native back listener는 붙지 않는다. 이 경우 PWA/browser history back은 동작하지만 Android shell 기본 동작은 실제 기기에서 확인해야 한다.

