# 2026-07-05 Workout Set Row Real Swipe Fix Review

## 상태

- 결과: PASS
- 계획: `docs/ai/features/2026-07-05-workout-set-swipe-row-real-fix.md`
- 범위: 운동 세트 행 내부 숫자/컨트롤 영역에서 시작한 모바일 swipe 삭제

## 검토 결과

1. PASS: `_bindWorkoutSetSwipeDelete()`가 sheet capture 단계에서 `touchstart/touchmove/touchend/touchcancel`을 처리해 `.wt-day-sheet-scroll`의 `touchmove` propagation guard보다 먼저 수평 swipe를 소유한다.
2. PASS: 세트 삭제 경로는 `optimisticRender: true`로 즉시 render를 요청한다.
3. PASS: optimistic render 전에 `getCache()[key]`를 `saveDay(merge)`와 동일한 `{ ...currentDay, ...payload }` 방식으로 먼저 갱신해 stale cache로 삭제 전 row가 다시 그려지는 문제를 막았다.
4. PASS: 일반 저장 경로는 여전히 `saveDay(..., { mode: 'merge', rethrow: true })` 완료 뒤 active draft sync/render를 수행한다.
5. PASS: DOM harness가 실제 앱처럼 `.wt-day-sheet-scroll`에서 `touchmove` propagation을 막는 조건을 포함하고, `kg/reps` 실제 컨트롤 중심에서 시작한 좌우 swipe 삭제를 검증한다.

## 검증

1. PASS: RED production E2E - 운영 URL `b9866bc52e13`에서 `kg` 숫자 영역 origin swipe가 `touchmove` capture에는 잡혔지만 row count `2 -> 2`로 남는 실패를 확인했다.
2. PASS: `node --check render-calendar.js && node --check tests/workout-calendar-bottom-sheet.test.js && node --check tests/workout-set-minimal-dom.test.js && node --check .omo/evidence/workout-set-swipe-row-real/repro-control-origin-swipe.mjs && node --check .omo/evidence/workout-set-inline-swipe/production-inline-swipe-flow.mjs && node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-set-minimal-dom.test.js` - 37 pass.
3. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=880`.
4. PASS: `node --test tests/*.test.js` - 704 pass.
5. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ ec0dc846a7e20e7367c38e02f72e466eae44e2aa` - deployed commit/cache verified.
6. PASS: deployed marker verification - `sw.js` z6 cache, `render-calendar.js::cache[key]`, `render-calendar.js::capture`, `tests/workout-set-minimal-dom.test.js::__scrollerTouchMoveBlocks`.
7. PASS: production mobile E2E - `node .omo/evidence/workout-set-swipe-row-real/repro-control-origin-swipe.mjs ec0dc846a7e20e7367c38e02f72e466eae44e2aa`
   - `kg` 숫자 영역에서 시작한 왼쪽 swipe 후 row count `2 -> 1`.
   - evidence: `.omo/evidence/workout-set-swipe-row-real/green-control-origin-swipe.json`, `.omo/evidence/workout-set-swipe-row-real/green-control-origin-swipe.png`.
8. PASS: production inline/swipe regression - `node .omo/evidence/workout-set-inline-swipe/production-inline-swipe-flow.mjs ec0dc846a7e20e7367c38e02f72e466eae44e2aa`
   - `kg/reps` focus value `''`, editor open `false`, inline editing `true`.
   - delete target `42 x 38`, expand gap `8`.
   - deployed source harness: `55kg / 15회` 저장 후 좌우 swipe 삭제, 최종 row count `1`.
   - 새 종목 carousel focus source checks 통과.

## 잔여 리스크

- 실제 인증 사용자 Firestore 문서를 변경하지 않기 위해 운영 앱 smoke와 deployed source harness를 조합했다. 최종 production E2E는 배포된 코드와 동일한 action/render 경로를 사용한다.

