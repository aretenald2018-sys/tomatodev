# 2026-07-03 운동 추가/카드 추가 결합 완화 리팩토링 Slice 4 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 실행 슬라이스: Slice 4 `하단시트 afterSelect 계약 명문화`
- 변경 파일:
  - `workout/exercise-entry-actions.js`
  - `render-calendar.js`
  - `tests/workout-exercise-entry-actions.test.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `sw.js`
  - cache marker 테스트

## 결론

- 발견된 P0/P1/P2 이슈: 없음
- 피커 selection detail 필드가 상수와 단위 테스트로 고정됐다.
- 하단시트 refresh는 더 이상 `detail.entryIdx`를 직접 숫자로 해석하지 않고 `normalizeWorkoutExerciseSelectionDetail()` 결과만 사용한다.
- 캐러셀 복원, 기존 종목 재선택 toast 억제, 피커 저장 경로는 기존 동작을 유지한다.

## 검증

- PASS: `node --check render-calendar.js; node --check workout/exercises.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
- PASS: `node --test tests/workout-exercise-entry-actions.test.js tests/ex-picker-selection-flow.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-save-mode-guard.test.js tests/workout-test-mode-unified.test.js` - 55 pass
- PASS: `node --test tests/*.test.js` - 662 pass
- PASS: `git diff --check`
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`

## 잔여 리스크

- 브라우저 UI 클릭 검증은 인증 세션이 필요해 아직 not verified yet. 직전 운영 브라우저 확인에서 로그인 화면이 전체 viewport를 덮고 `button[data-tab="workout"]`의 hit target이 `#login-screen`으로 잡혔다.
- 이번 slice는 detail contract를 고정했지만, 클릭 직후 중복 렌더/저장 경량화는 Slice 7로 남겼다.

## 다음 액션

- Slice 7 `클릭 지연을 만드는 중복 렌더/저장 경로 하나를 경량화`를 진행한다.
