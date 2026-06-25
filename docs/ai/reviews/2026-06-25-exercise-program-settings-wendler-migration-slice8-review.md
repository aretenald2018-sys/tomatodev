# 종목 프로그램 설정 / 웬들러 캘린더 배치와 입력 밀도 Slice 8 리뷰

## 리뷰 결과

- 발견 이슈: 없음.
- 범위 확인: 웬들러 시작 주 캘린더의 배치/클릭 가능 영역과 웬들러 입력 밀도만 변경했다.
- 데이터 계약 확인: `programStartDate`, TM 계산식, 저장 구조는 변경하지 않았다.

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
- 가능하면 배포 페이지에서 `종목 수정 -> 웬들러 -> 시작 주`를 눌러 캘린더 전체 날짜 열이 클릭 가능한지 직접 확인한다.
