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

## 배포 전 확인 필요

- `origin/main` push 후 Dashboard3 Pages 배포 검증:
  - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 가능하면 배포 페이지에서 `종목 수정 -> 웬들러 -> 수행 kg/회수 입력 -> TM 계산` 클릭으로 TM 값 반영을 직접 확인한다.
