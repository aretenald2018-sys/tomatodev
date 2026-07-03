# 운동 완료 도장 명시 액션 제한 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-complete-stamp-explicit-action.md`
- 변경 파일:
  - `render-calendar.js`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 테스트들
  - `docs/ai/NEXT_ACTION.md`

## findings

문제 없음.

## 확인 내용

1. `+` 버튼은 `_defaultWorkoutSheetSet()`의 `done: false` 빈 세트를 추가하며, `exerciseCompletedAt` marker를 생성하지 않는다.
2. 세트 값 수정, 세트 추가, 세트 삭제, 세트 완료 토글은 `_clearWorkoutExerciseCompletionMarker(entry)`를 호출해 이전 `종목완료` marker를 무효화한다.
3. `완료` 도장 렌더는 `exerciseCompletedAt` marker가 있고 완료 가능한 세트가 모두 `done === true`인 경우에만 동작한다.
4. `종목완료` 경로만 `_markWorkoutExerciseEntryComplete(entry, now)`를 호출해 marker를 저장한다.
5. `exerciseCompletedAt`은 운동 entry 객체 안의 필드이며 `workoutSessions[].exercises`와 aggregate `exercises`가 clone/merge되는 기존 저장 경로에서 보존된다.
6. `render-calendar.js`가 `STATIC_ASSETS` 대상이라 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z3-workout-complete-stamp-marker`로 bump했고, cache marker 테스트를 갱신했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js` - 38 pass
- PASS: `node --test tests/*.test.js` - 646 pass
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=868`
- PASS: `git diff --check`

## 남은 리스크

- 자동화 환경에서는 인증 계정 실제 UI를 조작하지 못했다. 운영계 배포 후 사용자가 `운동 탭 -> 해당 종목 카드 -> + 버튼`을 눌렀을 때 `완료` 도장이 뜨지 않고, `종목완료`를 누른 뒤에만 도장이 뜨는지 확인해야 한다.

## 결론

추가 수정 이슈 없음. 현재 슬라이스는 리뷰 완료이며, 운영계 배포 검증 후 사용자 확인 대상으로 넘길 수 있다.
