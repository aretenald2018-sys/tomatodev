# 운동 하단 시트 카드 캐러셀 수정

## 상태

- 상태: `approved`
- 요청일: 2026-07-02
- 대상: 캘린더/운동 홈 하단 시트의 운동종목 카드

## 진단

사용자 스크린샷은 일반 운동 기록 입력 화면이 아니라 `render-calendar.js`의 캘린더 하단 시트다. 직전 캐러셀 변경은 `workout/exercises.js`의 운동 기록 입력 카드에만 적용되어, 하단 시트의 `_renderWorkoutDetailCards()`는 여전히 `wx.exercises.map()` 결과를 `.wt-day-card-list` 안에 세로로 쌓고 있다.

반증 가능한 원인:

1. 하단 시트 렌더러가 별도라서 기존 캐러셀 클래스가 사용되지 않는다. 확인됨.
2. `.wt-day-card-list`가 `flex-direction: column`이라 여러 운동 카드가 세로 스택된다. 확인됨.
3. 하단 시트 scroller가 `touch-action: pan-y`라 내부 가로 swipe가 막힐 수 있다. CSS 계약상 가능성이 높다.

## Slice 1

목표:

- 하단 시트의 근력 운동종목 카드를 세로 스택 대신 좌우 swipe 가능한 carousel/slide 구조로 렌더한다.
- 활동/러닝 카드, 회차 탭, FAB, 세트 편집 동작은 건드리지 않는다.
- 모바일에서 다음 카드의 존재가 보이도록 track에 여백과 `scroll-snap`을 적용한다.

변경 범위:

- `render-calendar.js`
- `style.css`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache marker 테스트들
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

제외:

- 운동 기록 입력 화면(`workout/exercises.js`) 재작업
- 운동 데이터 schema 변경
- 러닝 카드 캐러셀 편입
- 새 JS 버튼/드래그 제스처 추가

검증:

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot tests/*.test.js`
6. `git diff --check`
7. Dashboard3/운영계 Pages 배포 후 `verify:deploy`와 deployed marker 확인

## 다음 실행

`docs/ai/features/2026-07-02-workout-day-sheet-card-carousel.md`의 Slice 1을 실행한다. `_renderWorkoutDetailCards()`에서 운동종목 카드를 `wt-day-exercise-carousel`/`wt-day-exercise-carousel-track`/`data-wt-day-exercise-slide` 구조로 렌더하고, 하단 시트 CSS에 horizontal `scroll-snap`과 가로 touch 동작을 추가한다.

## Slice 1 실행 결과

- 완료: `_renderWorkoutDetailCards()`가 근력 운동종목 카드를 `_renderWorkoutExerciseDetailCarousel()`로 렌더하도록 변경했다.
- 완료: 운동종목 카드는 `wt-day-exercise-carousel`/`wt-day-exercise-carousel-track`/`data-wt-day-exercise-slide` 구조로 감싸고, 활동/러닝 카드는 기존 리스트 흐름을 유지했다.
- 완료: `style.css`에 horizontal `scroll-snap`, scrollbar 숨김, 다중 카드 partial peek, 하단 시트 `pan-x pan-y` touch 동작을 추가했다.
- 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z13-workout-day-sheet-carousel`로 bump하고 cache marker 테스트를 갱신했다.
- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 25 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- not verified yet: 인증 계정 실제 모바일 UI에서 `운동 탭 -> 하단 시트 -> 여러 운동종목 카드 좌우 swipe` flow는 아직 직접 확인하지 못했다.

## Slice 2 진단

사용자 피드백: 좌우 드래그가 잘 안 된다.

원인 가설:

1. 하단 시트의 `_bindWorkoutHomeSheetInputIsolation()`이 `.wt-day-sheet-scroll`의 모든 `touchmove`를 세로 스크롤 체인 방지 로직으로 처리해, carousel 내부 가로 swipe 중에도 `preventDefault()`가 걸린다. 코드상 확인됨.
2. `touch-action`만 `pan-x pan-y`로 열어도 JavaScript `preventDefault()`가 bubble 단계에서 실행되면 native horizontal scroll이 취소된다. 가능성이 높다.
3. carousel track의 slide 폭/scroll-snap 설정 자체는 배포 marker와 CSS상 존재하므로, 구조 부재보다는 gesture ownership 문제다.

## Slice 2 계획

목표:

- 하단 시트 scroller가 carousel 내부의 명확한 가로 touch/wheel gesture를 가로 scroller에게 넘기도록 한다.
- 세로 경계에서 배경 캘린더로 스크롤이 새는 기존 방지는 유지한다.
- 새 버튼/드래그 컨트롤 없이 native horizontal scroll-snap만 살린다.

변경 범위:

- `render-calendar.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache marker 테스트들
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

검증:

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot tests/*.test.js`
6. `git diff --check`
7. Dashboard3/운영계 Pages 배포 후 marker 확인

## Slice 2 실행 결과

- 완료: 하단 시트 scroller touch handler가 `lastTouchX`/`lastTouchY`를 함께 추적하도록 변경했다.
- 완료: carousel track 내부에서 `abs(deltaX) >= 4 && abs(deltaX) > abs(deltaY)`인 touch/wheel gesture는 `preventDefault()` 없이 carousel이 소유하게 했다.
- 완료: 세로 gesture는 기존 `_workoutHomeSheetTouchWouldChain()`/`_workoutHomeSheetWheelWouldChain()` 경로를 유지해 배경 scroll chain 방지를 보존했다.
- 완료: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z14-workout-day-sheet-drag`로 bump하고 cache marker 테스트를 갱신했다.
- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 25 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ db5d217a9a59d3e328d4f16b57cc37b68a665473`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ db5d217a9a59d3e328d4f16b57cc37b68a665473`
- PASS: Dashboard3/운영계 marker 검증 - `tomatofarm-v20260702z14-workout-day-sheet-drag`, `_workoutHomeSheetCarouselShouldOwnTouch`, `_workoutHomeSheetCarouselShouldOwnWheel`, `data-wt-day-exercise-carousel-track`, `scroll-snap-type: x mandatory`
- not verified yet: 인증 계정 실제 모바일 UI에서 carousel 좌우 drag 감도는 아직 직접 확인하지 못했다.
