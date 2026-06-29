# 운동 홈 캘린더 주차 열 폭 확보

## 요청

- 현재 운동 홈 캘린더는 날짜 7열이 너무 크게 잡혀 왼쪽 주차/요약 1열 공간이 부족하다.
- 참고 사진 2 정도로 캘린더 날짜 열 배율을 줄이고, 오른쪽 여백을 남기는 방식이 아니라 줄어든 폭을 왼쪽 1열 확보에 써야 한다.

## 진단

- 운동 홈 월간 그리드는 `style.css`의 `.cal-workout-surface-home .cal-weekdays`, `.cal-workout-week-row`, `.cal-workout-week-cells`가 폭을 결정한다.
- 모바일 `@media (max-width: 430px)`에서 왼쪽 주차 rail은 `50px`, 날짜 7열은 `repeat(7, minmax(0, 1fr))`로 남은 폭을 모두 채운다.
- 요청은 전체 캘린더를 오른쪽으로 넘기거나 빈 여백을 만드는 것이 아니라, 날짜 열을 조금 조밀하게 만들어 왼쪽 rail을 1열로 안정 확보하는 변경이다.

## 실행 슬라이스

### Slice 1: 모바일 주차 rail 확대와 날짜 칩 압축

구현:

- 모바일 운동 홈 캘린더의 weekday header와 week row 왼쪽 rail을 같은 폭으로 확대한다.
- 날짜 칸의 좌우 padding과 칩 padding을 줄여 날짜 7열이 좁아져도 `분`, `세트`, 부위 라벨이 가능한 한 유지되게 한다.
- `style.css`는 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`과 cache-version 테스트를 bump한다.
- CSS source-level 테스트로 모바일 rail 폭과 압축 규칙을 고정한다.

범위 밖:

- 월 헤더, 상단 요약 카드, 하단 sheet 구조 변경.
- 날짜 클릭/드래그 동작 변경.
- 실제 기록 데이터 표시 로직 변경.

검증:

- `node --check sw.js`
- `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-test-mode-unified.test.js`
- `node --test .\tests\*.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- UI flow: `운동 탭 -> 월간 캘린더`에서 오른쪽 빈 여백 없이 날짜 열이 줄고 왼쪽 주차/요약 열이 더 넓게 보인다.

## 실행 결과

- `style.css` 모바일 운동 홈 캘린더에서 주차 rail을 `50px -> 64px`로 늘렸다.
- 같은 모바일 block에서 날짜 칸 좌우 padding을 `2px -> 1px`, 기록 칩 padding을 `3px -> 2px`, 칩 font-size를 `10px -> 9.5px`로 줄였다.
- `tests/workout-calendar-bottom-sheet.test.js`에 모바일 rail 폭과 칩 압축 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260626z3-workout-calendar-rail`로 bump하고 cache-version 테스트 기대값을 갱신했다.
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-test-mode-unified.test.js` — 14 tests passed
- PASS: `node --test .\tests\*.test.js` — 531 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`
- 리뷰 문서: `docs/ai/reviews/2026-06-26-workout-calendar-week-rail-width-review.md`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 6d6be82`
  - 결과: `[deploy-verify] ok 6d6be82c2ad8 tomatofarm-v20260626z3-workout-calendar-rail static=218`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260626z3-workout-calendar-rail" "style.css::grid-template-columns: 64px repeat(7, minmax(0, 1fr))" "style.css::font-size: 9.5px"`
- not verified yet: 인증 계정이 없어 실제 모바일 브라우저에서 `운동 탭 -> 월간 캘린더` 시각 상태는 직접 확인하지 못했다.
