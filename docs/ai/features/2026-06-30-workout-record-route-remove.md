# 운동 기록 record UI 렌더 경로 제거 계획

## 상태

- 상태: reviewed
- 요청일: 2026-06-30
- 유형: `/diagnose` 기반 회귀 원천 차단
- 대상: 운동 탭의 legacy record/edit 화면 렌더 진입점

## 요청

사용자가 하단 시트 1화면 흐름을 계속 쓰고 있는데, 기존 운동기록 화면이 다시 렌더되는 회귀가 반복됐다. 단순히 버튼을 막는 대신, 해당 운동기록 UI를 렌더하는 코드 경로 자체를 제거해 원천 차단한다.

## 진단

1. `app.js`에는 `pushWorkoutRecord()`를 통해 `WORKOUT_ROUTES.RECORD` route를 만들고 `_setWorkoutSurface('record')`로 old record 화면을 표시하는 경로가 남아 있다.
2. `render-calendar.js`에는 `_openWorkoutEditorForSession()`과 `_loadWorkoutEditorForSession()`이 남아 있어 실패 fallback이나 러닝/루틴 진입 중 record route를 다시 열 수 있다.
3. `index.html` 운동 탭에는 legacy `workout-date-nav` row가 정적 DOM으로 남아 있다.
4. 따라서 하단 시트 버튼을 하나씩 막아도, record route/surface가 살아 있으면 같은 UI가 다른 경로로 회귀할 수 있다.

## 실행 범위

Slice 1만 실행한다.

1. `app.js`에서 workout record route를 직접 push/render하지 않게 한다.
2. `wtOpenWorkoutRecord` 호환 함수는 남기되, 내부 동작은 하단 시트 open으로 리다이렉트한다.
3. `WORKOUT_ROUTES.RECORD` 또는 `DETAIL` route가 들어와도 `_setWorkoutSurface('record')`를 호출하지 않고 calendar day sheet로 정규화한다.
4. `render-calendar.js`의 `_openWorkoutEditorForSession()` / `_loadWorkoutEditorForSession()`를 제거하고, 남은 호출부는 `_loadWorkoutStateForSheetSession()` 또는 toast 실패 처리로 바꾼다.
5. `index.html` 운동 탭의 legacy 날짜 row를 제거한다.
6. 관련 테스트와 `sw.js` cache version을 갱신한다.

## 제외

- 하단 시트 inline edit 기능 자체는 유지한다.
- 운동 picker, 타이머, 러닝 session modal은 유지한다.
- `workout/navigation-stack.js`의 route 상수/저장 구조는 이번 Slice에서 삭제하지 않는다. 외부/이전 history 호환 입력을 하단 시트로 흡수하는 데 사용될 수 있다.
- 정적 DOM 안의 타이머/피커 의존 anchor까지 제거하지 않는다.

## 검증

1. `node --check app.js`
2. `node --check render-calendar.js`
3. `node --check sw.js`
4. `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-timer-summary-only.test.js`
5. `node scripts/verify-runtime-assets.mjs`
6. `node --test --test-reporter=dot tests/*.test.js`
7. `git diff --check`
8. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-record-route-remove.md`의 Slice 1을 실행한다. legacy workout record route/surface 렌더 경로를 제거하고, 해당 경로가 들어와도 하단 시트로 리다이렉트되게 만든다.

## 실행 결과

- 완료: `app.js`에서 `pushWorkoutRecord` 기반 record route 렌더를 제거했다.
- 완료: `wtOpenWorkoutRecord` 호환 호출은 하단 시트 open으로 리다이렉트한다.
- 완료: `render-calendar.js`의 `_openWorkoutEditorForSession()` / `_loadWorkoutEditorForSession()`를 제거했다.
- 완료: 운동 탭의 legacy 날짜 row와 record back button DOM/CSS를 제거했다.
- 완료: `sw.js` cache version을 `tomatofarm-v20260630z11-record-route-removed`로 갱신했다.
- 리뷰: `docs/ai/reviews/2026-06-30-workout-record-route-remove-review.md`
