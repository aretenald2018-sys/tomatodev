# 운동 navigation stack 회귀 수정

## 상태

- 상태: `implemented_static_verified`
- 트리거: `/diagnose`
- 요청: 운동 추가 picker 뒤로가기/종목 선택 상세 진입, 캘린더 BottomSheet 중앙 handle 클릭/하향 드래그 닫기 수정

## 문제

1. 운동 종목 picker에서 종목을 누르면 운동 기록 화면으로 돌아오지만 방금 추가한 종목 상세/세트 입력 화면으로 바로 이동하지 않는다.
2. picker 화면에서 앱/브라우저 뒤로가기와 상단 back UI가 자연스럽게 닫히거나 이전 picker view로 복귀하지 않는 경로가 있다.
3. 캘린더 BottomSheet 상단 중앙 파란 grip은 시각적으로 조작 가능한 handle처럼 보이지만 클릭으로 닫기/열기 동작이 명확하지 않고, full 상태에서 하향 drag가 사용자 의도대로 닫히지 않는 경우가 있다.

## 원인 가설

- picker add handler가 `S.workout.exercises.push(...)` 이후 `_renderExerciseList()`와 `wtCloseExercisePicker()`까지만 수행하고 `pushWorkoutDetail()`을 호출하지 않는다.
- Android/PWA back handler는 workout route stack을 우선 처리하지만 picker overlay가 열린 상태를 먼저 소비하지 않는다.
- BottomSheet handle click은 별도 click handler가 없고 drag end의 click suppression에 의존한다. 중앙 grip 자체는 `pointer-events: none`이라 사용자는 grip을 눌렀다고 느끼지만 실제 처리 대상은 bar 전체다.

## 수정 범위

1. picker 종목 추가 후 새 entry index를 기준으로 `WorkoutDetailScreen` route를 push한다.
2. picker가 열린 상태에서는 back을 먼저 picker back/close로 소비하고, PWA/Android back에서도 같은 동작을 쓰도록 전역 bridge를 둔다.
3. BottomSheet handle에 click toggle을 추가하고, full 상태에서는 중앙 grip/handle click과 하향 drag가 `bar`로 안정적으로 안착하게 한다.
4. 수정 파일이 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`을 bump한다.

## 검증

- `node --check app.js render-calendar.js workout/exercises.js workout/navigation-stack.js sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js`
- `node scripts/verify-runtime-assets.mjs`
- Dashboard3 Pages 배포 후 `verify:deploy`, `verify:deployed-markers`

## 실행 결과

1. picker 상단 back 버튼은 capture 단계에서 직접 처리하고, `wtHandleExercisePickerBack()`을 추가해 Android/PWA back보다 먼저 picker overlay를 소비한다.
2. picker에서 이미 추가된 종목을 누르면 기존 entry detail route로 이동하고, 새 종목을 누르면 추가 직후 새 entry detail route로 이동한다.
3. BottomSheet handle click을 추가해 중앙 grip/bar 클릭으로 full/bar 토글이 가능하다.
4. full 상태 grip은 파란색 affordance로 유지하고, 하향 drag collapse threshold를 `14px`/`0.2`로 낮췄다.
5. PWA 캐시 무효화를 위해 `sw.js` `CACHE_VERSION`과 versioned module query를 `20260625z45-workout-nav-regression`으로 갱신했다.

## 실행 검증

- PASS: `node --check app.js; node --check render-calendar.js; node --check workout/exercises.js; node --check workout/index.js; node --check workout/navigation-stack.js; node --check render-workout.js; node --check workout/load.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 512 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 검증

- Dashboard3 Pages 배포 후 최신 commit과 marker를 확인한다.
- 인증 계정으로 `운동 탭 -> + -> picker back/종목 선택/detail -> Android/PWA back`, `캘린더 날짜 sheet -> 중앙 grip click/down drag` 실제 UI flow를 확인한다.
