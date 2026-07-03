# 2026-07-03 운동 추가/카드 추가 결합 완화 리팩토링

## 요청 원문

`/goal 리팩토링 수행할 것. 특히 운동종목추가/운동카드추가 관련한 오류가, 무언가 수정할 때마다 다른게 고장나는 방식으로 너무 많이 나는데 UI와 벡엔드 상호의존성을 줄이고 무언가 추가했을 때 계속 꼬이거나 오류가 나지 않는 방향으로 코드 전체를 리팩토링할 것. 화면단에서 검증까지 완료한 후에 배포할 것.`

추가 목표: 운동 코드 관련 리팩토링이 끝났다고 멈추지 말고 코드 전체를 조망해 리팩토링을 이어간다. 추가 오류가 나지 않게 하고, 버튼 클릭이 무겁게 느껴지지 않도록 경량화도 함께 본다.

## 상태

- 단계: `ready_for_execution`
- 트리거: `/diagnose` 우선, 이후 `/grill-me`
- 대상: 운동 종목 피커, 운동 카드 추가, 운동 하단시트 afterSelect, 저장 후속효과

## 이해한 내용

- 목표: 운동종목 선택/추가, 운동카드 생성, 저장, 화면 포커스/시트 복원 사이의 직접 결합을 줄여 이후 UI 변경이 저장 경로나 카드 상태를 덜 깨뜨리게 한다.
- 확장 목표: 운동 경계 안정화 후 앱 전체의 `onclick`/`window.*`/무거운 클릭 핸들러/재렌더 경로를 조망해 추가 리팩토링 슬라이스를 이어간다.
- 비목표: Firestore schema 변경, 전체 앱 프레임워크 도입, 운동 UI 전면 재디자인, `www/` 직접 수정.
- 사용자 흐름: `운동 탭 -> + 종목 추가(선택) -> 피커에서 기존/신규 종목 선택 -> 오늘 운동 카드 또는 하단시트 카드에 선택 종목 표시 -> 세트 입력/완료 저장`.
- 데이터 가정: 운동 종목 카탈로그 SSOT는 `users/{uid}/exercises`이고 접근은 `data.js`를 통한다. 오늘 운동 기록은 `S.workout.exercises`와 `saveWorkoutDay()` 경로를 유지한다.
- 열려 있는 질문: 인증 계정이 필요한 실제 모바일 UI 검증은 자동화 계정이 없으면 배포 marker와 정적 테스트까지만 자동 검증 가능하다. 인증 UI 클릭은 사용자 계정으로 확인해야 한다.

## 진단

1. `workout/exercises.js`가 피커 렌더, 선택 이벤트, `S.workout.exercises` 직접 mutation, 카드 재렌더, 타이머/타임라인 후속효과, 저장, 피커 닫기, 카드 포커스, 하단시트 `afterSelect`를 한 row click handler에 묶고 있다.
2. 신규 종목 CRUD도 같은 파일에서 DOM form 읽기, `saveExercise()` 호출, 프로그램 설정 저장, 피커 재오픈을 한 함수에 처리한다.
3. 최근 회귀 문서들이 모두 같은 주변에서 발생했다: 피커 즉시 닫힘, 카드 헤더 레이아웃, 하단시트 캐러셀 포커스/재열기, 종목 완료 도장, 신규 CRUD 버튼 노출.
4. 현재 테스트는 문자열 기반 구조 회귀를 꽤 잘 잡지만, “종목 선택이 기존 카드를 재사용하는지/새 카드만 추가하는지/후속 UI 처리와 분리되는지”를 독립적으로 고정하는 순수 로직 테스트가 부족하다.

## 가설

1. 선택 row handler가 상태 전이와 UI 후속효과를 같이 가지므로 작은 UX 변경이 저장/카드/시트 동작을 같이 흔든다.
   - 예측: `S.workout.exercises.push`, `_renderExerciseList`, `wtCloseExercisePicker`, `saveWorkoutDay`, `wtFocusWorkoutEntryCard`, `_runPickerAfterSelect`가 같은 핸들러에 있다.
   - 결과: 코드 확인됨.
2. 운동 추가의 핵심 계약이 테스트 가능한 함수로 분리되어 있지 않아 회귀 테스트가 DOM 문자열 확인에 치우친다.
   - 예측: 중복 선택은 기존 entry index를 반환하고, 신규 선택은 entry 하나만 추가한다는 단위 테스트가 없다.
   - 결과: 코드/테스트 확인됨.
3. 피커/editor의 이벤트 연결이 `onclick`, 직접 `on*` 할당, element별 `addEventListener`가 섞여 있어 재렌더 변경 때 버튼 누락 가능성이 크다.
   - 예측: `modals/ex-editor-modal.js`는 `onclick`, 피커 chrome은 direct `onclick`, 목록은 element별 listener를 사용한다.
   - 결과: 코드 확인됨.
4. 저장 경로 자체는 `data.js`/`saveWorkoutDay()`에 모여 있으므로 첫 리팩토링은 schema보다 UI 상태 전이 경계를 만드는 편이 안전하다.
   - 예측: `saveExercise()`와 `saveWorkoutDay()`는 기존 계약을 유지하면 데이터 위험을 낮출 수 있다.
   - 결과: 코드 확인됨.

## 그릴 결과

- 적용 트리거: `/grill-me`
- 핵심 질문: “전체를 한 번에 쪼개는 리팩토링”과 “운동 추가 상태 전이부터 방화벽을 세우는 리팩토링” 중 무엇이 더 안전한가?
- 추천 답변: 운동 추가 상태 전이부터 독립 모듈/테스트로 고정한다.
- 사용자 답변: 명시 답변 없음. 오류가 연쇄되는 문제를 줄이는 것이 목표이므로, 가장 자주 터진 선택/카드 추가 경계부터 진행한다.
- 확정된 결정: 첫 슬라이스는 `S.workout.exercises` 선택/추가 계약을 UI/저장 후속효과에서 분리한다.
- 남은 가정: 실제 인증 모바일 UI 검증은 계정 접근 가능 여부에 따라 `not verified yet`이 될 수 있다.

## 결정 기록

- 결정: 운동 추가 리팩토링은 “순수 상태 전이 모듈 -> 피커 handler 축소 -> editor/action 라우팅 -> 하단시트 공유 계약” 순서로 진행한다.
- 이유: `workout/exercises.js`가 너무 큰 파일이라 한 번에 이동하면 회귀 표면이 크다. 상태 전이 함수를 먼저 고정하면 이후 렌더/이벤트 분리 때 같은 계약을 재사용할 수 있다.
- 되돌릴 수 있는가: 가능. 새 모듈은 기존 함수가 호출하는 얇은 helper로 시작하므로 문제가 있으면 기존 handler 로직으로 되돌릴 수 있다.

## 실행 슬라이스

### 슬라이스 1: 운동 선택 상태 전이 서비스화

- 목표: 피커 row 클릭의 핵심 상태 변경을 UI/저장 후속효과와 분리하고 단위 테스트로 고정한다.
- 범위:
  1. `workout/exercise-entry-actions.js`를 추가해 `findWorkoutEntryIndexByExerciseId()`와 `selectWorkoutExerciseEntry()`를 제공한다.
  2. `workout/exercises.js`의 피커 row handler는 helper 결과를 받아 UI 후속효과만 수행하도록 줄인다.
  3. 기존 `_findWorkoutEntryIndexByExerciseId()` 중복 구현을 제거하거나 helper로 대체한다.
  4. 선택 계약 테스트를 추가하고 기존 피커 선택 흐름 테스트를 새 구조에 맞춘다.
  5. 새 runtime module을 `sw.js` `STATIC_ASSETS`에 넣고 `CACHE_VERSION`을 bump한다.
- 예상 수정 파일:
  - `workout/exercise-entry-actions.js`
  - `workout/exercises.js`
  - `tests/workout-exercise-entry-actions.test.js`
  - `tests/ex-picker-selection-flow.test.js`
  - `sw.js`
  - cache marker 테스트 파일
- 수정하지 말 것:
  - Firestore schema
  - `saveWorkoutDay()` payload 계약
  - 하단시트 캐러셀 UI
  - 종목 editor form UI
- 구현 메모:
  - helper는 DOM, `window`, Firebase를 직접 보지 않는다.
  - 기존 종목을 다시 선택하면 새 entry를 만들지 않고 기존 index를 반환한다.
  - 신규 종목 선택은 `buildEntry(ex)` 결과를 한 번만 push한다.
  - `afterSelect`와 카드 focus는 helper 밖 UI orchestration에 남긴다.
- 검증 방법:
  1. `node --check workout/exercises.js workout/exercise-entry-actions.js sw.js`
  2. `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js`
  3. `node scripts/verify-runtime-assets.mjs`
  4. `git diff --check`
- 완료 증거:
  - 단위 테스트가 기존/신규 선택 계약을 검증한다.
  - 피커 row handler에 직접 `S.workout.exercises.push(_buildPickerExerciseEntry(ex))`가 남지 않는다.
  - `STATIC_ASSETS`가 새 모듈을 포함하고 cache marker가 갱신된다.
- 다음 세션 시작 프롬프트:
  - `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`의 슬라이스 1을 실행한다. 운동 선택 상태 전이를 `workout/exercise-entry-actions.js`로 분리하고, 기존 피커 row handler는 UI 후속효과만 담당하게 줄인다.

#### 슬라이스 1 실행 결과

- 상태: `reviewed`
- 완료:
  1. `workout/exercise-entry-actions.js`를 추가해 `findWorkoutEntryIndexByExerciseId()`, `selectWorkoutExerciseEntry()`, `workoutExerciseSelectionDetail()`를 분리했다.
  2. `workout/exercises.js`의 피커 row handler에서 직접 `S.workout.exercises.push(_buildPickerExerciseEntry(ex))`를 제거하고 selection helper 결과를 사용하도록 변경했다.
  3. 기존 종목 재선택은 `selection.existing` 경로로 기존 카드 focus/afterSelect detail을 유지한다.
  4. 신규 종목 선택은 `buildEntry` callback 안에서 `_ensureExpertManualSession()`과 `_buildPickerExerciseEntry()`를 실행해 기존 순서를 유지한다.
  5. `sw.js` `STATIC_ASSETS`에 새 모듈을 등록하고 `CACHE_VERSION`을 `tomatofarm-v20260703z8-workout-entry-actions`로 bump했다.
  6. `tests/workout-exercise-entry-actions.test.js`를 추가하고 기존 구조 테스트를 selection contract 기준으로 갱신했다.
- 검증:
  1. PASS: `node --check workout/exercises.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
  2. PASS: `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js` - 21 pass
  3. PASS: `node --test tests/*.test.js` - 654 pass
  4. PASS: `git diff --check`
  5. not verified yet: `node scripts/verify-runtime-assets.mjs`는 새 runtime 파일이 아직 git에 stage되지 않아 `workout/exercise-entry-actions.js` untracked 경고로 실패했다. stage 후 재실행 필요.
- 리뷰: `docs/ai/reviews/2026-07-03-workout-add-decoupling-slice1-review.md`
- 다음: 사용자 확장 목표를 반영해 운동 내부 후속 작업만 이어가지 말고, 슬라이스 5 `전체 클릭 경로/전역 함수 의존 인벤토리`를 먼저 수행한다.

### 슬라이스 2: 피커 이벤트 바인딩 집중화

- 목표: 피커 목록 내부 버튼과 row 선택 이벤트를 한 곳에서 라우팅해 재렌더 시 바인딩 누락/중복을 줄인다.
- 범위:
  1. 목록 item markup에 `data-picker-row-action` 또는 namespaced `data-action`을 적용한다.
  2. `_bindPickerListEvents(container)` 같은 단일 capture/delegation handler로 edit/delete/hide/select/create를 라우팅한다.
  3. 개별 row마다 `addEventListener`를 붙이는 패턴을 줄인다.
- 예상 수정 파일:
  - `workout/exercises.js`
  - 관련 테스트
  - `sw.js`
- 수정하지 말 것:
  - 피커 시각 디자인
  - 종목 CRUD 데이터 저장 형식
- 검증 방법:
  - 피커 edit/delete/hide/select/create 경로 구조 테스트
  - 기존 picker/gym/density 테스트
  - runtime assets 검증

#### 슬라이스 2 실행 결과

- 실행일: 2026-07-03
- 변경:
  1. `workout/exercises.js`에 `_selectPickerExercise(ex)`를 추가해 row 선택 후속효과를 render loop에서 분리했다.
  2. `_handlePickerListClick()`, `_handlePickerListKeydown()`, `_bindPickerListActions(container)`를 추가해 picker list row selection/edit/delete/hide/source-filter를 container delegate로 처리한다.
  3. `_renderPickerList()` row loop에서 `btn.addEventListener('click', async ...)`, edit/delete/hide per-row closures, `_bindPickerSourceFilter()`를 제거했다.
  4. row markup은 `data-picker-exercise-id`, `data-picker-row-action` 계약만 렌더한다.
  5. `tests/ex-picker-selection-flow.test.js`가 per-row click listener 재도입을 막고 delegated contract를 검증하도록 갱신했다.
- 검증:
  1. PASS: `node --check workout/exercises.js; node --check render-calendar.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
  2. PASS: `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js tests/stats-picker-ui-polish.test.js tests/workout-navigation-stack.test.js` - 63 pass
  3. PASS: `node --test tests/*.test.js` - 655 pass
  4. PASS: `git diff --check`
- 다음: staging 후 runtime asset verification을 통과시키고 운영 배포/운영 URL 검증으로 넘어간다.

### 슬라이스 3: 종목 editor 저장 계약 분리

- 목표: editor DOM 읽기와 운동 종목 record 생성/검증/저장을 분리한다.
- 범위:
  1. `buildExerciseEditorRecord()` 같은 pure helper를 만든다.
  2. 신규 부위 생성, gym scope, program 설정 저장을 단계별 함수로 분리한다.
  3. `wtSaveExerciseFromEditor()`는 form orchestration만 담당한다.
- 예상 수정 파일:
  - `workout/exercise-editor-actions.js` 또는 기존 새 모듈 확장
  - `workout/exercises.js`
  - 테스트
  - `sw.js`
- 수정하지 말 것:
  - `data.js`의 `saveExercise()` Firestore 계약
  - 운동 프로그램 설정 schema
- 검증 방법:
  - editor record 생성 단위 테스트
  - 기존 CRUD 버튼 노출/피커 테스트

#### 슬라이스 3 실행 결과

- 실행일: 2026-07-03
- 변경:
  1. `workout/exercise-editor-actions.js`를 추가해 `buildExerciseEditorRecord()`, `verifyExerciseEditorSavedRecord()`, `exerciseEditorRecordId()`, `customExerciseMuscleId()`를 분리했다.
  2. `wtSaveExerciseFromEditor()`는 DOM 읽기, 신규 부위 저장, record build, `saveExercise()`, 저장 검증, program save 순서만 orchestrate한다.
  3. program save는 더 이상 `saved || record` fallback을 쓰지 않고 `verifyExerciseEditorSavedRecord()`가 통과한 saved record만 사용한다.
  4. `tests/exercise-editor-actions.test.js`를 추가하고 `tests/exercise-program-editor.test.js`가 새 helper contract와 저장 순서를 검증하도록 갱신했다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z10-exercise-editor-actions`로 bump하고 `STATIC_ASSETS`에 새 모듈을 등록했다.
- 검증:
  1. PASS: `node --check workout/exercises.js; node --check workout/exercise-editor-actions.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
  2. PASS: `node --test tests/exercise-editor-actions.test.js tests/exercise-program-editor.test.js tests/ex-picker-selection-flow.test.js tests/workout-exercise-entry-actions.test.js tests/stats-picker-ui-polish.test.js tests/workout-picker-gym-rail.test.js` - 27 pass
  3. PASS: `node --test tests/*.test.js` - 660 pass
  4. PASS: `git diff --check`
  5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=874`
- 다음: 배포 전에는 Slice 4 또는 전역 hotspot 후속 slice를 선택한다.

### 슬라이스 4: 하단시트 afterSelect 계약 명문화

- 목표: 피커 선택 결과와 하단시트 카드 복원 로직 사이의 detail contract를 명시하고 테스트로 고정한다.
- 범위:
  1. `entryIdx`, `exerciseId`, `existing` detail contract를 상수/테스트로 고정한다.
  2. 하단시트 refresh helper가 detail만 읽고 피커 내부 구현에 의존하지 않게 한다.
  3. 기존 캐러셀 포커스/재열기 테스트를 계약 중심으로 정리한다.
- 예상 수정 파일:
  - `workout/exercise-entry-actions.js`
  - `workout/exercises.js`
  - `render-calendar.js`
  - 관련 테스트
  - `sw.js`
- 수정하지 말 것:
  - 캐러셀 디자인/제스처 변경

### 슬라이스 5: 전체 클릭 경로/전역 함수 의존 인벤토리

- 목표: 운동 외 코드까지 `onclick`, `window.*`, direct DOM handler, heavy click path를 표로 정리하고 가장 위험한 순서로 후속 리팩토링을 정한다.
- 범위:
  1. `index.html`, `modals/*.js`, 주요 `render-*.js`, `feature-*.js`, `home/*.js`, `workout/*.js`의 클릭 진입점을 `rg`로 인벤토리화한다.
  2. 즉시 전역 함수가 필요한 legacy 경로와 `utils/action-router.js`로 옮길 수 있는 경로를 구분한다.
  3. 클릭 직후 큰 동기 작업, 전체 탭 재렌더, 불필요한 저장 호출이 있는지 후보를 찾는다.
  4. 결과를 `docs/ai/diagnoses/` 또는 이 계획 문서의 실행 결과에 남긴다.
- 예상 수정 파일:
  - 문서 우선: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
  - 필요 시 아주 작은 측정 helper 또는 테스트
- 수정하지 말 것:
  - 인벤토리 슬라이스에서 대량 코드 이동 금지
  - UX 변경 금지
- 검증 방법:
  - 인벤토리 표가 위험도, 파일, 함수, 권장 처리로 정리되어 있다.
  - 다음 실행 슬라이스가 하나의 기능 경계만 바꾸도록 분리되어 있다.

#### 슬라이스 5 실행 결과

- 실행일: 2026-07-03
- 스캔 명령:
  - `node -e "... onclick/window/addEventListener/data-action count ..."` (`android`, `www`, `tests`, `docs`, `node_modules` 제외)
  - `rg -n -F -e 'onclick=' -e 'window._wtCal' -e "addEventListener('click'" -e 'data-action' render-calendar.js tests/workout-calendar-bottom-sheet.test.js`
- 상위 hotspot:

| 우선순위 | 파일 | 측정 | 위험 | 권장 처리 |
| --- | --- | --- | --- | --- |
| A | `render-calendar.js` | total 74, inline 23, window 48 | 운동 하단시트의 세트 추가/종목완료/카드 접기/삭제가 inline `onclick`과 `window._wtCal*`에 묶여 있어 버튼 추가 때 누락/중복 실행 위험이 큼 | 기존 `_bindWorkoutHomeSheetActions()` capture delegate에 card action을 흡수하고 `data-wt-sheet-card-action` 계약으로 고정 |
| B | `workout/exercises.js` | total 66, listener 46 | 피커/카드 row별 direct handler가 많고 운동 추가 상태 전이와 UI 후속효과가 가까움 | 슬라이스 2에서 피커 list action을 단일 위임으로 집중화 |
| C | `home/friend-profile.js` | total 75, inline 50 | 동적 HTML 문자열 안에 friend action이 inline으로 많아 escaping/전역 함수 결합 위험 | social 전용 action delegate를 별도 slice로 분리 |
| D | `feature-login.js` | total 76, inline 27, window 44 | 인증 화면이 전역 함수와 inline handler에 의존 | 로그인 bootstrap 안정성 때문에 후순위, 작은 단위로 전환 |
| E | `workout/expert.js`, `workout/expert/max.js` | total 126/137, window 100/25, action 7/79 | Max V4 plan sheet 규칙과 lazy module 버튼 규칙이 얽혀 있어 무리한 전환 시 회귀 위험 | plan sheet capture binding 규칙을 지키는 별도 계획으로 처리 |
| F | `index.html` | total 86, inline 82 | 전역 nav/tab 버튼이 대부분 inline handler | 앱 bootstrap 이후 `utils/action-router.js` namespaced action으로 점진 전환 |

- 성능 후보:
  1. `render-calendar.js` day sheet: 버튼 클릭 직후 inline global lookup 후 전체 `renderWorkoutCalendarHome()`이 반복된다. 우선 delegate로 경계를 줄이고 이후 부분 렌더 후보를 본다.
  2. `home/friend-feed.js`: reaction/like 후 feed 전체 렌더가 반복되는 경로가 있다.
  3. `workout/expert.js`: 일부 click path가 `renderAll()`로 이어져 작은 버튼도 큰 동기 작업을 부른다.
- 결정: 슬라이스 6은 `render-calendar.js` 운동 day sheet card action만 전환한다. 이유는 기존 sheet-level capture delegate가 있어 구조 변경 범위가 작고, 운동 카드/종목 추가 연쇄 회귀와 직접 맞닿아 있기 때문이다.

### 슬라이스 6: 전역 action-router 전환 1차

- 목표: `render-calendar.js` 운동 day sheet의 card action 묶음을 inline `onclick/window._wtCal*`에서 scoped `data-wt-sheet-card-action` + sheet capture delegate로 옮겨 버튼 누락과 중복 실행을 줄인다.
- 범위:
  1. `_renderWorkoutSetAddRow()`, `_renderWorkoutExerciseDetailCard()`, `_renderWorkoutRunningDetailCard()`, `_renderWorkoutActivityDetailCard()`의 세트 추가/종목완료/카드 접기/러닝 다시 측정/삭제 버튼을 data attribute로 바꾼다.
  2. `_bindWorkoutHomeSheetActions()`에서 action별 함수 호출을 단일 capture delegate로 처리한다.
  3. 기존 set done/remove delegate와 충돌하지 않게 처리 순서를 유지한다.
  4. 문자열/구조 테스트를 추가해 해당 card action inline handler 재도입을 막는다.
- 예상 수정 파일:
  - `render-calendar.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `sw.js`
  - cache marker 테스트
- 수정하지 말 것:
  - 여러 화면의 버튼을 한 번에 옮기지 않는다.
  - prefix 없는 `data-action` 로컬 라우팅을 전역 라우터가 잡게 만들지 않는다.
  - Max V4 plan sheet의 action binding은 건드리지 않는다.

#### 슬라이스 6 실행 결과

- 실행일: 2026-07-03
- 변경:
  1. `render-calendar.js` day sheet의 세트 추가, 종목완료, 운동 삭제, 러닝 삭제, 카드 접기/펼치기, 러닝 다시 측정 버튼을 `data-wt-sheet-card-action` 계약으로 전환했다.
  2. 기존 `_bindWorkoutHomeSheetActions()` capture listener 안에 `_runWorkoutHomeSheetCardAction(action, control)` dispatcher를 추가했다.
  3. 해당 버튼에서 더 이상 필요하지 않은 `window._wtCalAddExerciseSet`, `window._wtCalCompleteExercise`, `window._wtCalToggleExerciseCard`, `window._wtCalAddRunning`, `window._wtCalDeleteExercise`, `window._wtCalDeleteActivity` exports를 제거했다.
  4. `tests/workout-calendar-bottom-sheet.test.js`에 inline handler 재도입 방지와 running/generic activity card action 계약을 추가했다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z9-calendar-sheet-actions`로 bump하고 cache marker 테스트를 갱신했다.
- 검증:
  1. PASS: `node --check render-calendar.js; node --check workout/exercises.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
  2. PASS: `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js tests/workout-empty-picker-density.test.js tests/workout-picker-gym-rail.test.js` - 52 pass
  3. PASS: `node --test tests/*.test.js` - 655 pass
  4. PASS: `git diff --check`
- 다음: 운동 추가 오류의 핵심 표면인 슬라이스 2 `피커 이벤트 바인딩 집중화`를 이어서 실행한다.

### 슬라이스 7: 클릭 경량화 1차

- 목표: 사용자가 체감하는 버튼 클릭 지연을 만드는 가장 큰 동기 작업 하나를 줄인다.
- 범위:
  1. 클릭 직후 전체 리스트/탭 재렌더 또는 저장 호출이 불필요하게 반복되는 경로를 하나 선정한다.
  2. DOM 업데이트 범위를 줄이거나 저장을 이미 있는 draft/persist 경로와 합친다.
  3. 기능 동작은 유지하고 체감 응답만 가볍게 만든다.
- 예상 수정 파일: 슬라이스 5 인벤토리 후 확정.
- 검증 방법:
  - 기존 기능 테스트 통과
  - 클릭 후 즉시 UI 피드백이 유지됨
  - 불필요한 중복 저장/렌더 호출이 구조 테스트 또는 코드 리뷰로 제거됨

## 리뷰 세션 프롬프트

이 계획 문서와 직전 실행 세션의 변경 파일을 읽고 버그, 회귀, 누락된 테스트, 오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 특히 피커에서 기존 종목 재선택, 신규 종목 추가, 하단시트 `afterSelect`, 일반 운동 카드 focus가 모두 같은 detail contract를 만족하는지 확인한다. 리뷰 중에는 새 기능을 구현하지 않는다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: `ready_for_execution`
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: 슬라이스 5 `전체 클릭 경로/전역 함수 의존 인벤토리`를 실행한다.
- 차단 질문: 없음
