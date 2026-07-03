# 2026-07-03 운동 바텀시트 재열기 캐러셀 상태 보존 리뷰

## 결론

- 리뷰 결과: PASS
- 추가 수정 필요: 없음

## 검토 범위

1. `render-calendar.js`
2. `sw.js`
3. `tests/workout-calendar-bottom-sheet.test.js`
4. 서비스워커 캐시 marker를 참조하는 테스트 파일들
5. `docs/ai/features/2026-07-03-workout-carousel-reopen-state.md`
6. `docs/ai/NEXT_ACTION.md`

## 확인 내용

1. 기존 `_captureWorkoutSheetCarouselState()`와 `_restoreWorkoutSheetCarouselState()`는 유지했고, 저장/재렌더 중 위치 보존 역할을 계속 담당한다.
2. 날짜+회차 key 기반 `_workoutSheetCarouselSnapshots`를 추가해 마지막 slide index를 화면 상태로만 기억한다.
3. `_setWorkoutHomeSheetState('bar')`와 `applyWorkoutCalendarNavSnapshot()`의 닫힘 경로가 닫기 전 현재 slide를 저장한다.
4. `_toggleWorkoutHomeSheet()`, `_openWorkoutHomeDay()`, `_goTodayWorkoutDetail()`, `_selectWorkoutHomeSession()`이 렌더 직후 저장된 slide를 복원한다.
5. 운동 선택기에서 새 종목을 추가/선택한 직후 `_restoreWorkoutSheetCarouselToSlide()`가 해당 slide를 마지막 상태로도 기록한다.
6. `render-calendar.js`가 `STATIC_ASSETS` 대상이라 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z6-workout-carousel-reopen-state`로 bump했고 cache marker 테스트를 갱신했다.

## 검증

1. PASS: `node --check render-calendar.js; node --check sw.js`
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js` - 41 pass
3. PASS: `node --test tests/*.test.js` - 649 pass
4. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=868`
5. PASS: `git diff --check`
6. PASS: `npm.cmd run deploy:production` - 운영계 deploy verify 및 기본 marker 검증 완료
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <deployed-commit>`
8. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ "sw.js::tomatofarm-v20260703z6-workout-carousel-reopen-state" "render-calendar.js::_workoutSheetCarouselSnapshots" "render-calendar.js::_restoreRememberedWorkoutSheetCarousel" "render-calendar.js::_rememberWorkoutSheetCarouselState"`

## 잔여 리스크

- not verified yet: 인증 계정 실제 UI에서 `새 종목 카드 표시 -> 하단시트 닫기 -> 다시 열기 -> 같은 종목 카드 표시` 클릭 플로우는 자동 검증하지 못했다.
