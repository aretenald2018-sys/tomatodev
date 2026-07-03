# 2026-07-03 운동 추가/카드 추가 결합 완화 리팩토링 Slice 3 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 실행 슬라이스: Slice 3 `종목 editor 저장 계약 분리`
- 변경 파일:
  - `workout/exercises.js`
  - `workout/exercise-editor-actions.js`
  - `tests/exercise-editor-actions.test.js`
  - `tests/exercise-program-editor.test.js`
  - `sw.js`
  - cache marker 테스트

## 결론

- 발견된 P0/P1/P2 이슈: 없음
- `wtSaveExerciseFromEditor()`의 책임이 DOM/custom muscle orchestration으로 줄었고, 운동 record 생성/검증은 독립 helper로 테스트된다.
- `saveExercise()` Firestore 계약과 program schema는 변경하지 않았다.
- program save는 검증된 saved record만 사용하므로 저장 실패나 불일치 상태에서 성장 보드 설정을 이어서 쓰는 위험이 줄었다.

## 검증

- PASS: `node --check workout/exercises.js; node --check workout/exercise-editor-actions.js; node --check workout/exercise-entry-actions.js; node --check sw.js`
- PASS: `node --test tests/exercise-editor-actions.test.js tests/exercise-program-editor.test.js tests/ex-picker-selection-flow.test.js tests/workout-exercise-entry-actions.test.js tests/stats-picker-ui-polish.test.js tests/workout-picker-gym-rail.test.js` - 27 pass
- PASS: `node --test tests/*.test.js` - 660 pass
- PASS: `git diff --check`
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=874`

## 잔여 리스크

- 브라우저 UI 클릭 검증은 인증 세션이 필요해 아직 not verified yet.
- editor DOM 생성/표시(`wtOpenExerciseEditor`)와 program editor DOM binding은 아직 같은 파일에 남아 있다. 이번 slice는 record 생성/검증 경계만 분리했다.

## 다음 액션

- Slice 4 `afterSelect detail contract` 또는 전역 hotspot 후속 slice를 진행한다.
