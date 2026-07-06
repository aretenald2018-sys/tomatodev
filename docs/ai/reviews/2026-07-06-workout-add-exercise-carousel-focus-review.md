# 2026-07-06 Workout Add Exercise Carousel Focus 리뷰

## 판정

- 상태: `pass`
- 범위: `docs/ai/features/2026-07-06-workout-add-exercise-carousel-focus.md` Slice 1

## 변경 검토

1. `render-calendar.js`
   - day sheet add-picker 선택 결과의 `entryIdx`를 pending carousel focus request로 저장한다.
   - target slide가 없는 렌더에서는 pending request를 유지하고, target slide가 DOM에 생긴 렌더에서만 복원 성공 처리 후 request를 제거한다.
   - `carouselScrollLeft: null`은 slide offset fallback을 의미하므로 `null`을 숫자 `0`으로 오판하지 않도록 복원 조건을 보정했다.
2. `sw.js`
   - `render-calendar.js`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 `tomatofarm-v20260706z5-workout-carousel-focus`로 올렸다.
3. `tests/*.test.js`
   - cache marker 테스트를 새 cache version에 맞췄다.
   - `tests/workout-calendar-bottom-sheet.test.js`가 pending focus와 `null` fallback 계약을 고정한다.

## 검증

1. PASS: `.omo/evidence/workout-carousel-focus-20260706/browser-add-carousel-focus.json`
   - 모바일 Puppeteer harness에서 `entryIdx=2` afterSelect 실행.
   - 첫 렌더에는 slide 2가 없어 pending 유지: `pendingSize=1`.
   - 다음 렌더에서 slide 2가 생긴 뒤 `scrollLeft=736`, `expectedScrollLeft=736`, `scrollDelta=0`, `pendingSize=0`.
   - 화면에 `새로 추가한 덤벨 숄더프레스`와 `종목을 추가했어요` toast가 보인다.
2. PASS: `.omo/evidence/workout-carousel-focus-20260706/focused-test.txt` - 34 pass.
3. PASS: `.omo/evidence/workout-carousel-focus-20260706/full-tests.txt` - 710 pass.
4. PASS: `.omo/evidence/workout-carousel-focus-20260706/assets.txt` - `[runtime-assets] ok refs=882`.
5. PASS: `.omo/evidence/workout-carousel-focus-20260706/syntax-render-calendar.txt`.
6. PASS: `.omo/evidence/workout-carousel-focus-20260706-gate-review.md` - focused final gate `APPROVE`.
7. PASS: `.omo/evidence/workout-carousel-focus-20260706/production-add-carousel-focus.json`
   - Production Pages `HTTP 200`, final deployed commit, cache `tomatofarm-v20260706z5-workout-carousel-focus`.
   - deployed `render-calendar.js` 기반 모바일 harness에서 `entryIdx=2`, delayed render `scrollLeft=736`, `expectedScrollLeft=736`, `scrollDelta=0`, toast `종목을 추가했어요`.

## 남은 사항

- 없음.
