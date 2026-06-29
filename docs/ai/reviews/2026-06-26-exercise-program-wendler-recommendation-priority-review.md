# 추천 종목 웬들러 처방 우선순위 리뷰

## 대상

- 계획 문서: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md` Slice 11
- 변경 파일:
  - `workout/exercises.js`
  - `tests/workout-test-mode-unified.test.js`
  - `sw.js`
  - cache-version expectation tests

## 발견 사항

- 이슈 없음.

## 검토 내용

- `추천 종목 · 선택 헬스장` 후보가 `__maxBenchmarkPicker` 경로에 들어와도, `_buildPickerExerciseEntry()`가 먼저 저장된 종목 프로그램 처방을 확인한다.
- 저장된 웬들러/프로그램 처방이 있으면 준비운동/메인/보조 세트를 가진 program entry를 반환하고, 프로그램 처방이 없을 때만 기존 Max 추천 fallback을 사용한다.
- 기존 수동 입력/완료 세트는 이번 변경에서 자동 덮어쓰지 않는다. 이미 생성된 빈 드래프트 카드가 있으면 사용자가 입력한 세트를 지울 수 있기 때문이다.
- `workout/exercises.js`는 `sw.js` `STATIC_ASSETS` 대상이므로 `CACHE_VERSION` bump가 같이 적용됐다.

## 검증

- PASS: `node --check workout/exercises.js; node --check sw.js`
- PASS: `node --test tests/workout-test-mode-unified.test.js tests/test-v2.board-core.test.js` — 43 tests passed
- PASS: `node --test .\tests\*.test.js` — 531 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 36be474`
  - 결과: `[deploy-verify] ok 36be47482068 tomatofarm-v20260626z4-wendler-recommendation-priority static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z4-wendler-recommendation-priority" "workout/exercises.js::const programEntry = _buildProgramPickerExerciseEntry(ex)" "workout/exercises.js::buildMaxPickerExerciseEntry({"`

## 남은 확인

- not verified yet: 인증 계정이 없어 실제 배포 UI에서 `추천 종목 · 선택 헬스장 -> 웬들러 설정 종목 추가` 클릭 플로우는 직접 확인하지 못했다.
- 이미 만들어진 빈 카드가 화면에 남아 있는 경우, 이번 변경은 기존 드래프트를 자동 덮어쓰지 않으므로 해당 종목을 삭제 후 다시 추가해야 새 처방 세트가 적용된다.
