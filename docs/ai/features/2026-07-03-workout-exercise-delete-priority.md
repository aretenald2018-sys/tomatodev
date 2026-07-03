# 운동 종목 삭제 우선순위 핫픽스

## 요청

- 당일 `x`로 삭제한 운동종목이 다시 살아나는 문제를 점검한다.
- `종목완료`로 저장된 완료 상태보다, 사용자가 `x`로 삭제한 상태가 우선되어야 한다.

## 진단

### 증상

- 운동 홈 하단시트에서 완료된 종목을 `x`로 삭제해도 이후 다시 표시될 수 있다.
- 사용자는 최근 추가된 `종목완료` 저장이 완료 상태를 강하게 보존해 삭제를 덮는지 의심했다.

### 확인한 구조

- `render-calendar.js`의 `_completeWorkoutExerciseFromSheet()`와 `_deleteWorkoutExercise()`는 모두 `upsertWorkoutSession()` 결과를 `saveDay(..., { mode: 'merge' })`로 저장한다.
- 삭제 자체는 `workoutSessions`와 top-level `exercises` aggregate를 다시 계산하므로 Firestore payload 관점에서는 정상이다.
- 문제 가능성이 큰 경로는 active workout draft다.
  - `workout/timers.js`는 `visibilitychange`, `beforeunload`, 세트 편집 등에서 `S.workout.exercises`를 localStorage draft로 저장한다.
  - 하단시트 저장은 캐시/Firestore를 갱신하지만, 현재 운동 탭 상태 `S.workout`과 기존 active draft를 같은 세션의 저장 결과로 동기화하지 않는다.
  - 따라서 오래된 `S.workout.exercises` 또는 draft가 삭제 전 목록을 다시 저장하면 삭제한 종목이 되살아날 수 있다.

### 가설

1. 완료 도장 자체가 원인은 아니다. 완료 상태는 세트 `done` 값을 보고 렌더된다.
2. `종목완료` 이후 만들어진 최신 draft가 있고, 하단시트 `x` 삭제가 그 draft를 갱신하지 않으면 다음 로드/저장에서 삭제 전 종목이 복구될 수 있다.
3. 같은 날짜/회차에서 하단시트 저장 결과를 active draft와 `S.workout`에 반영하면 삭제가 최종 상태가 된다.

## 결정

- 하단시트 세션 저장 성공 직후, 저장된 `workoutSessions`의 현재 날짜/회차 세션으로 active draft를 교체한다.
- 현재 운동 탭이 같은 날짜/회차를 보고 있으면 `S.workout`도 저장된 세션으로 동기화한다.
- 새 스키마나 삭제 tombstone 필드는 만들지 않는다. 이번 버그는 기존 저장 결과와 로컬 초안 간 우선순위 문제로 한정한다.

## 실행 슬라이스

### Slice 1: 하단시트 저장 결과가 active draft를 덮도록 수정

- 상태: implemented and reviewed
- 변경 파일:
  - `render-calendar.js`
  - `workout/timers.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/workout-active-session-recovery.test.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- 구현:
  1. `workout/timers.js`에 같은 날짜/회차 active draft를 저장된 세션으로 교체하는 helper를 추가한다.
  2. `render-calendar.js`의 `_saveWorkoutHomeSessionResult()`가 저장 성공 후 해당 helper를 호출한다.
  3. 같은 날짜/회차를 운동 탭이 보고 있으면 `S.workout`의 운동 세션 필드를 저장된 세션으로 갱신한다.
  4. `render-calendar.js`와 `workout/timers.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.
- 제외:
  - Firestore schema 변경
  - 운동종목 카탈로그 삭제 로직
  - 운동 카드 UI 재디자인
  - `www/` 직접 수정
- 검증:
  - `node --check render-calendar.js workout/timers.js sw.js`
  - `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
  - 배포가 필요한 경우 `origin/main` push 후 Dashboard3 Pages verify

## 실행 결과

- `workout/timers.js`에 `wtReplaceActiveWorkoutDraftSession()`을 추가했다.
  - 기존 active draft가 같은 날짜/회차를 가리킬 때만 저장된 세션으로 교체한다.
  - 저장된 세션이 비어 있고 활성 타이머 등 보존할 draft 데이터가 없으면 draft를 제거한다.
- `render-calendar.js`의 하단시트 저장 성공 경로에서 저장한 회차의 active draft를 교체한다.
  - 같은 날짜/회차를 현재 운동 탭이 보고 있을 때만 `S.workout`도 저장된 세션으로 동기화한다.
  - 다른 회차의 임시 draft를 건드리지 않도록 `options.sessionIndex`로 저장 회차를 명시했다.
- `tests/workout-active-session-recovery.test.js`와 `tests/workout-calendar-bottom-sheet.test.js`에 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z2-workout-delete-priority`로 bump하고 cache marker 테스트들을 갱신했다.

## 검증 결과

- PASS: `node --check render-calendar.js; node --check workout/timers.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js` - 37 pass
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=868`
- PASS: `node --test tests/*.test.js` - 645 pass
- PASS: `git diff --check`
- not verified yet: 인증 계정 실제 UI에서 `운동 홈 하단시트 -> 종목완료 -> x 삭제 -> 새로고침/재진입 후 삭제 유지` 클릭 플로우는 자동 검증하지 못했다.

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-07-03-workout-exercise-delete-priority-review.md`
- finding 없음.
- 자체 리뷰 중 초기 구현이 저장 결과의 모든 회차를 순회하면 다른 회차의 active draft를 덮을 수 있음을 발견했고, 저장한 `sessionIndex` 하나만 동기화하도록 수정했다.

## 다음 세션 프롬프트

`docs/ai/features/2026-07-03-workout-exercise-delete-priority.md`의 Slice 1을 실행한다. 하단시트에서 `x` 삭제가 `종목완료` 또는 active draft보다 우선되도록, 저장 성공 후 같은 날짜/회차의 active draft와 `S.workout`을 저장된 세션으로 동기화하고 관련 테스트와 `sw.js` 캐시 버전을 갱신한다.
