# 2026-07-06 Workout Add Exercise Carousel Focus

## 상태

- 단계: complete
- 요청: 운동 탭에서 종목을 추가하면 `종목을 추가했어요` 토스트만 띄우지 말고 캐러셀 화면을 방금 추가한 종목 카드로 이동시킨다.

## 그릴 결과

- 사용자 요구가 구체적이고 기존 UI의 기대 동작 보정이므로 추가 질문 없이 진행한다.
- 스크린샷의 토스트는 `render-calendar.js`의 day sheet 운동 추가 흐름과 일치한다.
- 기존 코드는 추가 직후 선택 slide restore helper를 호출하지만, 저장/cache 반영이 다음 렌더로 밀리면 해당 시점에 slide가 없어 복원 시도가 사라질 수 있다.

## 실행 범위

1. `render-calendar.js`
   - picker 추가 후 선택한 `entryIdx`를 즉시 한 번만 복원하는 대신, 해당 slide가 실제 DOM에 나타날 때까지 pending focus request로 보존한다.
   - slide 복원에 성공하면 pending request를 제거해 이후 사용자의 수동 carousel 조작을 방해하지 않는다.
   - 기존 set save/inline edit의 carousel position preservation은 유지한다.
2. `tests/workout-calendar-bottom-sheet.test.js`
   - day sheet add picker focus 테스트를 강화해 pending focus request, render 후 재시도, 성공 후 request 제거 계약을 고정한다.
3. `sw.js`
   - `render-calendar.js`가 `STATIC_ASSETS`에 등록되어 있으므로 `CACHE_VERSION`을 bump한다.

## 제외 범위

- 운동 picker UI 구조 변경.
- main workout entry carousel 디자인 변경.
- 세트 행 입력, swipe 삭제, 웬들러/프로그램 처방 로직 변경.

## 검증 계획

1. RED: 강화된 focused test가 현재 구현에서 pending focus request 부재로 실패함을 확인한다.
2. GREEN: `node --test tests/workout-calendar-bottom-sheet.test.js` 통과. focused test에는 pending focus가 target slide 없는 렌더에서 유지되고, target slide가 생긴 브라우저 DOM 렌더에서 복원/해제되는 행동 검증을 포함한다.
3. Regression: `node --test tests/*.test.js`, `npm.cmd run verify:assets`.
4. Browser QA: 모바일 viewport에서 day sheet에 여러 종목이 있는 상태로 add-picker afterSelect를 실행한 뒤 carousel track `scrollLeft`가 추가된 slide offset과 일치하고 toast가 표시되는지 확인한다.
5. PASS: browser/mobile harness - `.omo/evidence/workout-carousel-focus-20260706/browser-add-carousel-focus.json` 및 screenshot.
6. PASS: Production Pages - final deployed commit, HTTP 200, deployed `render-calendar.js`, cache `tomatofarm-v20260706z5-workout-carousel-focus`, and mobile carousel focus harness `scrollLeft=736`, `expectedScrollLeft=736`.
