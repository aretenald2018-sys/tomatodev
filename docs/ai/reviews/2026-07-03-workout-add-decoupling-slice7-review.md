# 2026-07-03 운동 추가/카드 추가 결합 완화 리팩토링 Slice 7 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 실행 슬라이스: Slice 7 `클릭 경량화 1차`
- 변경 파일:
  - `workout/exercises.js`
  - `tests/ex-picker-selection-flow.test.js`
  - `sw.js`
  - cache marker 테스트

## 결론

- 발견된 P0/P1/P2 이슈: 없음
- 하단시트 `afterSelect` 경로에서 picker 선택 직후 숨겨진 운동 탭 리스트/상단/타임라인을 먼저 재렌더하는 중복 작업을 제거했다.
- 일반 운동 탭에서 picker를 여는 기존 경로는 동일하게 렌더/타이머/타임라인을 갱신한다.
- draft 보존과 `saveWorkoutDay({ keepDraftExercises: true })` 후 sheet refresh 흐름은 유지했다.

## 검증

- PASS: `node --check workout/exercises.js; node --check render-calendar.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
- PASS: `node --test tests/ex-picker-selection-flow.test.js tests/workout-exercise-entry-actions.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-save-mode-guard.test.js tests/workout-navigation-stack.test.js tests/stats-picker-ui-polish.test.js tests/workout-picker-gym-rail.test.js` - 60 pass
- PASS: `node --test tests/*.test.js` - 662 pass
- PASS: `git diff --check`
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`

## 잔여 리스크

- 인증 계정 운영 UI에서 `운동 탭 -> 하단시트 + -> 종목 선택 -> 카드 표시` flow는 아직 not verified yet. 운영 브라우저는 로그인 화면이 전체 viewport를 덮고 있어 운동 탭 클릭이 `#login-screen`에 가로막힌다.
- social/login/Max hotspot은 인벤토리에는 남겼지만 이번 계획의 실행 slice 범위를 넘겨 별도 후속 계획으로 다루는 편이 안전하다.

## 다음 액션

- 운영 배포 후 인증 계정으로 실제 UI flow를 확인한다.
- 인증이 계속 불가하면 social/login/Max hotspot 후속 계획을 별도 문서로 만든다.
