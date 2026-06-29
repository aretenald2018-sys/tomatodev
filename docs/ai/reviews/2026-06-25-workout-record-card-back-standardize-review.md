# 운동 기록 카드 화면 표준화 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-workout-record-card-back-standardize.md`
- 슬라이스: 운동 추가/기존 운동 선택 후 기준 운동 기록 카드 화면 유지

## 변경 요약

1. 운동 피커 선택과 운동 카드 제목/목표 클릭이 더 이상 `WorkoutDetailScreen` route를 만들지 않는다.
2. 선택된 운동은 기존 기록 화면의 `ex-max-v2` 카드로 스크롤/포커스된다.
3. 운동 기록 화면 날짜 바에 `wt-record-back-btn`을 추가해 캘린더 + 열린 바텀시트 상태로 돌아갈 수 있게 했다.
4. 과거 history에 남은 detail route가 들어와도 별도 상세 화면 대신 record mode에서 선택 카드 포커스로 흡수한다.
5. `sw.js` `CACHE_VERSION`과 versioned module query를 `tomatofarm-v20260625z47-workout-record-card-standard`로 갱신했다.

## 검증

- PASS: `node --check app.js; node --check render-workout.js; node --check workout/index.js; node --check workout/load.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 5fb5367`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "index.html::wt-record-back-btn" "app.js::wtFocusWorkoutEntryFromDetail?.(detailTarget)" "workout/exercises.js::wtFocusWorkoutEntryCard(existingIdx)" "workout/exercises.js::block.dataset.wtEntryIdx = String(idx)" "sw.js::tomatofarm-v20260625z47-workout-record-card-standard"`

## 남은 리스크

- 인증이 필요한 실제 모바일 UI 클릭 흐름은 배포 후 사용 계정에서 최종 확인이 필요하다.
- 자동 테스트는 정적 wiring과 navigation stack 동작을 검증하며, 실제 브라우저 터치 제스처 녹화 검증은 별도다.
