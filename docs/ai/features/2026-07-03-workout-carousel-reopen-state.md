# 2026-07-03 운동 바텀시트 재열기 캐러셀 상태 보존

## 상태

- 상태: `complete`
- 트리거: `/diagnose`
- 요청: 운동 하단시트를 닫았다 다시 열면 첫 종목이 아니라 닫기 직전에 보고 있던 종목 카드가 보여야 한다.

## 진단

1. `_captureWorkoutSheetCarouselState()`와 `_restoreWorkoutSheetCarouselState()`는 세트 저장/입력 재렌더 같은 같은 렌더 흐름 안의 위치 보존에는 사용된다.
2. `_restoreWorkoutSheetCarouselToSlide()`는 운동 선택기에서 새 종목을 추가한 직후 선택된 slide로 이동하는 일회성 helper다.
3. 하지만 `_setWorkoutHomeSheetState('bar')`로 닫을 때 현재 캐러셀 slide를 별도 상태에 저장하지 않는다.
4. `_toggleWorkoutHomeSheet()`나 `_openWorkoutHomeDay()`로 다시 열 때도 이전 slide 상태를 찾아 복원하지 않는다.
5. 따라서 바텀시트가 다시 렌더되면 캐러셀 track이 기본 위치인 첫 번째 slide에서 시작한다.

## 실행 범위

1. 날짜+회차 단위로 마지막 운동 카드 slide index를 기억하는 lightweight 메모리 상태를 추가한다.
2. 하단시트를 닫기 직전에 현재 캐러셀 slide를 저장한다.
3. 하단시트를 다시 열거나 같은 날짜를 다시 열 때 저장된 slide를 렌더 직후 복원한다.
4. 회차 탭 전환 시 현재 회차의 slide를 저장하고, 전환된 회차에 저장된 slide가 있으면 복원한다.
5. 운동 선택기로 특정 종목을 추가/선택한 직후에도 해당 slide를 마지막 상태로 기록한다.
6. `render-calendar.js`는 `sw.js` `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 함께 bump한다.

## 검증 계획

1. 정적 테스트로 `닫기 전 저장 -> 열기 후 복원` 연결을 고정한다.
2. 기존 `추가 직후 선택 slide 이동`, `세트 저장 중 캐러셀 위치 보존` 테스트가 회귀하지 않는지 확인한다.
3. `node --check render-calendar.js; node --check sw.js`
4. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js`
5. `node --test tests/*.test.js`
6. `node scripts/verify-runtime-assets.mjs`
7. `git diff --check`
8. 운영계 Pages 배포 후 `verify:deploy`와 marker 검증을 실행한다.

## 완료 기준

- 새 종목 카드가 보이는 상태에서 하단시트를 닫았다 다시 열면 같은 종목 카드가 보인다.
- 회차별 캐러셀 위치가 서로 섞이지 않는다.
- 기존 세트 입력/체크 후 현재 카드 유지 동작과 새 종목 추가 직후 포커스 동작이 유지된다.
