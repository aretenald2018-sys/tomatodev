# 운동 하단 시트 종목 추가 초안 카드 회귀 수정

## 배경

사용자가 운동 탭 1화면 하단 시트에서 `+`로 운동 종목을 추가했을 때, 피커 선택 후 같은 1화면 시트에 종목 카드가 바로 보여야 한다. 현재는 선택 흐름이 실행되어도 새 종목이 `kg/reps/done`이 없는 초안 상태이면 하단 시트 표시 로직이 이를 빈 회차로 처리해 “추가가 안 됨”처럼 보일 수 있다.

## 진단

1. `render-calendar.js`의 하단 시트 상세는 `_workoutMetrics()` 결과의 `wx.hasWorkout`으로 기록/빈 화면을 결정한다.
2. `_workoutMetrics()`는 `_exerciseRows()`가 반환한 운동 row만 카드로 렌더한다.
3. `_exerciseRows()`는 실제 세트 또는 메모가 없는 entry를 버린다.
4. 피커로 막 추가한 운동 entry는 종목명/`exerciseId`는 있지만 아직 실제 세트 기록이 없을 수 있다.
5. 따라서 저장된 `workoutSessions`에 초안 종목이 있어도 하단 시트는 빈 화면을 렌더할 수 있다.

## 실행 범위

Slice 1만 실행한다.

1. `workout/exercises.js`
   - 하단 시트 `afterSelect` 흐름으로 추가한 종목은 `saveWorkoutDay({ keepDraftExercises: true })`로 저장해 초안 entry가 저장 정리 단계에서 사라지지 않게 한다.
2. `workout/save.js`
   - `saveWorkoutDay` 옵션에 `keepDraftExercises`를 추가하고, 명시 옵션이 있을 때 `_cleanExercises(..., includeDrafts)`가 초안을 보존하도록 한다.
3. `render-calendar.js`
   - 일반 캘린더/월간 집계 기준은 유지한다.
   - 운동 하단 시트 상세 렌더에서만 `exerciseId`/운동명이 있는 초안 entry도 카드 row로 포함한다.
   - 회차 탭 표시도 하단 시트에서는 초안 종목을 기록 표시 대상으로 인정한다.
4. 테스트
   - 피커 선택 저장 옵션 회귀 테스트를 갱신한다.
   - 하단 시트가 초안 운동 row를 표시하도록 source contract 테스트를 추가한다.
5. `sw.js`
   - `STATIC_ASSETS`에 포함된 JS를 수정하므로 `CACHE_VERSION`을 bump한다.

## 제외 범위

- 운동 기록 편집 화면 전체 UX 변경
- 월간 캘린더의 운동일/월간 통계 집계 기준 변경
- 러닝/식단 저장 흐름 변경
- 하단 시트 디자인 재작업

## 검증

1. `node --check render-calendar.js`
2. `node --check workout/exercises.js`
3. `node --check workout/save.js`
4. `node --check sw.js`
5. `node --test tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-save-mode-guard.test.js`
6. `node scripts/verify-runtime-assets.mjs`
7. `git diff --check`
8. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행

바로 Slice 1을 실행한다.
