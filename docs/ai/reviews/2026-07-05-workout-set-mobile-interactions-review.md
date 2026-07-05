# 운동 세트 모바일 상호작용 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-05-workout-set-mobile-interactions.md`
- 요청: 세트 행 `kg/횟수` 모바일 편집, focus 시 숫자 초기화, 삭제 `×` hit target 확대/분리, 새 종목 추가 후 새 카드 포커스 유지, 세트 행 swipe 삭제.
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/workout-set-minimal-dom.test.js`
  - `docs/ai/NEXT_ACTION.md`
  - `docs/ai/features/2026-07-05-workout-set-mobile-interactions.md`

## 결론

PASS. 요청된 모바일 세트 행 편집/삭제 흐름은 구현됐고, Chromium 모바일 에뮬레이션 E2E와 운영 Pages 모바일 smoke에서 터치 탭, focus clear, 값 변경, 좌측 swipe 삭제, 삭제 버튼 hit target을 직접 검증했다.

## 요구사항별 확인

1. `kg/횟수` 더블탭/클릭 편집
   - PASS: 접힌 값 표시를 `data-wt-set-edit-field="kg|reps"` button으로 렌더한다.
   - PASS: `edit-set-field` action이 `_focusWorkoutSetEditorFieldFromSheet()`를 통해 editor를 열고 해당 input에 focus한다.

2. 숫자 칸 클릭 시 기존 값 초기화
   - PASS: `_clearWorkoutSetInputOnFocus()`가 `data-wt-set-clear-on-focus` input의 첫 focus 값을 빈 문자열로 바꾼다.
   - PASS: 기존 저장은 `change` 경로인 `window._wtCalUpdateExerciseSet()`에 남겼다.

3. 삭제 `×` 버튼 hit target 확대/분리
   - PASS: E2E evidence 기준 삭제 버튼 `38x34`, 펼침 버튼과 gap `4`.
   - PASS: 삭제 버튼은 DOM 순서상 펼침 버튼보다 왼쪽에 있다.

4. 손가락 swipe 삭제
   - PASS: `data-wt-set-swipe-row`와 `_bindWorkoutSetSwipeDelete()`가 좌측 horizontal swipe를 `_removeWorkoutExerciseSetFromSheet()`로 연결한다.
   - PASS: 입력 필드와 열린 set type menu에서는 swipe 삭제를 시작하지 않는다.

5. 새 종목 추가 후 첫 종목 고정 회귀 방지
   - PASS: 기존 add picker carousel restore 경로를 유지했고, `day sheet add picker focuses the selected exercise carousel slide` 테스트가 계속 통과한다.
   - PASS: `day sheet preserves exercise carousel position across set saves`와 reopen state 테스트도 통과한다.

6. Cache version
   - PASS: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260705z1-workout-set-entry-followup-z2-workout-set-mobile-interactions`로 bump했다.

## 검증

1. PASS: `node --check render-calendar.js && node --check tests/workout-set-minimal-dom.test.js`
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js` - 37 pass.
3. PASS: `node --test tests/workout-set-minimal-dom.test.js` - 4 pass.
4. PASS: `node --test tests/*.test.js` - 704 pass.
5. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=880`.
6. PASS: `git diff --check`.
7. PASS: 모바일 E2E evidence:
   - `.omo/evidence/workout-set-mobile-interactions/mobile-set-row-e2e.json`
   - `.omo/evidence/workout-set-mobile-interactions/mobile-set-row-after.png`
8. PASS: 운영 Pages 배포 검증:
   - `npm.cmd run deploy:production`
   - deployed commit `147f25da88e9`
   - cache `tomatofarm-v20260705z1-workout-set-entry-followup-z2-workout-set-mobile-interactions`
9. PASS: 운영 Pages marker 검증:
   - `sw.js::tomatofarm-v20260705z1-workout-set-entry-followup-z2-workout-set-mobile-interactions`
   - `render-calendar.js::data-wt-set-edit-field`
   - `render-calendar.js::_bindWorkoutSetSwipeDelete`
   - `render-calendar.js::sheet:set-field-editor`
   - `style.css::is-swipe-delete-ready`
10. PASS: 운영 앱 모바일 smoke:
   - 배포 URL에서 테스트 사용자/날짜 cache로 workout day sheet를 열었다.
   - 실제 터치 hit target은 `70kg` 버튼 내부 `B` element였다.
   - `kg` input focus, value `''`, editor open 확인.
   - 삭제 hit target `36x34`, 삭제/펼침 gap `3`.
   - evidence: `.omo/evidence/workout-set-mobile-interactions/production-mobile-flow.json`, `.omo/evidence/workout-set-mobile-interactions/production-app-mobile-focus.png`
11. PASS: 운영 배포 source 모바일 swipe harness:
   - 배포된 `render-calendar.js`/`style.css`를 사용했다.
   - `55kg / 15회` 변경 후 좌측 swipe 삭제로 set count `1`.
   - toast `세트를 삭제했어요`.
   - evidence: `.omo/evidence/workout-set-mobile-interactions/production-source-mobile-swipe.png`

## 리뷰 제한

- `omo:review-work`는 구현 후 5개 sub-agent 리뷰를 요구하지만, 현재 Codex sub-agent 도구 정책은 사용자가 명시적으로 sub-agent/parallel agent work를 요청하지 않은 경우 spawn을 금지한다. 따라서 이번 리뷰는 로컬 검증과 artifact evidence로 대체했다.
- 운영 Pages 배포 검증은 완료됐다. 이후 docs-only 커밋이 추가되면 해당 commit에 대해 `npm.cmd run deploy:production`을 다시 실행한다.

## 잔여 리스크

- 운영 앱 smoke는 production DB를 오염시키지 않기 위해 테스트 사용자 localStorage와 브라우저 cache 주입으로 day sheet를 열었고, 저장/change가 필요한 swipe 삭제는 배포 source harness에서 검증했다.
