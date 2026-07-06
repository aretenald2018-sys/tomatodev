# 2026-07-06 운동 세트 타입 메뉴 잘림 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-06-workout-set-type-menu-clipping.md`
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - `tests/workout-set-minimal-dom.test.js`
  - `tests/*.test.js`의 `CACHE_VERSION` marker assertion
  - `docs/ai/NEXT_ACTION.md`

## 결과

PASS. 리뷰에서 수정이 필요한 blocker를 찾지 못했다.

## 확인 사항

1. 범위 준수
   - 세트 타입 메뉴 placement만 수정했고, 세트 종류/저장 schema/카드 디자인은 변경하지 않았다.
2. 이벤트 경로
   - 기존 `.wt-day-sheet` 내부 direct/capture action 흐름을 유지했다.
   - 새 버튼이나 overlay delegated handler를 추가하지 않아 modal/sheet propagation 규칙을 위반하지 않는다.
3. UI 동작
   - 메뉴를 연 뒤 실제 DOM rect를 기준으로 하단 clipping 여부를 판단한다.
   - 하단 여유가 부족하면 `is-menu-above` class로 위 방향 표시를 적용한다.
   - 위/아래 방향 모두에서 `.wt-day-sheet-scroll`을 최소 보정해 메뉴가 visible sheet 영역 안에 들어오게 한다.
4. Service Worker
   - `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION` bump가 포함됐다.
   - cache marker assertion들이 새 버전으로 갱신됐다.

## 검증 근거

1. RED: `node --test tests/workout-calendar-bottom-sheet.test.js`가 `_positionOpenWorkoutSetTypeMenu should exist`로 실패했다.
2. PASS: `node --test tests/workout-calendar-bottom-sheet.test.js` - 35 pass.
3. PASS: `node --test tests/workout-set-minimal-dom.test.js` - 4 pass.
4. PASS: `node --test tests/*.test.js` - 714 pass.
5. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=882`.
6. PASS: `git diff --check`.
7. PASS: Puppeteer mobile visual QA harness - `isAbove=true`, `optionCount=4`, `clipped=false`.
8. PASS: `npm.cmd run deploy:production` - `origin/main` 배포 및 deployed marker 검증 통과.
9. PASS: 배포 URL `https://aretenald2018-sys.github.io/tomatofarm/`의 `render-calendar.js`/`style.css` 기반 mobile placement harness - `positionedAbove=true`, `optionCount=4`, `clipped=false`.

## 남은 작업

없음.
