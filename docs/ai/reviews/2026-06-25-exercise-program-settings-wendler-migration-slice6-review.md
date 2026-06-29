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

## 배포 확인

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 763fa44`
  - `[deploy-verify] ok 763fa441465e tomatofarm-v20260625z64-wendler-start-calendar static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z64-wendler-start-calendar" "workout/exercises.js::data-ex-program-calendar-toggle" "workout/exercises.js::Training Max, 실제 1RM보다 낮게 잡는 프로그램 기준 중량" "workout/test-v2/board-core.js::programStartDate" "style.css::.ex-program-mini-cal"`
- PASS: 배포 URL에서 로그인 화면, 운동 탭 루트, `#ex-editor-modal`, `#ex-picker-modal` DOM 로드 확인.
- not verified yet: 인증 계정이 없어 `운동 탭 -> 종목 수정 -> 웬들러 -> 시작 주 캘린더 선택 -> 저장` 실제 UI flow는 직접 저장 확인 미완료.
