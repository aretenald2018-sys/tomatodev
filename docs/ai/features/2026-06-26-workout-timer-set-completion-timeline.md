# 운동 타이머 세트 완료 타임라인 전환

## 배경

현재 운동 타이머는 `S.workout.workoutStartTime`과 `S.workout.workoutDuration` 중심으로 동작한다. 세트 입력 또는 운동 추가 시 타이머가 자동 시작되고, pause/finish 시 화면에 켜져 있던 시간 또는 앱 실행 중 누적 시간이 `workoutDuration`으로 저장된다.

사용자는 바디캘린더처럼 총 운동시간을 휴대폰 화면 켜짐 시간이나 앱 실행 시간이 아니라 세트 완료 체크 시각의 타임라인으로 계산하기를 요청했다.

## 그릴 결과

- 핵심 질문: 운동 시간의 단일 진실을 기존 stopwatch elapsed로 둘지, 세트 완료 timestamp timeline으로 둘지.
- 답변/결정: 세트 완료 timestamp timeline을 단일 진실로 둔다.
- 코드에서 확인한 사실:
  - 세트 완료 체크는 `workout/exercises.js`의 `wtToggleSetDone()`에서 처리된다.
  - 저장 payload와 `workoutSessions` 집계는 `workout/save.js`, `workout/sessions.js`를 거친다.
  - 캘린더/월 합계는 저장된 `workoutDuration`을 읽는다.
  - 기존 active timer 복구는 `workout/timers.js`와 `_settings/active_timer`에 묶여 있다.
- 남은 가정: 새 기록은 세트 완료 timestamp 기반으로 계산하고, 과거 기록 중 timestamp가 없는 기록은 기존 `workoutDuration`을 그대로 표시한다.

## 목표

1. 세트가 완료 체크될 때마다 해당 set에 완료 시각을 기록한다.
2. 총 근력 운동 시간은 완료된 세트들의 첫 완료 시각부터 마지막 완료 시각까지로 계산한다.
3. 세트 사이 휴식은 두 완료 시각 사이의 간격으로 자연스럽게 포함한다.
4. 앱이 켜져 있던 시간, 화면이 켜져 있던 시간, 수동 play/pause stopwatch elapsed는 새 근력 운동 시간의 기준이 되지 않게 한다.
5. 기존 캘린더, 월간 합계, 상세 요약, life-zone, 세션 집계는 새 계산 결과를 읽도록 `workoutDuration` 호환 필드를 계속 채운다.

## 보완 요구사항

- 완료 체크 해제 시 해당 세트의 완료 시각도 제거한다.
- 완료된 세트를 삭제하면 그 세트의 완료 시각은 duration 계산에서 빠진다.
- 삭제 실행 취소, 세트 이동, 이전 세트 복사, 드래그 이동은 timestamp를 보존하되 새로 복사한 미완료 세트에는 timestamp가 남지 않게 한다.
- kg/reps 수정으로 기존 로직이 세트를 미완료로 되돌리는 경우 `completedAt`도 함께 제거해 미완료 세트가 duration에 섞이지 않게 한다.
- 여러 회차가 있는 날은 각 회차의 duration을 먼저 계산하고 top-level `workoutDuration`은 회차 합산으로 유지한다.
- timestamp가 없는 과거 기록은 기존 `workoutDuration`을 fallback으로 사용한다.
- 비정상 timestamp나 과도하게 긴 span은 방어적으로 무시하거나 기존 값으로 fallback한다.
- running/crossfit/swimming/stretching의 수동 duration 입력은 기존 방식 유지한다.

## 실행 Slice 1 — Set completion timeline timer

### 구현 계획

1. 순수 계산 모듈을 추가한다.
   - 예: `workout/timeline.js`
   - `completedAt` 정규화, 완료 세트 timestamp 수집, `firstSetCompletedAt`, `lastSetCompletedAt`, `durationSec`, `checkedSetCount` 계산을 담당한다.
2. `workout/state.js`에 세트 완료 timeline 메타 저장 공간을 추가한다.
   - 예: `workoutTimeline: null`
3. `workout/exercises.js`의 세트 완료/해제 경로를 갱신한다.
   - `wtToggleSetDone()`에서 미완료 -> 완료 시 `set.completedAt = Date.now()`.
   - 완료 -> 미완료 시 `completedAt` 제거.
   - kg/reps 수정으로 `done = false`가 되는 경로에서도 `completedAt` 제거.
   - 이전 세트 복사/새 세트 생성은 timestamp가 없는 미완료 세트로 생성한다.
4. `workout/timers.js`의 표시/완료 계산을 timeline 기반으로 바꾼다.
   - `_renderWorkoutTimer()`는 live stopwatch elapsed가 아니라 현재 세트 timeline duration을 표시한다.
   - `wtFinishWorkout()`은 `_finalWorkoutDurationSec()` 대신 timeline 계산 결과를 `S.workout.workoutDuration`에 반영한다.
   - `wtStartWorkoutTimer()` 자동 시작은 더 이상 duration의 기준이 되지 않게 축소하거나 no-op에 가깝게 만든다.
   - rest timer는 계속 세트 완료 후 시작되므로 유지한다.
5. `workout/save.js`에서 저장 직전 clean exercise 기준으로 timeline을 계산한다.
   - `payload.workoutDuration`은 timeline duration을 우선 사용한다.
   - `payload.workoutTimeline`에 계산 근거를 저장한다.
6. `workout/load.js`, `workout/sessions.js`, `workout/save-schema.js`를 갱신한다.
   - `workoutTimeline`을 로드/세션/저장 payload 허용 키에 포함한다.
   - 세션 aggregate는 회차별 `workoutDuration`을 합산하고, 필요 시 aggregate `workoutTimeline`은 합산/요약 형태로 둔다.
7. `render-calendar.js`는 기존 `workoutDuration`을 계속 읽되, timestamp가 있고 `workoutDuration`이 비어 있으면 timeline fallback을 쓸 수 있게 한다.
8. `sw.js` `STATIC_ASSETS`에 새 모듈을 추가하고 `CACHE_VERSION`을 bump한다.
9. 테스트를 추가/갱신한다.

### 제외

- 러닝/크로스핏/수영/스트레칭 수동 duration 계산 방식 변경
- 캘린더 UI redesign
- Firestore 데이터 마이그레이션 일괄 작업
- 과거 기록의 timestamp 임의 생성

### 검증 계획

- `node --check workout/timeline.js workout/exercises.js workout/timers.js workout/save.js workout/load.js workout/sessions.js workout/state.js render-calendar.js sw.js`
- `node --test tests/workout-timeline.test.js tests/workout-active-session-recovery.test.js tests/workout-sessions.test.js tests/workout-timer-summary-only.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL에서 인증 계정으로 `운동 탭 -> 세트 체크 여러 개 -> 총 운동시간이 첫 체크~마지막 체크 간격으로 표시/저장 -> 월간 캘린더 시간 반영` 확인

## 실행 결과

- `workout/timeline.js`를 추가해 세트 완료 timestamp 정규화, 수집, 첫 완료 시각~마지막 완료 시각 duration 계산, 비정상 긴 span fallback을 분리했다.
- 세트 완료 체크 시 `completedAt`을 찍고, 체크 해제 또는 kg/reps 수정으로 미완료가 되면 `completedAt`을 제거하도록 했다.
- 근력 운동 타이머는 live stopwatch elapsed 대신 세트 완료 timeline duration을 렌더링하고 저장한다.
- 저장 payload, 세션 집계, active draft, 로드, 캘린더 월간 집계, life-zone 활동 판정을 `workoutTimeline`과 호환되는 방식으로 갱신했다.
- 과거 기록처럼 timestamp가 없는 데이터는 기존 `workoutDuration`을 fallback으로 표시한다.
- `sw.js` `STATIC_ASSETS`에 `./workout/timeline.js`를 추가하고 `CACHE_VERSION`을 `tomatofarm-v20260626z8-set-completion-timeline`로 bump했다.

## 로컬 검증

- PASS: `node --check workout/timeline.js; node --check workout/exercises.js; node --check workout/timers.js; node --check workout/save.js; node --check workout/load.js; node --check workout/sessions.js; node --check workout/state.js; node --check render-calendar.js; node --check data/data-load.js; node --check data/data-pure.js; node --check home/life-zone-state.js; node --check sw.js`
- PASS: `node --test .\tests\*.test.js` - 545 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=835`
- PASS: `git diff --check`
- PASS: `git diff --cached --check`

## 다음 세션 시작 지침

`docs/ai/NEXT_ACTION.md`가 `ready_for_review`이면 이 문서의 `실행 Slice 1 — Set completion timeline timer` 변경분을 리뷰하고, 문제가 없으면 Dashboard3 Pages 배포 검증으로 넘긴다.
