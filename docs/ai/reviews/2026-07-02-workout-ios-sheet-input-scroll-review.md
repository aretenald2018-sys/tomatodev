# 운동 시트 iOS 숫자 입력 스크롤 안정화 리뷰

## 리뷰 대상

- `docs/ai/features/2026-07-02-workout-ios-sheet-input-scroll.md`
- `docs/ai/diagnoses/2026-07-02-workout-ios-sheet-input-scroll.md`
- `render-calendar.js`
- `workout/exercises.js`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `tests/workout-card-layout-css.test.js`
- cache version marker 테스트 파일들

## Findings

- 없음.

## 확인한 사항

- 시트 숫자 input 저장은 기존 `saveDay()`/`renderWorkoutCalendarHome()` 흐름을 유지하되, 저장 전 input 좌표와 `.wt-day-sheet-scroll`/root/window scrollTop을 캡처하고 재렌더 후 `focus({ preventScroll: true })`와 scrollTop 복원을 수행한다.
- 실제 운동 입력 카드의 `wtUpdateSet()`은 change 저장 후 행/카드 재렌더가 발생해도 document scrollTop을 복원한다. 포커스는 강제로 되돌리지 않아 다음 input 탭 전환을 훔치지 않는다.
- 새 세트 KG/REP는 시트와 실제 운동 입력 카드 모두 빈 문자열로 시작한다.
- KG/REP 빈 입력은 `0`으로 되돌리지 않고 빈 값으로 저장된다. 기존 계산 경로는 `Number('')`/`_num('')`에 의해 0처럼 계산되어 볼륨/성공 판정에 새 양수 세트로 오인되지 않는다.
- `render-calendar.js`와 `workout/exercises.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js` cache version bump가 필요했고 반영됐다.

## 검증

- PASS: `node --check render-calendar.js`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 30e018d75677c57f6d4632adfe1ef85d006b57ab` -> `[deploy-verify] ok 30e018d75677 tomatofarm-v20260702z4-workout-ios-sheet-input-scroll static=236`
- PASS: Dashboard3 Pages marker 검증 - `sw.js`, `render-calendar.js`, `workout/exercises.js`에 이번 수정 marker가 반영됐다.
- not verified yet: 인증 iPhone PWA 실제 `운동 탭 -> 종목 추가 -> KG/REP 입력/수정 -> 세트 추가` UI flow 확인이 남아 있다.

## 결정

- 배포/marker 검증까지 완료했으며, 추가 코드 수정 이슈는 없다.
