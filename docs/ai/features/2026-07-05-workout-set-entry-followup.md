# 운동 세트 첫 행 기본값과 웬들러 세트 보존

## 요청

- 사진 1: 운동을 처음 추가했을 때 첫 세트 1행에 직전 수행 세트의 중량/횟수를 미리 채운다. 수행 이력이 없으면 `40kg x 10회`를 채운다. 사용자는 이 값을 수정할 수 있어야 한다.
- 사진 1: 접힌 세트 행의 `-` 빈칸은 직접 입력칸처럼 보이지만 실제로는 우측 펼침 버튼을 눌러야 수정된다. 오인 여지를 줄이기 위해 빈 입력칸처럼 보이는 표현을 없애고 단순 정보로만 표출한다. 대신 우측 펼침 버튼은 파란색 affordance로 눈에 띄게 한다.
- 사진 2: 펼친 편집 패널의 `무게/횟수/RIR/ROM`은 한 줄에서 입력 가능해야 한다.
- 사진 2: 세트 유형 표기는 `본`/`프리`가 아니라 `메인`/`웜업`으로 표출한다.
- 예외: 웬들러 프로그램으로 등록된 운동은 미니멀 1행 정책을 적용하지 않고, 해당 주에 수행해야 하는 웬들러 세트를 전부 불러온다.

## 적용 워크플로우

- 적용 트리거: `$omo:ulw-loop`, `/grill-me`, UI 보정.
- 사용 스킬:
  - `omo:ulw-loop`: 증거 기반 목표/기준/검증 기록을 `.omo/ulw-loop/workout-set-entry-followup-20260705/`에 둔다.
  - `omo:frontend`: 기존 `DESIGN.md`의 TDS Mobile/Seed 토큰과 모바일 입력 행 규칙을 따른다.
  - `omo:visual-qa`: 구현 후 브라우저/DOM harness 캡처와 독립 리뷰로 접힌 행, 펼친 행, CJK 라벨 줄바꿈을 확인한다.
- 이번 세션은 계획 세션이다. 프로젝트 규칙상 새 승인 계획 없이 앱 코드는 수정하지 않는다.

## 현재 코드 근거

1. `render-calendar.js`
   - `_workoutSetTypeLabel()`이 현재 `wendlerRole === 'warmup'`과 일반 `warmup`을 `프리`로, 기본 `main`을 `본`으로 표기한다.
   - `_renderWorkoutSetRows()`는 접힌 행에 체크, 타입, `kg`, `reps`, 삭제, 우측 펼침 버튼을 렌더하고, 펼친 상태에서 `무게/횟수/RIR/ROM` 입력을 별도 편집 패널로 렌더한다.
   - `_defaultWorkoutSheetSet(prev)`는 직전 세트가 있으면 `kg`/`reps`를 복사하지만, 직전 세트가 없으면 빈 값으로 둔다.
   - `_addWorkoutExerciseSetFromSheet()`는 이미 직전 세트 복사 경로를 사용한다.
2. `workout/exercises.js`
   - `_buildPickerExerciseEntry()`의 일반 운동 기본 `sets`는 `{ kg: 0, reps: 0, setType: 'main' }` 1행이다.
   - `_buildProgramPickerExerciseEntry()`는 프로그램 처방을 `maxPrescription`에 보존하고 현재는 `_firstTestModePrescriptionSet()`으로 첫 처방 세트 1개만 `sets`에 넣는다.
   - `buildExerciseProgramWorkoutPrescription()`은 웬들러 처방일 때 `prescription.program === 'wendler'`, `applySets: true`, `sets` 전체를 만든다. 실행 시 웬들러 예외는 이 `sets` 전체를 `entry.sets`로 반영해야 한다.
3. `workout/expert/max-benchmark-picker.js`
   - 일반 Max 벤치마크 picker는 `maxPrescription.sets` 전체를 보존하되 `_firstPickerSetFromPrescription()` 1행만 보이는 정책을 쓴다.
4. `style.css`
   - `.wt-max-set-main`, `.wt-max-set-value`, `.wt-max-set-editor`, `.wt-max-set-expand`가 이번 UI 밀도와 affordance의 스타일 지점이다.
5. `sw.js`
   - `render-calendar.js`, `style.css`, `workout/exercises.js`, `workout/expert/max-benchmark-picker.js`는 `STATIC_ASSETS`에 포함되어 있으므로 수정 시 `CACHE_VERSION`을 반드시 bump한다.

## 실행 슬라이스

### Slice 1: 첫 행 기본값, 라벨/밀도, 웬들러 전체 세트 예외

#### 목표

1. 운동을 처음 추가했을 때 일반/비웬들러 운동의 첫 세트는 직전 수행 세트가 있으면 그 `kg`/`reps`를 쓰고, 없으면 `40kg x 10회`를 쓴다.
2. 접힌 세트 행은 입력칸처럼 보이지 않는 단순 값 표시로 유지하며, 값이 없더라도 `-` 빈 입력칸처럼 보이지 않게 한다.
3. 우측 펼침 버튼은 파란색 톤/포커스/활성 affordance를 가져야 한다.
4. 펼친 편집 패널은 `무게`, `횟수`, `RIR`, `ROM` 네 입력을 모바일 한 줄 grid로 배치한다. 360px에서도 라벨과 값이 깨지지 않아야 한다.
5. 세트 유형 라벨은 일반/웬들러 모두 `메인`, `웜업`, `드랍`, `실패`, `BBB`, `FSL`, `보조`로 표출한다.
6. 웬들러 프로그램 등록 운동은 `entry.sets`에 해당 주의 메인/보조 세트를 전부 불러온다. 기존 일반 Max/비웬들러 프로그램은 계속 첫 세트 1행만 보여야 한다.

#### 예상 수정 파일

- `render-calendar.js`
- `style.css`
- `workout/exercises.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/workout-set-minimal-dom.test.js`
- `tests/calc.max.test.js` 또는 웬들러 picker 계약을 다루는 관련 테스트
- `sw.js`
- 리뷰 문서: `docs/ai/reviews/2026-07-05-workout-set-entry-followup-review.md`
- `docs/ai/NEXT_ACTION.md`

#### 구현 지시

1. 첫 세트 seed helper를 만든다.
   - 일반 운동 추가 경로에서 최근 수행 이력을 찾을 수 있으면 가장 최근의 완료/유효 본세트 `kg`/`reps`를 사용한다.
   - 최근 수행 이력이 없거나 값이 유효하지 않으면 `{ kg: 40, reps: 10, setType: 'main', done: false, rir: 2, romPct: 100 }`을 사용한다.
   - 완료 marker(`done`, `completedAt`, `exerciseCompletedAt`)는 복사하지 않는다.
2. `_defaultWorkoutSheetSet(prev)`는 `prev`가 없을 때도 `40kg x 10회` fallback을 반환한다.
   - 단, 이 helper가 웬들러 처방 세트 생성에 끼어들어 웬들러 세트 수를 줄이면 안 된다.
3. `_buildPickerExerciseEntry()` 일반 운동 기본 `sets`를 새 seed helper로 바꾼다.
   - 가능하면 `getCache()`, `getWorkoutSessions()`, `_pickerEntryHasWork()` 계열을 재사용하고, 동일 exerciseId의 최근 유효 본세트만 seed로 삼는다.
4. `_buildProgramPickerExerciseEntry()`는 `program.prescription.program === 'wendler'`인 경우 `program.prescription.sets` 전체를 `entry.sets`로 복사한다.
   - 각 세트는 `done: false`, `romPct` 기본 보정, 완료 marker 제거를 거친다.
   - 비웬들러 프로그램은 기존처럼 `sets.length === 1`을 유지한다.
5. `_workoutSetTypeLabel()`의 한국어 라벨을 바꾼다.
   - `wendlerRole === 'warmup'`과 `setType === 'warmup'`은 `웜업`.
   - 기본 main은 `메인`.
   - UI 옵션의 긴 라벨은 필요하면 `WORKOUT_SET_TYPE_OPTIONS`와 테스트를 함께 갱신한다.
6. `_renderWorkoutSetRows()`의 collapsed 값 표시를 입력처럼 보이지 않게 다듬는다.
   - 값이 유효하면 `70kg`, `10회`처럼 단순 정보로 표출한다.
   - fallback 적용 후 일반 첫 행은 `-`가 나오지 않아야 한다.
   - 정말 값이 없는 레거시 데이터는 `미입력` 또는 동등한 비입력형 텍스트로 표출한다.
7. `.wt-max-set-expand` 스타일을 파란색 affordance로 보강한다.
   - 기존 변수 또는 `DESIGN.md`에 맞는 토큰만 사용한다. raw hex 추가가 필요하면 `DESIGN.md`를 먼저 갱신한다.
   - hover/focus/expanded 상태가 명확해야 한다.
8. `.wt-max-set-editor`를 한 줄 입력 grid로 바꾼다.
   - 4개 label이 한 줄에 들어가되, 360px 폭에서 과밀하면 horizontal scroll이 아니라 `grid-template-columns`와 label 축약으로 자연스럽게 유지한다.
   - 카드 안 카드처럼 보이는 nested-card 스타일은 금지한다.
9. `sw.js` `CACHE_VERSION`을 새 marker로 bump한다.

#### 제외

- `www/` 직접 수정
- Firestore 직접 호출 추가
- 운동 추천 알고리즘 전면 개편
- Max plan editor, benchmark editor, Dashboard3 별도 UI 변경
- 휴식 타이머/광고/상단 지표 신규 구현
- 새 프레임워크, 번들러, 외부 UI 라이브러리 도입

## RED/검증 계획

### Failing-first

1. RED: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js tests/calc.max.test.js`
   - 일반 운동 첫 추가 시 기존 `kg: 0/reps: 0` 또는 `-` 렌더 때문에 `40kg x 10회`/직전 세트 seed 계약이 실패해야 한다.
   - `_workoutSetTypeLabel()`이 `본`/`프리`를 반환해 `메인`/`웜업` 계약이 실패해야 한다.
   - 웬들러 program picker가 첫 세트 1행만 만들면 `entry.sets.length === prescription.sets.length` 계약이 실패해야 한다.

### GREEN

1. `node --check render-calendar.js workout/exercises.js sw.js`
2. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js tests/calc.max.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. 필요 시 전체 회귀: `node --test tests/*.test.js`

### Real-surface QA

1. DOM harness:
   - `tests/workout-set-minimal-dom.test.js`에서 390px 모바일 폭으로 운동 카드 HTML을 렌더한다.
   - 첫 행 collapsed 상태에 `40kg`, `10회` 또는 직전 이력값이 보이고 직접 입력 `input`은 없어야 한다.
   - 우측 버튼 클릭 후 `무게/횟수/RIR/ROM` 입력 4개가 같은 editor row에 보여야 한다.
   - 타입 버튼/메뉴에서 `메인`/`웜업` 라벨이 보여야 한다.
2. 운영 Pages:
   - 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - marker 검증: `sw.js::<new-cache-version>`, `render-calendar.js::_workoutSetTypeLabel`, `workout/exercises.js::<new-seed-helper-or-marker>`, `style.css::wt-max-set-expand`
   - 인증 세션이 있으면 `운동 탭 -> 헬스 종목 추가 -> 첫 세트 값 확인 -> 우측 펼침 -> 4필드 한 줄 수정 -> 웬들러 등록 운동 추가 -> 전체 세트 수 확인`을 운영 URL에서 실행한다.
   - 인증 세션이 없으면 `not verified yet`으로 정확한 blocker를 리뷰에 남기고 DOM harness 증거를 대체 증거로 명시한다.

## 완료 증거

- 새 테스트가 일반 운동 첫 행 fallback `40kg x 10회`와 최근 수행 세트 seed를 검증한다.
- 새 테스트가 collapsed 행에 직접 입력 input이 없고 우측 expand affordance가 있음을 검증한다.
- 새 테스트 또는 DOM harness가 펼친 편집 패널의 `무게/횟수/RIR/ROM` 4필드 한 줄 배치를 검증한다.
- 새 테스트가 `본`/`프리` 문자열 부재와 `메인`/`웜업` 표기를 검증한다.
- 새 테스트가 웬들러 프로그램 등록 운동만 전체 처방 세트를 `entry.sets`로 불러오고, 비웬들러 프로그램은 1행 정책을 유지함을 검증한다.
- `sw.js` cache marker가 운영 배포 URL에서 확인된다.

## 상태

- 상태: `complete`
- 차단 질문: 없음
- ULW 상태: `.omo/ulw-loop/workout-set-entry-followup-20260705/`
- 리뷰: `docs/ai/reviews/2026-07-05-workout-set-entry-followup-review.md`
- 실행 요약:
  1. 일반/추천 수동 운동 추가의 첫 세트는 동일 `exerciseId`의 최근 유효 본세트 `kg/reps`를 사용하고, 이력이 없으면 `40kg x 10회`를 사용한다.
  2. 달력 시트에서 세트를 추가할 때도 직전 세트가 없으면 `40kg x 10회`를 기본값으로 둔다.
  3. 접힌 행의 값 배경을 제거하고 레거시 빈 값은 `미입력` 정보 텍스트로 표출한다.
  4. 우측 펼침 버튼은 기본/열림 상태 모두 파란 affordance와 glow를 가진다.
  5. 펼친 편집 패널은 `무게/횟수/RIR/ROM` 네 필드를 한 줄 grid로 배치한다.
  6. 세트 유형 라벨은 `메인/웜업`으로 바꿨고, 웬들러 warmup/main도 같은 표기를 따른다.
  7. 웬들러 프로그램 처방은 `applySets === true`와 `program === 'wendler'`일 때 해당 주 `prescription.sets` 전체를 불러온다. 비웬들러/Max 벤치마크 1행 정책은 유지했다.
  8. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260705z1-workout-set-entry-followup`로 bump했다.
- 검증:
  1. PASS: RED targeted tests에서 라벨, 기본값, Wendler 전체 세트, cache marker 기대값 실패 확인.
  2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js tests/workout-test-mode-unified.test.js tests/calc.max.test.js` - 98 pass.
  3. PASS: `node --test tests/*.test.js` - 701 pass.
  4. PASS: Puppeteer DOM/visual harness - 접힌 행 입력 0개, `70kg/10회`, 레거시 `미입력`, 값 배경 투명, 파란 expand glow, `kg/reps/rir/romPct` 같은 줄. 스크린샷: `.omo/evidence/workout-set-entry-followup-dom.png`.
- 다음 액션: 리뷰/배포 검증 후 완료 처리한다.
