# 2026-07-06 운동 세트 타입 메뉴 잘림 수정 계획

## 요청

운동 카드의 세트 타입 선택 메뉴(`메인세트`, `웜업세트`, `드랍세트` 등)가 사진처럼 하단 영역에서 열릴 때 화면 아래로 잘리는 문제를 해결한다.

## 진단 요약 (`/diagnose`)

1. `render-calendar.js`는 열린 세트 타입 메뉴를 각 세트 행 내부에 렌더링한다.
2. `style.css`의 `.wt-max-set-type-menu`는 항상 `top: 38px`로 아래 방향에 절대 배치된다.
3. 운동 상세 시트는 `.cal-workout-day-sheet`에서 `overflow: hidden`을 사용하고, 모바일 하단 탭/회차 바가 있어 행이 하단에 가까우면 메뉴 하단 옵션이 잘릴 수 있다.
4. `_toggleWorkoutSetTypeMenuFromSheet()`는 시트 스크롤 위치만 복원하고, 메뉴가 실제 viewport/sheet 안에 들어오는지는 보정하지 않는다.

## 반증 가능한 가설

1. 메뉴가 항상 아래로 열려 sheet body 하단보다 커지므로 하단 행에서 잘린다.
   - 증거: CSS가 `top` 고정이고 메뉴 방향 class가 없다.
   - 수정: 열린 메뉴의 DOM 위치를 측정해 필요한 경우 위 방향 class를 적용한다.
2. 메뉴가 위 방향으로 열려도 sheet scroll 위치가 그대로라 행과 메뉴 일부가 하단 bar 뒤에 남는다.
   - 증거: toggle 후 `_restoreWorkoutSheetScrollState()`만 호출한다.
   - 수정: 열린 메뉴 rect를 sheet viewport 안으로 스크롤 보정한다.
3. `z-index`만 낮아 다른 요소 뒤에 가려지는 문제다.
   - 증거: `.wt-max-set-row.is-type-menu-open`과 menu z-index는 이미 있고, 사진은 뒤로 숨은 것이 아니라 하단이 잘린 상태다.
   - 수정 후보가 아님. z-index 조정만으로는 해결하지 않는다.

## 실행 Slice 1

### 범위

1. `render-calendar.js`
   - 열린 `.wt-max-set-type-menu`를 렌더 후 측정한다.
   - sheet/body/viewport 하단 여유가 부족하면 행에 `is-menu-above` class를 붙여 메뉴를 위로 연다.
   - 위/아래 어느 방향이어도 메뉴가 sheet body 안에 들어오도록 최소 스크롤 보정을 한다.
2. `style.css`
   - `.wt-max-set-row.is-menu-above .wt-max-set-type-menu` 스타일을 추가한다.
   - 모바일 미디어쿼리에서도 동일한 방향 전환 오프셋을 맞춘다.
3. `tests/workout-calendar-bottom-sheet.test.js` 또는 `tests/workout-set-minimal-dom.test.js`
   - 메뉴 positioning 함수/스타일/호출 경로를 회귀 테스트로 고정한다.
4. `sw.js`
   - `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION`을 bump한다.

### 하지 않을 것

- 세트 행 전체 디자인 재작업.
- 세트 타입 종류/라벨 변경.
- 운동 저장 schema 변경.
- `www/` 직접 수정.

## 검증 계획

1. RED: 메뉴 방향/스크롤 보정 테스트가 현재 코드에서 실패하는 것을 확인한다.
2. GREEN: focused tests 통과.
   - `node --test tests/workout-calendar-bottom-sheet.test.js`
   - 필요 시 `node --test tests/workout-set-minimal-dom.test.js`
3. 정적 검증.
   - `node --check render-calendar.js`
   - `node --check sw.js`
   - `npm.cmd run verify:assets`
   - `git diff --check`
4. UI 검증.
   - 모바일 폭에서 운동 상세 시트의 세트 타입 메뉴를 연 상태로 메뉴가 위/아래 방향 전환되어 모든 옵션이 보이는지 확인한다.
   - 이 체크아웃의 최종 검증은 운영 Pages 배포 후 `https://aretenald2018-sys.github.io/tomatofarm/`에서 확인한다.

## 실행 결과

1. `render-calendar.js`에 `_positionOpenWorkoutSetTypeMenu()`를 추가했다.
   - 열린 메뉴의 실제 DOM rect를 측정한다.
   - sheet/scroller/viewport 하단 여유가 부족하면 행에 `is-menu-above`를 적용한다.
   - 위/아래 어느 방향에서도 메뉴가 visible sheet 영역 안에 들어오도록 `.wt-day-sheet-scroll.scrollTop`을 최소 보정한다.
2. `_toggleWorkoutSetTypeMenuFromSheet()`가 렌더와 scroll 복원 직후/다음 frame에 메뉴 placement를 실행한다.
3. `style.css`에 위 방향 placement 스타일을 추가했다.
4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260706z7-set-type-menu-clip`로 bump했다.
5. 세트 타입 메뉴 placement 회귀 테스트와 DOM harness dependency를 갱신했다.

## 실행 검증

1. RED: `node --test tests/workout-calendar-bottom-sheet.test.js`가 `_positionOpenWorkoutSetTypeMenu should exist`로 실패했다.
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 35 pass.
3. PASS: `node --test tests/workout-set-minimal-dom.test.js` - 4 pass.
4. PASS: `node --check render-calendar.js`.
5. PASS: `node --check sw.js`.
6. PASS: `node --check tests/workout-calendar-bottom-sheet.test.js`.
7. PASS: `node --check tests/workout-set-minimal-dom.test.js`.
8. PASS: `node --test tests/*.test.js` - 714 pass.
9. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=882`.
10. PASS: `git diff --check`.
11. PASS: Puppeteer mobile visual QA harness - before placement `menuBottom=2280`, visible bottom `2123`; after placement `isAbove=true`, `optionCount=4`, `clipped=false`.

## 다음 실행 프롬프트

`docs/ai/features/2026-07-06-workout-set-type-menu-clipping.md` Slice 1을 실행한다. 변경 범위는 `render-calendar.js`, `style.css`, focused tests, `sw.js`, `docs/ai/NEXT_ACTION.md`로 제한한다.
