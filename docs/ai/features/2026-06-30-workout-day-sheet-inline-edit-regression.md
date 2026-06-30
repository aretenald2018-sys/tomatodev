# 운동 하단 시트 편집 버튼 회귀 수정 계획

## 상태

- 상태: reviewed
- 요청일: 2026-06-30
- 유형: `/diagnose` 기반 회귀 수정
- 대상 화면: 운동 탭 캘린더 1화면 하단 시트의 헬스 종목 카드

## 증상

하단 시트에서 헬스 종목 카드의 `편집하기`를 누르면 기존 기록 편집 화면으로 빠진다. 이 때문에 앞서 수정한 1화면 유지 흐름이 깨지고, 타이머와 오늘 운동 기록이 분기되는 것처럼 보인다.

## 진단

1. `render-calendar.js`의 헬스 종목 카드 버튼이 `window._wtCalEditSession(...)`을 호출한다.
2. `_wtCalEditSession`은 `_editWorkoutHomeSession()`에 연결되어 있다.
3. `_editWorkoutHomeSession()`은 `_openWorkoutEditorForSession()`을 직접 호출한다.
4. `_openWorkoutEditorForSession()`은 `wtOpenWorkoutRecord()` 또는 `openWorkoutTab()` 경로로 기록 편집 화면을 연다.
5. 따라서 하단 시트의 `편집하기`는 현재 1화면 시트 작업이 아니라 기존 2화면 기록 편집 경로다.

## 실행 범위

Slice 1에서만 처리한다.

1. 하단 시트 헬스 카드의 `편집하기`가 기존 기록 화면으로 이동하지 않게 한다.
2. 같은 카드 안에서 세트 값을 수정할 수 있는 간단한 inline edit mode를 추가한다.
3. inline edit mode에서 KG, REP, RIR, ROM 값을 저장하고, 세트 완료 토글, 세트 추가, 세트 삭제를 처리한다.
4. 저장은 기존 `upsertWorkoutSession()`과 `saveDay(..., { mode: 'merge' })` 경로를 그대로 사용한다.
5. `render-calendar.js`, `style.css`, `tests/workout-calendar-bottom-sheet.test.js`, cache marker 관련 테스트, `sw.js`만 수정한다.

## 제외

- 운동명 변경, 종목 교체, 드래그 정렬은 이번 Slice에 포함하지 않는다.
- 러닝 탭 편집 흐름은 포함하지 않는다.
- 기존 기록 편집 화면 자체를 제거하지 않는다.

## 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-save-mode-guard.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot tests/*.test.js`
6. `git diff --check`
7. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-day-sheet-inline-edit-regression.md`의 Slice 1을 실행한다. 하단 시트 헬스 카드 `편집하기`에서 `_openWorkoutEditorForSession()`으로 빠지는 경로를 제거하고, 카드 안 inline edit mode로 세트 값을 수정/추가/삭제할 수 있게 한 뒤 검증한다.

## 실행 결과

- 완료: 하단 시트 헬스 카드 `편집하기`를 `_wtCalEditExerciseCard()` inline edit mode로 전환했다.
- 완료: KG, REP, RIR, ROM 입력, 세트 완료 토글, 세트 추가, 세트 삭제를 하단 시트 안에서 처리한다.
- 완료: `_editWorkoutHomeSession()`에서 `_openWorkoutEditorForSession()` 호출을 제거해 stale handler도 기록 route로 빠지지 않게 했다.
- 완료: `sw.js` cache version을 `tomatofarm-v20260630z10-day-sheet-inline-edit`로 갱신했다.
- 리뷰: `docs/ai/reviews/2026-06-30-workout-day-sheet-inline-edit-regression-review.md`
