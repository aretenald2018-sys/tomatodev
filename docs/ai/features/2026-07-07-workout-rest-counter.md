# 2026-07-07 운동 세트 간 쉬는시간 원형 카운터

## 요청

첨부 사진 상단의 초록 원형 스탑워치처럼 운동 화면에 세트 간 쉬는시간 카운터를 구현한다.

- 기본 총 쉬는시간에서 남은 시간을 원형 진행률과 `mm:ss`로 보여준다.
- 시간이 초과되면 카운터를 닫지 않고 초과 시간을 증가 방향으로 계속 카운팅한다.
- 카운터를 더블클릭하면 총 쉬는시간을 변경할 수 있다.
- 세트 간 쉬는시간 기록을 저장해 통계 `전체통계` raw export에서 추출할 수 있게 한다.

## 그릴 결과

1. 질문: 기존 휴식 타이머를 대체할지, 새 타이머 시스템을 만들지?
   - 발견: `workout/timers.js`에 이미 세트 완료 시 시작되는 휴식 타이머가 있고, `workout/exercises.js`의 `_setSetDoneState()`가 `wtRestTimerStart()`를 호출한다.
   - 결정: 새 시스템을 만들지 않고 기존 `restTimer` 흐름을 원형 카운터 UI와 저장 메타데이터로 확장한다.
2. 질문: 통계 export에서 어떻게 추출 가능하게 할지?
   - 발견: `render-stats.js`의 `buildStatsRawExport()`는 `WORKOUT_PAYLOAD_KEYS` 기반 raw workout fields를 JSON으로 내보낸다.
   - 결정: set-level 원본 필드를 보존하고, 추출 편의를 위해 top-level `restBetweenSets` 배열도 운동 payload에 포함한다.
3. 질문: 현재 `docs/ai/NEXT_ACTION.md`의 대기 작업을 이어갈지?
   - 발견: 대기 작업은 Life Zone Weight Motion으로 이번 요청과 별개다.
   - 결정: 이번 요청을 별도 ULW 세션 `.omo/ulw-loop/rest-counter-20260707/`로 분리하고, 이 계획을 새 다음 액션으로 등록한다.

## 현재 코드 맥락

- `index.html`에는 `#wt-workout-timer-bar`, `#wt-rest-section`, `#wt-rest-time`, `#wt-rest-fill`이 있다.
- `workout/timers.js`는 `S.workout.restTimer`를 사용하며 현재 기본 총 쉬는시간은 90초다.
- `workout/timers.js`의 `_formatTime(sec)`는 음수 남은 시간을 `+m:ss`로 표시한다.
- `workout/exercises.js`의 `_setSetDoneState()`는 세트 완료 시 `stampSetCompletedAt(set)` 후 `wtRestTimerStart(null, "...후 휴식")`을 호출한다.
- `workout/save.js`의 `_buildWorkoutPayload()`는 `cleanEx`를 `exercises`로 저장하고 `workoutSessions`를 `upsertWorkoutSession()`으로 만든다.
- `workout/save-schema.js`의 `WORKOUT_PAYLOAD_KEYS`에 새 top-level 운동 필드를 추가해야 raw export가 해당 필드를 포함한다.
- `render-stats.js`의 `buildStatsRawExport()`는 `daily[].raw.workout`에 `_RAW_WORKOUT_KEYS`를 넣는다.
- `index.html`, `style.css`, `workout/timers.js`, `workout/exercises.js`, `workout/save.js`, `workout/save-schema.js`, `render-stats.js`는 `sw.js` `STATIC_ASSETS` 대상이므로 수정 시 `CACHE_VERSION`을 같이 bump한다.

## 실행 Slice 1

### 목표

기존 세트 완료 흐름에 원형 쉬는시간 카운터, 더블클릭 총 쉬는시간 변경, 저장/export 가능한 세트 간 휴식 기록을 한 번에 붙인다.

### 포함 범위

1. `index.html`
   - `#wt-rest-section` 안의 휴식 표시를 초록 원형 카운터 구조로 바꾼다.
   - 카운터 더블클릭이 총 쉬는시간 변경 UI를 열도록 연결한다.
2. `style.css`
   - 사진처럼 얇은 초록 원형 progress ring, 중앙 `mm:ss`, 초과 상태 시 구분되는 시각 상태를 추가한다.
   - TDS/Seed 토큰을 우선 사용하고 임의 색/spacing을 최소화한다.
3. `workout/timers.js`
   - 남은 시간, 진행률, 초과 시간을 원형 ring CSS 변수 또는 SVG stroke로 동기화한다.
   - 더블클릭으로 기존 `wtOpenRestPresetSheet()`를 열거나 동등한 총 쉬는시간 편집 UI를 연다.
   - 현재 휴식의 origin set을 상태에 기록하고 다음 세트 완료/skip/새 타이머 시작 시 이전 휴식 기록을 finalize한다.
4. `workout/exercises.js`
   - 세트 완료 시 `wtRestTimerStart()`에 `entryIdx`, `setIdx`, planned seconds 등 저장 메타를 넘긴다.
   - 완료 취소 시 해당 세트의 휴식 메타를 정리한다.
5. `workout/save.js`, `workout/save-schema.js`
   - set-level 휴식 필드를 보존한다.
   - `restBetweenSets` top-level 배열을 빌드해 `WORKOUT_PAYLOAD_KEYS`에 포함한다.
6. `render-stats.js`
   - 기존 raw export 경로가 `restBetweenSets`를 포함하도록 보장한다. 별도 CSV 변환은 하지 않는다.
7. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260707z17-rest-counter` 계열로 bump한다.

### 데이터 계약 초안

Set-level 필드:

- `restStartedAt`: 해당 세트 완료 후 휴식 시작 epoch ms.
- `restPlannedSec`: 시작 당시 목표 휴식 초.
- `restEndedAt`: 다음 세트 완료, skip, 날짜 변경 등으로 finalize된 epoch ms.
- `restElapsedSec`: 실제 측정된 휴식 초.
- `restOverSec`: `max(0, restElapsedSec - restPlannedSec)`.
- `restEndedBy`: `next-set`, `skip`, `restart`, `cancel`, `finish` 중 하나.

Top-level export 필드:

- `restBetweenSets`: `{ exerciseId, exerciseName, entryIdx, setIdx, setNumber, plannedSec, elapsedSec, overSec, startedAt, endedAt, endedBy }[]`

### 제외 범위

- 운동 추천 로직, Max V4 plan editor, 러닝/GPS, Wear OS bridge는 건드리지 않는다.
- 통계 화면에 새 차트나 요약 UI를 추가하지 않는다. 이번 slice는 raw export 추출 가능성까지만 포함한다.
- 기존 inline handler 전면 제거 같은 리팩터링은 하지 않는다.

## 검증 계획

1. RED/GREEN: `node --test tests/workout-rest-counter.test.js`
   - RED: 원형 카운터 구조/더블클릭/rest metadata/export 계약이 없어서 실패해야 한다.
   - GREEN: 세트 완료 후 카운터가 시작되고, 시간 초과 후 `+m:ss` 또는 동등한 초과 표시가 증가하며, 더블클릭으로 총 쉬는시간 변경 UI가 열린다.
2. Data/export: `node --test tests/workout-rest-counter.test.js tests/stats-raw-export-download.test.js tests/save-schema.test.js`
   - `restBetweenSets`가 `WORKOUT_PAYLOAD_KEYS`와 raw export에 포함되는지 확인한다.
3. Syntax/static:
   - `node --check workout/timers.js workout/exercises.js workout/save.js workout/save-schema.js render-stats.js`
   - `npm.cmd run verify:assets`
   - `git diff --check`
4. Browser/visual QA:
   - 390x844 mobile harness에서 운동 화면을 열고 세트 완료 버튼을 클릭한다.
   - `#wt-rest-section`에 초록 원형 카운터와 `#wt-rest-time`이 보이고, 더블클릭 시 휴식시간 설정 sheet가 열리는 스크린샷을 `.omo/evidence/rest-counter-20260707/`에 남긴다.
5. 운영 검증:
   - 사용자-facing 검증 단계에서는 `origin/main` 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`를 실행한다.
   - 인증이 필요한 실제 UI flow를 배포 URL에서 직접 exercise하지 못하면 `not verified yet`과 blocker를 기록한다.

## ULW

- 세션: `.omo/ulw-loop/rest-counter-20260707/`
- 목표: `G001`
- 기준:
  - `C001`: 브라우저/DOM에서 원형 쉬는시간 카운터 표시.
  - `C002`: 초과 카운팅과 더블클릭 총 쉬는시간 변경.
  - `C003`: 저장 데이터와 `전체통계` raw export에서 세트 간 쉬는시간 추출.

## 다음 실행 프롬프트

`docs/ai/features/2026-07-07-workout-rest-counter.md`의 Slice 1을 실행한다. 기존 dirty worktree를 보존하고, 앱 코드 수정 전 focused RED test를 먼저 만든 뒤 GREEN 구현, cache bump, focused/static/browser QA까지 진행한다.
