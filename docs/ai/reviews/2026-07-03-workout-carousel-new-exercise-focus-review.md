# 2026-07-03 운동 새 종목 추가 후 캐러셀 포커스 리뷰

## 결론

- 리뷰 결과: PASS
- 추가 수정 필요: 없음

## 검토 범위

1. `render-calendar.js`
2. `sw.js`
3. `tests/workout-calendar-bottom-sheet.test.js`
4. 서비스워커 캐시 marker를 참조하는 테스트 파일들
5. `docs/ai/features/2026-07-03-workout-carousel-new-exercise-focus.md`
6. `docs/ai/NEXT_ACTION.md`

## 확인 내용

1. `_refreshWorkoutHomeAfterPickerSelect()`가 선택기 콜백의 `detail.entryIdx`를 `entryIndex`로 정규화한다.
2. `renderWorkoutCalendarHome()` 이후 `_restoreWorkoutSheetCarouselToSlide(entryIndex)`를 호출해 새 DOM 기준으로 선택된 slide를 복원한다.
3. `_restoreWorkoutSheetCarouselToSlide()`는 즉시, `requestAnimationFrame`, 지연 `setTimeout`으로 새 시트 DOM을 다시 찾아 캐러셀 track을 복원한다.
4. 기존 세트 저장/체크 경로의 `_workoutSheetScrollState()` 기반 캐러셀 위치 보존 로직은 변경하지 않았다.
5. `render-calendar.js`가 `STATIC_ASSETS` 대상이라 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z5-workout-carousel-new-focus`로 bump했고 cache marker 테스트를 갱신했다.

## 검증

1. PASS: `node --check render-calendar.js; node --check sw.js`
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js` - 40 pass
3. PASS: `node --test tests/*.test.js` - 648 pass
4. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=868`
5. PASS: `git diff --check`
6. PASS: `npm.cmd run deploy:production` - 운영계 deploy verify 및 기본 marker 검증 완료
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <deployed-commit>`
8. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ "sw.js::tomatofarm-v20260703z5-workout-carousel-new-focus" "render-calendar.js::_restoreWorkoutSheetCarouselToSlide" "render-calendar.js::carouselSlideIndex: index"`

## 잔여 리스크

- not verified yet: 인증 계정 실제 UI에서 `운동 하단시트 + 버튼 -> 새 종목 선택 -> 추가된 종목 카드 표시` 클릭 플로우는 자동 검증하지 못했다.
