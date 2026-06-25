# 종목 프로그램 설정 / 웬들러 시작 주 캘린더 Slice 6 리뷰

## 리뷰 결과

- 발견 이슈: 없음.
- 범위 확인: 종목 수정 시트의 웬들러 시작 주 선택 UX, `programStartDate` 저장 계약, active cycle 6주 시작일 정규화, TM/%TM 설명 문구만 변경했다.
- 보류 범위: 성장보드 색칠/미달 자동 반영 통합은 사용자 결정 전까지 진행하지 않았다.

## 변경 파일

- `workout/exercises.js`
- `workout/test-v2/board-core.js`
- `style.css`
- `sw.js`
- `tests/exercise-program-editor.test.js`
- `tests/test-v2.board-core.test.js`
- cache-version 참조 테스트들

## 검증

- `node --check workout/exercises.js`
- `node --check workout/test-v2/board-core.js`
- `node --check sw.js`
- `node --test tests/exercise-program-editor.test.js tests/test-v2.board-core.test.js` 통과: 41개.
- `node --test .\tests\*.test.js` 통과: 528개.
- `node scripts/verify-runtime-assets.mjs` 통과: `[runtime-assets] ok refs=827`.
- `git diff --check` 통과.

## 배포 전 확인 필요

- `origin/main` push 후 Dashboard3 Pages 배포 검증:
  - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 가능하면 배포 페이지에서 `종목 수정 -> 웬들러 -> 시작 주` 버튼을 눌러 미니 캘린더가 열리고, 날짜 선택 후 저장되는 흐름을 직접 확인한다.
