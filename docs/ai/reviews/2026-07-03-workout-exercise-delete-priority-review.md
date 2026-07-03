# 운동 종목 삭제 우선순위 핫픽스 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-exercise-delete-priority.md`
- 변경 파일:
  - `render-calendar.js`
  - `workout/timers.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/workout-active-session-recovery.test.js`
  - `sw.js`
  - cache marker 테스트 파일들
  - `docs/ai/NEXT_ACTION.md`

## 결과

- finding 없음.

## 확인한 점

- `x` 삭제와 `종목완료`는 모두 `upsertWorkoutSession()` 결과를 저장하므로 Firestore payload는 같은 session aggregate 경로를 탄다.
- 새 helper `wtReplaceActiveWorkoutDraftSession()`은 기존 active draft가 같은 날짜/회차일 때만 저장된 세션으로 교체한다.
- `render-calendar.js`는 하단시트 저장 성공 후 `options.sessionIndex`로 지정된 저장 회차만 active draft와 `S.workout`에 반영한다.
- 같은 날짜여도 현재 운동 탭이 다른 회차를 보고 있으면 `S.workout`은 건드리지 않는다.
- `sw.js` `CACHE_VERSION`은 변경된 정적 자산에 맞춰 bump되었다.

## 자체 리뷰에서 수정한 점

- 초기 구현은 저장 결과의 모든 `workoutSessions`를 순회해 active draft 교체를 시도했다.
- 이 경우 사용자가 다른 회차에 최신 draft를 가지고 있을 때, 저장하지 않은 회차의 draft까지 오래된 session snapshot으로 덮을 수 있다.
- 저장한 `sessionIndex` 하나만 동기화하도록 `render-calendar.js`와 회귀 테스트를 수정했다.

## 검증

- PASS: `node --check render-calendar.js; node --check workout/timers.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-active-session-recovery.test.js tests/workout-save-mode-guard.test.js` - 37 pass
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=868`
- PASS: `node --test tests/*.test.js` - 645 pass
- PASS: `git diff --check`
- not verified yet: 인증 계정 실제 UI에서 `운동 홈 하단시트 -> 종목완료 -> x 삭제 -> 새로고침/재진입 후 삭제 유지` 클릭 플로우는 자동 검증하지 못했다.

## 다음 상태

- 현재 slice는 리뷰 완료.
- 배포 검증이 필요하면 `origin/main` push 후 Dashboard3 Pages에서 배포 commit과 실제 UI flow를 확인한다.
