# 운동 캘린더 바텀시트 내리기 제스처 수정 리뷰

## 범위

- `render-calendar.js` 바텀시트 drag 시작 영역과 target 판정
- `style.css` 시트 헤더 touch-action
- `sw.js` 캐시 버전
- 관련 회귀 테스트

## 변경

- `.cal-workout-day-bar`에 `data-wt-sheet-bar`를 추가하고 pointerdown drag 시작을 헤더 전체에 바인딩했다.
- 화살표 버튼의 `keydown` 바인딩은 유지했다.
- `_resolveWorkoutHomeSheetDragTarget()`에 downward fling collapse 조건을 추가했다.
- 헤더 영역에 `touch-action: none`을 적용했다.
- 기존 “downward velocity가 없어야 한다” 테스트를 제거하고, 새 collapse 조건과 헤더 바인딩을 테스트로 고정했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` (513 passed)
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 본문 스크롤 영역에서 아래로 끌어 접는 동작은 이번 범위에 포함하지 않았다. 이번 수정은 헤더 전체를 drag affordance로 확장하는 데 초점을 둔다.
