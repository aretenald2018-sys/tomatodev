# 웬들러 picker 처방 세트 회귀 수정 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md` Slice 9
- 변경 파일:
  - `workout/test-v2/board-core.js`
  - `tests/test-v2.board-core.test.js`
  - `sw.js`
  - cache-version 참조 테스트들

## 결과

- 발견 이슈 없음.

## 검토 내용

- `findExerciseProgramBenchmark()`는 `exerciseId` 정확 일치를 계속 최우선으로 둔다.
- 정확 일치가 없을 때만 같은 `movementId`를 fallback으로 허용하므로, 기존 정확 매칭 동작은 유지된다.
- 회귀 테스트가 서로 다른 `exerciseId`와 같은 `movementId` 조합에서 웬들러 준비운동 3세트, 메인 3세트, BBB 5세트와 kg/reps 입력값을 확인한다.
- `workout/test-v2/board-core.js`가 `STATIC_ASSETS` 대상이라 `sw.js` `CACHE_VERSION`과 관련 테스트 기대값이 함께 갱신됐다.

## 검증

- PASS: `node --check workout/test-v2/board-core.js; node --check sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js` — 43 tests passed
- PASS: `node --test .\tests\*.test.js` — 529 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포와 인증 계정의 `운동 탭 -> + -> 종목 수정 -> 웬들러 저장 -> 같은 종목 추가` 실제 UI flow 확인.
