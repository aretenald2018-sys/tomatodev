# 2026-07-05 Workout Set Row Real Swipe Fix

## 상태

- 단계: execution-ready
- 요청: 운동 종목 내 세트 행의 실제 모바일 swipe 삭제가 동작하지 않는 문제를 끝까지 수정한다.

## 진단

1. 이전 검증은 세트 행 배경에서 시작하는 swipe를 중심으로 통과했다.
2. 실제 사용자는 `kg`, `횟수`, 삭제 `×`, 펼침 토글 같은 행 내부 컨트롤 위에 손가락을 올리고 swipe한다.
3. 운영 URL RED E2E에서 `kg` 숫자 영역에서 왼쪽 swipe를 시작해도 row count가 `2 -> 2`로 남아 세트가 화면에서 사라지지 않았다.
4. Firestore 저장 실패 또는 지연이 있을 때 삭제 mutation은 적용되어도 렌더가 저장 완료 뒤로 밀릴 수 있어 사용자에게는 삭제가 안 된 것처럼 보인다.
5. 재배포 RED E2E에서 `.wt-day-sheet-scroll`의 `touchmove` stopPropagation이 sheet bubble 단계의 row swipe handler보다 먼저 실행되어, 실제 숫자 영역 origin swipe가 삭제 handler까지 도달하지 않았다.

## 실행 범위

1. `render-calendar.js`
   - 세트 삭제 경로에 한해 optimistic render 옵션을 추가한다.
   - 일반 저장 경로는 기존처럼 `saveDay(..., rethrow: true)` 완료 뒤 active draft 동기화와 렌더를 수행한다.
   - row swipe touch handler를 capture 단계에 바인딩해 scroller/carousel propagation guard보다 먼저 수평 swipe를 소유한다.
2. `tests/workout-set-minimal-dom.test.js`
   - swipe 시작점을 row 배경이 아니라 실제 `kg/reps` 컨트롤 중심으로 바꾼다.
   - 저장 대기 중에도 DOM row count가 즉시 줄어드는지 검증한다.
   - 실제 sheet scroller처럼 `touchmove` bubble propagation을 막는 harness 조건을 추가한다.
3. `tests/workout-calendar-bottom-sheet.test.js`
   - 삭제 경로의 optimistic render와 일반 저장 경로의 save-after-sync 불변식을 정적 테스트로 고정한다.
   - row swipe `touchmove`가 capture 단계에 남아 있는지 고정한다.
4. `sw.js`
   - `render-calendar.js`가 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.

## 검증 계획

1. RED: 운영 URL에서 `kg` 컨트롤 origin swipe가 row를 삭제하지 못하는 증거를 저장한다.
2. GREEN: focused browser DOM test와 전체 Node test를 통과시킨다.
3. Production: `origin/main` 배포 후 모바일 Chromium E2E에서 `kg` 숫자 영역 origin swipe로 row count가 `2 -> 1`이 되는지 확인한다.
4. Regression: 기존 인라인 `kg/횟수` 수정, 좌/우 swipe 삭제, 새 종목 추가 후 carousel focus 테스트를 함께 통과시킨다.
