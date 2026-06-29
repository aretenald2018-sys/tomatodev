# 종목 프로그램 설정 / 웬들러 컴팩트 패널과 TM 계산기 Slice 7 리뷰

## 리뷰 결과

- 발견 이슈: 없음.
- 범위 확인: 웬들러 설정 UI 밀도, TM/%TM 설명 축약, 대표 세트 기반 TM 계산기만 변경했다.
- 데이터 계약 확인: 저장되는 웬들러 설정 구조와 `programStartDate` 계약은 유지했다.

## 변경 파일

- `workout/exercises.js`
- `style.css`
- `sw.js`
- `tests/exercise-program-editor.test.js`
- cache-version 참조 테스트들
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md`

## 검증

- `node --check workout/exercises.js`
- `node --check sw.js`
- `node --test tests/exercise-program-editor.test.js` 통과: 3개.
- `node --test .\tests\*.test.js` 통과: 528개.
- `node scripts/verify-runtime-assets.mjs` 통과: `[runtime-assets] ok refs=827`.
- `git diff --check` 통과.

## 배포 확인

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ f1e8eef`
  - `[deploy-verify] ok f1e8eef43521 tomatofarm-v20260625z65-compact-wendler-tm static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z65-compact-wendler-tm" "workout/exercises.js::data-ex-program-tm-calc" "workout/exercises.js::실제 1RM보다 낮은 기준 중량" "workout/exercises.js::estimate1RM(kg, reps)" "style.css::.ex-program-compact-list" "style.css::.ex-program-tm-calc"`
- not verified yet: 인증 계정이 없어 `종목 수정 -> 웬들러 -> 수행 kg/회수 입력 -> TM 계산` 실제 UI 클릭 흐름은 직접 저장 확인 미완료.
