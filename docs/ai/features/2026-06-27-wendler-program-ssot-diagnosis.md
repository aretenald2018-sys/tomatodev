# 웬들러 프로그램 SSOT 진단

## 요청

- `스모데드`, `스쿼트(와이드)`는 이번 주차에 새로 설정한 값이 아니라 예전에 설정한 웬들러 값이 남아 있는 것 같다.
- 프로그램 설정의 SSOT가 흔들리는 느낌이 있으므로, 실제 데이터와 코드 흐름을 확인하고 어떻게 정리할지 제안한다.

## 확인한 실제 데이터

읽기 전용으로 Firestore `users/김_태우`를 확인했다.

- 현재 `settings/test_board_v2`는 존재한다.
- 현재 board에는 하체 active cycle이 1개만 있다.
  - `groupId: lower`
  - `startDate: 2026-06-22`
  - `weeks: 6`
  - `status: active`
- 현재 board benchmark는 2개다.
  - `스모데드`
    - `exerciseId: custom_1778990759855`
    - `program: wendler`
    - `tmKg: 107.5`
    - `scheme: w863`
    - `startWeek: 1`
    - `incrementKg: 5`
    - `supplemental: BBB 50%, 5x10`
  - `스쿼트(와이드)`
    - `exerciseId: lower_1`
    - `movementId: squat_machine`
    - `program: wendler`
    - `tmKg: 107.5`
    - `scheme: w863`
    - `startWeek: 1`
    - `incrementKg: 10`
    - `supplemental: BBB 50%, 5x10`
- 운동기록에는 이전 웬들러 흔적이 있다.
  - `2026-06-21` `스모데드`
    - `boardV2WeekStart: 2026-06-15`
    - `cycleWeek: 1`
    - `tm: 102.5`
    - 톱세트 `72.5kg x 8+`, BBB `52.5kg 5x10`
    - 세트의 `wendlerRole`이 모두 남아 있고 `done: true`
  - `2026-06-26` `스모데드`
    - 현재 board 기준 `boardV2WeekStart: 2026-06-22`
    - `cycleWeek: 1`
    - `tm: 107.5`
    - 톱세트 `75kg x 8+`, BBB `55kg 5x10`
    - 세트는 `done: false`
  - `스쿼트(와이드)`의 6월 중순 이전 기록은 현재 확인 범위에서는 웬들러가 아니라 기존 `max_cycle_20260504`의 볼륨/강도 benchmark 기록이다.

## 코드 진단

현재 코드상 프로그램 설정의 명목상 SSOT는 `settings/test_board_v2`다.

문제는 `programStartDate`가 종목별 값이 아니라 하체 그룹 active cycle 값으로 취급된다는 점이다.

- `workout/test-v2/board-core.js`
  - `_activeCycleForProgram()`은 `config.programStartDate`가 있으면 기존 active cycle의 `cycle.startDate`를 직접 변경한다.
  - `getExerciseProgramSettings()`는 편집 UI의 `programStartDate`를 `cycle.startDate`에서 읽는다.
  - `_programPlanForBenchmark()`는 웬들러 주차를 `activeCycleOf(board, bm.groupId)` 기준으로 계산한다.
- 결과적으로 종목 수정 시트에서 한 종목의 시작 주를 바꾸는 행동이 하체 그룹 전체 cycle 시작 주를 바꾸는 효과를 낸다.
- 운동기록 entry의 `recommendationMeta.boardV2WeekStart`와 `wendlerSignature`는 과거 처방의 증거이지만, 현재 처방의 live SSOT는 아니다.

## 판단

사용자가 느낀 SSOT 흔들림은 실제로 타당하다.

- 현재 live SSOT는 `test_board_v2` 하나로 보이지만, 그 안에서 `cycle.startDate`가 그룹 단위라 종목별 프로그램 시작 주처럼 사용하면 의미가 흔들린다.
- `스모데드`는 `2026-06-15` 시작 웬들러 기록이 있고, 현재 board는 `2026-06-22` 시작으로 리셋되어 같은 1주차가 다시 나온 상태다.
- `스쿼트(와이드)`는 현재 board에는 웬들러로 저장되어 있지만, 확인된 과거 수행 기록은 웬들러가 아니라 기존 Max benchmark 계열이다. 이 종목은 "과거 웬들러 수행"보다 "현재 board에 웬들러 설정이 들어간 상태"로 보는 편이 맞다.

## 제안

### 권장안 A: 종목별 프로그램 시작 주를 benchmark에 분리

장기적으로 가장 안전한 정리다.

- `benchmarks[].programStartDate` 또는 `benchmarks[].wendler.programStartDate`를 추가한다.
- 웬들러 처방 주차는 `bm.programStartDate || cycle.startDate`로 계산한다.
- 종목 수정 시트에서 시작 주를 저장할 때 active group cycle을 직접 바꾸지 않는다.
- `cycle.startDate`는 성장보드 그룹 레이아웃/정산용으로만 유지한다.
- 과거 workout entry는 live SSOT가 아니라, 누락된 `programStartDate`를 추정할 때만 참고한다.

데이터 보정:

- `스모데드`는 사용자가 이어가기를 원하면 `programStartDate: 2026-06-15`, `tmKg: 102.5 또는 107.5` 중 하나를 명시 선택한다.
- `스쿼트(와이드)`는 과거 웬들러 수행 증거가 아직 없으므로 기본은 현재 `2026-06-22` 시작 유지가 안전하다.

### 선택지 B: 데이터만 즉시 보정

코드 변경 없이 `settings/test_board_v2.cycles[lower].startDate`를 `2026-06-15`로 되돌린다.

- 장점: 빠르다.
- 단점: 하체 그룹 전체가 함께 움직여 `스쿼트(와이드)`도 같이 2주차가 된다. 종목별 SSOT 문제는 그대로 남는다.

### 선택지 C: 현재 상태 유지

현재 board를 그대로 `2026-06-22` 시작 1주차로 본다.

- 장점: 추가 변경이 없다.
- 단점: `2026-06-21` 스모데드 웬들러 수행과 현재 처방 흐름이 끊겨 보인다.

## 권장 다음 단계

사용자 결정:

- `2026-06-27`: 사용자 승인. 권장안 A로 진행한다.
- 추가 요구: 과거에 설정한 TM 값을 나중에 그 과거 시점으로 다시 수정해도, 향후 계획이 꼬이지 않게 설계한다.

## 그릴 결과

핵심 질문:

- 과거 주차의 TM을 나중에 바꾸면 미래 처방도 모두 재계산되어야 하는가, 아니면 이미 더 나중에 확정된 TM/정산은 보존되어야 하는가?

결정:

- 과거 TM 수정은 해당 주차의 기준점(anchor)을 추가/갱신하는 것으로 처리한다.
- 더 나중에 존재하는 TM anchor 또는 정산으로 생성된 anchor는 보존한다.
- 따라서 `2026-06-15` TM을 나중에 다시 수정해도, `2026-06-22` 이후에 이미 별도 anchor가 있으면 미래 처방은 그 더 늦은 anchor를 따른다.

남은 가정:

- 사용자가 명시적으로 "미래까지 재계산"을 선택하는 cascade UX는 이번 실행 범위에서 제외한다.
- 기존 단일 `wendler.tmKg`는 하위 호환용 current/latest 값으로 유지하되, 실제 주차 처방 계산의 SSOT는 `tmAnchors`가 된다.
- 실제 운영 데이터 보정은 코드가 배포된 뒤 읽기 검증을 거쳐 별도 실행한다. 이번 첫 실행 슬라이스에서는 자동/수동 데이터 write를 하지 않는다.

## 승인된 설계

### 1. 프로그램 시작 주 SSOT 분리

현재 문제:

- `programStartDate`가 종목별 설정처럼 보이지만 실제로는 `activeCycleOf(board, groupId).startDate`를 변경한다.
- 한 하체 종목의 시작 주 저장이 같은 하체 그룹의 다른 종목 주차까지 바꾼다.

변경 방향:

- `benchmarks[].programStartDate`를 종목별 프로그램 시작 주 SSOT로 추가한다.
- `benchmarks[].wendler.programStartDate`는 하위 호환/편집 UI 보조값으로만 허용하고, 정규화 후 `benchmarks[].programStartDate`에 복사한다.
- `_activeCycleForProgram()`은 새 program 설정 저장 시 기존 active cycle의 `startDate`를 바꾸지 않는다.
- `cycle.startDate`는 성장보드 그룹 레이아웃/정산 범위용으로 유지한다.
- `getExerciseProgramSettings()`는 `programStartDate`를 `bm.programStartDate || bm.wendler?.programStartDate || cycle.startDate` 순서로 반환한다.

### 2. TM anchor timeline

새 저장 모델:

```js
benchmark.wendler = {
  tmKg: 107.5,              // 하위 호환/current 표시용
  incrementKg: 5,
  scheme: 'w863',
  startWeek: 1,
  tmAnchors: [
    {
      weekStart: '2026-06-15',
      tmKg: 102.5,
      source: 'manual',
      updatedAt: 1782000000000
    },
    {
      weekStart: '2026-06-22',
      tmKg: 107.5,
      source: 'manual',
      updatedAt: 1782437770628
    }
  ]
}
```

계산 규칙:

- 처방 대상 주차 `weekStart`보다 같거나 이른 anchor 중 가장 최신 anchor를 선택한다.
- 더 늦은 anchor는 과거 수정의 영향을 받지 않는다.
- anchor가 하나도 없는 기존 데이터는 `programStartDate || cycle.startDate`에 `wendler.tmKg`를 가진 implicit anchor를 만든 것처럼 계산한다.
- `recommendationMeta`에는 디버깅 가능하도록 다음 값을 남긴다.
  - `programStartDate`
  - `programWeek`
  - `cycleWeek`
  - `wendlerTmKg`
  - `wendlerTmAnchorWeekStart`
  - 기존 `boardV2WeekStart`

### 3. 과거 TM 재설정 안전성

예시:

- `스모데드`
  - `2026-06-15` anchor: `102.5kg`
  - `2026-06-22` anchor: `107.5kg`
- 나중에 `2026-06-15` anchor를 `100kg`으로 고쳐도:
  - `2026-06-15` 주차 처방은 `100kg` 기준으로 바뀐다.
  - `2026-06-22` 이후 처방은 `2026-06-22` anchor `107.5kg` 기준을 유지한다.
- 사용자가 미래까지 재계산하고 싶다면 별도 cascade 옵션이 필요하지만, 이번 범위에서는 제공하지 않는다.

### 4. 정산과 미래 계획

- `applySettle()`에서 Wendler 성장 시 단순히 `bm.wendler.tmKg`만 바꾸지 않고, 다음 cycle 시작 주에 새 `tmAnchors[]` anchor를 추가한다.
- `projectFutureCells()`는 실제 저장된 anchor 이후의 가상 미래만 `incrementKg`로 투영한다.
- 이미 저장된 미래 anchor가 있으면 projection은 그 anchor를 기준으로 끊어 계산한다.

### 5. 기존 데이터 마이그레이션

첫 코드 실행 슬라이스에서는 무손실 lazy migration만 한다.

- 저장/편집 시 `bm.programStartDate`가 없으면 기존 `cycle.startDate`에서 보강한다.
- `wendler.tmAnchors`가 없으면 `programStartDate`와 `wendler.tmKg`로 implicit anchor를 만든다.
- 운영 Firestore 데이터 직접 보정은 코드 배포 후 별도 세션에서 한다.

운영 보정 후보:

- `스모데드`
  - `programStartDate: 2026-06-15`
  - `tmAnchors`
    - `2026-06-15: 102.5`
    - `2026-06-22: 107.5`
- `스쿼트(와이드)`
  - 현재 확인된 과거 웬들러 수행 증거는 없으므로 `programStartDate: 2026-06-22`
  - `tmAnchors`
    - `2026-06-22: 107.5`

## 실행 슬라이스

### Slice 1: board-core SSOT 모델과 회귀 테스트

목표:

- `workout/test-v2/board-core.js`에서 종목별 `programStartDate`와 Wendler `tmAnchors`를 실제 처방 계산 SSOT로 만든다.

대상 파일:

- `workout/test-v2/board-core.js`
- `tests/test-v2.board-core.test.js`
- `sw.js`
- cache-version 참조 테스트들

구현:

- `programStartDate` 정규화 helper를 추가한다.
- `tmAnchors` 정규화/upsert/resolve helper를 추가한다.
- `_activeCycleForProgram()`이 종목 프로그램 저장만으로 group active cycle을 변경하지 않게 한다.
- `_programPlanForBenchmark()`가 `bm.programStartDate`와 resolved TM anchor 기준으로 `programWeek`, `cycleWeek`, 처방 kg를 계산하게 한다.
- `applySettle()`이 Wendler 성장 시 다음 cycle 시작 주에 TM anchor를 추가하게 한다.
- `projectFutureCells()`가 anchor timeline을 고려해 projection을 만든다.
- 기존 `programStartDate` 테스트를 "cycle은 유지되고 benchmark만 바뀐다" 계약으로 수정한다.
- 과거 anchor 수정이 더 늦은 anchor 이후 미래 처방을 바꾸지 않는 테스트를 추가한다.

범위 밖:

- 종목 수정 UI 문구/레이아웃 변경.
- 운영 Firestore 데이터 write.
- cascade 재계산 UX.

검증:

- `node --check workout/test-v2/board-core.js sw.js`
- `node --test tests/test-v2.board-core.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

실행 결과:

- `2026-06-27`: 완료.
- `workout/test-v2/board-core.js`에서 `benchmarks[].programStartDate`와 `wendler.tmAnchors[]`를 처방 계산 SSOT로 연결했다.
- `_activeCycleForProgram()`은 종목 프로그램 저장만으로 group active cycle 시작일을 변경하지 않는다.
- Wendler 처방 metadata에 `programWeek`, `programStartDate`, `tmAnchorWeekStart`, `tmKg`, `groupCycleWeek`를 남긴다.
- `applySettle()`은 다음 cycle 시작 주에 TM anchor를 추가한다.
- `tests/test-v2.board-core.test.js`에 "cycle 유지 + benchmark 시작일 저장"과 "과거 TM anchor 수정이 더 늦은 anchor 이후 처방을 바꾸지 않음" 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z1-wendler-ssot-anchors`로 bump했다.
- 리뷰: `docs/ai/reviews/2026-06-27-wendler-ssot-slice1-review.md`
- PASS: `node --check workout/test-v2/board-core.js sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js`
- PASS: `node --test .\tests\*.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ b0336a8`
  - 결과: `[deploy-verify] ok b0336a8d3c2e tomatofarm-v20260627z2-workout-sheet-header-toggle static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260627z2-workout-sheet-header-toggle" "workout/test-v2/board-core.js::tmAnchors" "workout/test-v2/board-core.js::programStartDate"`
- not verified yet: 인증 계정 실제 UI flow는 아직 직접 확인하지 못했다.

### Slice 2: 종목 수정 UI/캘린더 레일 연동

목표:

- 종목 수정 시트와 캘린더 cycle rail이 새 SSOT를 읽고 표시하게 한다.

대상 파일:

- `workout/exercises.js`
- `render-calendar.js`
- `tests/exercise-program-editor.test.js`
- `tests/workout-test-mode-unified.test.js`
- `sw.js`
- cache-version 참조 테스트들

구현:

- 편집 UI 저장값이 `bm.programStartDate`와 `tmAnchors`로 들어가게 한다.
- `buildExerciseProgramWorkoutPrescription()` metadata가 UI 카드에 주차/anchor 디버그 정보를 안정적으로 남기게 한다.
- 캘린더 rail의 Wendler 주차/제목은 group cycle week가 아니라 종목별 program week/cycle week를 표시한다.
- UI에서는 우선 기존 단일 TM 입력을 유지하되, 저장 시 선택된 시작 주 anchor로 upsert한다.

범위 밖:

- 복수 anchor 관리 UI.
- cascade 옵션.
- 운영 데이터 write.

검증:

- `node --check workout/exercises.js render-calendar.js sw.js`
- `node --test tests/exercise-program-editor.test.js tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: `운동 탭 -> + -> 스모데드/스쿼트(와이드) 종목 수정 -> 웬들러 시작 주/TM 저장 -> 종목 추가`에서 각 종목의 처방 주차가 독립적으로 보인다.

실행 결과:

- `2026-06-27`: 완료.
- `render-calendar.js`의 cycle rail Wendler 표시가 group cycle week 대신 `buildExerciseProgramWorkoutPrescription()`의 `plan.cycleWeek`/`plan.programWeek`를 사용한다.
- Wendler rail chip은 `Wn` 주차를 보이는 라벨에 포함하고, title/aria label에는 종목별 program week를 함께 남긴다.
- 종목 수정 UI의 단일 TM 입력은 기존 흐름을 유지하며, 저장 시 `upsertExerciseProgramBenchmark()`가 선택된 `programStartDate` anchor로 upsert하는 계약을 `tests/test-v2.board-core.test.js`와 `tests/exercise-program-editor.test.js`로 고정했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z3-wendler-ui-rail`로 bump했다.
- 리뷰: `docs/ai/reviews/2026-06-27-wendler-ssot-slice2-review.md`
- PASS: `node --check render-calendar.js sw.js workout/exercises.js workout/test-v2/board-core.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/exercise-program-editor.test.js tests/test-v2.board-core.test.js`
- PASS: `node --test tests/*.test.js` — 550 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 18f2a05`
  - 결과: `[deploy-verify] ok 18f2a057dda2 tomatofarm-v20260627z3-wendler-ui-rail static=219`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ 'sw.js::tomatofarm-v20260627z3-wendler-ui-rail' 'render-calendar.js::programWeekText' 'render-calendar.js::W${_fmtNum(displayWeek, 0)}' 'workout/test-v2/board-core.js::tmAnchors'`
- not verified yet: 인증 계정 실제 UI flow는 직접 조작하지 못했다.

### Slice 3: 운영 데이터 보정과 배포 검증

목표:

- 배포된 새 모델 위에서 `김_태우` 운영 `test_board_v2`의 스모데드/스쿼트(와이드) anchor를 명시적으로 보정한다.

대상:

- Firestore `users/김_태우/settings/test_board_v2`
- 필요 시 보정 스크립트 문서화 또는 일회성 read-after-write 검증 스크립트

구현:

- 기존 board 전체를 읽고, 운동/식단 다른 설정을 건드리지 않는 patch 전략을 쓴다.
- `스모데드` anchor를 `2026-06-15`, `2026-06-22`로 분리한다.
- `스쿼트(와이드)`는 `2026-06-22` anchor로 명시한다.
- read-after-write로 benchmark/programStartDate/tmAnchors만 검증한다.

범위 밖:

- 과거 workout entry 재작성.
- 수행 완료 세트의 `wendlerSignature` 소급 수정.

검증:

- Firestore read-after-write: `settings/test_board_v2`의 두 benchmark가 기대 `programStartDate`/`tmAnchors`를 가진다.
- Dashboard3 Pages에서 해당 종목을 추가했을 때 새 처방 metadata가 기대 주차와 TM anchor를 반환한다.
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 지시

다음 세션은 Slice 1만 실행한다.

앱 코드 수정 범위는 `workout/test-v2/board-core.js`, `tests/test-v2.board-core.test.js`, `sw.js`, cache-version 참조 테스트로 제한한다. UI 파일과 운영 Firestore 데이터는 건드리지 않는다.

## 검증 계획

전체 계획 완료 전 최종 검증:

- `node --check workout/test-v2/board-core.js workout/exercises.js sw.js`
- `node --test tests/test-v2.board-core.test.js tests/exercise-program-editor.test.js tests/workout-test-mode-unified.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: `운동 탭 -> + -> 스모데드/스쿼트(와이드) 종목 수정 -> 웬들러 시작 주 확인 -> 종목 추가`에서 각 종목별 주차와 세트 처방이 의도한 시작 주 기준으로 표시된다.
