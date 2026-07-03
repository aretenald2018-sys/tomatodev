# 2026-07-03 운동 새 종목 추가 후 캐러셀 포커스

## 상태

- 상태: `complete`
- 트리거: `/diagnose`
- 요청: 운동 하단시트에서 새 종목을 추가하면 캐러셀이 첫 종목이 아니라 방금 추가한 종목 카드를 보여줘야 한다.

## 진단

1. 운동 선택기 `afterSelect` 콜백은 선택된 운동의 `entryIdx`를 `_refreshWorkoutHomeAfterPickerSelect()`에 전달한다.
2. 현재 `_refreshWorkoutHomeAfterPickerSelect()`는 날짜, 회차, 시트 상태를 복원하고 `renderWorkoutCalendarHome()`을 호출하지만, `detail.entryIdx`를 캐러셀 위치 복원에 사용하지 않는다.
3. 그래서 새 종목을 추가하거나 이미 들어 있는 종목을 선택한 직후 하단시트가 재렌더되면 캐러셀 track이 기본 위치인 첫 번째 카드에 머물 수 있다.

## 실행 범위

1. `_refreshWorkoutHomeAfterPickerSelect()`가 `detail.entryIdx`를 정규화해 선택된 종목 index를 계산한다.
2. 하단시트 재렌더 후 캐러셀 track을 해당 slide로 복원하는 전용 helper를 추가한다.
3. 새 종목과 기존 종목 재선택 모두 선택한 카드가 보이도록 동일한 경로를 사용한다.
4. `render-calendar.js`는 `sw.js` `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 함께 bump한다.
5. 기존 캐러셀 위치 보존 로직은 세트 저장/체크 경로에 그대로 유지한다.

## 검증 계획

1. 정적 테스트로 `afterSelect -> detail.entryIdx -> 캐러셀 slide 복원` 연결을 고정한다.
2. 기존 캐러셀 위치 보존, 세트 저장, 완료 도장 테스트가 회귀하지 않는지 확인한다.
3. `node --check render-calendar.js; node --check sw.js`
4. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js`
5. `node --test tests/*.test.js`
6. `node scripts/verify-runtime-assets.mjs`
7. `git diff --check`
8. 운영계 Pages 배포 후 `verify:deploy`와 marker 검증을 실행한다.

## 완료 기준

- 운동 하단시트에서 `+`로 선택기를 열고 새 종목을 추가한 뒤, 하단시트 캐러셀이 추가된 종목 카드 위치로 이동한다.
- 이미 추가된 종목을 다시 선택해도 선택한 종목 카드가 보인다.
- 기존 세트 입력/체크 후 현재 카드 유지 동작은 유지된다.
