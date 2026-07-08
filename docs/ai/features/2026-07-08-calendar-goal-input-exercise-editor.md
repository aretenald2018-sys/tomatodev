# 캘린더 목표입력 드롭다운과 종목 수정 시트 연동

## 요청

- 운동 달력 화면에서 요일 헤더의 `일` 왼쪽 칸에 `목표입력` 버튼을 만든다.
- 버튼을 누르면 바텀시트가 나오고, 드롭다운으로 헬스 운동 종목 중 하나를 선택할 수 있게 한다.
- 종목을 선택한 뒤에는 첨부 두 번째 사진처럼 기존 `종목 수정` 바텀시트를 열어 해당 종목의 목표/프로그램 설정을 수정할 수 있게 한다.
- 이번 세션은 계획 세션이므로 앱 코드는 수정하지 않는다.

## 그릴 결과

- 핵심 질문: 새 목표 입력 UI를 기존 성장보드/종목 수정 흐름과 별도로 만들지, 기존 시트를 재사용할지.
- 답변/결정: 기존 `workout/exercises.js`의 `wtOpenExerciseEditor()`가 두 번째 사진의 `종목 수정` 시트를 이미 열고 프로그램 입력까지 보강하므로, 새 UI는 `목표입력 -> 종목 선택 드롭다운 -> 기존 종목 수정 시트`로 연결한다.
- 남은 가정: `목표입력` 버튼은 각 주 row의 왼쪽 rail(`.cal-workout-week-rail`)이 아니라 요일 헤더의 `.cal-week-rail-spacer`, 즉 `일` 왼쪽 칸에 1개만 보인다.

## 현재 구조

- `render-calendar.js`의 `renderWorkoutCalendarHome()`이 운동 탭 달력 홈을 렌더한다.
- `render-calendar.js` `_renderWorkoutCalendar()`는 운동 홈에서 요일 헤더를 만들고, `일` 왼쪽에 `.cal-week-rail-spacer`를 둔다.
- `render-calendar.js` `_renderWorkoutHomeMonthGrid()`는 각 주 row를 만들고, 각 주의 Sunday 셀 왼쪽에 `_renderWorkoutCycleRail(weekStart, cycleItems)`를 둔다.
- `_renderWorkoutCycleRail()`은 기존 성장보드 목표 chip을 `.cal-cycle-branch` 버튼으로 렌더하고, `_bindWorkoutCycleRailActions(root)`가 `[data-cal-cycle-target]` 클릭을 capture phase에서 받아 `window.tm2OpenBenchmarkSettings()`로 연결한다.
- `render-calendar.js`는 이미 `getExList()`와 `getMuscleParts()`를 import하고 있어 드롭다운 후보를 같은 파일에서 계산할 수 있다.
- `workout/exercises.js`의 `wtOpenExerciseEditor(exId, defaultMuscleId)`는 `#ex-editor-modal`을 `종목 수정` 제목으로 열고, `타겟 부위`, `헬스장 범위`, `종목 이름`, `프로그램` 영역을 채운다.
- 단, 현재 `wtCloseExerciseEditor()`와 `wtSaveExerciseFromEditor()`는 닫은 뒤 항상 `wtOpenExercisePicker()`로 돌아간다. 캘린더 목표입력에서 직접 열린 editor는 picker로 돌아가면 안 되므로 return mode를 추가해야 한다.
- `modal-manager.js`의 `loadAndInjectModals()`가 `ex-editor-modal`을 DOM에 주입한다.
- `DESIGN.md`는 반복 입력 UI를 TDS/Seed 토큰 기반 compact control로 유지하고, sheet/stopPropagation 내부 버튼은 직접 바인딩 또는 capture phase로 처리하라고 규정한다.

## 설계 결정

1. 왼쪽 목표 칸 위치는 요일 헤더의 `일` 왼쪽 spacer다.
   - `_renderWorkoutCalendar()`의 workout-home `weekdayHtml` 안 `.cal-week-rail-spacer`에 `목표입력` 버튼을 1개 렌더한다.
   - 버튼에는 `data-cal-goal-input`과 첫 주 시작일 `data-week-start`를 넣고 inline handler는 쓰지 않는다.
   - `_renderWorkoutCycleRail(weekStart, items)`는 기존 `[data-cal-cycle-target]` 카드만 렌더한다.

2. 새 첫 단계는 실제 드롭다운 바텀시트다.
   - `render-calendar.js`에 `_openWorkoutGoalInputSheet(weekStart)`를 추가한다.
   - sheet title은 `목표입력`, primary select label은 `운동 종목`으로 둔다.
   - 후보는 `getExList()` 중 헬스 근력 종목만 사용한다. 기준은 `getMuscleParts()`의 `id`와 exercise `muscleId`/`muscleIds`/movement major 매칭이며, 러닝/유산소 manual cardio 후보는 제외한다.
   - 후보가 없으면 저장/다음 버튼을 비활성화하고 `운동 종목을 먼저 추가해 주세요` 상태를 보여준다.

3. 종목 선택 뒤에는 기존 종목 수정 시트를 재사용한다.
   - `목표입력` sheet의 `다음` 버튼이 선택된 `exerciseId`를 읽고 sheet를 닫은 뒤 `wtOpenExerciseEditor(exId, null, { returnToPicker: false, source: 'calendar-goal-input' })`를 호출한다.
   - 호출 전 `loadAndInjectModals()`로 `#ex-editor-modal`을 보장한다.
   - `window.wtOpenExerciseEditor`가 없으면 `await import('./render-workout.js')`로 workout orchestrator side effect를 보장한 뒤 다시 확인한다.

4. `wtOpenExerciseEditor`에는 return mode만 추가한다.
   - 기본값은 기존 동작 보존을 위해 `returnToPicker: true`다.
   - picker row의 `edit`, `delete-via-editor`, `종목 추가` 경로는 기존처럼 editor를 닫거나 저장한 뒤 picker로 돌아간다.
   - calendar goal input 경로는 닫기/저장 후 picker를 열지 않는다. 필요하면 toast만 보여주고 calendar는 다음 render 때 최신 설정을 반영한다.
   - 삭제 flow는 캘린더 목표입력에서 직접 들어온 경우 위험하므로 기존 delete button 노출 정책을 유지하되, 삭제 후 picker 자동 복귀는 하지 않는다.

5. 저장 스키마는 늘리지 않는다.
   - 목표/프로그램 canonical store는 기존 종목 수정 시트가 사용하는 `saveExercise()`와 `test_board_v2` 프로그램 저장 경로를 그대로 따른다.
   - `saveWorkoutDay()`, `_addWorkoutHomeSession()`, `selectWorkoutExerciseEntry()`를 호출하지 않는다. 목표입력은 오늘 운동 기록에 종목을 추가하는 기능이 아니다.

6. UI는 현재 달력 밀도를 유지한다.
   - 버튼은 `.cal-week-rail-spacer` 안의 `.cal-cycle-goal-input` compact secondary button으로 스타일링한다.
   - 360px 모바일에서 `목표입력` 텍스트가 rail 폭 안에서 깨지지 않도록 min-height, line-height, wrapping/ellipsis를 고정한다.
   - 드롭다운 sheet는 `modal-backdrop`/`modal-sheet` 계열 또는 calendar 전용 sheet 클래스를 쓰되, 카드 안 카드 구조를 만들지 않는다.

## 실행 Slice 1

### 범위

1. `render-calendar.js`
   - `_renderWorkoutCalendar()`의 workout-home `weekdayHtml` `.cal-week-rail-spacer`에 `목표입력` 버튼을 추가한다.
   - `_renderWorkoutCycleRail()`에는 `목표입력` 버튼을 렌더하지 않는다.
   - `_bindWorkoutCycleRailActions(root)`에 `[data-cal-goal-input]` capture handler를 추가한다.
   - `_openWorkoutGoalInputSheet()`, `_renderWorkoutGoalInputSheet()`, `_workoutGoalExerciseOptions()` 같은 helper를 추가한다.
   - `loadAndInjectModals()`와 `wtOpenExerciseEditor(..., { returnToPicker: false })` 연결을 구현한다.
   - 기존 `[data-cal-cycle-target]` 동작과 `_openWorkoutCycleTargetSettings()`는 변경하지 않는다.

2. `workout/exercises.js`
   - `wtOpenExerciseEditor(exId, defaultMuscleId, options = {})` 형태로 options를 추가한다.
   - editor DOM 또는 module state에 return mode를 저장한다.
   - `wtCloseExerciseEditor()`, `wtSaveExerciseFromEditor()`, `wtDeleteExerciseFromEditor()`가 return mode를 보고 picker 자동 복귀 여부를 결정하게 한다.
   - 기존 picker 진입 경로의 기본 동작은 그대로 유지한다.

3. `style.css`
   - `.cal-week-rail-spacer .cal-cycle-goal-input`, 목표입력 sheet/select/action 스타일을 TDS/Seed 토큰 기반으로 추가한다.
   - 기존 `.cal-cycle-branch` 목표 chip과 시각적으로 구분하되, 같은 왼쪽 목표 칸 계열 안에서 튀지 않게 한다.

4. `sw.js`
   - `render-calendar.js`, `style.css`, `workout/exercises.js`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 반드시 bump한다.

5. 테스트
   - `tests/workout-calendar-bottom-sheet.test.js`에 요일 헤더 왼쪽 spacer `목표입력` 버튼 렌더, cycle rail 내 미렌더, capture binding, 기존 target card handler 보존, `saveWorkoutDay()` 미호출 계약을 추가한다.
   - `tests/ex-picker-selection-flow.test.js` 또는 `tests/exercise-program-editor.test.js`에 editor return mode 계약을 추가한다.
   - 새 테스트가 필요하면 `tests/calendar-goal-input-editor-flow.test.js`로 분리하되, 문자열 테스트만으로 끝내지 말고 최소 DOM harness로 `목표입력 -> select -> 종목 수정 title/name` 흐름을 검증한다.

### 제외

- 기존 성장보드/Max V4 계획 조정 시트의 저장 로직 변경.
- 목표 chip 계산 방식, `buildExerciseProgramWorkoutPrescription()`, `test_board_v2` schema 변경.
- 오늘 운동 기록에 자동으로 종목 추가.
- 러닝/유산소 목표 입력.
- `www/` 직접 수정.

## 검증

1. RED 우선
   - `node --test tests/workout-calendar-bottom-sheet.test.js tests/ex-picker-selection-flow.test.js tests/exercise-program-editor.test.js`
   - 현재 코드에서는 `목표입력` 버튼/handler/editor return mode가 없어 실패해야 한다.

2. 정적 검증
   - `node --check render-calendar.js && node --check workout/exercises.js && node --check sw.js`
   - `git diff --check`

3. 테스트
   - `node --test tests/workout-calendar-bottom-sheet.test.js tests/ex-picker-selection-flow.test.js tests/exercise-program-editor.test.js`
   - `node --test tests/*.test.js`
   - `npm.cmd run verify:assets`

4. 브라우저 QA
   - 모바일 390x844에서 `운동 -> 달력 홈`으로 진입한다.
   - 각 주 왼쪽 rail에 `목표입력` 버튼이 보이고 기존 목표 chip은 계속 눌린다.
   - `목표입력` 클릭 시 첫 번째 바텀시트가 열리고 `운동 종목` select가 보인다.
   - 종목 하나를 선택하고 `다음`을 누르면 첫 sheet가 닫히고 `종목 수정` sheet가 열린다.
   - 열린 sheet의 `종목 이름`이 선택한 운동명이고, `프로그램` 영역이 두 번째 참고 사진처럼 보인다.
   - 취소/저장 후 운동종목 picker가 갑자기 열리지 않는다.
   - pageerror/console error가 없다.

5. 운영 검증
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - production Pages URL에서 위 브라우저 QA flow를 직접 확인한다.

## 2026-07-08 배치 회귀 수정

- 사용자 피드백: `목표입력`은 주차별 왼쪽 레일의 첫 줄이 아니라 요일 헤더 `일` 왼쪽 칸에 있어야 한다.
- 진단: 버튼이 `_renderWorkoutCycleRail()` 안에 있으면 첫 번째 주 row의 왼쪽 레일에 렌더되어, 화면상 `일` 왼쪽이 아니라 `일` 아래쪽 왼쪽처럼 보인다.
- 수정: `목표입력` 버튼을 workout-home `weekdayHtml`의 `.cal-week-rail-spacer`로 이동하고, `_renderWorkoutCycleRail()`에서는 제거했다. 주차별 목표 카드는 다시 `.cal-cycle-branch-list` 중앙 정렬을 사용한다.
- 회귀 테스트: `tests/workout-calendar-bottom-sheet.test.js`에 `.cal-week-rail-spacer` 렌더, `goalInputWeekStart`, cycle rail 내 `목표입력` 미렌더 계약을 추가했다.

## 다음 세션 시작점

`docs/ai/features/2026-07-08-calendar-goal-input-exercise-editor.md`의 `실행 Slice 1`을 실행한다. 앱 코드는 이 계획 범위만 수정하고, `render-calendar.js`, `workout/exercises.js`, `style.css`를 바꾸면 `sw.js` `CACHE_VERSION`도 같은 변경에 포함한다.
