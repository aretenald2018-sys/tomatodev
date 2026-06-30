# 운동 캘린더 드래그 Surface 회귀 수정 계획

## 요청

운동 탭 월간 캘린더가 바텀시트 영역에서 손가락을 움직일 때만 드래그되는 상황을 수정한다.

## `/diagnose`

### 증상

- 첨부 화면 기준 운동 탭 월간 캘린더가 보이는 상태에서 캘린더 본문 영역의 세로 드래그가 안정적으로 동작하지 않는다.
- 사용자는 바텀시트 영역에서 손가락을 움직여야 캘린더가 드래그된다고 보고했다.

### 재현/피드백 루프

- 코드 계약 확인: `render-calendar.js` 월간 surface 표식, `app.js` 전역 workout pull-back 예외, `style.css` touch-action 범위를 확인한다.
- 회귀 테스트: `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-navigation-stack.test.js`에서 캘린더 surface 전체가 pull-back 예외/touch pan 대상임을 검증한다.
- 정적 검증: `node --check render-calendar.js; node --check sw.js`, 관련 node tests, runtime assets, diff check.

### 원인 가설

1. 우선순위 높음: 이전 터치 스크롤 수정이 `data-wt-calendar-scroll-surface`를 `.cal-workout-month-grid`에만 붙여 헤더/요약/요일/셀 사이 영역에서 시작한 touch가 전역 workout pull-back 제스처에 잡힌다.
2. 우선순위 중간: `.cal-workout-surface-home`에는 `touch-action: pan-y`가 없어 grid 바깥 터치 시작 지점에서 브라우저가 세로 pan 의도를 명확히 받지 못한다.
3. 우선순위 낮음: full sheet backdrop이 남아 배경 입력을 막는다. 현재 CSS는 `.is-full`에서만 `pointer-events:auto`라 가능성은 낮다.
4. 우선순위 낮음: fixed bottom sheet 높이/하단 padding 때문에 실제 스크롤 대상이 페이지가 아니라 시트로 잡힌다. 현재 시트는 fixed이고 root는 문서 흐름에 있어 가능성은 낮다.

## 결정

- 바텀시트 drag는 되살리지 않는다. 현재 계약은 `bar`/`full` 탭 토글이다.
- 월간 운동 캘린더의 top-level surface 자체를 `data-wt-calendar-scroll-surface`로 표시해 surface 어디에서 시작한 세로 pan도 전역 pull-back이 가로채지 않게 한다.
- `.cal-workout-surface-home`에도 `touch-action: pan-y`를 명시한다.

## 실행 범위

- `render-calendar.js`: workout home surface wrapper에 `data-wt-calendar-scroll-surface` 추가.
- `style.css`: `.cal-workout-surface-home`에 `touch-action: pan-y` 추가.
- `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-navigation-stack.test.js`: surface-level 표식/touch-action 회귀 검증.
- `sw.js`와 cache marker 테스트: `STATIC_ASSETS` 대상 변경에 따른 `CACHE_VERSION` bump.
- `docs/ai/NEXT_ACTION.md`: 실행/리뷰 상태 기록.

## 하지 않을 것

- bottom sheet pointer drag, `is-dragging`, `is-mid` 상태를 복구하지 않는다.
- 캘린더 셀 크기, 바텀시트 높이, 운동 기록 데이터 구조를 변경하지 않는다.
- `www/` 산출물은 직접 수정하지 않는다.

## 검증 계획

- `node --check render-calendar.js`
- `node --check sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL marker 확인:
  - `render-calendar.js`의 `data-wt-calendar-scroll-surface`
  - `style.css`의 `.cal-workout-surface-home` `touch-action: pan-y`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-calendar-drag-surface-fix.md` Slice 1을 실행한다.

## 실행 결과

- `render-calendar.js`에서 운동 홈 surface wrapper에 `data-wt-calendar-scroll-surface`를 조건부로 추가했다.
- 기존 `.cal-workout-month-grid` 표식은 유지해 grid 내부 계약을 보존했다.
- `style.css`에서 `.cal-workout-surface-home`에 `touch-action: pan-y`를 추가했다.
- `tests/workout-calendar-bottom-sheet.test.js`, `tests/workout-navigation-stack.test.js`에 surface-level 표식과 touch-action 검증을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z13-workout-calendar-drag-surface`로 bump하고 cache marker 테스트 기대값을 갱신했다.

검증:

- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js` — 24 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: 커밋 `041f878 fix: widen workout calendar drag surface`를 `origin/main`에 push했다.
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 041f878` — `[deploy-verify] ok 041f878367c6 tomatofarm-v20260630z13-workout-calendar-drag-surface static=233`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260630z13-workout-calendar-drag-surface" "render-calendar.js::scrollSurfaceAttr" "render-calendar.js::data-wt-calendar-scroll-surface" "style.css::.cal-workout-surface-home" "style.css::touch-action: pan-y"`
- PASS: 운영계 `tomatofarm/main`에 커밋 `3120d0f`를 fast-forward push했다.
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 3120d0f` — `[deploy-verify] ok 3120d0f20fae tomatofarm-v20260630z13-workout-calendar-drag-surface static=233`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ "sw.js::tomatofarm-v20260630z13-workout-calendar-drag-surface" "render-calendar.js::scrollSurfaceAttr" "render-calendar.js::data-wt-calendar-scroll-surface" "style.css::.cal-workout-surface-home" "style.css::touch-action: pan-y"`
- not verified yet: 인증 세션이 없어 실제 `운동 탭 -> 캘린더 본문/요일/요약/좌측 레일에서 세로 드래그` UI flow는 직접 조작하지 못했다.
