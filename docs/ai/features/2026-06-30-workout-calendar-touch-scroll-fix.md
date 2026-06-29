# 운동 캘린더 터치 스크롤 개선

## 요청

운동 탭의 월간 캘린더 화면에서 하단 날짜 bar가 아니라 캘린더 영역을 먼저 터치해 아래로 스크롤하면 화면이 내려가야 하는데 내려가지 않는 문제를 개선한다. 반영은 `dashboard3` Pages 배포에만 적용한다.

## 진단

증상: 모바일 운동 캘린더 화면에서 월간 캘린더 셀 영역을 시작점으로 아래 방향 스크롤을 시도하면 브라우저의 기본 세로 스크롤이 동작하지 않는다.

확인한 단서:

- `app.js`의 `initWorkoutPullBackGesture()`가 `window`의 `touchmove`를 capture 단계에서 감지한다.
- `_canStartWorkoutPullBack()`은 운동 탭이고 현재 root/scroller가 최상단이면 대부분의 운동 탭 터치를 pull-back 후보로 허용한다.
- `touchmove`에서 아래 방향 이동이 deadzone을 넘으면 threshold 도달 전에도 `event.preventDefault()`가 호출된다.
- `_isWorkoutPullBlockedTarget()`은 input, sheet, modal만 제외하고 월간 캘린더 그리드 영역은 제외하지 않는다.
- 하단 sheet가 `bar` 상태일 때 backdrop은 `pointer-events: none`이라 캘린더 영역 초기 터치를 직접 막는 주 원인 가능성은 낮다.

반증 가능한 원인 가설:

1. 전역 workout pull-back gesture가 캘린더 그리드에서 시작한 아래 방향 touchmove를 먼저 잡아 기본 스크롤을 막는다.
2. 캘린더 월간 그리드에 "이 영역은 기본 세로 pan 대상"이라는 명시적 표식이 없어 gesture guard와 CSS 양쪽에서 보호되지 않는다.
3. 하단 day sheet의 bar/backdrop 레이어가 캘린더 영역의 pointer/touch 이벤트를 가로챈다.
4. 캘린더 셀의 inline click handler와 터치 제스처 처리 조합이 브라우저의 세로 스크롤 판정을 지연시킨다.

현재 우선순위는 1번과 2번이다. 3번은 `bar` 상태 CSS상 가능성이 낮고, 4번은 `preventDefault()` 제거 후에도 남으면 후속 진단한다.

## Slice 1 — 월간 캘린더 영역의 네이티브 세로 스크롤 허용

### 포함

- 월간 캘린더 그리드 DOM에 스크롤 시작 영역 표식을 추가한다.
- `app.js`의 workout pull-back 차단 대상에 해당 표식을 추가해 캘린더 그리드에서 시작한 아래 방향 스크롤은 브라우저 기본 동작으로 둔다.
- `style.css`에서 월간 캘린더 그리드에 `touch-action: pan-y`를 명시한다.
- 관련 회귀 테스트를 추가한다.
- `sw.js` `CACHE_VERSION`을 bump한다.
- Dashboard3 Pages(`origin/main`)에만 배포하고 배포 asset marker를 확인한다.

### 제외

- 하단 day sheet drag/snap UX 재설계.
- 날짜 선택, 날짜 bar, 운동 기록 sheet의 열림/닫힘 정책 변경.
- 운동 상세/기록 화면의 pull-back gesture 제거.
- 캘린더 데이터 집계 또는 저장 schema 변경.
- `www/` 직접 수정.
- `tomatofarm` remote 배포.

## 예상 변경 파일

- `render-calendar.js`
- `app.js`
- `style.css`
- `sw.js`
- `tests/workout-navigation-stack.test.js`
- `tests/*`의 `sw.js` cache marker 관련 기대값
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/reviews/2026-06-30-workout-calendar-touch-scroll-fix-review.md`

## 검증 계획

- `node --check app.js`
- `node --check render-calendar.js`
- `node --check sw.js`
- `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- 커밋 후 `git push origin main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- 배포 URL asset marker 확인:
  - `app.js`의 `data-wt-calendar-scroll-surface`
  - `render-calendar.js`의 `data-wt-calendar-scroll-surface`
  - `style.css`의 `.cal-workout-month-grid` `touch-action: pan-y`
  - `sw.js`의 새 cache version

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-workout-calendar-touch-scroll-fix.md` Slice 1을 실행한다.

## 실행 결과

- `render-calendar.js`의 월간 운동 캘린더 그리드에 `data-wt-calendar-scroll-surface` 표식을 추가했다.
- `app.js`의 `_isWorkoutPullBlockedTarget()`에 `[data-wt-calendar-scroll-surface]`를 추가해 캘린더 그리드에서 시작한 터치가 전역 workout pull-back gesture로 처리되지 않게 했다.
- `style.css`의 `.cal-workout-month-grid`에 `touch-action: pan-y`를 추가해 월간 그리드가 세로 pan 대상임을 브라우저에 명시했다.
- `tests/workout-navigation-stack.test.js`와 `tests/workout-calendar-bottom-sheet.test.js`에 캘린더 스크롤 표식, pull-back 예외, CSS marker 회귀 검증을 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z02-workout-calendar-scroll`로 bump하고 cache marker 테스트 기대값을 갱신했다.

검증:

- PASS: `node --check app.js`
- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-calendar-bottom-sheet.test.js` — 21 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 `운동 탭 -> 월간 캘린더 영역에서 아래 방향 스크롤` UI flow 확인이 남아 있다.
