# 2026-07-05 Workout Set Inline Swipe Fix Review

## 상태

- 결과: PASS
- 계획: `docs/ai/features/2026-07-05-workout-set-inline-swipe-fix.md`
- 범위: 모바일 세트 행 `kg/횟수` 인라인 수정, 삭제 `×` hit target 확대/분리, 좌우 swipe 삭제, 새 종목 추가 후 carousel focus 회귀 검증

## 검토 결과

1. PASS: 접힌 세트 행의 `kg/횟수` 값 칸은 펼침 editor를 열지 않고 해당 칸 안의 숫자 input으로 전환된다.
2. PASS: input focus 시 기존 값이 지워져 사용자가 숫자를 별도로 삭제하지 않아도 바로 입력할 수 있다.
3. PASS: 삭제 `×` hit target은 모바일 기준 42px x 38px 이상이고, 파란 펼침 토글보다 왼쪽에 8px 간격으로 분리된다.
4. PASS: 세트 행은 왼쪽 swipe와 오른쪽 swipe 모두 같은 삭제 경로를 탄다.
5. PASS: 새 종목 추가 후 선택한 exercise carousel slide를 복원하는 기존 회귀 테스트가 통과한다.
6. PASS: `render-calendar.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260705z1-workout-set-entry-followup-z3-workout-set-inline-swipe`로 bump했다.

## 검증

1. PASS: RED focused tests - 기존 구현에서 `kg/횟수` 인라인 편집 함수 부재와 swipe 방향 기대 차이로 실패 확인.
2. PASS: `node --check render-calendar.js && node --check tests/workout-calendar-bottom-sheet.test.js && node --check tests/workout-set-minimal-dom.test.js && node --check .omo/evidence/workout-set-inline-swipe/production-inline-swipe-flow.mjs && npm.cmd run verify:assets && node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js`
3. PASS: `node --test tests/*.test.js` - 704 pass.
4. PASS: `npm.cmd run deploy:production` - GitHub Pages deploy and deployed marker verification passed.
5. PASS: production mobile E2E `node .omo/evidence/workout-set-inline-swipe/production-inline-swipe-flow.mjs <commit>`
   - 운영 앱 smoke: `kg` focus value `''`, editor open `false`, inline editing `true`.
   - 운영 앱 smoke: delete target `42 x 38`, expand gap `8`.
   - deployed source harness: `kg/reps` inline focus value `''`, `55kg / 15회` 저장, 오른쪽 swipe 1회와 왼쪽 swipe 1회 후 row count `1`.
   - evidence: `.omo/evidence/workout-set-inline-swipe/production-inline-swipe-flow.json`

## 잔여 리스크

- 인증된 실제 사용자 데이터 변경은 하지 않았다. 생산 URL에서는 앱 smoke와 deployed source harness로 동일한 렌더/action 경로를 검증했다.
