# 종목 수정 프로그램 설정과 성장보드 웬들러 마이그레이션

## 요청

- 운동 picker 목록 우측의 최근 운동정보 chip(`최근/볼륨 ...kg x ...회`)을 미표출한다.
- picker의 연필 버튼으로 여는 `종목 수정` 시트에서 사용자가 특정 운동의 진행 프로그램을 설정할 수 있게 한다.
- 프로그램 선택지는 최소 `웬들러`, `강도 트랙`, `볼륨 트랙`, `사용자 지정`을 고려한다.
- 웬들러는 성장보드 v2에서 개발한 모듈을 재사용하고, 시작 시기, TM, 8/6/3 또는 5/3/1, BBB 설정 등을 조정할 수 있어야 한다.
- 성장보드모드를 본격적으로 일반 운동 선택/수정 UX로 마이그레이션하되, 코드 구조와 UX에서 유지/폐기할 지점은 사용자 확인 후 구현한다.

## 코드 탐색 결과

- picker 목록/종목 수정은 `workout/exercises.js`가 담당한다.
  - 목록 row는 `_renderPickerList()`에서 만들고, 우측 최근 운동정보 chip은 Max benchmark picker 경로의 `_renderMaxBenchmarkPickerMeta()` 출력이다.
  - 종목 수정 시트는 `modals/ex-editor-modal.js`의 기본 폼을 `wtOpenExerciseEditor()`가 동적으로 보강한다.
  - 저장은 `saveExercise(record)` 경유로 Firestore `users/{uid}/exercises`에 전체 종목 레코드를 저장한다.
- 운동종목 카탈로그 SSOT는 `users/{uid}/exercises`다. `docs/adr/2026-05-15-exercise-ssot.md`에 따르면 운동 기록과 성장판 계획은 별도 도메인이다.
- 성장보드 v2는 `_settings.test_board_v2`를 canonical store로 사용한다.
  - 저장 API: `data.js`의 `getTestBoardV2()` / `saveTestBoardV2()`.
  - 보드 벤치마크 모델: `benchmark.program: 'stair' | 'wendler'`, `tracks: ['volume'|'intensity']`, `wendler: {...}`.
  - 웬들러 엔진: `workout/test-v2/wendler.js`.
  - 이미 지원하는 설정: `scheme`(`w531`, `w863`, `custom`), `tmKg`, `incrementKg`, `roundKg`, `startWeek`, `cycleNo`, `warmup`, `supplemental`(`none`, `bbb`, `fsl`).
  - 오늘 운동 카드 생성은 `workout/test-v2/board-render.js`의 `_upsertWorkoutEntryForBenchmark()`가 `maxPrescription`, `recommendationMeta.boardV2BenchmarkId`, `wendlerSignature`, `wendlerRole/wendlerPct` 세트를 만든다.
- 서비스워커 주의:
  - `workout/exercises.js`, `style.css`, `modals/ex-picker-modal.js`, `workout/test-v2/*.js`는 `sw.js` `STATIC_ASSETS`에 포함되어 있어 수정 시 `CACHE_VERSION` bump가 필요하다.

## 그릴 결과

- 질문 1: 종목 수정에서 저장하는 프로그램 설정의 canonical store를 어디로 둘지가 핵심이다.
- 추천 결정: 활성 프로그램 상태는 성장보드 v2 `test_board_v2.benchmarks`를 canonical로 두고, `종목 수정` 시트는 해당 벤치마크 설정을 읽고 수정하는 진입점으로 쓴다.
- 근거: 웬들러의 시작 주차, 현재 사이클, 색칠 로그, 정산, TM 증량은 정적인 운동종목 속성이 아니라 6주 프로그램 상태다. 이를 `exercises` 레코드에 저장하면 `test_board_v2`와 상태가 갈라진다.
- 사용자 결정: 세부 구현은 Codex가 판단하되, `test_board_v2` 기준으로 진행한다.
- 사용자 보류 결정: 성장보드의 기존 색칠 방식은 현재 구조와 맞지 않는 부분이 있으므로 자동 색칠/미달 반영 통합은 이번 구현에서 제외하고 향후 별도 결정한다.

## 사용자 확인 질문

### 질문 1: 프로그램 설정의 기준 저장소

권장안 A: `test_board_v2`가 기준이다.

- `종목 수정`에서 웬들러/트랙을 바꾸면 성장보드의 해당 벤치마크가 생성 또는 갱신된다.
- 오늘 운동 picker에서 해당 종목을 추가하면 성장보드의 이번 주 처방을 불러온다.
- 6주 정산, 색칠 로그, 시작 주차, TM 증량은 성장보드와 하나의 상태로 유지된다.

대안 B: `exercises` 종목 레코드가 기준이다.

- `종목 수정`은 운동종목 자체에 기본 프로그램 설정을 저장한다.
- 성장보드는 이 기본값을 가져와 별도 보드 상태를 만든다.
- 구현은 직관적이지만 웬들러의 현재 주차/정산/로그가 운동종목 기본값과 성장보드 상태로 나뉘어 동기화 규칙이 필요하다.

대안 C: 둘 다 둔다.

- `exercises`에는 기본값, `test_board_v2`에는 활성 실행 상태를 둔다.
- 장기적으로 유연하지만 이번 마이그레이션 범위가 가장 커진다.

## 실행 슬라이스

### Slice 1: picker row 우측 최근 운동정보 chip 미표출

대상 파일:

- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/workout-empty-picker-density.test.js` 또는 신규 picker source test

구현:

- Max benchmark picker row에서 `_renderMaxBenchmarkPickerMeta()`를 우측 row side에 출력하지 않는다.
- 우측 영역은 연필/삭제 액션만 남기고, row grid 폭을 줄여 이름과 `총 n번, n일 전` 메타가 더 넓게 보이게 한다.
- 필요하면 `_renderMaxBenchmarkPickerMeta()` 함수는 다른 경로가 쓸 수 있으므로 삭제하지 않고 호출만 제거한다.
- `workout/exercises.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

범위 밖:

- 프로그램 설정 UI 추가.
- 운동 저장 스키마 변경.
- 성장보드 데이터 변경.

검증:

- `node --check workout/exercises.js; node --check sw.js`
- picker source test로 `ex-picker-row-side` 안에 `_renderMaxBenchmarkPickerMeta(ex)`가 다시 들어오지 않는지 확인한다.
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: 로그인 후 `운동 탭 -> + -> 하체 -> 목록`에서 우측 최근/볼륨 chip이 없고 연필/삭제만 보인다.

실행 결과:

- 2026-06-25: Slice 1 구현 완료.
- `workout/exercises.js`의 Max benchmark picker row에서 `_renderMaxBenchmarkPickerMeta(ex)` 호출을 제거했다.
- `style.css`에서 picker row 우측 액션 열을 84px에서 74px로 줄이고 세로 가운데 정렬했다.
- `tests/workout-empty-picker-density.test.js`에 Max picker row branch에서 benchmark meta chip이 다시 렌더되지 않는 source-level 검증을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z60-picker-meta-chip-hide`로 bump하고 관련 cache-version 테스트를 갱신했다.
- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-empty-picker-density.test.js tests/workout-test-mode-unified.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a0b5dc305e69bba23229e803aaf2b2fa9e5d0e3c`
- not verified yet: 인증 계정으로 `운동 탭 -> + -> 하체 -> 목록`에서 chip 미표출을 수동 확인해야 한다.

### Slice 2: 프로그램 설정 데이터 계약 확정

전제:

- 질문 1 답변 후 실행한다.

권장 구현(A 기준):

- `workout/test-v2/board-core.js`에 종목 카탈로그 항목과 보드 벤치마크를 연결/생성/갱신하는 순수 helper를 추가한다.
- 같은 `exerciseId`가 있으면 기존 벤치마크를 갱신하고, 없으면 해당 `muscleId/groupId`의 활성 사이클에 벤치마크를 만든다.
- `stair` 프로그램은 `volume`, `intensity`, 둘 다를 지원한다.
- `wendler` 프로그램은 기존 `normalizeWendlerConfig()`를 사용한다.
- `custom`은 질문 2에서 확정 전까지 저장 모델만 예약하고 UI에는 노출하지 않는다.

범위 밖:

- 종목 수정 시트 UI 전체 구현.
- 오늘 운동 picker에서 처방 자동 적용.

검증:

- `node --check workout/test-v2/board-core.js`
- `node --test tests/test-v2.board-core.test.js`
- 신규 테스트: exerciseId 기준 upsert, 기존 웬들러 보존, stair 전환 시 wendlerLog 처리 정책.

실행 결과:

- 2026-06-25: Slice 2 구현 완료.
- `workout/test-v2/board-core.js`에 `test_board_v2`용 종목 프로그램 helper를 추가했다.
  - `findExerciseProgramBenchmark()`
  - `getExerciseProgramSettings()`
  - `upsertExerciseProgramBenchmark()`
  - `createEmptyBoardV2()`
- `exerciseId` 우선 매칭, `movementId` 폴백, `none` 선택 시 archive, `custom`은 예약 상태로 skip하는 계약을 확정했다.
- `wendler` 전환은 기존 성장보드 컬럼 시트와 같은 정책으로 활성 stair step을 제거하고 `wendlerLog`는 보존한다.
- `stair` 복귀는 활성 cycle step을 재생성하고 dormant `wendlerLog`를 보존한다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z61-exercise-program-contract`로 bump하고 관련 cache-version 테스트를 갱신했다.
- PASS: `node --check workout/test-v2/board-core.js; node --check sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

### Slice 3: 종목 수정 시트에 프로그램 섹션 추가

대상 파일:

- `modals/ex-editor-modal.js`
- `workout/exercises.js`
- `workout/test-v2/wendler.js`
- `workout/test-v2/board-core.js`
- `style.css`
- `sw.js`

구현:

- 기존 `종목 수정` 시트 아래에 `프로그램` 섹션을 추가한다.
- 프로그램 선택:
  - `기본`
  - `볼륨 트랙`
  - `강도 트랙`
  - `볼륨+강도`
  - `웬들러`
  - `사용자 지정`은 질문 2 결정 전에는 비활성 또는 숨김 처리한다.
- 웬들러 선택 시 기존 성장보드 컬럼 시트의 설정 UI를 축소 재사용한다.
  - `scheme`: `8/6/3`, `5/3/1`, `custom`
  - `tmKg`, `startWeek`, `cycleNo`, `incrementKg`, `roundKg`
  - `supplemental`: `BBB`, `FSL`, `없음`
  - BBB `%TM`, 세트, 반복 입력
- 저장 시 `saveExercise(record)`는 기존 종목 필드만 저장하고, 프로그램 상태는 질문 1의 결정에 맞는 별도 저장 경로로 저장한다.

범위 밖:

- 성장보드 전체 화면 재디자인.
- 과거 운동 기록 마이그레이션.
- `www/` 직접 수정.

검증:

- `node --check modals/ex-editor-modal.js workout/exercises.js workout/test-v2/board-core.js workout/test-v2/wendler.js sw.js`
- `node --test tests/test-v2.board-core.test.js`
- 신규 테스트: 종목 저장 시 기존 name/muscle/gym 필드와 프로그램 설정 저장이 서로 필드 손실 없이 동작한다.

실행 결과:

- 2026-06-25: Slice 3 구현 완료.
- `workout/exercises.js`의 `종목 수정/추가` 시트에 프로그램 섹션을 동적으로 추가했다.
- 선택지는 `기본`, `볼륨`, `강도`, `볼륨+강도`, `웬들러`이며, `사용자 지정`은 정책 미확정으로 비활성 버튼으로만 렌더한다.
- 웬들러 설정 입력은 `8/6/3`, `5/3/1`, `custom`, `TM`, `시작 주`, `사이클`, `증량`, `반올림`, `BBB/FSL/없음`, 보조 `%TM/세트/횟수`를 포함한다.
- 저장은 기존 `saveExercise(record)` 성공 검증 후 `upsertExerciseProgramBenchmark()`와 `saveTestBoardV2()`로 이어진다.
- `style.css`에 종목 수정 시트 프로그램 섹션의 compact grid 스타일과 모바일 2열 fallback을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z62-exercise-program-editor`로 bump하고 관련 cache-version 테스트를 갱신했다.
- PASS: `node --check workout/exercises.js; node --check workout/test-v2/board-core.js; node --check sw.js`
- PASS: `node --test tests/exercise-program-editor.test.js tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

### Slice 4: picker에서 프로그램 처방을 오늘 운동 카드에 적용

대상 파일:

- `workout/exercises.js`
- `workout/test-v2/board-core.js`
- `workout/test-v2/wendler.js`
- `workout/save.js`
- `sw.js`
- `tests/workout-test-mode-unified.test.js`

구현:

- picker row를 눌러 운동을 추가할 때 해당 종목에 활성 프로그램이 있으면 프로그램 처방을 조회한다.
- `웬들러`는 `wendlerWeekPrescription()` 기반으로 준비운동/메인/BBB 세트를 만든다.
- `볼륨/강도 트랙`은 성장보드 stair 처방 또는 현재 대표 무게를 `maxPrescription`으로 붙인다.
- 기존 사용자 요청대로 picker로 추가된 일반 종목 기본은 1개 빈 세트가 원칙이므로, 프로그램이 명시 설정된 종목에만 처방 세트를 자동 생성한다.
- 생성된 운동 entry에는 `recommendationMeta`에 프로그램 출처와 보드 벤치마크 id를 남긴다.

범위 밖:

- 정산 자동 실행.
- 운동 완료 시 성장보드 색칠 자동화 정책 변경.

검증:

- `node --check workout/exercises.js workout/test-v2/board-core.js workout/test-v2/wendler.js sw.js`
- `node --test tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js`
- UI flow: 웬들러 설정된 스쿼트를 picker에서 추가하면 준비운동/메인/BBB 세트가 표시된다.

실행 결과:

- 2026-06-25: Slice 4 구현 완료.
- `workout/test-v2/board-core.js`에 `buildExerciseProgramWorkoutPrescription()`과 웬들러 signature helper를 추가했다.
- `stair` 프로그램은 선택 트랙의 현재 주차 처방 세트를 만들고, 복수 트랙이면 `trackAlternatives`를 함께 생성한다.
- `wendler` 프로그램은 기존 웬들러 엔진의 주차 처방으로 준비운동/메인/BBB 또는 FSL 세트를 만든다.
- `workout/exercises.js`의 picker entry 생성 경로에서 `test_board_v2` 활성 프로그램이 있는 종목만 프로그램 처방을 적용한다.
- 기존 일반 종목은 계속 1개 빈 세트로 시작한다.
- 운동 entry에는 `maxPrescription`, `recommendationMeta.boardV2BenchmarkId`, `boardV2WeekStart`, `program`, `wendlerSignature` 등 출처 metadata를 남긴다.
- 성장보드 색칠/미달 상태 자동 반영은 구현하지 않았다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z63-program-picker-prescription`으로 bump하고 관련 cache-version 테스트를 갱신했다.
- PASS: `node --check workout/test-v2/board-core.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/exercise-program-editor.test.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/exercise-program-editor.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `node --test .\tests\*.test.js` — 527 tests passed
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 7fcac68c3bfcba6a39c108e79b22842ebb7b5f4e`
- not verified yet: 인증 계정으로 `운동 탭 -> + -> 종목 수정 -> 프로그램 저장 -> picker에서 프로그램 종목 추가` UI flow를 수동 확인해야 한다.

### Slice 5: 운동 완료와 성장보드 반영 정책 연결

상태:

- 보류. 사용자가 성장보드 색칠 통합 방식은 향후 결정한다고 명시했다.
- Slice 2-4에서도 운동 기록 entry에는 프로그램 metadata만 남기고, 성장보드 색칠/미달 상태 자동 변경은 구현하지 않는다.

구현 후보:

- 보수안: 오늘 운동 기록에는 프로그램 metadata만 저장하고, 성장보드 색칠은 기존처럼 보드에서 명시적으로 한다.
- 적극안: 프로그램 운동 entry 완료 시 해당 주차를 자동 색칠하거나 미달 기록으로 남긴다.

검증:

- 자동 반영을 선택하면 `paintWeek()`/`recordMiss()` 회귀 테스트를 추가한다.
- 보수안을 선택하면 운동 기록 저장이 성장보드 상태를 건드리지 않는지 테스트한다.

### Slice 6: 웬들러 시작 주 미니 캘린더와 TM/%TM 설명

요청:

- 종목 수정 시트의 웬들러 `시작 주`는 숫자 입력이 아니라 미니 캘린더로 선택한다.
- 선택한 날짜가 포함된 주의 월요일을 6주 사이클 시작일로 저장하고, 처방 주차 계산이 그 시작일 기준으로 돌게 한다.
- TM과 %TM을 모르는 사용자를 위해 각 라벨 아래 작은 설명 문구를 붙인다.

대상 파일:

- `workout/exercises.js`
- `workout/test-v2/board-core.js`
- `style.css`
- `sw.js`
- `tests/exercise-program-editor.test.js`
- `tests/test-v2.board-core.test.js`
- cache-version 참조 테스트들

구현:

- `종목 수정 -> 웬들러` 패널에 `시작일` 표시 버튼과 숨겨진 저장 input을 둔다.
- 버튼 클릭 시 같은 시트 안에 작은 월간 캘린더 popover를 띄우고 날짜를 선택한다.
- 저장 시 `programStartDate`를 `upsertExerciseProgramBenchmark()`에 전달한다.
- `board-core`는 전달받은 날짜를 `mondayOf()`로 정규화하고, 해당 그룹 active cycle의 `startDate`를 그 월요일, `weeks`를 6으로 맞춘다.
- 기존 웬들러 `startWeek`는 8/6/3 또는 5/3/1 scheme offset 용도로 유지하되, UI에서는 고급 숫자 입력으로 노출하지 않는다.
- TM 설명: `Training Max, 실제 1RM보다 낮게 잡는 프로그램 기준 중량`.
- %TM 설명: `TM의 몇 퍼센트로 보조 세트를 할지`.

범위 밖:

- 성장보드 색칠/미달 자동 반영.
- 과거 cycle/settled history 재작성.
- 여러 같은 그룹 종목의 cycle 분리 정책 변경.

검증:

- `node --check workout/exercises.js workout/test-v2/board-core.js sw.js`
- `node --test tests/exercise-program-editor.test.js tests/test-v2.board-core.test.js`
- source-level 테스트로 캘린더 popover, 설명 문구, `programStartDate`, active cycle startDate 정규화를 확인한다.
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`

실행 결과:

- `workout/exercises.js` 종목 수정 웬들러 패널에 시작 주 미니 캘린더 버튼과 TM/%TM 설명을 추가했다.
- 저장 시 `programStartDate`를 넘기고, `workout/test-v2/board-core.js`에서 선택 날짜의 월요일을 active cycle `startDate`로 정규화하며 `weeks=6`을 보장한다.
- 기존 `wendler.startWeek`는 숨김 input으로 유지해 scheme offset 설정을 보존했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z64-wendler-start-calendar`로 bump하고 관련 cache-version 테스트를 갱신했다.
- 리뷰 문서: `docs/ai/reviews/2026-06-25-exercise-program-settings-wendler-migration-slice6-review.md`

## 추가 질문 후보

질문 1 답변 뒤 순서대로 확인한다.

- 질문 2: `사용자 지정`은 무엇을 뜻하는가?
  - 단순 수동 세트 템플릿
  - 6주짜리 custom %/reps 진행표
  - 자동 처방 없이 라벨만 붙이는 모드
- 질문 3: picker에서 프로그램 종목을 완료하면 성장보드 칸도 자동 색칠할까?
- 질문 4: 웬들러 허용 범위는 현재 엔진처럼 `chest/back/lower/shoulder/glute` 대근육만 유지할까, 사용자가 모든 종목에 강제로 적용할 수 있게 할까?
- 질문 5: 같은 movementId가 공용/헬스장별로 여러 개 있을 때 프로그램 설정은 exerciseId 단위로 분리할까, movementId 단위로 공유할까?

## 상태

- Slice 1 실행, Dashboard3 Pages 배포 검증, 리뷰 완료.
- Slice 2 실행 완료. 리뷰 결과 이슈 없음.
- Slice 3 실행 완료. 리뷰 결과 이슈 없음.
- Slice 4 실행 완료. 리뷰 결과 이슈 없음.
- Dashboard3 Pages 배포 검증 완료.
- Slice 6 계획 추가. 다음 실행은 웬들러 시작 주 미니 캘린더와 TM/%TM 설명 UX다.
- Slice 6 실행 완료. 리뷰 결과 이슈 없음.
- Slice 5는 사용자 결정 전까지 보류한다.
- 성장보드 색칠/미달 자동 반영은 사용자 최종 결정 전까지 보류한다.
