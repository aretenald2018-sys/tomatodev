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

## 배포 확인

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 66bf22b`
  - `[deploy-verify] ok 66bf22bb1564 tomatofarm-v20260625z66-wendler-calendar-density static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260625z66-wendler-calendar-density" "workout/exercises.js::ex-program-calendar-row" "style.css::position: static" "style.css::min-height: 24px"`
- not verified yet: 인증 계정이 없어 `종목 수정 -> 웬들러 -> 시작 주 캘린더 선택 -> 저장` 실제 UI 클릭 흐름은 직접 저장 확인 미완료.
