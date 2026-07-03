# 운동 카드 캐러셀 위치 보존 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-carousel-position-preserve.md`
- 변경 파일:
  - `render-calendar.js`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 테스트들
  - `docs/ai/NEXT_ACTION.md`

## findings

문제 없음.

## 확인 내용

1. `_workoutSheetScrollState()`가 기존 세로 scroll 상태와 함께 `data-wt-day-exercise-carousel-track`의 `scrollLeft`와 가장 가까운 `data-wt-day-exercise-slide` index를 캡처한다.
2. `_restoreWorkoutSheetScrollState()`가 재렌더된 하단시트에서 캐러셀 track을 찾아 같은 horizontal 위치를 복원한다.
3. 세트 입력 저장은 기존 `preserveInput` 경로를 통해 캐러셀 상태를 포함한 scroll state를 복원한다.
4. 세트 체크/추가/삭제 저장은 기존 `preserveSheetScroll` 경로를 통해 같은 캐러셀 상태 복원을 사용한다.
5. `render-calendar.js`가 `STATIC_ASSETS` 대상이라 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z4-workout-carousel-position`으로 bump했고 cache marker 테스트를 갱신했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js` - 39 pass
- PASS: `node --test tests/*.test.js` - 647 pass
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=868`
- PASS: `git diff --check`

## 남은 리스크

- 자동화 환경에서는 인증 계정 실제 UI를 조작하지 못했다. 운영계 배포 후 사용자가 `운동 탭 -> 하단시트 -> 두 번째 종목 카드 -> 세트 입력/체크` 플로우에서 카드 위치가 유지되는지 확인해야 한다.

## 결론

추가 수정 이슈 없음. 현재 슬라이스는 리뷰 완료이며 운영계 배포 검증 후 사용자 확인 대상으로 넘길 수 있다.
