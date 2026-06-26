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
- Slice 6 Dashboard3 Pages 배포 및 deployed marker 검증 완료.
- Slice 7 실행 완료. 리뷰 결과 이슈 없음.
- Slice 7 Dashboard3 Pages 배포 및 deployed marker 검증 완료.
- Slice 8 실행 완료. 리뷰 결과 이슈 없음.
- Slice 8 Dashboard3 Pages 배포 및 deployed marker 검증 완료.
- Slice 9 실행 완료. 리뷰 결과 이슈 없음.
- Slice 10 실행 완료. 리뷰 결과 이슈 없음.
- Slice 10 Dashboard3 Pages 배포 및 deployed marker 검증 완료.
- Slice 11 실행 완료. 리뷰 결과 이슈 없음.
- Slice 11 Dashboard3 Pages 배포 및 deployed marker 검증 완료.
- Slice 5는 사용자 결정 전까지 보류한다.
- 성장보드 색칠/미달 자동 반영은 사용자 최종 결정 전까지 보류한다.

### Slice 7: 웬들러 패널 컴팩트화와 TM 계산기

요청:

- 종목 수정 시트의 웬들러 설정 영역이 현재 너무 크고 넓으므로, 두 번째 참고 이미지처럼 컴팩트한 행/그룹 구조로 줄인다.
- TM 설명과 %TM 설명은 가급적 한 줄로 보이게 조정한다.
- TM은 사용자가 대표 수행 세트의 `kg`와 `반복 수`를 입력하면 자동 계산해 채울 수 있게 한다.

결정:

- TM 계산은 표준적으로 세트 수가 아니라 한 세트의 중량과 반복 수로 추정한다.
- 계산식은 기존 프로젝트 계산 모듈의 `estimate1RM()`를 사용하고, 웬들러 TM은 `추정 1RM × 0.9`를 `roundKg` 단위로 반올림한다.
- 사용자가 “몇 세트”라고 표현했지만, 웬들러 TM 산출에는 세트 수보다 대표 세트의 반복 수가 필요하므로 UI 문구는 `수행 kg`, `회수`, `TM 계산`으로 둔다.

대상 파일:

- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/exercise-program-editor.test.js`
- cache-version 참조 테스트들

구현:

- 웬들러 패널 내부에 `ex-program-compact-list` 형태의 조밀한 섹션을 추가하고, 기존 3열/4열 input 높이와 gap을 줄인다.
- TM 라벨의 설명을 한 줄 helper로 줄이고, `%TM`도 한 줄 helper로 유지한다.
- TM 입력 아래에 `수행 kg`, `회수`, `TM 계산` 컨트롤을 배치한다.
- 계산 버튼은 현재 반올림 단위(`ex-program-wendler-round`)를 읽어 `estimate1RM(kg, reps) * 0.9`를 반올림하고 TM input에 반영한다.
- 계산 결과는 작은 문구로 `추정 1RM`과 적용 TM을 표시한다.

검증:

- `node --check workout/exercises.js sw.js`
- `node --test tests/exercise-program-editor.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`

실행 결과:

- `workout/exercises.js`에서 캘린더 DOM을 `시작 주` 칸 내부가 아닌 `ex-program-calendar-row` 전체 폭 sibling으로 이동했다.
- `style.css`에서 `.ex-program-mini-cal`을 `position: static` 일반 블록으로 바꿔 좌우 날짜가 잘리지 않도록 했다.
- 웬들러 패널의 input/select/date button/calc button을 `min-height: 24px`, `font-size: 12px` 기준으로 더 줄였다.
- 캘린더 day cell과 헤더 높이도 함께 축소했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z66-wendler-calendar-density`로 bump하고 관련 cache-version 테스트를 갱신했다.
- 리뷰 문서: `docs/ai/reviews/2026-06-25-exercise-program-settings-wendler-migration-slice8-review.md`

실행 결과:

- `workout/exercises.js` 웬들러 패널을 `ex-program-compact-list` 기반의 조밀한 레이아웃으로 조정했다.
- TM 설명을 `실제 1RM보다 낮은 기준 중량`, `%TM` 설명을 `보조 세트에 쓰는 TM 비율`로 줄여 한 줄 표시를 우선했다.
- 대표 세트 `수행 kg`와 `회수`를 입력하고 `TM 계산`을 누르면 `estimate1RM(kg, reps) × 0.9`를 현재 반올림 단위로 반영해 `TM`에 채운다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z65-compact-wendler-tm`으로 bump하고 관련 cache-version 테스트를 갱신했다.
- 리뷰 문서: `docs/ai/reviews/2026-06-25-exercise-program-settings-wendler-migration-slice7-review.md`

### Slice 8: 웬들러 캘린더 배치 수정과 입력 밀도 추가 축소

요청:

- 시작 주 미니 캘린더가 좌측으로 잘려 과거 날짜가 선택되지 않고, 클릭할 수 없는 위치에 렌더링된다.
- 웬들러 패널의 나머지 숫자 입력 글자 크기와 높이를 더 줄여야 한다.

진단:

- 캘린더가 `시작 주` 칸 내부 absolute popover로 렌더되어 작은 그리드 칸 기준으로 좌우가 잘릴 수 있다.
- `.ex-program-date-btn` 기본 `min-height: 40px`가 웬들러 compact override보다 뒤에서 적용되어 시작 주 버튼이 여전히 크다.

구현:

- 캘린더 DOM을 `시작 주` 칸 안이 아니라 웬들러 compact list의 전체 폭 sibling 블록으로 이동한다.
- `.ex-program-mini-cal`을 absolute overlay가 아닌 일반 block으로 표시해 좌우 날짜와 과거 날짜를 클릭 가능하게 한다.
- 웬들러 패널의 input/select/date button/calc button 높이와 padding, font-size를 추가로 줄인다.
- 캘린더 day cell과 헤더도 같이 낮춰 모달 안에서 차지하는 높이를 줄인다.
- `sw.js` cache version과 source-level 테스트를 갱신한다.

검증:

- `node --check workout/exercises.js sw.js`
- `node --test tests/exercise-program-editor.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`

### Slice 9: picker 웬들러 처방 세트 적용 회귀 수정

요청:

- 종목 수정에서 웬들러를 기본 프로그램으로 저장한 뒤 picker에서 해당 운동을 추가하면, 현재는 1개 빈 세트 카드로 생성된다.
- UI 구조는 바꾸지 않고, 사진 2처럼 웬들러 준비운동/메인/보조 세트의 kg와 반복 횟수가 입력된 상태로 생성되어야 한다.

진단:

- Slice 4에서 웬들러 처방 세트 생성은 구현되어 있다.
- 다만 프로그램 벤치마크 조회가 `exerciseId`가 서로 다른 같은 `movementId` 종목을 놓치면 일반 1개 빈 세트 fallback으로 내려간다.
- 성장보드 후보 생성은 이미 `movementId` fallback을 사용하므로 picker 처방 조회도 같은 계약을 따라야 한다.

구현:

- `findExerciseProgramBenchmark()`의 운동 매칭을 `exerciseId` 정확 일치 우선, 그 다음 같은 `movementId` fallback 순서로 보정한다.
- 웬들러 프로그램이 설정된 같은 `movementId` 종목을 picker에서 추가할 때 `buildExerciseProgramWorkoutPrescription()`이 준비운동/메인/보조 세트를 반환하는 회귀 테스트를 추가한다.
- `workout/test-v2/board-core.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`과 cache-version 테스트를 bump한다.

범위 밖:

- UI 레이아웃 변경.
- 성장보드 색칠/미달 자동 반영.
- 같은 `movementId`의 프로그램 공유 정책을 새로 확장하는 별도 UX.

검증:

- `node --check workout/test-v2/board-core.js sw.js`
- `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: `운동 탭 -> + -> 종목 수정 -> 웬들러 저장 -> 같은 종목 추가`에서 준비운동/메인/보조 세트가 kg/반복 수 입력된 상태로 보인다.

실행 결과:

- `workout/test-v2/board-core.js`의 프로그램 벤치마크 매칭을 `exerciseId` 정확 일치 우선, 같은 `movementId` fallback 차순위로 보정했다.
- `tests/test-v2.board-core.test.js`에 다른 `exerciseId`지만 같은 `movementId`인 웬들러 종목이 준비운동 3세트, 메인 3세트, BBB 5세트를 생성하는 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z1-wendler-picker-sets`로 bump하고 cache-version 테스트 기대값을 갱신했다.
- PASS: `node --check workout/test-v2/board-core.js; node --check sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js` — 43 tests passed
- PASS: `node --test .\tests\*.test.js` — 529 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰 문서: `docs/ai/reviews/2026-06-26-exercise-program-wendler-picker-sets-review.md`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 095a7c12eab92ac6f52dbc03a6388ac980d3a2f6`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z1-wendler-picker-sets" "workout/test-v2/board-core.js::return (exerciseId && bm.exerciseId) ? 3 : 2"`
- not verified yet: 인증 계정이 없어 `운동 탭 -> + -> 종목 수정 -> 웬들러 저장 -> 같은 종목 추가` 실제 UI flow 확인은 남아 있다.

### Slice 10: 웬들러 프로그램 상태 재로딩 보존

요청:

- 한 번 웬들러로 설정한 종목은 계속 웬들러로 고정되어 저장되어야 하는데, 상태가 계속 초기화되는 것으로 보인다.

진단:

- 종목별 프로그램 설정은 `test_board_v2.benchmarks`를 canonical 저장소로 쓴다.
- `saveTestBoardV2()`는 Firestore `settings/test_board_v2`에 저장하지만, `loadAll()`이 `fbMap.test_board_v2`를 `_settings.test_board_v2`로 다시 넣지 않아 새로고침 뒤 `getTestBoardV2()`가 `null`로 돌아갈 수 있다.
- 종목 저장 직후 프로그램 저장은 `saveExercise(record)`가 반영한 정규화 레코드가 아니라 저장 전 `record`를 넘기고 있어, `movementId` 같은 연결 키가 누락될 위험이 남아 있다.

구현:

- `data/data-load.js`에서 `fbMap.test_board_v2`를 `_settings.test_board_v2`로 재수화한다.
- `wtSaveExerciseFromEditor()`에서 프로그램 저장 입력을 저장 후 검증된 종목 레코드로 바꾼다.
- `data/data-load.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`과 cache-version 테스트를 bump한다.

범위 밖:

- UI 레이아웃 변경.
- 성장보드 색칠/미달 자동 반영.
- 기존 저장 데이터의 스키마 변경.

검증:

- `node --check data/data-load.js workout/exercises.js sw.js`
- `node --test tests/exercise-program-editor.test.js tests/data.load-save.test.js tests/workout-test-mode-unified.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: `종목 수정 -> 웬들러 저장 -> 새로고침/재진입 -> 종목 수정`에서 프로그램이 웬들러로 유지되고, 같은 종목 추가 시 처방 세트가 입력된 상태로 보인다.

실행 결과:

- `data/data-load.js`에서 Firestore `settings/test_board_v2` 값을 `_settings.test_board_v2`로 재수화하도록 추가했다.
- `workout/exercises.js`에서 종목 저장 후 프로그램 저장 입력을 저장/검증된 `saved` 레코드 기준으로 바꿨다.
- `tests/exercise-program-editor.test.js`에 프로그램 보드 재수화와 저장 기준 레코드 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z2-wendler-state-reload`로 bump하고 cache-version 테스트 기대값을 갱신했다.
- PASS: `node --check data/data-load.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/exercise-program-editor.test.js tests/data.load-save.test.js tests/workout-test-mode-unified.test.js` — 37 tests passed
- PASS: `node --test .\tests\*.test.js` — 530 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰 문서: `docs/ai/reviews/2026-06-26-exercise-program-wendler-state-reload-review.md`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 36f5b53`
  - 결과: `[deploy-verify] ok 36f5b533d8ff tomatofarm-v20260626z2-wendler-state-reload static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z2-wendler-state-reload" "data/data-load.js::_settings.test_board_v2    = fbMap.test_board_v2" "workout/exercises.js::const programRecord = saved || record"`
- not verified yet: 인증 계정이 없어 `종목 수정 -> 웬들러 저장 -> 새로고침/재진입 -> 종목 수정` 실제 UI flow 확인은 남아 있다.

### Slice 11: 추천 종목 피커에서도 웬들러 처방 우선 적용

요청:

- 웬들러 설정값에 따라 오늘 수행해야 하는 세트 정보가 자동 업로드되어야 하는데, `추천 종목 · 선택 헬스장` 카드가 빈 1세트로 출력된다.

진단:

- `workout/exercises.js`의 `_buildPickerExerciseEntry()`는 `__maxBenchmarkPicker` 후보를 먼저 처리하고 반환한다.
- 선택 헬스장 추천 종목은 이 경로에 들어오므로 `_buildProgramPickerExerciseEntry()`가 실행되기 전에 빈 테스트모드 엔트리 또는 Max 추천 엔트리로 확정될 수 있다.
- 웬들러/프로그램 설정은 사용자가 종목별 기본값으로 저장한 것이므로, 같은 운동을 추가할 때 추천 후보 여부보다 우선해야 한다.

구현:

- `_buildPickerExerciseEntry()`에서 `_buildProgramPickerExerciseEntry(ex)`를 Max 추천/벤치마크 처리보다 먼저 실행한다.
- 프로그램 설정이 없을 때만 기존 Max 추천/벤치마크 엔트리 생성으로 fallback한다.
- source-level 테스트로 프로그램 엔트리 조회가 `buildMaxPickerExerciseEntry()`보다 먼저 실행되는 계약을 고정한다.
- `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`과 cache-version 테스트를 bump한다.

범위 밖:

- UI 레이아웃 변경.
- 이미 저장된 수동 입력/완료 세트 강제 덮어쓰기.
- 성장보드 색칠/미달 자동 반영.

검증:

- `node --check workout/exercises.js sw.js`
- `node --test tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: `운동 탭 -> + -> 추천/선택 헬스장 목록 -> 웬들러 설정 종목 추가`에서 준비운동/메인/보조 세트가 kg/반복 수 입력된 상태로 보인다.

실행 결과:

- `_buildPickerExerciseEntry()`에서 `_buildProgramPickerExerciseEntry(ex)`를 먼저 확인하도록 순서를 바꿨다.
- 프로그램 처방이 없을 때만 기존 `__maxBenchmarkPicker`/Max 추천 엔트리 생성으로 fallback한다.
- `tests/workout-test-mode-unified.test.js`에 프로그램 처방 조회가 `buildMaxPickerExerciseEntry()`보다 먼저 실행되는 source-level 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z4-wendler-recommendation-priority`로 bump하고 cache-version 테스트 기대값을 갱신했다.
- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js` — 43 tests passed
- PASS: `node --test .\tests\*.test.js` — 531 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰 문서: `docs/ai/reviews/2026-06-26-exercise-program-wendler-recommendation-priority-review.md`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 36be474`
  - 결과: `[deploy-verify] ok 36be47482068 tomatofarm-v20260626z4-wendler-recommendation-priority static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z4-wendler-recommendation-priority" "workout/exercises.js::const programEntry = _buildProgramPickerExerciseEntry(ex)" "workout/exercises.js::buildMaxPickerExerciseEntry({"`
- not verified yet: 인증 계정이 없어 실제 배포 UI에서 `추천 종목 · 선택 헬스장 -> 웬들러 설정 종목 추가` 클릭 플로우는 직접 확인하지 못했다.
