# 웬들러 프로그램 상태 재로딩 보존 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md` Slice 10
- 변경 파일:
  - `data/data-load.js`
  - `workout/exercises.js`
  - `tests/exercise-program-editor.test.js`
  - `sw.js`
  - cache-version 기대값 테스트

## 리뷰 결과

- PASS: `test_board_v2` 저장 위치와 로딩 위치가 일치한다.
  - `saveTestBoardV2()`가 `settings/test_board_v2`에 쓰는 값을 `loadAll()`이 다시 `_settings.test_board_v2`로 재수화한다.
  - 새로고침 후 `getTestBoardV2()`가 `null`로 돌아가 프로그램 설정이 초기화되는 회귀를 막는다.
- PASS: 종목 저장 후 프로그램 저장 기준 레코드가 더 안정적이다.
  - `saveExercise(record)` 이후 검증된 `saved` 레코드를 `_saveExerciseProgramFromEditor()`에 넘겨 `movementId` 등 정규화 필드를 유지한다.
- PASS: `data/data-load.js`는 `STATIC_ASSETS`에 포함되어 있고, `sw.js` `CACHE_VERSION` bump가 같은 변경에 포함되었다.

## 검증

- PASS: `node --check data/data-load.js; node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/exercise-program-editor.test.js tests/data.load-save.test.js tests/workout-test-mode-unified.test.js` — 37 tests passed
- PASS: `node --test .\tests\*.test.js` — 530 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 36f5b53`
  - 결과: `[deploy-verify] ok 36f5b533d8ff tomatofarm-v20260626z2-wendler-state-reload static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z2-wendler-state-reload" "data/data-load.js::_settings.test_board_v2    = fbMap.test_board_v2" "workout/exercises.js::const programRecord = saved || record"`

## 남은 리스크

- not verified yet: 인증 계정이 없어 실제 배포 UI에서 `종목 수정 -> 웬들러 저장 -> 새로고침/재진입` 플로우는 직접 클릭 검증하지 못했다.
